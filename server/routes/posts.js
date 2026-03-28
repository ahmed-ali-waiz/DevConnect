import express from "express";
import {
  createPost, getFeed, getExplorePosts, getCodeFeed, getPost, deletePost, editPost,
  toggleLike, toggleRepost, toggleBookmark, getBookmarks, getUserPosts,
  getUserReplies, getUserLikedPosts, getUserMediaPosts, getUserCodePosts,
} from "../controllers/postController.js";
import protect from "../middleware/auth.js";
import upload from "../middleware/upload.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = express.Router();

router.get("/feed", protect, getFeed);
router.get("/explore", getExplorePosts);
router.get("/code", getCodeFeed);
router.get("/bookmarks", protect, getBookmarks);
router.get("/user/:userId/replies", getUserReplies);
router.get("/user/:userId/liked", getUserLikedPosts);
router.get("/user/:userId/media", getUserMediaPosts);
router.get("/user/:userId/code", getUserCodePosts);
router.get("/user/:userId", getUserPosts);
router.get("/:id", getPost);
router.post("/", protect, upload.array("media", 4), asyncHandler(createPost));
router.put("/:id", protect, editPost);
router.delete("/:id", protect, deletePost);
router.post("/:id/like", protect, toggleLike);
router.post("/:id/repost", protect, toggleRepost);
router.post("/:id/bookmark", protect, toggleBookmark);

export default router;
