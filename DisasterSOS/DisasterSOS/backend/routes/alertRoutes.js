import express from "express";
import mongoose from "mongoose";
import Report from "../models/Alert.js";
import Team from "../models/Team.js";
import User from "../models/User.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

const severityMap = {
  fire: "critical",
  earthquake: "moderate",
  flood: "moderate",
  landslide: "moderate",
  typhoon: "moderate",
};

const formatCoord = (value) => Number(value).toFixed(5);

const fetchWithTimeout = async (url, options = {}, timeoutMs = 2000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const reverseGeocodeLocation = async (lat, lng) => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=16&addressdetails=1`;
    const response = await fetchWithTimeout(url, {
      headers: {
        // Nominatim requires a descriptive user agent.
        "User-Agent": "DisasterSOS/1.0 (capstone emergency app)",
      },
    }, 1800);

    if (!response.ok) return null;

    const result = await response.json();
    const address = result?.address || {};
    const area =
      address.suburb ||
      address.village ||
      address.neighbourhood ||
      address.city_district ||
      address.quarter ||
      null;
    const city =
      address.city ||
      address.town ||
      address.municipality ||
      address.county ||
      null;

    if (area && city) return `${area}, ${city}`;
    if (area) return area;
    if (city) return city;
    if (result?.display_name) return result.display_name.split(",").slice(0, 2).join(", ");
    return null;
  } catch (error) {
    console.warn("Reverse geocoding failed:", error.message);
    return null;
  }
};

// let io;

// export const setIo = (socketIo) => { io = socketIo; };

// 📩 Create report
router.post("/", requireAuth, async (req, res) => {
  console.log("POST received", req.body);
  try {
    // Get sender name from user if userId is provided but senderName is not
    let senderName = req.body.senderName;
    if (!senderName && req.body.userId) {
      const user = await User.findById(req.body.userId);
      senderName = user ? user.name : 'Anonymous';
    }
    
    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);
    const inputLocationName = (req.body.locationName || "").trim();
    const pinnedLabel = /^Pinned location\s*\(/i.test(inputLocationName);

    let resolvedLocationName = inputLocationName;
    if ((!resolvedLocationName || pinnedLabel) && Number.isFinite(latitude) && Number.isFinite(longitude)) {
      const reverseLabel = await reverseGeocodeLocation(latitude, longitude);
      if (reverseLabel) {
        resolvedLocationName = `${reverseLabel} (${formatCoord(latitude)}, ${formatCoord(longitude)})`;
      }
    }

    if (!resolvedLocationName && Number.isFinite(latitude) && Number.isFinite(longitude)) {
      resolvedLocationName = `Pinned location (${formatCoord(latitude)}, ${formatCoord(longitude)})`;
    }

    const normalizedType = String(req.body.type || "").toLowerCase();
    const resolvedSeverity = severityMap[normalizedType] || req.body.severity || "moderate";

    // Map incoming data to report schema
    const reportData = {
      userId: req.user?._id || req.body.userId || null,
      lat: latitude,
      lng: longitude,
      severity: resolvedSeverity,
      note: req.body.note || `${req.body.type} - ${resolvedLocationName}`,
      status: 'new',
      geofenceRadiusMeters: req.body.geofenceRadiusMeters || 100,
      disasterType: req.body.type,
      locationName: resolvedLocationName,
      senderName: senderName || 'Anonymous',
      senderPhone: req.body.userPhone || "",
      photoUrl: req.body.photoUrl || null,
    };
    const report = new Report(reportData);
    await report.save();

    const io = req.app.get("io");
    if (io) {
      io.to("admins").emit("new_alert", report);
      io.to("admins").emit("new_report", report);
    }
    
    // Optional forward to AdminWebApp backend for realtime + severity handling (non-blocking)
    const shouldForward = (process.env.ENABLE_ADMIN_FORWARD || "false").toLowerCase() === "true";
    if (shouldForward) {
      setImmediate(async () => {
        try {
          const adminBackendUrl = process.env.ADMIN_BACKEND_URL || 'http://localhost:5000';
          const forwardPayload = {
            type: reportData.disasterType,
            latitude: reportData.lat,
            longitude: reportData.lng,
            locationName: reportData.locationName,
            userId: reportData.userId,
            userName: reportData.senderName,
            userPhone: req.body.userPhone || "",
            photoUrl: reportData.photoUrl || null,
          };
          console.log('📤 [Forwarding to AdminWebApp]', {
            type: forwardPayload.type,
            userName: forwardPayload.userName,
            userPhone: forwardPayload.userPhone,
          });
          const response = await fetchWithTimeout(`${adminBackendUrl}/api/alerts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(forwardPayload)
          }, 2500);

          if (!response.ok) {
            console.warn(`⚠️ Failed to forward alert to AdminWebApp: ${response.status}`);
          } else {
            console.log('✓ Alert forwarded to AdminWebApp (/api/alerts)');
          }
        } catch (err) {
          console.error('❌ Error forwarding to AdminWebApp:', err.message);
          // Continue anyway - user report is saved locally
        }
      });
    }
    
    res.status(201).json(report);
  } catch (err) {
    console.error("Error saving report:", err);
    res.status(400).json({ message: err.message });
  }
});

