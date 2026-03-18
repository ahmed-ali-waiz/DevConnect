import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { uploadToCloudinary } from "../middleware/upload.js";

// @desc    Get user profile by username
// @route   GET /api/v1/users/:username
export const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select("-bookmarks")
      .populate("followers", "name username profilePic")
      .populate("following", "name username profilePic");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};

// @desc    Update profile
// @route   PUT /api/v1/users/profile
export const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { name, bio, location, website, github, skills } = req.body;

    if (name) user.name = name;
    if (bio !== undefined) user.bio = bio;
    if (location !== undefined) user.location = location;
    if (website !== undefined) user.website = website;
    if (github !== undefined) user.github = github;
    if (skills) user.skills = Array.isArray(skills) ? skills : skills.split(",").map((s) => s.trim());

    // Handle profile pic upload
    if (req.files?.profilePic?.[0]) {
      const result = await uploadToCloudinary(req.files.profilePic[0].buffer, "devconnect/avatars");
      user.profilePic = result.secure_url;
    }

    // Handle cover image upload
    if (req.files?.coverImage?.[0]) {
      const result = await uploadToCloudinary(req.files.coverImage[0].buffer, "devconnect/covers");
      user.coverImage = result.secure_url;
    }

    await user.save();
    res.json(user);
  } catch (error) {
    next(error);
  }
};

// @desc    Follow / Unfollow user
// @route   POST /api/v1/users/:id/follow
export const toggleFollow = async (req, res, next) => {
  try {
    const targetUser = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user._id);

    if (!targetUser) return res.status(404).json({ message: "User not found" });
    if (targetUser._id.equals(currentUser._id)) {
      return res.status(400).json({ message: "Cannot follow yourself" });
    }

    const isFollowing = currentUser.following.includes(targetUser._id);

    if (isFollowing) {
      // Unfollow
      currentUser.following = currentUser.following.filter((id) => !id.equals(targetUser._id));
      targetUser.followers = targetUser.followers.filter((id) => !id.equals(currentUser._id));
    } else {
      // Follow
      currentUser.following.push(targetUser._id);
      targetUser.followers.push(currentUser._id);

      // Create notification
      await Notification.create({
        recipient: targetUser._id,
        sender: currentUser._id,
        type: "follow",
      });

      // Emit Socket.IO notification if available
      const io = req.app.get("io");
      const onlineUsers = req.app.get("onlineUsers");
      if (io && onlineUsers?.get(targetUser._id.toString())) {
        io.to(onlineUsers.get(targetUser._id.toString())).emit("newNotification", {
          type: "follow",
          sender: { _id: currentUser._id, name: currentUser.name, username: currentUser.username, profilePic: currentUser.profilePic },
        });
      }
    }

    await currentUser.save();
    await targetUser.save();

    res.json({
      following: !isFollowing,
      followerCount: targetUser.followers.length,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get followers
// @route   GET /api/v1/users/:id/followers
export const getFollowers = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate("followers", "name username profilePic bio");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user.followers);
  } catch (error) {
    next(error);
  }
};

// @desc    Get following
// @route   GET /api/v1/users/:id/following
export const getFollowing = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate("following", "name username profilePic bio");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user.following);
  } catch (error) {
    next(error);
  }
};

// @desc    Get suggested users
// @route   GET /api/v1/users/suggested
export const getSuggestedUsers = async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.user._id);

    const suggestedUsers = await User.find({
      _id: { $nin: [...currentUser.following, ...currentUser.blockedUsers, currentUser._id] },
      isDeactivated: false,
      blockedUsers: { $ne: currentUser._id },
    })
      .select("name username profilePic bio")
      .limit(5)
      .sort({ followers: -1 });

    res.json(suggestedUsers);
  } catch (error) {
    next(error);
  }
};

// @desc    Pin / Unpin post to profile
// @route   POST /api/v1/users/pin-post/:postId
export const pinPost = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const postId = req.params.postId;

    if (user.pinnedPost && user.pinnedPost.toString() === postId) {
      user.pinnedPost = null;
    } else {
      const Post = (await import("../models/Post.js")).default;
      const post = await Post.findById(postId);
      if (!post) return res.status(404).json({ message: "Post not found" });
      if (!post.author.equals(req.user._id)) return res.status(403).json({ message: "Can only pin your own posts" });
      user.pinnedPost = postId;
    }

    await user.save();
    res.json({ pinnedPost: user.pinnedPost });
  } catch (error) {
    next(error);
  }
};

// @desc    Block / Unblock user
// @route   POST /api/v1/users/:id/block
export const blockUser = async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.user._id);
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ message: "User not found" });
    if (targetUser._id.equals(currentUser._id)) return res.status(400).json({ message: "Cannot block yourself" });

    const isBlocked = currentUser.blockedUsers.some(id => id.equals(targetUser._id));

    if (isBlocked) {
      currentUser.blockedUsers = currentUser.blockedUsers.filter(id => !id.equals(targetUser._id));
    } else {
      currentUser.blockedUsers.push(targetUser._id);
      // Unfollow both directions
      currentUser.following = currentUser.following.filter(id => !id.equals(targetUser._id));
      targetUser.followers = targetUser.followers.filter(id => !id.equals(currentUser._id));
      targetUser.following = targetUser.following.filter(id => !id.equals(currentUser._id));
      currentUser.followers = currentUser.followers.filter(id => !id.equals(targetUser._id));
      await targetUser.save();
    }

    await currentUser.save();
    res.json({ blocked: !isBlocked });
  } catch (error) {
    next(error);
  }
};

// @desc    Mute / Unmute user
// @route   POST /api/v1/users/:id/mute
export const muteUser = async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.user._id);
    const targetId = req.params.id;
    const isMuted = currentUser.mutedUsers.some(id => id.toString() === targetId);

    if (isMuted) {
      currentUser.mutedUsers = currentUser.mutedUsers.filter(id => id.toString() !== targetId);
    } else {
      currentUser.mutedUsers.push(targetId);
    }

    await currentUser.save();
    res.json({ muted: !isMuted });
  } catch (error) {
    next(error);
  }
};

// @desc    Update notification preferences
// @route   PUT /api/v1/users/notification-preferences
export const updateNotificationPreferences = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const { newFollowers, likes, comments, mentions, messages } = req.body;

    if (newFollowers !== undefined) user.notificationPreferences.newFollowers = newFollowers;
    if (likes !== undefined) user.notificationPreferences.likes = likes;
    if (comments !== undefined) user.notificationPreferences.comments = comments;
    if (mentions !== undefined) user.notificationPreferences.mentions = mentions;
    if (messages !== undefined) user.notificationPreferences.messages = messages;

    await user.save();
    res.json(user.notificationPreferences);
  } catch (error) {
    next(error);
  }
};

// @desc    Update privacy settings
// @route   PUT /api/v1/users/privacy-settings
export const updatePrivacySettings = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const { isPrivate, hideFromSearch, showOnlineStatus } = req.body;

    if (isPrivate !== undefined) user.privacySettings.isPrivate = isPrivate;
    if (hideFromSearch !== undefined) user.privacySettings.hideFromSearch = hideFromSearch;
    if (showOnlineStatus !== undefined) user.privacySettings.showOnlineStatus = showOnlineStatus;

    await user.save();
    res.json(user.privacySettings);
  } catch (error) {
    next(error);
  }
};
