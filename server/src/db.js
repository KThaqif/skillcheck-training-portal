import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'skillcheck_db',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true
});

const demoUsers = [
  {
    name: 'Admin Trainer',
    email: 'admin@company.com',
    employeeId: 'ADM001',
    department: 'Training Department',
    role: 'ADMIN',
    password: 'admin123'
  },
  {
    name: 'Employee Demo',
    email: 'employee@company.com',
    employeeId: 'EMP001',
    department: 'IT Department',
    role: 'EMPLOYEE',
    password: 'employee123'
  }
];

export async function query(sql, params = []) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    let message = `Database query failed: ${error.message}`;
    if (error.code === 'ECONNREFUSED') {
      message = 'Database connection failed. Start MySQL in XAMPP and confirm server/.env settings.';
    }
    if (error.code === 'ER_BAD_DB_ERROR') {
      message = 'Database skillcheck_db does not exist. Create it in phpMyAdmin, then import server/database/schema.sql.';
    }
    if (error.code === 'ER_NO_SUCH_TABLE') {
      message = 'Database tables are missing. Import server/database/schema.sql into the skillcheck_db database using phpMyAdmin.';
    }
    error.message = message;
    throw error;
  }
}

export function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    employeeId: row.employee_id,
    department: row.department,
    role: row.role
  };
}

export function mapTopic(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    description: row.description || '',
    thumbnailUrl: row.thumbnail || '',
    startDate: row.start_date,
    deadline: row.deadline,
    status: row.status,
    launchedAt: row.launched_at,
    createdAt: row.created_at,
    createdBy: row.created_by
  };
}

export function mapVideo(row) {
  if (!row) return null;
  return {
    id: row.id,
    topicId: row.topic_id,
    title: row.title,
    description: row.description || '',
    order: row.video_order,
    videoUrl: row.video_url,
    originalName: row.original_name || '',
    duration: row.duration,
    createdAt: row.created_at
  };
}

export function mapQuestion(row, options = []) {
  if (!row) return null;
  return {
    id: row.id,
    videoId: row.video_id,
    timestamp: row.timestamp_seconds,
    questionText: row.question_text,
    questionType: row.question_type,
    options,
    correctAnswer: row.correct_answer,
    createdAt: row.created_at
  };
}

export function mapProgress(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    topicId: row.topic_id,
    videoId: row.video_id,
    watchedSeconds: row.last_watched_second,
    watchedPercentage: row.watched_percentage,
    completed: Boolean(row.completed),
    score: row.score,
    updatedAt: row.updated_at
  };
}

export async function getUserById(id) {
  const rows = await query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

export async function getUserByEmail(email) {
  const rows = await query('SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1', [email]);
  return rows[0] || null;
}

export async function seedDb() {
  await query('SELECT 1');

  for (const demoUser of demoUsers) {
    const existing = await getUserByEmail(demoUser.email);
    const passwordHash = bcrypt.hashSync(demoUser.password, 10);

    if (!existing) {
      await query(
        `INSERT INTO users (id, name, email, password, role, department, employee_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuid(), demoUser.name, demoUser.email, passwordHash, demoUser.role, demoUser.department, demoUser.employeeId]
      );
      continue;
    }

    const passwordMatches = existing.password && bcrypt.compareSync(demoUser.password, existing.password);
    await query(
      `UPDATE users
       SET name = ?, password = ?, role = ?, department = ?, employee_id = ?
       WHERE id = ?`,
      [
        demoUser.name,
        passwordMatches ? existing.password : passwordHash,
        demoUser.role,
        demoUser.department,
        demoUser.employeeId,
        existing.id
      ]
    );
  }

  const topicRows = await query('SELECT COUNT(*) AS count FROM topics');
  if (Number(topicRows[0].count) > 0) {
    return;
  }

  const admin = await getUserByEmail('admin@company.com');
  const topicId = uuid();
  const videoId = uuid();
  const questionId = uuid();

  await query(
    `INSERT INTO topics
     (id, title, description, category, thumbnail, start_date, deadline, status, launched_at, created_by)
     VALUES (?, ?, ?, ?, ?, CURDATE(), ?, 'LAUNCHED', NOW(), ?)`,
    [
      topicId,
      'Cybersecurity Awareness Training',
      'Learn how to identify phishing emails, protect passwords, and report suspicious activity.',
      'IT Security',
      'https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?auto=format&fit=crop&w=1000&q=80',
      '2026-06-30',
      admin?.id || null
    ]
  );

  await query(
    `INSERT INTO videos
     (id, topic_id, title, description, video_url, original_name, video_order)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
    [
      videoId,
      topicId,
      'Introduction to Cybersecurity',
      'Sample video. Replace this with your uploaded training video.',
      'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      'sample-training.mp4'
    ]
  );

  await query(
    `INSERT INTO questions
     (id, video_id, timestamp_seconds, question_text, question_type, correct_answer)
     VALUES (?, ?, 5, ?, 'MULTIPLE_CHOICE', ?)`,
    [
      questionId,
      videoId,
      'What should you do when you receive a suspicious email?',
      'Report it to IT or security team'
    ]
  );

  const options = ['Click the link quickly', 'Ignore company policy', 'Report it to IT or security team', 'Forward it to everyone'];
  for (const option of options) {
    await query(
      'INSERT INTO question_options (id, question_id, option_text, is_correct) VALUES (?, ?, ?, ?)',
      [uuid(), questionId, option, option === 'Report it to IT or security team']
    );
  }
}
