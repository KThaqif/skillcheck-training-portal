import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { mapUser, query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/reports', requireAuth, requireRole('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const employees = await query("SELECT * FROM users WHERE role = 'EMPLOYEE' ORDER BY name ASC");
    const topics = await query("SELECT * FROM topics WHERE status = 'LAUNCHED' ORDER BY created_at DESC");

    const report = await Promise.all(employees.map(async (employee) => {
      const topicReports = await Promise.all(topics.map(async (topic) => {
        const videos = await query('SELECT id FROM videos WHERE topic_id = ?', [topic.id]);
        const videoIds = videos.map((video) => video.id);
        const progressRows = await query(
          'SELECT completed FROM progress WHERE user_id = ? AND topic_id = ?',
          [employee.id, topic.id]
        );

        let questions = [];
        if (videoIds.length > 0) {
          questions = await query(
            `SELECT id FROM questions WHERE video_id IN (${videoIds.map(() => '?').join(',')})`,
            videoIds
          );
        }

        const questionIds = questions.map((question) => question.id);
        let answeredQuestions = 0;
        let correct = 0;
        if (questionIds.length > 0) {
          const answerRows = await query(
            `SELECT COUNT(*) AS answered_questions, COALESCE(SUM(is_correct), 0) AS correct
             FROM employee_answers
             WHERE user_id = ? AND question_id IN (${questionIds.map(() => '?').join(',')})`,
            [employee.id, ...questionIds]
          );
          answeredQuestions = Number(answerRows[0].answered_questions);
          correct = Number(answerRows[0].correct);
        }

        const completedVideos = progressRows.filter((item) => Boolean(item.completed)).length;
        const totalItems = videos.length + questions.length;
        const completedItems = completedVideos + answeredQuestions;

        return {
          topicId: topic.id,
          title: topic.title,
          deadline: topic.deadline,
          completedVideos,
          totalVideos: videos.length,
          progressPercent: totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100),
          score: questions.length === 0 ? 0 : Math.round((correct / questions.length) * 100),
          answeredQuestions,
          totalQuestions: questions.length
        };
      }));

      return {
        employee: mapUser(employee),
        topics: topicReports
      };
    }));

    res.json({ report });
  } catch (error) {
    next(error);
  }
});

router.post('/employees', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { name, email, employeeId, department, password, role } = req.body;

    if (!name || !email || !employeeId || !department || !password) {
      return res.status(400).json({ message: 'Name, email, employee ID, department, and password are required.' });
    }

    const existingRows = await query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER(?) OR employee_id = ? LIMIT 1',
      [email, employeeId]
    );

    if (existingRows.length > 0) {
      return res.status(409).json({ message: 'Employee email or ID already exists.' });
    }

    const user = {
      id: uuid(),
      name,
      email,
      employeeId,
      department,
      role: role || 'EMPLOYEE'
    };

    await query(
      `INSERT INTO users (id, name, email, password, role, department, employee_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user.id, user.name, user.email, bcrypt.hashSync(password, 10), user.role, user.department, user.employeeId]
    );

    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
});

export default router;
