import Comment from "../models/Comment.js";
import Post from "../models/Post.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

// Helper: detect @mentions in comment text
const detectCommentMentions = async (text, senderId, postId, req) => {
  if (!text) return;
  const mentionRegex = /@([a-zA-Z0-9_]+)/g;
  const matches = [...text.matchAll(mentionRegex)];
  const usernames = [...new Set(matches.map(m => m[1].toLowerCase()))];
  if (usernames.length === 0) return;

  const users = await User.find({ username: { $in: usernames }, _id: { $ne: senderId } });
  for (const user of users) {
    const notif = await Notification.create({ recipient: user._id, sender: senderId, type: "mention", post: postId });
    await emitNotification(req, user._id, notif._id);
  }
};

const emitNotification = async (req, recipientId, notificationId) => {
  const io = req.app.get("io");
  const onlineUsers = req.app.get("onlineUsers");
  const socketId = onlineUsers?.get(recipientId.toString());
  if (!io || !socketId) return;

  const notif = await Notification.findById(notificationId)
    .populate("sender", "name username profilePic")
    .populate("post", "text image")
    .populate("comment", "text parentComment post");

  io.to(socketId).emit("newNotification", notif);
};

// @desc    Get comments for a post
// @route   GET /api/v1/comments/post/:postId
export const getComments = async (req, res, next) => {
  try {
    const comments = await Comment.find({ post: req.params.postId, parentComment: null })
      .sort({ createdAt: -1 })
      .populate("author", "name username profilePic")
      .populate({
        path: "parentComment",
        populate: { path: "author", select: "name username profilePic" },
      });

    // Also fetch replies for each top-level comment
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await Comment.find({ parentComment: comment._id })
          .sort({ createdAt: 1 })
          .populate("author", "name username profilePic");
        return { ...comment.toObject(), replies };
      })
    );

    res.json(commentsWithReplies);
  } catch (error) {
    next(error);
  }
};

// @desc    Add comment to a post
// @route   POST /api/v1/comments/post/:postId
export const addComment = async (req, res, next) => {
  try {
    const { text, parentCommentId } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Comment text is required" });
    }

    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    let parentComment = null;
    if (parentCommentId) {
      parentComment = await Comment.findById(parentCommentId);
      if (!parentComment) return res.status(404).json({ message: "Parent comment not found" });
    }

    const comment = await Comment.create({
      post: post._id,
      author: req.user._id,
      text,
      parentComment: parentCommentId || null,
    });

    // Add comment ref to post
    post.comments.push(comment._id);
    await post.save();

    // Notifications:
    // - Top-level comment => notify post author
    // - Reply => notify original commenter
    // - Reply may also notify post author (if different)
    if (!parentComment) {
      if (!post.author.equals(req.user._id)) {
        const notif = await Notification.create({
          recipient: post.author,
          sender: req.user._id,
          type: "comment",
          post: post._id,
          comment: comment._id,
        });
        await emitNotification(req, post.author, notif._id);
      }
    } else {
      const originalCommenterId = parentComment.author;
      if (originalCommenterId && !originalCommenterId.equals(req.user._id)) {
        const notif = await Notification.create({
          recipient: originalCommenterId,
          sender: req.user._id,
          type: "reply",
          post: post._id,
          comment: comment._id, // the reply itself
        });
        await emitNotification(req, originalCommenterId, notif._id);
      }
      if (!post.author.equals(req.user._id) && !post.author.equals(originalCommenterId)) {
        const notif = await Notification.create({
          recipient: post.author,
          sender: req.user._id,
          type: "comment",
          post: post._id,
          comment: comment._id,
        });
        await emitNotification(req, post.author, notif._id);
      }
    }

    await comment.populate("author", "name username profilePic");

    // Detect @mentions
    await detectCommentMentions(text, req.user._id, post._id, req);

    res.status(201).json(comment);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete comment
// @route   DELETE /api/v1/comments/:id
export const deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    if (!comment.author.equals(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Remove from post
    await Post.findByIdAndUpdate(comment.post, { $pull: { comments: comment._id } });

    // Delete replies too
    await Comment.deleteMany({ parentComment: comment._id });
    await Comment.findByIdAndDelete(req.params.id);

    res.json({ message: "Comment deleted" });
  } catch (error) {
    next(error);
  }
};

// @desc    Like / unlike comment
// @route   POST /api/v1/comments/:id/like
export const toggleCommentLike = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const isLiked = comment.likes.includes(req.user._id);

    if (isLiked) {
      comment.likes = comment.likes.filter((id) => !id.equals(req.user._id));
    } else {
      comment.likes.push(req.user._id);

      // Notify comment author (comment or reply)
      if (comment.author && !comment.author.equals(req.user._id)) {
        const type = comment.parentComment ? "reply_like" : "comment_like";
        const notif = await Notification.create({
          recipient: comment.author,
          sender: req.user._id,
          type,
          post: comment.post,
          comment: comment._id,
        });
        await emitNotification(req, comment.author, notif._id);
      }
    }

    await comment.save();
    res.json({ liked: !isLiked, likeCount: comment.likes.length });
  } catch (error) {
    next(error);
  }
};

// @desc    Edit comment
// @route   PUT /api/v1/comments/:id
export const editComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    if (!comment.author.equals(req.user._id)) return res.status(403).json({ message: "Not authorized" });

    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ message: "Comment text is required" });

    comment.text = text;
    comment.isEdited = true;
    await comment.save();
    await comment.populate("author", "name username profilePic");

    res.json(comment);
  } catch (error) {
    next(error);
  }
};
