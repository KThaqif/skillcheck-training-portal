import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuid } from 'uuid';
import { mapQuestion, mapVideo, query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { LIMITS, cleanString, parsePositiveInteger } from '../validation.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(os.tmpdir(), 'skillcheck-video-uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const allowedVideoTypes = new Map([
  ['.mp4', new Set(['video/mp4'])],
  ['.webm', new Set(['video/webm'])],
  ['.mov', new Set(['video/quicktime', 'video/x-quicktime', 'video/mov'])]
]);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: LIMITS.maxVideoSizeBytes },
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const allowedMimeTypes = allowedVideoTypes.get(extension);

    if (!allowedMimeTypes || !allowedMimeTypes.has(file.mimetype)) {
      return cb(new Error('Only MP4, WebM, and MOV video files are allowed.'));
    }

    cb(null, true);
  }
});

function uploadVideoFile(req, res, next) {
  upload.single('video')(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? 'File size is too large. Please upload a smaller safety video. Maximum upload size is 500 MB.'
        : error.message;
      return res.status(400).json({ message });
    }

    return res.status(400).json({ message: error.message || 'Invalid video upload.' });
  });
}

function requireCloudinaryConfig() {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME
    || !process.env.CLOUDINARY_API_KEY
    || !process.env.CLOUDINARY_API_SECRET
  ) {
    const error = new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.');
    error.statusCode = 500;
    throw error;
  }
}

function removeTempFile(filePath) {
  if (!filePath) return;
  fs.promises.unlink(filePath).catch(() => {});
}

async function uploadToCloudinary(filePath, originalName) {
  try {
    return await cloudinary.uploader.upload(filePath, {
      resource_type: 'video',
      folder: 'skillcheck-training-videos',
      use_filename: true,
      unique_filename: true,
      overwrite: false,
      context: {
        original_filename: originalName
      }
    });
  } catch (error) {
    const uploadError = new Error('Video upload to Cloudinary failed. Please try again.');
    uploadError.statusCode = 502;
    uploadError.publicMessage = uploadError.message;
    uploadError.cause = error;
    throw uploadError;
  }
}

async function getOptions(questionId) {
  const rows = await query('SELECT option_text FROM question_options WHERE question_id = ? ORDER BY id ASC', [questionId]);
  return rows.map((row) => row.option_text);
}

router.get('/topic/:topicId', requireAuth, async (req, res, next) => {
  try {
    const videoRows = await query('SELECT * FROM videos WHERE topic_id = ? ORDER BY video_order ASC', [req.params.topicId]);
    const videos = await Promise.all(videoRows.map(async (row) => {
      const questionCountRows = await query('SELECT COUNT(*) AS count FROM questions WHERE video_id = ?', [row.id]);
      return {
        ...mapVideo(row),
        questionCount: Number(questionCountRows[0].count)
      };
    }));

    res.json({ videos });
  } catch (error) {
    next(error);
  }
});

router.post('/topic/:topicId', requireAuth, requireRole('ADMIN'), uploadVideoFile, async (req, res, next) => {
  try {
    const title = cleanString(req.body?.title);
    const description = cleanString(req.body?.description);
    const order = req.body?.order === undefined || req.body?.order === ''
      ? null
      : parsePositiveInteger(req.body.order);
    const topicRows = await query('SELECT id FROM topics WHERE id = ? LIMIT 1', [req.params.topicId]);

    if (topicRows.length === 0) {
      return res.status(404).json({ message: 'Topic not found.' });
    }

    if (!title) {
      return res.status(400).json({ message: 'Safety video title is required.' });
    }

    if (title.length > LIMITS.videoTitle) {
      return res.status(400).json({ message: `Safety video title must not exceed ${LIMITS.videoTitle} characters.` });
    }

    if (description.length > LIMITS.videoDescription) {
      return res.status(400).json({ message: `Safety video description must not exceed ${LIMITS.videoDescription} characters.` });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Safety video file is required.' });
    }

    if (req.body?.order !== undefined && req.body?.order !== '' && order === null) {
      return res.status(400).json({ message: 'Module order / lesson sequence must be a positive number.' });
    }

    requireCloudinaryConfig();

    const cloudinaryVideo = await uploadToCloudinary(req.file.path, req.file.originalname);
    const countRows = await query('SELECT COUNT(*) AS count FROM videos WHERE topic_id = ?', [req.params.topicId]);
    const duration = Math.floor(Number(cloudinaryVideo.duration || req.body.duration) || 0);
    const video = {
      id: uuid(),
      topicId: req.params.topicId,
      title,
      description,
      order: order || Number(countRows[0].count) + 1,
      videoUrl: cloudinaryVideo.secure_url,
      originalName: req.file.originalname,
      duration,
      createdAt: new Date().toISOString()
    };

    await query(
      `INSERT INTO videos
       (id, topic_id, title, description, video_url, original_name, video_order, duration)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [video.id, video.topicId, video.title, video.description, video.videoUrl, video.originalName, video.order, video.duration]
    );

    res.status(201).json({ video });
  } catch (error) {
    next(error);
  } finally {
    removeTempFile(req.file?.path);
  }
});

router.get('/:videoId', requireAuth, async (req, res, next) => {
  try {
    const videoRows = await query('SELECT * FROM videos WHERE id = ? LIMIT 1', [req.params.videoId]);
    const video = mapVideo(videoRows[0]);

    if (!video) {
      return res.status(404).json({ message: 'Video not found.' });
    }

    const questionRows = await query('SELECT * FROM questions WHERE video_id = ? ORDER BY timestamp_seconds ASC', [video.id]);
    const questions = await Promise.all(questionRows.map(async (row) => {
      const question = mapQuestion(row, await getOptions(row.id));
      if (req.user.role === 'EMPLOYEE') {
        const { correctAnswer, ...safeQuestion } = question;
        return safeQuestion;
      }
      return question;
    }));

    res.json({ video, questions });
  } catch (error) {
    next(error);
  }
});

export default router;
