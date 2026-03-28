import express from "express";
import { 
  getStoryFeed, 
  createStory, 
  getStory,
  viewStory, 
  deleteStory,
  likeStory,
  getStoryViewers,
  getStoryLikes 
} from "../controllers/storyController.js";
import protect from "../middleware/auth.js";
import upload from "../middleware/upload.js";

const router = express.Router();

router.get("/feed", protect, getStoryFeed);
router.post("/", protect, upload.single("media"), createStory);
router.get("/:id", protect, getStory);
router.post("/:id/view", protect, viewStory);
router.post("/:id/like", protect, likeStory);
router.get("/:id/viewers", protect, getStoryViewers);
router.get("/:id/likes", protect, getStoryLikes);
router.delete("/:id", protect, deleteStory);

export default router;
