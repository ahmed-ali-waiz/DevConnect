import Post from "../models/Post.js";
import User from "../models/User.js";
import Comment from "../models/Comment.js";
import Notification from "../models/Notification.js";
import { uploadToCloudinary } from "../middleware/upload.js";

// Helper: detect @mentions in text and create notifications
const detectMentions = async (text, senderId, postId, req) => {
  if (!text) return;
  const mentionRegex = /@([a-zA-Z0-9_]+)/g;
  const matches = [...text.matchAll(mentionRegex)];
  const usernames = [...new Set(matches.map(m => m[1].toLowerCase()))];
  if (usernames.length === 0) return;

  const users = await User.find({ username: { $in: usernames }, _id: { $ne: senderId } });
  for (const user of users) {
    const notif = await Notification.create({
      recipient: user._id,
      sender: senderId,
      type: "mention",
      post: postId,
    });

    const io = req.app.get("io");
    const onlineUsers = req.app.get("onlineUsers");
    if (io && onlineUsers?.get(user._id.toString())) {
      const populated = await Notification.findById(notif._id)
        .populate("sender", "name username profilePic")
        .populate("post", "text");
      io.to(onlineUsers.get(user._id.toString())).emit("newNotification", populated);
    }
  }
};

// @desc    Create a post
// @route   POST /api/v1/posts
export const createPost = async (req, res, next) => {
  try {
    const { text, codeSnippet } = req.body || {};
    let imageUrl = "";
    let videoUrl = "";
    const imageUrls = [];

    // Upload media files if present (supports multiple images via upload.array)
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const resourceType = file.mimetype.startsWith("video") ? "video" : "image";
        const folder = resourceType === "video" ? "devconnect/videos" : "devconnect/posts";
        const result = await uploadToCloudinary(file.buffer, folder, resourceType);
        if (resourceType === "video") {
          videoUrl = result.secure_url;
        } else {
          imageUrls.push(result.secure_url);
        }
      }
      // Keep backward compat: first image goes to `image` field
      if (imageUrls.length > 0) imageUrl = imageUrls[0];
    } else if (req.file) {
      // Fallback for single file upload (backward compat)
      const resourceType = req.file.mimetype.startsWith("video") ? "video" : "image";
      const folder = resourceType === "video" ? "devconnect/videos" : "devconnect/posts";
      const result = await uploadToCloudinary(req.file.buffer, folder, resourceType);
      if (resourceType === "video") videoUrl = result.secure_url;
      else {
        imageUrl = result.secure_url;
        imageUrls.push(result.secure_url);
      }
    }

    // Parse codeSnippet safely
    let parsedCode = { language: "", code: "" };
    if (codeSnippet) {
      try {
        parsedCode = typeof codeSnippet === "string" ? JSON.parse(codeSnippet) : codeSnippet;
      } catch {
        parsedCode = { language: "", code: "" };
      }
    }

    const post = await Post.create({
      author: req.user._id,
      text: text || "",
      image: imageUrl,
      images: imageUrls,
      video: videoUrl,
      codeSnippet: parsedCode,
    });

    await post.populate("author", "name username profilePic isVerified");

    // Detect @mentions
    await detectMentions(text, req.user._id, post._id, req);

    res.status(201).json(post);
  } catch (error) {
    next(error);
  }
};

