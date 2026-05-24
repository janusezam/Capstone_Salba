import express from "express";
import Feedback from "../models/Feedback.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

router.post("/", requireAuth, async (req, res) => {
  try {
    const { message, category } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({ message: "Feedback message is required" });
    }

    const feedback = await Feedback.create({
      userId: req.user._id,
      senderName: req.user.name || "Anonymous",
      senderPhone: req.user.phone || "",
      message: String(message).trim(),
      category: category || "general",
    });

    const io = req.app.get("io");
    if (io) {
      io.to("admins").emit("feedback_submitted", {
        _id: feedback._id,
        senderName: feedback.senderName,
        senderPhone: feedback.senderPhone,
        message: feedback.message,
        category: feedback.category,
        createdAt: feedback.createdAt,
      });
    }

    return res.status(201).json({
      message: "Feedback sent to admin successfully",
      feedback,
      notification: "Your feedback has been sent to admin.",
    });
  } catch (error) {
    console.error("Create feedback error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.get("/my", requireAuth, async (req, res) => {
  try {
    const feedbackList = await Feedback.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .select("message category isReadByAdmin readAt createdAt");

    return res.json(feedbackList);
  } catch (error) {
    console.error("Get my feedback error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.get("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const feedbackList = await Feedback.find({})
      .populate("userId", "name phone email")
      .sort({ createdAt: -1 });

    return res.json(feedbackList);
  } catch (error) {
    console.error("Get feedback list error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.patch("/:id/read", requireAuth, requireAdmin, async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      { isReadByAdmin: true, readAt: new Date() },
      { new: true }
    );

    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }

    return res.json({ message: "Feedback marked as read", feedback });
  } catch (error) {
    console.error("Mark feedback read error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
