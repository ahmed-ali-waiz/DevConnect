import express from "express";
import { getStats, getAllUsers, toggleBan, adminDeletePost, getAdminPosts } from "../controllers/adminController.js";
import { getReports, updateReportStatus } from "../controllers/reportController.js";
import protect from "../middleware/auth.js";
import admin from "../middleware/admin.js";

const router = express.Router();

router.use(protect, admin); // All admin routes require auth + admin

router.get("/stats", getStats);
router.get("/users", getAllUsers);
router.put("/users/:id/ban", toggleBan);
router.get("/posts", getAdminPosts);
router.delete("/posts/:id", adminDeletePost);
router.get("/reports", getReports);
router.put("/reports/:id", updateReportStatus);

export default router;
