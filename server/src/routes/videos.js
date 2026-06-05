import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuid } from 'uuid';
import { mapQuestion, mapVideo, query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../../uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('video/')) {
      return cb(new Error('Only video files are allowed.'));
    }
    cb(null, true);
  }
});

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

router.post('/topic/:topicId', requireAuth, requireRole('ADMIN'), upload.single('video'), async (req, res, next) => {
  try {
    const { title, description, order } = req.body;
    const topicRows = await query('SELECT id FROM topics WHERE id = ? LIMIT 1', [req.params.topicId]);

    if (topicRows.length === 0) {
      return res.status(404).json({ message: 'Topic not found.' });
    }

    if (!title || !req.file) {
      return res.status(400).json({ message: 'Video title and video file are required.' });
    }

    const countRows = await query('SELECT COUNT(*) AS count FROM videos WHERE topic_id = ?', [req.params.topicId]);
    const video = {
      id: uuid(),
      topicId: req.params.topicId,
      title,
      description: description || '',
      order: Number(order) || Number(countRows[0].count) + 1,
      videoUrl: `/uploads/${req.file.filename}`,
      originalName: req.file.originalname,
      createdAt: new Date().toISOString()
    };

    await query(
      `INSERT INTO videos
       (id, topic_id, title, description, video_url, original_name, video_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [video.id, video.topicId, video.title, video.description, video.videoUrl, video.originalName, video.order]
    );

    res.status(201).json({ video });
  } catch (error) {
    next(error);
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
