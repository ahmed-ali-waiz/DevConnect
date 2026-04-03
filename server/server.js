import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

// Config
import connectDB from "./config/db.js";
import connectCloudinary from "./config/cloudinary.js";

// Middleware
import errorHandler from "./middleware/errorHandler.js";

// Routes
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import postRoutes from "./routes/posts.js";
import commentRoutes from "./routes/comments.js";
import chatRoutes from "./routes/chat.js";
import notificationRoutes from "./routes/notifications.js";
import storyRoutes from "./routes/stories.js";
import searchRoutes from "./routes/search.js";
import adminRoutes from "./routes/admin.js";
import reportRoutes from "./routes/reports.js";

// Socket.IO
import initializeSocket from "./socket/socket.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

// Socket.IO Setup
const io = new Server(server, {
  cors: {
    origin: [
      process.env.CLIENT_URL || "http://localhost:5173",
      "http://localhost:5173",
      "http://localhost:5174",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const onlineUsers = initializeSocket(io);

// Make io and onlineUsers accessible in controllers via req.app
app.set("io", io);
app.set("onlineUsers", onlineUsers);

// ───── Global Middleware ─────
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
  origin: [
    process.env.CLIENT_URL || "http://localhost:5173",
    "http://localhost:5173",
    "http://localhost:5174",
  ],
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  message: { message: "Too many requests, please try again later." },
  skip: () => process.env.NODE_ENV === "development",
});
app.use("/api/", apiLimiter);

// ───── API Routes ─────
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/posts", postRoutes);
app.use("/api/v1/comments", commentRoutes);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/stories", storyRoutes);
app.use("/api/v1/search", searchRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/reports", reportRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 404 handler for API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static assets if in production or by default fallback
const clientBuildPath = path.join(__dirname, "../client/dist");
app.use(express.static(clientBuildPath));

// For any other routes, send the React app (Client-side routing)
app.get("*", (req, res) => {
  res.sendFile(path.join(clientBuildPath, "index.html"));
});

// Global error handler
app.use(errorHandler);

// ───── Start Server ─────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    connectCloudinary();

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(
          `\n❌ Port ${PORT} is already in use. Stop the other server (e.g. another terminal running npm run dev) or set PORT in .env to a free port.\n`
        );
        process.exit(1);
      }
      throw err;
    });

    server.listen(PORT, () => {
      console.log(`\n🚀 DevConnect Server running on port ${PORT}`);
      console.log(`📡 Socket.IO ready`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}\n`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
