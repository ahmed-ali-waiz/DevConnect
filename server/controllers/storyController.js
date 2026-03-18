import Story from "../models/Story.js";
import User from "../models/User.js";
import { uploadToCloudinary } from "../middleware/upload.js";

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

    // Group stories by user
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
      grouped[userId].stories.push(story);
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

    if (!story.viewers.includes(req.user._id)) {
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
