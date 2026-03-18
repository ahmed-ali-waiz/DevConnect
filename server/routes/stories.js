import express from "express";
import { getStoryFeed, createStory, viewStory, deleteStory } from "../controllers/storyController.js";
import protect from "../middleware/auth.js";
import upload from "../middleware/upload.js";

const router = express.Router();

router.get("/feed", protect, getStoryFeed);
router.post("/", protect, upload.single("media"), createStory);
router.post("/:id/view", protect, viewStory);
router.delete("/:id", protect, deleteStory);

export default router;
