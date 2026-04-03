import dotenv from "dotenv";
dotenv.config();

console.log("DEBUG: MONGO_URI is", process.env.MONGO_URI ? "Set (Check Railway Dashboard for value)" : "UNDEFINED ❌");

import express from "express";
import http from "http";
import { Server } from "socket.io";

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