// @desc    Get feed posts (from following + own posts)
// @route   GET /api/v1/posts/feed?page=1&limit=10&type=following
export const getFeed = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const currentUser = await User.findById(req.user._id);
    const feedUsers = req.query.type === 'following'
      ? [...currentUser.following]
      : [...currentUser.following, currentUser._id];

    const posts = await Post.find({ author: { $in: feedUsers } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "name username profilePic isVerified")
      .populate({
        path: "comments",
        options: { limit: 3, sort: { createdAt: -1 } },
        populate: { path: "author", select: "name username profilePic" },
      });

    const total = await Post.countDocuments({ author: { $in: feedUsers } });

    res.json({
      posts,
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get explore/trending posts
// @route   GET /api/v1/posts/explore?page=1&limit=10
export const getExplorePosts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.aggregate([
      {
        $addFields: {
          likesCount: { $size: { $ifNull: ["$likes", []] } },
        },
      },
      { $sort: { likesCount: -1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    await Post.populate(posts, { path: "author", select: "name username profilePic isVerified" });

    const total = await Post.countDocuments();

    res.json({
      posts,
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single post
// @route   GET /api/v1/posts/:id
export const getPost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("author", "name username profilePic isVerified")
      .populate({
        path: "comments",
        populate: { path: "author", select: "name username profilePic" },
        options: { sort: { createdAt: -1 } },
      });

    if (!post) return res.status(404).json({ message: "Post not found" });

    res.json(post);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete post
// @route   DELETE /api/v1/posts/:id
export const deletePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (!post.author.equals(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: "Post deleted" });
  } catch (error) {
    next(error);
  }
};

// @desc    Like / Unlike a post
// @route   POST /api/v1/posts/:id/like
export const toggleLike = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const isLiked = post.likes.includes(req.user._id);

    if (isLiked) {
      post.likes = post.likes.filter((id) => !id.equals(req.user._id));
    } else {
      post.likes.push(req.user._id);

      // Notify post author (if not self)
      if (!post.author.equals(req.user._id)) {
        await Notification.create({
          recipient: post.author,
          sender: req.user._id,
          type: "like",
          post: post._id,
        });

        const io = req.app.get("io");
        const onlineUsers = req.app.get("onlineUsers");
        if (io && onlineUsers?.get(post.author.toString())) {
          io.to(onlineUsers.get(post.author.toString())).emit("newNotification", {
            type: "like",
            sender: { _id: req.user._id, name: req.user.name, username: req.user.username },
            post: post._id,
          });
        }
      }
    }

    await post.save();
    res.json({ liked: !isLiked, likeCount: post.likes.length });
  } catch (error) {
    next(error);
  }
};

// @desc    Repost / Unrepost
// @route   POST /api/v1/posts/:id/repost
export const toggleRepost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const isReposted = post.reposts.includes(req.user._id);

    if (isReposted) {
      post.reposts = post.reposts.filter((id) => !id.equals(req.user._id));
    } else {
      post.reposts.push(req.user._id);

      if (!post.author.equals(req.user._id)) {
        await Notification.create({
          recipient: post.author,
          sender: req.user._id,
          type: "repost",
          post: post._id,
        });
      }
    }

    await post.save();
    res.json({ reposted: !isReposted, repostCount: post.reposts.length });
  } catch (error) {
    next(error);
  }
};

// @desc    Bookmark / Unbookmark
// @route   POST /api/v1/posts/:id/bookmark
export const toggleBookmark = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const postId = req.params.id;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const isBookmarked = user.bookmarks.includes(postId);

    if (isBookmarked) {
      user.bookmarks = user.bookmarks.filter((id) => !id.equals(postId));
    } else {
      user.bookmarks.push(postId);
    }

    await user.save();
    res.json({ bookmarked: !isBookmarked });
  } catch (error) {
    next(error);
  }
};

// @desc    Get bookmarked posts
// @route   GET /api/v1/posts/bookmarks
export const getBookmarks = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: "bookmarks",
      populate: { path: "author", select: "name username profilePic isVerified" },
      options: { sort: { createdAt: -1 } },
    });

    res.json(user.bookmarks);
  } catch (error) {
    next(error);
  }
};

// @desc    Get posts by user
// @route   GET /api/v1/posts/user/:userId
export const getUserPosts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find({ author: req.params.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "name username profilePic isVerified");

    const total = await Post.countDocuments({ author: req.params.userId });

    res.json({
      posts,
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Edit a post (text + codeSnippet only)
// @route   PUT /api/v1/posts/:id
export const editPost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (!post.author.equals(req.user._id)) return res.status(403).json({ message: "Not authorized" });

    const { text, codeSnippet } = req.body;
    if (text !== undefined) post.text = text;
    if (codeSnippet !== undefined) {
      post.codeSnippet = typeof codeSnippet === "string" ? JSON.parse(codeSnippet) : codeSnippet;
    }
    post.markModified("text");
    await post.save();
    await post.populate("author", "name username profilePic isVerified");

    if (text) await detectMentions(text, req.user._id, post._id, req);

    res.json(post);
  } catch (error) {
    next(error);
  }
};

// @desc    Get user replies (comments authored by user)
// @route   GET /api/v1/posts/user/:userId/replies
export const getUserReplies = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const comments = await Comment.find({ author: req.params.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "name username profilePic isVerified")
      .populate({ path: "post", populate: { path: "author", select: "name username profilePic isVerified" } });

    const total = await Comment.countDocuments({ author: req.params.userId });

    res.json({ posts: comments, page, totalPages: Math.ceil(total / limit), hasMore: page * limit < total });
  } catch (error) {
    next(error);
  }
};

// @desc    Get posts liked by user
// @route   GET /api/v1/posts/user/:userId/liked
export const getUserLikedPosts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find({ likes: req.params.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "name username profilePic isVerified");

    const total = await Post.countDocuments({ likes: req.params.userId });

    res.json({ posts, page, totalPages: Math.ceil(total / limit), hasMore: page * limit < total });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user posts that have media
// @route   GET /api/v1/posts/user/:userId/media
export const getUserMediaPosts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find({
      author: req.params.userId,
      $or: [{ image: { $ne: "" } }, { images: { $ne: [] } }, { video: { $ne: "" } }],
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "name username profilePic isVerified");

    const total = await Post.countDocuments({
      author: req.params.userId,
      $or: [{ image: { $ne: "" } }, { images: { $ne: [] } }, { video: { $ne: "" } }],
    });

    res.json({ posts, page, totalPages: Math.ceil(total / limit), hasMore: page * limit < total });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user posts that have code snippets
// @route   GET /api/v1/posts/user/:userId/code
export const getUserCodePosts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find({
      author: req.params.userId,
      "codeSnippet.code": { $ne: "" },
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "name username profilePic isVerified");

    const total = await Post.countDocuments({
      author: req.params.userId,
      "codeSnippet.code": { $ne: "" },
    });

    res.json({ posts, page, totalPages: Math.ceil(total / limit), hasMore: page * limit < total });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all code posts feed (posts with code snippets)
// @route   GET /api/v1/posts/code?page=1&limit=10
export const getCodeFeed = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find({
      "codeSnippet.code": { $ne: "" },
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "name username profilePic isVerified");

    const total = await Post.countDocuments({
      "codeSnippet.code": { $ne: "" },
    });

    res.json({
      posts,
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    });
  } catch (error) {
    next(error);
  }
};
