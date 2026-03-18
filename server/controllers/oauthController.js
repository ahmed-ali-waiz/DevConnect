import crypto from "crypto";
import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";

const generateUsername = (name, email) => {
  const base = (name || email.split("@")[0])
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
  return base.length >= 3 ? base : base + "_" + Math.random().toString(36).slice(2, 6);
};

const ensureUniqueUsername = async (baseUsername) => {
  let username = baseUsername.slice(0, 20);
  let counter = 1;
  while (await User.findOne({ username })) {
    username = `${baseUsername.slice(0, 16)}${counter}`.slice(0, 20);
    counter++;
  }
  return username;
};

const getApiUrl = () => process.env.API_URL || "http://localhost:5000";

// @desc    Redirect to Google OAuth
// @route   GET /api/v1/auth/google
export const googleAuth = (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.redirect(`${process.env.CLIENT_URL}/login?error=google_not_configured`);
  }
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${getApiUrl()}/api/v1/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
};

// @desc    Google OAuth callback
// @route   GET /api/v1/auth/google/callback
export const googleCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) return res.redirect(`${process.env.CLIENT_URL}/login?error=no_code`);

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${getApiUrl()}/api/v1/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();
    if (tokens.error) throw new Error(tokens.error_description || tokens.error);

    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await userRes.json();
    if (!profile.email) throw new Error("No email from Google");

    let user = await User.findOne({ email: profile.email.toLowerCase() });
    if (!user) {
      user = await User.findOne({ googleId: profile.id });
    }
    if (!user) {
      const baseUsername = generateUsername(profile.name, profile.email);
      const username = await ensureUniqueUsername(baseUsername);
      user = await User.create({
        name: profile.name || profile.email.split("@")[0],
        email: profile.email.toLowerCase(),
        username,
        password: crypto.randomBytes(32).toString("hex"),
        profilePic: profile.picture || "",
        googleId: profile.id,
      });
    } else if (!user.googleId) {
      user.googleId = profile.id;
      user.profilePic = user.profilePic || profile.picture || "";
      await user.save();
    }

    const token = generateToken(user._id);
    res.redirect(`${process.env.CLIENT_URL}/login?token=${token}`);
  } catch (error) {
    console.error("Google OAuth error:", error);
    res.redirect(`${process.env.CLIENT_URL}/login?error=oauth_failed`);
  }
};

// @desc    Redirect to GitHub OAuth
// @route   GET /api/v1/auth/github
export const githubAuth = (req, res) => {
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    return res.redirect(`${process.env.CLIENT_URL}/login?error=github_not_configured`);
  }
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: `${getApiUrl()}/api/v1/auth/github/callback`,
    scope: "user:email",
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
};

// @desc    GitHub OAuth callback
// @route   GET /api/v1/auth/github/callback
export const githubCallback = async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.redirect(`${process.env.CLIENT_URL}/login?error=no_code`);

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        redirect_uri: `${getApiUrl()}/api/v1/auth/github/callback`,
      }),
    });

    const tokens = await tokenRes.json();
    if (tokens.error) throw new Error(tokens.error_description || tokens.error);

    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await userRes.json();

    let email = profile.email;
    if (!email) {
      const emailRes = await fetch("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const emails = await emailRes.json();
      const primary = emails.find((e) => e.primary) || emails[0];
      email = primary?.email;
    }
    if (!email) throw new Error("No email from GitHub");

    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      user = await User.findOne({ githubId: String(profile.id) });
    }
    if (!user) {
      const baseUsername = generateUsername(profile.login || profile.name, email);
      const username = await ensureUniqueUsername(baseUsername);
      user = await User.create({
        name: profile.name || profile.login || email.split("@")[0],
        email: email.toLowerCase(),
        username,
        password: crypto.randomBytes(32).toString("hex"),
        profilePic: profile.avatar_url || "",
        githubId: String(profile.id),
        github: profile.login || "",
      });
    } else {
      if (!user.githubId) user.githubId = String(profile.id);
      if (!user.profilePic) user.profilePic = profile.avatar_url || "";
      if (!user.github) user.github = profile.login || "";
      await user.save();
    }

    const token = generateToken(user._id);
    res.redirect(`${process.env.CLIENT_URL}/login?token=${token}`);
  } catch (error) {
    console.error("GitHub OAuth error:", error);
    res.redirect(`${process.env.CLIENT_URL}/login?error=oauth_failed`);
  }
};
