import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { v4 as uuid } from 'uuid';
import { getUserByEmail, mapUser, query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { getJwtSecret } from '../config.js';

const router = express.Router();
const passwordHashRounds = 10;
const allowedPublicRoles = new Set(['EMPLOYEE']);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again in 15 minutes.' }
});

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isBcryptHash(value) {
  return /^\$2[aby]\$\d{2}\$/.test(value || '');
}

async function verifyPasswordAndUpgradeIfNeeded(user, password) {
  if (!user.password) {
    return false;
  }

  if (isBcryptHash(user.password)) {
    return bcrypt.compare(password, user.password);
  }

  const passwordMatches = password === user.password;
  if (passwordMatches) {
    const passwordHash = await bcrypt.hash(password, passwordHashRounds);
    await query('UPDATE users SET password = ? WHERE id = ?', [passwordHash, user.id]);
  }

  return passwordMatches;
}

function safeUser(user) {
  return mapUser(user);
}

function createToken(user) {
  return jwt.sign(
    { userId: user.id, role: user.role },
    getJwtSecret(),
    { expiresIn: '8h' }
  );
}

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const email = req.body?.email?.trim().toLowerCase();
    const { password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    const user = await getUserByEmail(email);

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (!user.password) {
      console.error(`Login error: account ${user.id} is missing a password.`);
      return res.status(500).json({ message: 'Unable to login right now. Please contact support.' });
    }

    const passwordMatches = await verifyPasswordAndUpgradeIfNeeded(user, password);
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = createToken(user);

    res.json({ token, user: safeUser(user) });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed. Please try again later.' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const name = req.body?.name?.trim();
    const email = req.body?.email?.trim().toLowerCase();
    const employeeId = req.body?.employeeId?.trim();
    const department = req.body?.department?.trim();
    const role = String(req.body?.role || 'EMPLOYEE').trim().toUpperCase();
    const { password } = req.body || {};

    if (!name || !email || !employeeId || !department || !password) {
      return res.status(400).json({ message: 'Name, email, employee ID, department, and password are required.' });
    }

    if (name.length < 2) {
      return res.status(400).json({ message: 'Name must be at least 2 characters.' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    if (!allowedPublicRoles.has(role)) {
      return res.status(400).json({ message: 'Public registration is only available for employee accounts.' });
    }

    const existingEmail = await getUserByEmail(email);
    if (existingEmail) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const existingEmployee = await query('SELECT id FROM users WHERE employee_id = ? LIMIT 1', [employeeId]);
    if (existingEmployee.length > 0) {
      return res.status(409).json({ message: 'An account with this employee ID already exists.' });
    }

    const user = {
      id: uuid(),
      name,
      email,
      employee_id: employeeId,
      department,
      role
    };

    const passwordHash = await bcrypt.hash(password, passwordHashRounds);
    await query(
      `INSERT INTO users (id, name, email, password, role, department, employee_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user.id, user.name, user.email, passwordHash, user.role, user.department, user.employee_id]
    );

    const token = createToken(user);
    res.status(201).json({ token, user: safeUser(user) });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Registration failed. Please try again later.' });
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
