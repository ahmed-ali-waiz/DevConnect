import express from "express";
import { getConversations, createConversation, getMessages, sendMessage, deleteMessage, deleteConversation } from "../controllers/chatController.js";
import protect from "../middleware/auth.js";
import upload from "../middleware/upload.js";

const router = express.Router();

router.get("/conversations", protect, getConversations);
router.post("/conversations", protect, createConversation);
router.delete("/conversations/:conversationId", protect, deleteConversation);
router.get("/:conversationId/messages", protect, getMessages);
router.post("/:conversationId/messages", protect, upload.fields([
  { name: "image", maxCount: 1 },
  { name: "audio", maxCount: 1 }
]), sendMessage);
router.delete("/:conversationId/messages/:messageId", protect, deleteMessage);

export default router;
