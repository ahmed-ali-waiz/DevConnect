import User from "../models/User.js";
import Post from "../models/Post.js";

// @desc    Search users and posts
// @route   GET /api/v1/search?q=query&type=all|users|posts
export const search = async (req, res, next) => {
  try {
    const { q, type = "all" } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: "Search query must be at least 2 characters" });
    }

    const results = {};

    if (type === "all" || type === "users") {
      results.users = await User.find({
        $or: [
          { name: { $regex: q, $options: "i" } },
          { username: { $regex: q, $options: "i" } },
        ],
        isDeactivated: false,
      })
        .select("name username profilePic bio")
        .limit(10);
    }

    if (type === "all" || type === "posts") {
      results.posts = await Post.find({
        $or: [
          { text: { $regex: q, $options: "i" } },
          { hashtags: { $regex: q.replace("#", ""), $options: "i" } },
        ],
      })
        .sort({ createdAt: -1 })
        .limit(15)
        .populate("author", "name username profilePic isVerified");
    }

    res.json(results);
  } catch (error) {
    next(error);
  }
};

// @desc    Get trending hashtags
// @route   GET /api/v1/search/hashtags/trending
export const getTrendingHashtags = async (req, res, next) => {
  try {
    const trending = await Post.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }, // Last 7 days
      { $unwind: "$hashtags" },
      { $group: { _id: "$hashtags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { tag: "$_id", count: 1, _id: 0 } },
    ]);

    res.json(trending);
  } catch (error) {
    next(error);
  }
};
