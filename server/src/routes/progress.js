import express from 'express';
import { v4 as uuid } from 'uuid';
import { mapProgress, query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/topic/:topicId', requireAuth, async (req, res, next) => {
  try {
    const videoRows = await query('SELECT id FROM videos WHERE topic_id = ?', [req.params.topicId]);
    const videoIds = videoRows.map((video) => video.id);

    const progressRows = await query(
      'SELECT * FROM progress WHERE user_id = ? AND topic_id = ?',
      [req.user.id, req.params.topicId]
    );

    let answers = [];
    if (videoIds.length > 0) {
      const questionRows = await query(
        `SELECT id FROM questions WHERE video_id IN (${videoIds.map(() => '?').join(',')})`,
        videoIds
      );
      const questionIds = questionRows.map((question) => question.id);

      if (questionIds.length > 0) {
        answers = await query(
          `SELECT id, user_id AS userId, question_id AS questionId, selected_answer AS selectedAnswer,
                  is_correct AS isCorrect, answered_at AS answeredAt
           FROM employee_answers
           WHERE user_id = ? AND question_id IN (${questionIds.map(() => '?').join(',')})`,
          [req.user.id, ...questionIds]
        );
      }
    }

    res.json({ progress: progressRows.map(mapProgress), answers });
  } catch (error) {
    next(error);
  }
});

router.post('/answer', requireAuth, async (req, res, next) => {
  try {
    const { questionId, selectedAnswer } = req.body;

    if (!questionId || selectedAnswer === undefined) {
      return res.status(400).json({ message: 'Question ID and selected answer are required.' });
    }

    const questionRows = await query('SELECT * FROM questions WHERE id = ? LIMIT 1', [questionId]);
    const question = questionRows[0];

    if (!question) {
      return res.status(404).json({ message: 'Question not found.' });
    }

    const correctOptionRows = await query(
      'SELECT option_text FROM question_options WHERE question_id = ? AND is_correct = 1 LIMIT 1',
      [questionId]
    );
    const optionRows = await query('SELECT option_text FROM question_options WHERE question_id = ?', [questionId]);
    const allowedAnswers = optionRows.map((row) => row.option_text);

    if (!allowedAnswers.includes(selectedAnswer)) {
      return res.status(400).json({ message: 'Selected answer must match one of the question options.' });
    }

    const correctAnswer = correctOptionRows[0]?.option_text || question.correct_answer;
    const isCorrect = selectedAnswer === correctAnswer;
    const existingRows = await query(
      'SELECT id FROM employee_answers WHERE user_id = ? AND question_id = ? LIMIT 1',
      [req.user.id, questionId]
    );

    const answerId = existingRows[0]?.id || uuid();
    if (existingRows.length > 0) {
      await query(
        `UPDATE employee_answers
         SET selected_answer = ?, is_correct = ?, answered_at = NOW()
         WHERE id = ?`,
        [selectedAnswer, isCorrect, answerId]
      );
    } else {
      await query(
        `INSERT INTO employee_answers (id, user_id, question_id, selected_answer, is_correct)
         VALUES (?, ?, ?, ?, ?)`,
        [answerId, req.user.id, questionId, selectedAnswer, isCorrect]
      );
    }

    res.json({
      answer: {
        id: answerId,
        userId: req.user.id,
        questionId,
        selectedAnswer,
        isCorrect,
        correctAnswer
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/video', requireAuth, async (req, res, next) => {
  try {
    const { topicId, videoId, watchedSeconds, completed } = req.body;

    if (!topicId || !videoId) {
      return res.status(400).json({ message: 'Topic ID and video ID are required.' });
    }

    const videoRows = await query(
      'SELECT id, duration FROM videos WHERE id = ? AND topic_id = ? LIMIT 1',
      [videoId, topicId]
    );

    if (videoRows.length === 0) {
      return res.status(404).json({ message: 'Video not found for this topic.' });
    }

    const seconds = Number(watchedSeconds) || 0;
    const duration = Number(videoRows[0].duration) || 0;
    const watchedPercentage = duration > 0 ? Math.min(100, Math.round((seconds / duration) * 100)) : 0;
    const existingRows = await query(
      'SELECT * FROM progress WHERE user_id = ? AND topic_id = ? AND video_id = ? LIMIT 1',
      [req.user.id, topicId, videoId]
    );

    const progressId = existingRows[0]?.id || uuid();
    if (existingRows.length > 0) {
      await query(
        `UPDATE progress
         SET watched_percentage = GREATEST(watched_percentage, ?),
             last_watched_second = GREATEST(last_watched_second, ?),
             completed = completed OR ?,
             updated_at = NOW()
         WHERE id = ?`,
        [watchedPercentage, seconds, Boolean(completed), progressId]
      );
    } else {
      await query(
        `INSERT INTO progress
         (id, user_id, topic_id, video_id, watched_percentage, last_watched_second, completed)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [progressId, req.user.id, topicId, videoId, watchedPercentage, seconds, Boolean(completed)]
      );
    }

    const rows = await query('SELECT * FROM progress WHERE id = ? LIMIT 1', [progressId]);
    res.json({ progress: mapProgress(rows[0]) });
  } catch (error) {
    next(error);
  }
});

export default router;
