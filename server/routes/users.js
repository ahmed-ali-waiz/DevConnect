import express from "express";
import {
  getUserProfile, updateProfile, toggleFollow, getFollowers, getFollowing, getSuggestedUsers,
  pinPost, blockUser, muteUser, updateNotificationPreferences, updatePrivacySettings,
} from "../controllers/userController.js";
import protect from "../middleware/auth.js";
import upload from "../middleware/upload.js";

const router = express.Router();

router.get("/suggested", protect, getSuggestedUsers);
router.put("/notification-preferences", protect, updateNotificationPreferences);
router.put("/privacy-settings", protect, updatePrivacySettings);
router.post("/pin-post/:postId", protect, pinPost);
router.get("/:username", getUserProfile);
router.put("/profile", protect, upload.fields([{ name: "profilePic", maxCount: 1 }, { name: "coverImage", maxCount: 1 }]), updateProfile);
router.post("/:id/follow", protect, toggleFollow);
router.post("/:id/block", protect, blockUser);
router.post("/:id/mute", protect, muteUser);
router.get("/:id/followers", getFollowers);
router.get("/:id/following", getFollowing);

export default router;
