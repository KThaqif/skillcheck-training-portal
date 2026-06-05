import jwt from 'jsonwebtoken';
import { getUserById, mapUser } from '../db.js';
import { getJwtSecret } from '../config.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    const token = header.replace('Bearer ', '');
    const payload = jwt.verify(token, getJwtSecret());
    const user = await getUserById(payload.userId);

    if (!user) {
      return res.status(401).json({ message: 'User not found.' });
    }

    req.user = mapUser(user);
    next();
  } catch (error) {
    if (error.message?.startsWith('Database')) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to access this resource.' });
    }
    next();
  };
}
