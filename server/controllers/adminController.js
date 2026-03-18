import User from "../models/User.js";
import Post from "../models/Post.js";
import Notification from "../models/Notification.js";

// @desc    Get admin dashboard stats
// @route   GET /api/v1/admin/stats
export const getStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalPosts = await Post.countDocuments();
    const activeToday = await User.countDocuments({
      updatedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    });
    const newUsersThisWeek = await User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    });

    // User growth — last 30 days
    const userGrowth = await User.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      totalUsers,
      totalPosts,
      activeToday,
      newUsersThisWeek,
      userGrowth,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users (paginated)
// @route   GET /api/v1/admin/users?page=1&limit=20
export const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .select("-bookmarks")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments();

    res.json({
      users,
      page,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Ban / Unban user
// @route   PUT /api/v1/admin/users/:id/ban
export const toggleBan = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "admin") return res.status(400).json({ message: "Cannot ban admin" });

    user.isDeactivated = !user.isDeactivated;
    await user.save();

    res.json({ message: user.isDeactivated ? "User banned" : "User unbanned", isDeactivated: user.isDeactivated });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete any post (admin)
// @route   DELETE /api/v1/admin/posts/:id
export const adminDeletePost = async (req, res, next) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json({ message: "Post removed by admin" });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all posts (admin, paginated)
// @route   GET /api/v1/admin/posts
export const getAdminPosts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "name username profilePic");

    const total = await Post.countDocuments();

    res.json({ posts, page, totalPages: Math.ceil(total / limit), total });
  } catch (error) {
    next(error);
  }
};
