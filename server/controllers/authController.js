import crypto from "crypto";
import User from "../models/User.js";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import Story from "../models/Story.js";
import Notification from "../models/Notification.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import generateToken from "../utils/generateToken.js";
import sendEmail from "../utils/sendEmail.js";
import { validateEmail, validateUsername, validatePassword } from "../utils/validators.js";

// @desc    Register a new user
// @route   POST /api/v1/auth/register
export const register = async (req, res, next) => {
  try {
    const { name, username, password } = req.body;
    const email = (req.body.email || '').toLowerCase().trim();

    // Validations
    if (!name || !username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (!validateEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }
    if (!validateUsername(username)) {
      return res.status(400).json({ message: "Username must be 3-20 chars, letters, numbers, underscore only" });
    }
    if (!validatePassword(password)) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    // Check existing
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      const field = existingUser.email === email ? "Email" : "Username";
      return res.status(400).json({ message: `${field} already taken` });
    }

    const user = await User.create({
      name, username, email, password,
      isVerified: process.env.NODE_ENV !== 'production',
    });

    // Send verification email
    try {
      const verifyToken = crypto.randomBytes(32).toString("hex");
      user.emailVerificationToken = crypto.createHash("sha256").update(verifyToken).digest("hex");
      user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24h
      await user.save();

      const verifyUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/verify-email?token=${verifyToken}`;
      await sendEmail({
        to: user.email,
        subject: "Verify your DevConnect email",
        html: `<h2>Welcome to DevConnect!</h2><p>Click <a href="${verifyUrl}">here</a> to verify your email. This link expires in 24 hours.</p>`,
      });
    } catch {
      // Don't block registration if email fails
    }

    const token = generateToken(user._id);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      profilePic: user.profilePic,
      role: user.role,
      isVerified: user.isVerified,
      token,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
export const login = async (req, res, next) => {
  try {
    const { password } = req.body;
    const email = (req.body.email || '').toLowerCase().trim();

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.isDeactivated) {
      return res.status(403).json({ message: "Account is deactivated. Contact support." });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user._id);

    res.json({
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      profilePic: user.profilePic,
      role: user.role,
      token,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/v1/auth/logout
export const logout = async (req, res) => {
  res.cookie("token", "", { maxAge: 0 });
  res.json({ message: "Logged out successfully" });
};

// @desc    Get current user
// @route   GET /api/v1/auth/me
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("followers", "name username profilePic")
      .populate("following", "name username profilePic");

    res.json(user);
  } catch (error) {
    next(error);
  }
};

// @desc    Check username availability
// @route   GET /api/v1/auth/check-username/:username
export const checkUsername = async (req, res, next) => {
  try {
    const { username } = req.params;
    const exists = await User.findOne({ username: username.toLowerCase() });
    res.json({ available: !exists });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password – send reset email
// @route   POST /api/v1/auth/forgot-password
export const forgotPassword = async (req, res, next) => {
  try {
    const email = (req.body.email || '').toLowerCase().trim();
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal whether email exists
      return res.json({ message: "If that email is registered, a reset link has been sent." });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/reset-password?token=${resetToken}`;
    try {
      await sendEmail({
        to: user.email,
        subject: "DevConnect Password Reset",
        html: `<h2>Password Reset</h2><p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 1 hour.</p><p>If you didn't request this, ignore this email.</p>`,
      });
    } catch (emailError) {
      console.error("Failed to send password reset email:", emailError.message);
      // Clean up the token since the email wasn't delivered
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      return res.status(500).json({ message: "Failed to send reset email. Please try again later." });
    }

    res.json({ message: "If that email is registered, a reset link has been sent." });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password with token
// @route   POST /api/v1/auth/reset-password
export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ message: "Token and new password are required" });
    if (!validatePassword(newPassword)) return res.status(400).json({ message: "Password must be at least 6 characters" });

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({ resetPasswordToken: hashedToken, resetPasswordExpires: { $gt: Date.now() } }).select("+password");
    if (!user) return res.status(400).json({ message: "Invalid or expired reset token" });

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password has been reset successfully" });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password (authenticated)
// @route   PUT /api/v1/auth/change-password
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: "Current and new password are required" });
    if (!validatePassword(newPassword)) return res.status(400).json({ message: "Password must be at least 6 characters" });

    const user = await User.findById(req.user._id).select("+password");
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) return res.status(400).json({ message: "Current password is incorrect" });

    user.password = newPassword;
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify email with token
// @route   GET /api/v1/auth/verify-email
export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ message: "Verification token is required" });

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({ emailVerificationToken: hashedToken, emailVerificationExpires: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ message: "Invalid or expired verification token" });

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({ message: "Email verified successfully" });
  } catch (error) {
    next(error);
  }
};

// @desc    Resend verification email
// @route   POST /api/v1/auth/resend-verification
export const resendVerification = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (user.isVerified) return res.status(400).json({ message: "Email is already verified" });

    const verifyToken = crypto.randomBytes(32).toString("hex");
    user.emailVerificationToken = crypto.createHash("sha256").update(verifyToken).digest("hex");
    user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    const verifyUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/verify-email?token=${verifyToken}`;
    try {
      await sendEmail({
        to: user.email,
        subject: "Verify your DevConnect email",
        html: `<h2>Email Verification</h2><p>Click <a href="${verifyUrl}">here</a> to verify your email. This link expires in 24 hours.</p>`,
      });
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError.message);
      // Clean up the token since the email wasn't delivered
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      await user.save();
      return res.status(500).json({ message: "Failed to send verification email. Please try again later." });
    }

    res.json({ message: "Verification email sent" });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete account permanently
// @route   DELETE /api/v1/auth/account
export const deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ message: "Password is required to delete account" });

    const user = await User.findById(req.user._id).select("+password");
    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(400).json({ message: "Password is incorrect" });

    const userId = user._id;

    // Remove user from all followers/following arrays
    await User.updateMany({ followers: userId }, { $pull: { followers: userId } });
    await User.updateMany({ following: userId }, { $pull: { following: userId } });
    await User.updateMany({ blockedUsers: userId }, { $pull: { blockedUsers: userId } });
    await User.updateMany({ mutedUsers: userId }, { $pull: { mutedUsers: userId } });
    await User.updateMany({ followRequests: userId }, { $pull: { followRequests: userId } });

    // Delete user content
    await Post.deleteMany({ author: userId });
    await Comment.deleteMany({ author: userId });
    await Story.deleteMany({ user: userId });
    await Notification.deleteMany({ $or: [{ recipient: userId }, { sender: userId }] });
    await Message.deleteMany({ sender: userId });
    await Conversation.deleteMany({ participants: userId });

    // Remove likes/reposts/bookmarks from posts
    await Post.updateMany({ likes: userId }, { $pull: { likes: userId } });
    await Post.updateMany({ reposts: userId }, { $pull: { reposts: userId } });

    await User.findByIdAndDelete(userId);

    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// @desc    Deactivate account
// @route   PUT /api/v1/auth/deactivate
export const deactivateAccount = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ message: "Password is required" });

    const user = await User.findById(req.user._id).select("+password");
    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(400).json({ message: "Password is incorrect" });

    user.isDeactivated = true;
    await user.save();

    res.json({ message: "Account deactivated successfully" });
  } catch (error) {
    next(error);
  }
};
