import express from 'express';
import { v4 as uuid } from 'uuid';
import { mapQuestion, pool, query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { LIMITS, cleanString } from '../validation.js';

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
  let connection;

  try {
    const { timestamp, questionText, options, correctAnswer, correctOptionIndex } = req.body;
    const videoRows = await query('SELECT id FROM videos WHERE id = ? LIMIT 1', [req.params.videoId]);

    if (videoRows.length === 0) {
      return res.status(404).json({ message: 'Video not found.' });
    }

    const timestampSeconds = Number(timestamp);
    const cleanedQuestion = cleanString(questionText);
    const cleanedOptions = Array.isArray(options) ? options.map((option) => cleanString(option)) : [];
    const hasSelectedIndex = correctOptionIndex !== undefined && correctOptionIndex !== '';
    const selectedIndex = hasSelectedIndex ? Number(correctOptionIndex) : -1;
    const selectedCorrectAnswer = Number.isInteger(selectedIndex) && selectedIndex >= 0 && selectedIndex < cleanedOptions.length
      ? cleanedOptions[selectedIndex]
      : cleanString(correctAnswer);

    if (!Number.isInteger(timestampSeconds) || timestampSeconds <= 0) {
      return res.status(400).json({ message: 'Pause time must be a whole number greater than 0 seconds.' });
    }

    if (!cleanedQuestion) {
      return res.status(400).json({ message: 'Question text is required.' });
    }

    if (cleanedQuestion.length > LIMITS.questionText) {
      return res.status(400).json({ message: `Question text must not exceed ${LIMITS.questionText} characters.` });
    }

    if (!Array.isArray(options) || cleanedOptions.length !== 4 || cleanedOptions.some((option) => !option)) {
      return res.status(400).json({ message: 'Option 1, Option 2, Option 3, and Option 4 are required.' });
    }

    if (cleanedOptions.some((option) => option.length > LIMITS.optionText)) {
      return res.status(400).json({ message: `Each answer option must not exceed ${LIMITS.optionText} characters.` });
    }

    if (new Set(cleanedOptions.map((option) => option.toLowerCase())).size !== cleanedOptions.length) {
      return res.status(400).json({ message: 'Answer options must be unique.' });
    }

    if (!selectedCorrectAnswer) {
      return res.status(400).json({ message: 'Please select the correct safety answer.' });
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

    connection = await pool.getConnection();
    await connection.beginTransaction();

    await connection.execute(
      `INSERT INTO questions
       (id, video_id, timestamp_seconds, question_text, question_type, correct_answer)
       VALUES (?, ?, ?, ?, 'MULTIPLE_CHOICE', ?)`,
      [question.id, question.videoId, question.timestamp, question.questionText, question.correctAnswer]
    );

    for (const [index, option] of cleanedOptions.entries()) {
      await connection.execute(
        'INSERT INTO question_options (id, question_id, option_text, is_correct) VALUES (?, ?, ?, ?)',
        [uuid(), question.id, option, selectedIndex >= 0 ? index === selectedIndex : option === selectedCorrectAnswer]
      );
    }

    await connection.commit();
    res.status(201).json({ question });
  } catch (error) {
    if (connection) {
      await connection.rollback().catch(() => {});
    }
    if (!error.statusCode) {
      error.statusCode = 500;
      error.message = 'Unable to save checkpoint question. Please try again.';
    }
    next(error);
  } finally {
    connection?.release();
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
