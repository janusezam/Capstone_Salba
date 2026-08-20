import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import alertRoutes from "./routes/alertRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";

dotenv.config();
connectDB();

const app = express();
const httpServer = createServer(app);
const allowedOrigins = (process.env.CORS_ORIGINS || "").split(",").map((o) => o.trim()).filter(Boolean);

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
}));
app.use(express.json({ limit: "256kb" }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 400,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again later." },
});
app.use("/api", apiLimiter);

app.use("/api/alerts", alertRoutes);
app.use("/api/users", userRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/upload", uploadRoutes);

app.get("/", (req, res) => res.send("DisasterSOS Backend Server is running"));
app.get("/api/health", (req, res) => res.json({ status: "ok", timestamp: new Date() }));

const PORT = process.env.PORT || 5002;
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] },
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log("[Socket.IO] client connected", socket.id);

  socket.on("join_admin", () => {
    socket.join("admins");
    console.log("[Socket.IO] admin joined", socket.id);
  });

  socket.on("disconnect", () => {
    console.log("[Socket.IO] client disconnected", socket.id);
  });
});

const server = httpServer.listen(PORT, '0.0.0.0', () => console.log(`🚀 [DisasterSOS] Server running on port ${PORT}`));
server.keepAliveTimeout = 65000;

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});





