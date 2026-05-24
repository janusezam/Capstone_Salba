import dotenv from "dotenv";
import mongoose from "mongoose";
import Report from "../models/Alert.js";
import { malaybalayBarangays } from "../../utils/locations.js";

dotenv.config();

const applyChanges = process.argv.includes("--apply");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : null;

const formatCoord = (value) => Number(value).toFixed(5);

const haversineMeters = (lat1, lng1, lat2, lng2) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

const nearestBarangayLabel = (lat, lng) => {
  let best = null;
  let shortest = Number.POSITIVE_INFINITY;

  for (const item of malaybalayBarangays) {
    const d = haversineMeters(lat, lng, item.latitude, item.longitude);
    if (d < shortest) {
      shortest = d;
      best = item;
    }
  }

  if (!best) return null;
  return {
    label: best.label,
    distance: shortest,
  };
};

const isGenericPinnedLabel = (value) => /^Pinned location\s*\(/i.test((value || "").trim());

const shouldRecompute = (report) => {
  if (!Number.isFinite(report.lat) || !Number.isFinite(report.lng)) return false;
  if (!report.locationName) return true;
  if (isGenericPinnedLabel(report.locationName)) return true;
  return false;
};

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing. Set it in backend/.env before running this script.");
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const query = {
    lat: { $type: "number" },
    lng: { $type: "number" },
  };

  const reports = await Report.find(query).sort({ createdAt: -1 });
  const targetReports = reports.filter(shouldRecompute);
  const selected = Number.isFinite(limit) && limit > 0 ? targetReports.slice(0, limit) : targetReports;

  console.log(`Found ${reports.length} reports with coordinates.`);
  console.log(`Eligible for recompute: ${targetReports.length}.`);
  console.log(`Processing: ${selected.length}. Mode: ${applyChanges ? "APPLY" : "DRY-RUN"}.`);

  let updatedCount = 0;

  for (const report of selected) {
    const nearest = nearestBarangayLabel(report.lat, report.lng);
    if (!nearest) continue;

    const newLocationName = `${nearest.label} (${formatCoord(report.lat)}, ${formatCoord(report.lng)})`;
    const oldLocationName = report.locationName || "";

    if (newLocationName === oldLocationName) continue;

    console.log(`- ${report._id}`);
    console.log(`  old: ${oldLocationName || "<empty>"}`);
    console.log(`  new: ${newLocationName}`);
    console.log(`  nearest distance: ${nearest.distance.toFixed(1)}m`);

    if (applyChanges) {
      report.locationName = newLocationName;
      await report.save();
      updatedCount += 1;
    }
  }

  if (applyChanges) {
    console.log(`Done. Updated ${updatedCount} report location names.`);
  } else {
    console.log("Dry-run complete. Re-run with --apply to write changes.");
  }

  await mongoose.disconnect();
};

run()
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error("Backfill failed:", error.message);
    try {
      await mongoose.disconnect();
    } catch {
      // Ignore disconnect errors during failure path.
    }
    process.exit(1);
  });
