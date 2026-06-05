import express from 'express';
import { v4 as uuid } from 'uuid';
import { mapQuestion, query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

async function getOptions(questionId) {
  const rows = await query('SELECT option_text FROM question_options WHERE question_id = ? ORDER BY id ASC', [questionId]);
  return rows.map((row) => row.option_text);
}

router.get('/video/:videoId', requireAuth, async (req, res, next) => {
  try {
    const rows = await query('SELECT * FROM questions WHERE video_id = ? ORDER BY timestamp_seconds ASC', [req.params.videoId]);
    const questions = await Promise.all(rows.map(async (row) => {
      const question = mapQuestion(row, await getOptions(row.id));
      if (req.user.role === 'EMPLOYEE') {
        const { correctAnswer, ...safeQuestion } = question;
        return safeQuestion;
      }
      return question;
    }));

    res.json({ questions });
  } catch (error) {
    next(error);
  }
});

router.post('/video/:videoId', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { timestamp, questionText, options, correctAnswer, correctOptionIndex } = req.body;
    const videoRows = await query('SELECT id FROM videos WHERE id = ? LIMIT 1', [req.params.videoId]);

    if (videoRows.length === 0) {
      return res.status(404).json({ message: 'Video not found.' });
    }

    const timestampSeconds = Number(timestamp);
    const cleanedQuestion = questionText?.trim();
    const cleanedOptions = Array.isArray(options) ? options.map((option) => String(option).trim()) : [];
    const hasSelectedIndex = correctOptionIndex !== undefined && correctOptionIndex !== '';
    const selectedIndex = hasSelectedIndex ? Number(correctOptionIndex) : -1;
    const selectedCorrectAnswer = Number.isInteger(selectedIndex) && selectedIndex >= 0 && selectedIndex < cleanedOptions.length
      ? cleanedOptions[selectedIndex]
      : String(correctAnswer || '').trim();

    if (!Number.isFinite(timestampSeconds) || timestampSeconds < 0) {
      return res.status(400).json({ message: 'Timestamp second must be 0 or greater.' });
    }

    if (!cleanedQuestion) {
      return res.status(400).json({ message: 'Question cannot be empty.' });
    }

    if (!Array.isArray(options) || cleanedOptions.length !== 4 || cleanedOptions.some((option) => !option)) {
      return res.status(400).json({ message: 'Option 1, Option 2, Option 3, and Option 4 are required.' });
    }

    if (!selectedCorrectAnswer) {
      return res.status(400).json({ message: 'Please select the correct option.' });
    }

    if (!cleanedOptions.includes(selectedCorrectAnswer)) {
      return res.status(400).json({ message: 'Correct answer must match one of the options.' });
    }

    const question = {
      id: uuid(),
      videoId: req.params.videoId,
      timestamp: timestampSeconds,
      questionText: cleanedQuestion,
      questionType: 'MULTIPLE_CHOICE',
      options: cleanedOptions,
      correctAnswer: selectedCorrectAnswer,
      createdAt: new Date().toISOString()
    };

    await query(
      `INSERT INTO questions
       (id, video_id, timestamp_seconds, question_text, question_type, correct_answer)
       VALUES (?, ?, ?, ?, 'MULTIPLE_CHOICE', ?)`,
      [question.id, question.videoId, question.timestamp, question.questionText, question.correctAnswer]
    );

    for (const [index, option] of cleanedOptions.entries()) {
      await query(
        'INSERT INTO question_options (id, question_id, option_text, is_correct) VALUES (?, ?, ?, ?)',
        [uuid(), question.id, option, selectedIndex >= 0 ? index === selectedIndex : option === selectedCorrectAnswer]
      );
    }

    res.status(201).json({ question });
  } catch (error) {
    next(error);
  }
});

router.delete('/:questionId', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const result = await query('DELETE FROM questions WHERE id = ?', [req.params.questionId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Question not found.' });
    }

    res.json({ message: 'Question deleted.' });
  } catch (error) {
    next(error);
  }
});

export default router;
