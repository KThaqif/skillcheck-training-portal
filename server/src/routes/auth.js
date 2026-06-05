import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { getUserByEmail, mapUser, query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { getJwtSecret } from '../config.js';

const router = express.Router();

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

router.post('/login', async (req, res) => {
  try {
    const email = req.body?.email?.trim();
    const { password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await getUserByEmail(email);

    if (!user) {
      return res.status(401).json({ message: `No account found for ${email}. Check the email address or seed demo users.` });
    }

    if (!user.password) {
      return res.status(500).json({ message: `Account ${email} is missing a password hash in MySQL.` });
    }

    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: 'Password is incorrect for this account.' });
    }

    const token = createToken(user);

    res.json({ token, user: safeUser(user) });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: `Login failed on the server: ${error.message}` });
  }
});

router.post('/register', async (req, res) => {
  try {
    const name = req.body?.name?.trim();
    const email = req.body?.email?.trim();
    const employeeId = req.body?.employeeId?.trim();
    const department = req.body?.department?.trim();
    const { password } = req.body || {};

    if (!name || !email || !employeeId || !department || !password) {
      return res.status(400).json({ message: 'Name, email, employee ID, department, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
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
      role: 'EMPLOYEE'
    };

    await query(
      `INSERT INTO users (id, name, email, password, role, department, employee_id)
       VALUES (?, ?, ?, ?, 'EMPLOYEE', ?, ?)`,
      [user.id, user.name, user.email, bcrypt.hashSync(password, 10), user.department, user.employee_id]
    );

    const token = createToken(user);
    res.status(201).json({ token, user: safeUser(user) });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: `Registration failed on the server: ${error.message}` });
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
