import express from "express";
import {
  register, login, logout, getMe, checkUsername,
  forgotPassword, resetPassword, changePassword,
  verifyEmail, resendVerification,
  deleteAccount, deactivateAccount,
} from "../controllers/authController.js";
import { googleAuth, googleCallback, githubAuth, githubCallback } from "../controllers/oauthController.js";
import protect from "../middleware/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", protect, getMe);
router.get("/check-username/:username", checkUsername);

// Password reset
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.put("/change-password", protect, changePassword);

// Email verification
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", protect, resendVerification);

// Account management
router.delete("/account", protect, deleteAccount);
router.put("/deactivate", protect, deactivateAccount);

// OAuth
router.get("/google", googleAuth);
router.get("/google/callback", googleCallback);
router.get("/github", githubAuth);
router.get("/github/callback", githubCallback);

export default router;
