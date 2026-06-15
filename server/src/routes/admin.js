import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { mapUser, query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { cleanString, validateUserInput } from '../validation.js';

const router = express.Router();
const passwordHashRounds = 10;

function getPagination(req) {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));
  return { page, limit, offset: (page - 1) * limit };
}

function likeSearch(value) {
  return `%${cleanString(value)}%`;
}

async function pagedQuery({ selectSql, countSql, params, page, limit, offset }) {
  const countRows = await query(countSql, params);
  const total = Number(countRows[0]?.total || 0);
  const safeLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 25));
  const safeOffset = Math.max(0, Number.parseInt(offset, 10) || 0);
  const rows = await query(`${selectSql} LIMIT ${safeLimit} OFFSET ${safeOffset}`, params);

  return {
    records: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit))
    }
  };
}

router.get('/reports', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
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

router.get('/data-monitoring/summary', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const [
      employeeRows,
      adminRows,
      campaignRows,
      videoRows,
      questionRows,
      answerRows,
      completedRows,
      scoreRows
    ] = await Promise.all([
      query("SELECT COUNT(*) AS total FROM users WHERE role = 'EMPLOYEE'"),
      query("SELECT COUNT(*) AS total FROM users WHERE role = 'ADMIN'"),
      query('SELECT COUNT(*) AS total FROM topics'),
      query('SELECT COUNT(*) AS total FROM videos'),
      query('SELECT COUNT(*) AS total FROM questions'),
      query('SELECT COUNT(*) AS total FROM employee_answers'),
      query('SELECT COUNT(*) AS total FROM progress WHERE completed = 1'),
      query('SELECT COALESCE(ROUND(AVG(is_correct) * 100), 0) AS average_score FROM employee_answers')
    ]);

    res.json({
      summary: {
        totalEmployees: Number(employeeRows[0].total),
        totalAdmins: Number(adminRows[0].total),
        totalCampaigns: Number(campaignRows[0].total),
        totalVideos: Number(videoRows[0].total),
        totalQuestions: Number(questionRows[0].total),
        totalEmployeeAnswers: Number(answerRows[0].total),
        totalCompletedTrainingRecords: Number(completedRows[0].total),
        averageSafetyScore: Number(scoreRows[0].average_score)
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/data-monitoring/users', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const params = [];
    const filters = [];
    const search = cleanString(req.query.search);
    const department = cleanString(req.query.department);

    if (search) {
      filters.push('(name LIKE ? OR email LIKE ? OR employee_id LIKE ?)');
      params.push(likeSearch(search), likeSearch(search), likeSearch(search));
    }

    if (department) {
      filters.push('department = ?');
      params.push(department);
    }

    const whereSql = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await pagedQuery({
      selectSql: `SELECT id, name, email, employee_id AS employeeId, department, role, created_at AS createdAt
                  FROM users ${whereSql} ORDER BY created_at DESC`,
      countSql: `SELECT COUNT(*) AS total FROM users ${whereSql}`,
      params,
      page,
      limit,
      offset
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/data-monitoring/campaigns', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const params = [];
    const filters = [];
    const campaignId = cleanString(req.query.campaignId);
    const status = cleanString(req.query.status).toUpperCase();

    if (campaignId) {
      filters.push('id = ?');
      params.push(campaignId);
    }

    if (status && ['DRAFT', 'LAUNCHED', 'ARCHIVED'].includes(status)) {
      filters.push('status = ?');
      params.push(status);
    }

    const whereSql = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await pagedQuery({
      selectSql: `SELECT id, title, category, status, deadline, created_at AS createdAt
                  FROM topics ${whereSql} ORDER BY created_at DESC`,
      countSql: `SELECT COUNT(*) AS total FROM topics ${whereSql}`,
      params,
      page,
      limit,
      offset
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/data-monitoring/videos', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const params = [];
    const filters = [];
    const campaignId = cleanString(req.query.campaignId);

    if (campaignId) {
      filters.push('v.topic_id = ?');
      params.push(campaignId);
    }

    const whereSql = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await pagedQuery({
      selectSql: `SELECT v.id, v.title AS videoTitle, t.title AS campaignTitle, v.video_order AS moduleOrder,
                    CASE
                      WHEN v.video_url IS NULL OR v.video_url = '' THEN 'No URL'
                      WHEN v.video_url LIKE '%cloudinary.com%' THEN 'Cloudinary Video'
                      ELSE 'Local Upload'
                    END AS videoUrlStatus,
                    v.created_at AS createdAt
                  FROM videos v
                  JOIN topics t ON t.id = v.topic_id
                  ${whereSql}
                  ORDER BY t.created_at DESC, v.video_order ASC`,
      countSql: `SELECT COUNT(*) AS total FROM videos v JOIN topics t ON t.id = v.topic_id ${whereSql}`,
      params,
      page,
      limit,
      offset
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/data-monitoring/questions', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const params = [];
    const filters = [];
    const campaignId = cleanString(req.query.campaignId);

    if (campaignId) {
      filters.push('v.topic_id = ?');
      params.push(campaignId);
    }

    const whereSql = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await pagedQuery({
      selectSql: `SELECT q.id, v.title AS videoTitle, q.question_text AS questionText,
                    q.timestamp_seconds AS checkpointTime,
                    COUNT(qo.id) AS optionCount,
                    COALESCE(MAX(CASE WHEN qo.is_correct = 1 THEN qo.option_text END), q.correct_answer) AS correctOptionText
                  FROM questions q
                  JOIN videos v ON v.id = q.video_id
                  LEFT JOIN question_options qo ON qo.question_id = q.id
                  ${whereSql}
                  GROUP BY q.id, v.title, q.question_text, q.timestamp_seconds, q.correct_answer
                  ORDER BY v.title ASC, q.timestamp_seconds ASC`,
      countSql: `SELECT COUNT(*) AS total
                 FROM questions q
                 JOIN videos v ON v.id = q.video_id
                 ${whereSql}`,
      params,
      page,
      limit,
      offset
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/data-monitoring/progress', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const params = [];
    const filters = [];
    const search = cleanString(req.query.search);
    const department = cleanString(req.query.department);
    const campaignId = cleanString(req.query.campaignId);
    const status = cleanString(req.query.status).toUpperCase();

    if (search) {
      filters.push('(u.name LIKE ? OR u.email LIKE ? OR u.employee_id LIKE ?)');
      params.push(likeSearch(search), likeSearch(search), likeSearch(search));
    }

    if (department) {
      filters.push('u.department = ?');
      params.push(department);
    }

    if (campaignId) {
      filters.push('p.topic_id = ?');
      params.push(campaignId);
    }

    if (status === 'COMPLETED') {
      filters.push('p.completed = 1');
    } else if (status === 'INCOMPLETE') {
      filters.push('p.completed = 0');
    }

    const whereSql = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await pagedQuery({
      selectSql: `SELECT p.id, u.name AS employeeName, u.employee_id AS employeeId, u.department,
                    t.title AS campaignTitle, v.title AS videoTitle,
                    p.watched_percentage AS watchedPercentage, p.completed,
                    p.score, p.updated_at AS updatedAt
                  FROM progress p
                  JOIN users u ON u.id = p.user_id
                  JOIN topics t ON t.id = p.topic_id
                  JOIN videos v ON v.id = p.video_id
                  ${whereSql}
                  ORDER BY p.updated_at DESC`,
      countSql: `SELECT COUNT(*) AS total
                 FROM progress p
                 JOIN users u ON u.id = p.user_id
                 JOIN topics t ON t.id = p.topic_id
                 JOIN videos v ON v.id = p.video_id
                 ${whereSql}`,
      params,
      page,
      limit,
      offset
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/data-monitoring/answers', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const params = [];
    const filters = [];
    const search = cleanString(req.query.search);
    const department = cleanString(req.query.department);
    const campaignId = cleanString(req.query.campaignId);
    const answerStatus = cleanString(req.query.answerStatus).toUpperCase();

    if (search) {
      filters.push('(u.name LIKE ? OR u.email LIKE ? OR u.employee_id LIKE ?)');
      params.push(likeSearch(search), likeSearch(search), likeSearch(search));
    }

    if (department) {
      filters.push('u.department = ?');
      params.push(department);
    }

    if (campaignId) {
      filters.push('v.topic_id = ?');
      params.push(campaignId);
    }

    if (answerStatus === 'CORRECT') {
      filters.push('ea.is_correct = 1');
    } else if (answerStatus === 'WRONG') {
      filters.push('ea.is_correct = 0');
    }

    const whereSql = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await pagedQuery({
      selectSql: `SELECT ea.id, u.name AS employeeName, t.title AS campaignTitle,
                    v.title AS videoTitle, q.question_text AS questionText,
                    ea.selected_answer AS selectedAnswer, ea.is_correct AS isCorrect,
                    ea.answered_at AS answeredAt
                  FROM employee_answers ea
                  JOIN users u ON u.id = ea.user_id
                  JOIN questions q ON q.id = ea.question_id
                  JOIN videos v ON v.id = q.video_id
                  JOIN topics t ON t.id = v.topic_id
                  ${whereSql}
                  ORDER BY ea.answered_at DESC`,
      countSql: `SELECT COUNT(*) AS total
                 FROM employee_answers ea
                 JOIN users u ON u.id = ea.user_id
                 JOIN questions q ON q.id = ea.question_id
                 JOIN videos v ON v.id = q.video_id
                 JOIN topics t ON t.id = v.topic_id
                 ${whereSql}`,
      params,
      page,
      limit,
      offset
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/employees', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const validation = validateUserInput(req.body);
    if (validation.message) {
      return res.status(400).json({ message: validation.message });
    }
    const { name, email, employeeId, department, role, password } = validation.value;

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
      role
    };

    const passwordHash = await bcrypt.hash(password, passwordHashRounds);
    await query(
      `INSERT INTO users (id, name, email, password, role, department, employee_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user.id, user.name, user.email, passwordHash, user.role, user.department, user.employeeId]
    );

    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
});

export default router;
