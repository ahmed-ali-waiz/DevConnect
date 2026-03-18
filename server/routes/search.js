import express from "express";
import { search, getTrendingHashtags } from "../controllers/searchController.js";

const router = express.Router();

router.get("/", search);
router.get("/hashtags/trending", getTrendingHashtags);

export default router;
