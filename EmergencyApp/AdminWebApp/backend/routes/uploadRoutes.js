// routes/uploadRoutes.js
// Provides secure Cloudinary upload endpoint for mobile apps (DisasterSOS & RescuerApp)
// Mobile apps send image data here; credentials are NEVER exposed to clients.
const express = require('express');
const { v2: cloudinary } = require('cloudinary');
const multer = require('multer');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// Configure Cloudinary from environment variables (set in AdminWebApp/.env)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Use memory storage - we stream directly to Cloudinary, no disk writes
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB max (photo is already compressed on device)
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

/**
 * POST /api/upload/incident-photo
 * Upload an incident photo from the victim's device.
 * Accepts: multipart/form-data with field "photo"
 * Returns: { url, public_id }
 */
router.post('/incident-photo', authMiddleware, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No photo file provided' });
    }

    console.log(`📷 [UPLOAD] Uploading incident photo — size: ${(req.file.size / 1024).toFixed(1)} KB`);

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'disaster-sos/incidents',
          resource_type: 'image',
          // Cloudinary-side transforms as a safety net (in case client compression is skipped)
          transformation: [
            { width: 1200, height: 1200, crop: 'limit' },
            { quality: 'auto:good' },
            { fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    console.log(`✅ [UPLOAD] Incident photo uploaded: ${result.secure_url}`);

    return res.status(200).json({
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
    });
  } catch (err) {
    console.error('❌ [UPLOAD] Incident photo upload error:', err.message);
    return res.status(500).json({ message: 'Photo upload failed', error: err.message });
  }
});

/**
 * POST /api/upload/resolution-photo
 * Upload a proof-of-resolution photo from the rescuer's device.
 * Accepts: multipart/form-data with field "photo"
 * Returns: { url, public_id }
 */
router.post('/resolution-photo', authMiddleware, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No photo file provided' });
    }

    console.log(`📷 [UPLOAD] Uploading resolution photo — size: ${(req.file.size / 1024).toFixed(1)} KB`);

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'disaster-sos/resolutions',
          resource_type: 'image',
          transformation: [
            { width: 1200, height: 1200, crop: 'limit' },
            { quality: 'auto:good' },
            { fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    console.log(`✅ [UPLOAD] Resolution photo uploaded: ${result.secure_url}`);

    return res.status(200).json({
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
    });
  } catch (err) {
    console.error('❌ [UPLOAD] Resolution photo upload error:', err.message);
    return res.status(500).json({ message: 'Resolution photo upload failed', error: err.message });
  }
});

module.exports = router;
