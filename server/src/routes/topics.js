import express from 'express';
import { v4 as uuid } from 'uuid';
import { mapTopic, mapVideo, query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateTopicInput } from '../validation.js';

const router = express.Router();

async function getTopicProgress(topicId, userId) {
  const videoRows = await query('SELECT id FROM videos WHERE topic_id = ?', [topicId]);
  const videoIds = videoRows.map((video) => video.id);
  const totalVideos = videoIds.length;

  const completedRows = await query(
    'SELECT COUNT(*) AS count FROM progress WHERE user_id = ? AND topic_id = ? AND completed = 1',
    [userId, topicId]
  );

  const questionRows = await query(
    `SELECT q.id
     FROM questions q
     JOIN videos v ON v.id = q.video_id
     WHERE v.topic_id = ?`,
    [topicId]
  );
  const questionIds = questionRows.map((question) => question.id);

  let answeredQuestions = 0;
  let correct = 0;
  if (questionIds.length > 0) {
    const answerRows = await query(
      `SELECT COUNT(*) AS answered_questions, COALESCE(SUM(is_correct), 0) AS correct
       FROM employee_answers
       WHERE user_id = ? AND question_id IN (${questionIds.map(() => '?').join(',')})`,
      [userId, ...questionIds]
    );
    answeredQuestions = Number(answerRows[0].answered_questions);
    correct = Number(answerRows[0].correct);
  }

  const completedVideos = Number(completedRows[0].count);
  const totalQuestions = questionIds.length;
  const totalItems = totalVideos + totalQuestions;
  const completedItems = completedVideos + answeredQuestions;

  return {
    totalVideos,
    completedVideos,
    progressPercent: totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100),
    totalQuestions,
    answeredQuestions,
    score: totalQuestions === 0 ? 0 : Math.round((correct / totalQuestions) * 100)
  };
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const rows = await query(
      req.user.role === 'EMPLOYEE'
        ? "SELECT * FROM topics WHERE status = 'LAUNCHED' ORDER BY created_at DESC"
        : 'SELECT * FROM topics ORDER BY created_at DESC'
    );

    const topics = await Promise.all(rows.map(async (row) => {
      const topic = mapTopic(row);
      const countRows = await query('SELECT COUNT(*) AS count FROM videos WHERE topic_id = ?', [topic.id]);
      return {
        ...topic,
        progress: req.user.role === 'EMPLOYEE' ? await getTopicProgress(topic.id, req.user.id) : undefined,
        videoCount: Number(countRows[0].count)
      };
    }));

    res.json({ topics });
  } catch (error) {
    next(error);
  }
});

router.get('/:topicId', requireAuth, async (req, res, next) => {
  try {
    const topicRows = await query('SELECT * FROM topics WHERE id = ? LIMIT 1', [req.params.topicId]);
    const topic = mapTopic(topicRows[0]);

    if (!topic) {
      return res.status(404).json({ message: 'Topic not found.' });
    }

    const videoRows = await query('SELECT * FROM videos WHERE topic_id = ? ORDER BY video_order ASC', [topic.id]);
    const videos = await Promise.all(videoRows.map(async (row) => {
      const questionCountRows = await query('SELECT COUNT(*) AS count FROM questions WHERE video_id = ?', [row.id]);
      return {
        ...mapVideo(row),
        questionCount: Number(questionCountRows[0].count)
      };
    }));

    res.json({
      topic: {
        ...topic,
        videoCount: videos.length,
        progress: await getTopicProgress(topic.id, req.user.id)
      },
      videos
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const validation = validateTopicInput(req.body);
    if (validation.message) {
      return res.status(400).json({ message: validation.message });
    }
    const { title, category, description, thumbnailUrl, startDate, deadline } = validation.value;

    const topic = {
      id: uuid(),
      title,
      category,
      description,
      thumbnailUrl,
      startDate,
      deadline,
      status: 'DRAFT',
      launchedAt: null,
      createdAt: new Date().toISOString(),
      createdBy: req.user.id
    };

    await query(
      `INSERT INTO topics
       (id, title, description, category, thumbnail, start_date, deadline, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?)`,
      [topic.id, topic.title, topic.description, topic.category, topic.thumbnailUrl, topic.startDate, topic.deadline, topic.createdBy]
    );

    res.status(201).json({ topic });
  } catch (error) {
    next(error);
  }
});

router.patch('/:topicId', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const validation = validateTopicInput(req.body);
    if (validation.message) {
      return res.status(400).json({ message: validation.message });
    }
    const { title, category, description, thumbnailUrl, startDate, deadline } = validation.value;

    const result = await query(
      `UPDATE topics
       SET title = ?, description = ?, category = ?, thumbnail = ?, start_date = ?, deadline = ?
       WHERE id = ?`,
      [
        title,
        description,
        category,
        thumbnailUrl,
        startDate,
        deadline,
        req.params.topicId
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Topic not found.' });
    }

    const rows = await query('SELECT * FROM topics WHERE id = ? LIMIT 1', [req.params.topicId]);
    res.json({ topic: mapTopic(rows[0]) });
  } catch (error) {
    next(error);
  }
});

router.patch('/:topicId/launch', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const result = await query(
      "UPDATE topics SET status = 'LAUNCHED', launched_at = NOW() WHERE id = ?",
      [req.params.topicId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Topic not found.' });
    }

    const rows = await query('SELECT * FROM topics WHERE id = ? LIMIT 1', [req.params.topicId]);
    res.json({ topic: mapTopic(rows[0]) });
  } catch (error) {
    next(error);
  }
});

router.patch('/:topicId/archive', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const result = await query(
      "UPDATE topics SET status = 'ARCHIVED' WHERE id = ?",
      [req.params.topicId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Topic not found.' });
    }

    const rows = await query('SELECT * FROM topics WHERE id = ? LIMIT 1', [req.params.topicId]);
    res.json({ topic: mapTopic(rows[0]) });
  } catch (error) {
    next(error);
  }
});

router.delete('/:topicId', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const result = await query('DELETE FROM topics WHERE id = ?', [req.params.topicId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Topic not found.' });
    }

    res.json({ message: 'Topic deleted.' });
  } catch (error) {
    next(error);
  }
});

export default router;
