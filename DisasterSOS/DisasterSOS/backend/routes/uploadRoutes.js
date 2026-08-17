// routes/uploadRoutes.js
// Provides secure Cloudinary upload endpoint for DisasterSOS victim app.
import express from 'express';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Memory storage for direct streaming to Cloudinary
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB max
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
 */
router.post('/incident-photo', requireAuth, upload.single('photo'), async (req, res) => {
  try {
    // Configure Cloudinary inside the handler to ensure dotenv has finished loading
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    if (!req.file) {
      return res.status(400).json({ message: 'No photo file provided' });
    }

    console.log(`📷 [UPLOAD] Uploading incident photo — size: ${(req.file.size / 1024).toFixed(1)} KB`);

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'disaster-sos/incidents',
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

    console.log(`✅ [UPLOAD] Incident photo uploaded successfully: ${result.secure_url}`);

    return res.status(200).json({
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (err) {
    console.error('❌ [UPLOAD] Incident photo upload failed:', err.message);
    return res.status(500).json({ message: 'Photo upload failed', error: err.message });
  }
});

export default router;