// 📊 Get all active (non-resolved) alerts
router.get("/", async (req, res) => {
  try {
    // Find reports that are NOT resolved, sorted by most recent
    const reports = await Report.find({
      status: { $ne: 'Resolved' }
    }).populate('userId', 'name phone email').populate('assignedTeam').sort({ createdAt: -1 });

    res.json(reports);
  } catch (err) {
    console.error("Error fetching reports:", err);
    res.status(500).json({ message: "Error fetching reports" });
  }
});

// 📜 Get resolved cases history - MUST BE BEFORE /:id route
router.get("/history", requireAuth, requireAdmin, async (req, res) => {
  try {
    const resolvedReports = await Report.find({
      status: 'Resolved'
    }).populate('userId', 'name phone email').populate('assignedTeam').populate('resolvedBy', 'name phone email').sort({ resolvedAt: -1, updatedAt: -1 });
    
    res.json(resolvedReports);
  } catch (err) {
    console.error("Error fetching resolved reports:", err);
    res.status(500).json({ message: "Error fetching resolved reports" });
  }
});

// 🔄 Update alert (e.g., assign rescue team or resolve)
router.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const updateData = {};
    if (req.body.assignedTeam) updateData.assignedTeam = req.body.assignedTeam;
    if (req.body.status) {
      updateData.status = req.body.status;
      // Track who resolved the case
      if (req.body.status === 'Resolved') {
        updateData.resolvedAt = new Date();
        updateData.resolvedBy = req.user._id;
        updateData.resolvedByName = req.user.name || req.body.resolvedByName || "Admin";
      }
    }
    
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('userId', 'name phone email').populate('assignedTeam').populate('resolvedBy', 'name phone email');
    if (!report) return res.status(404).json({ message: "Report not found" });

    const io = req.app.get("io");
    if (io) {
      io.to("admins").emit("alert_updated", report);
    }

    res.json(report);
  } catch (err) {
    console.error("Error updating report:", err);
    res.status(400).json({ message: err.message });
  }
});

// 📂 Optional: Get all alerts grouped by type
router.get("/grouped", requireAuth, requireAdmin, async (req, res) => {
  try {
    const grouped = await Report.aggregate([
      {
        $group: {
          _id: "$disasterType",
          count: { $sum: 1 },
          reports: { $push: "$$ROOT" },
        },
      },
    ]);
    res.json(grouped);
  } catch (err) {
    console.error("Error grouping reports:", err);
    res.status(500).json({ message: err.message });
  }
});

// 👤 Get current user's reports
router.get("/my-reports", requireAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    const reports = await Report.find({ userId }).sort({ createdAt: -1 }).lean();
    
    // Auto-sync status with capstoneDB on the same MongoDB connection
    const adminDb = mongoose.connection.useDb('capstoneDB');
    const AdminReportModel = adminDb.model('Report', Report.schema);

    const syncedReports = await Promise.all(reports.map(async (report) => {
      try {
        const match = await AdminReportModel.findOne({
          lat: report.lat,
          lng: report.lng,
          disasterType: report.disasterType,
          createdAt: {
            $gte: new Date(report.createdAt.getTime() - 30000), // +/- 30 seconds
            $lte: new Date(report.createdAt.getTime() + 30000)
          }
        }).lean();

        if (match && match.status !== report.status) {
          console.log(`[STATUS SYNC] Updating local report ${report._id} status to ${match.status}`);
          await Report.updateOne({ _id: report._id }, { $set: { status: match.status } });
          report.status = match.status;
        }
      } catch (syncErr) {
        console.warn(`[STATUS SYNC] Failed to sync report ${report._id}:`, syncErr.message);
      }
      return report;
    }));
    
    res.json({
      count: syncedReports.length,
      reports: syncedReports,
    });
  } catch (err) {
    console.error("Error fetching user reports:", err);
    res.status(500).json({ message: err.message });
  }
});

// 🗑️ Clear user's alert history
router.delete("/my-reports", requireAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    const result = await Report.deleteMany({ userId });
    
    res.json({
      message: "Alert history cleared successfully",
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error("Error clearing user reports:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
