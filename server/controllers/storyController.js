import Story from "../models/Story.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { uploadToCloudinary } from "../middleware/upload.js";

// @desc    Get a single story by ID
// @route   GET /api/v1/stories/:id
export const getStory = async (req, res, next) => {
  try {
    const story = await Story.findById(req.params.id)
      .populate("user", "name username profilePic")
      .populate("viewers", "name username profilePic")
      .populate("likes", "name username profilePic");

    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }

    // Add engagement flags for current user
    const storyData = story.toObject();
    storyData.hasViewed = story.viewers.some(viewer => 
      viewer._id.equals(req.user._id)
    );
    storyData.hasLiked = story.likes.some(liker => 
      liker._id.equals(req.user._id)
    );

    res.json(storyData);
  } catch (error) {
    next(error);
  }
};

// @desc    Get stories feed (from following)
// @route   GET /api/v1/stories/feed
export const getStoryFeed = async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.user._id);
    const feedUsers = [...currentUser.following, currentUser._id];

    const stories = await Story.find({
      user: { $in: feedUsers },
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .populate("user", "name username profilePic");

    // Group stories by user and add engagement metadata
    const grouped = {};
    stories.forEach((story) => {
      const userId = story.user._id.toString();
      if (!grouped[userId]) {
        grouped[userId] = {
          user: story.user,
          stories: [],
          hasSeen: false,
        };
      }
      
      // Add engagement data to each story
      const storyData = story.toObject();
      storyData.hasViewed = story.viewers.includes(req.user._id);
      storyData.hasLiked = story.likes.includes(req.user._id);
      storyData.viewersCount = story.viewers.length;
      storyData.likesCount = story.likes.length;
      
      grouped[userId].stories.push(storyData);
      if (story.viewers.includes(req.user._id)) {
        grouped[userId].hasSeen = true;
      }
    });

    // Sort: unseen first
    const result = Object.values(grouped).sort((a, b) => a.hasSeen - b.hasSeen);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Create story
// @route   POST /api/v1/stories
export const createStory = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Media file is required" });
    }

    const resourceType = req.file.mimetype.startsWith("video") ? "video" : "image";
    const result = await uploadToCloudinary(req.file.buffer, "devconnect/stories", resourceType);

    const story = await Story.create({
      user: req.user._id,
      media: result.secure_url,
      mediaType: resourceType,
    });

    await story.populate("user", "name username profilePic");

    res.status(201).json(story);
  } catch (error) {
    next(error);
  }
};

// @desc    Mark story as viewed
// @route   POST /api/v1/stories/:id/view
export const viewStory = async (req, res, next) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: "Story not found" });

    // Don't count the story owner as a viewer
    if (!story.user.equals(req.user._id) && !story.viewers.includes(req.user._id)) {
      story.viewers.push(req.user._id);
      await story.save();
    }

    res.json({ viewed: true, viewerCount: story.viewers.length });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete own story
// @route   DELETE /api/v1/stories/:id
export const deleteStory = async (req, res, next) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: "Story not found" });
    if (!story.user.equals(req.user._id)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await Story.findByIdAndDelete(req.params.id);
    res.json({ message: "Story deleted" });
  } catch (error) {
    next(error);
  }
};

// @desc    Like/unlike a story
// @route   POST /api/v1/stories/:id/like
export const likeStory = async (req, res, next) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: "Story not found" });

    const likeIndex = story.likes.indexOf(req.user._id);
    
    if (likeIndex > -1) {
      // Unlike - remove notification
      story.likes.splice(likeIndex, 1);
      await Notification.findOneAndDelete({
        recipient: story.user,
        sender: req.user._id,
        type: "story_like",
        story: story._id,
      });
    } else {
      // Like - add notification
      story.likes.push(req.user._id);
      
      // Notify story owner (if not self)
      if (!story.user.equals(req.user._id)) {
        await Notification.create({
          recipient: story.user,
          sender: req.user._id,
          type: "story_like",
          story: story._id,
        });
      }
    }

    await story.save();

    res.json({ 
      liked: likeIndex === -1, 
      likesCount: story.likes.length 
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get story viewers list with like status
// @route   GET /api/v1/stories/:id/viewers
export const getStoryViewers = async (req, res, next) => {
  try {
    const story = await Story.findById(req.params.id)
      .populate("viewers", "name username profilePic bio")
      .populate("likes", "_id");
    
    if (!story) return res.status(404).json({ message: "Story not found" });

    // Only story owner can see viewers
    if (!story.user.equals(req.user._id)) {
      return res.status(403).json({ message: "Not authorized to view viewers list" });
    }

    // Add hasLiked flag to each viewer
    const likesIds = story.likes.map(like => like._id.toString());
    const viewersWithLikes = story.viewers.map(viewer => ({
      ...viewer.toObject(),
      hasLiked: likesIds.includes(viewer._id.toString()),
    }));

    res.json({
      count: story.viewers.length,
      likesCount: story.likes.length,
      viewers: viewersWithLikes,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get story likes list
// @route   GET /api/v1/stories/:id/likes
export const getStoryLikes = async (req, res, next) => {
  try {
    const story = await Story.findById(req.params.id).populate(
      "likes",
      "name username profilePic bio"
    );
    
    if (!story) return res.status(404).json({ message: "Story not found" });

    res.json({
      count: story.likes.length,
      likes: story.likes,
    });
  } catch (error) {
    next(error);
  }
};
