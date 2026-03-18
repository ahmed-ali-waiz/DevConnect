import express from "express";
import { getComments, addComment, deleteComment, editComment, toggleCommentLike } from "../controllers/commentController.js";
import protect from "../middleware/auth.js";

const router = express.Router();

router.get("/post/:postId", getComments);
router.post("/post/:postId", protect, addComment);
router.put("/:id", protect, editComment);
router.delete("/:id", protect, deleteComment);
router.post("/:id/like", protect, toggleCommentLike);

export default router;
