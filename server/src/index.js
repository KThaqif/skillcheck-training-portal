import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { seedDb } from './db.js';
import authRoutes from './routes/auth.js';
import topicRoutes from './routes/topics.js';
import videoRoutes from './routes/videos.js';
import questionRoutes from './routes/questions.js';
import progressRoutes from './routes/progress.js';
import adminRoutes from './routes/admin.js';

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 5000;
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173'
].filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin || allowedOrigins.includes(origin)) {
    return true;
  }

  try {
    const url = new URL(origin);
    const isVitePort = url.port === '5173';
    const isLocalNetwork = url.hostname === 'localhost'
      || url.hostname === '127.0.0.1'
      || url.hostname.startsWith('192.168.')
      || url.hostname.startsWith('10.')
      || url.hostname.startsWith('172.');

    return isVitePort && isLocalNetwork;
  } catch {
    return false;
  }
}

app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked request from origin: ${origin}`));
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/sample-training.mp4', express.static(path.join(__dirname, '../uploads/sample-training.mp4')));

app.get('/', (req, res) => {
  res.json({ message: 'SkillCheck Training Portal API is running.' });
});

app.use('/api/auth', authRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/admin', adminRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: err.message || 'Server error.' });
});

try {
  await seedDb();
  app.listen(PORT, () => {
    console.log(`SkillCheck API running on http://localhost:${PORT}`);
  });
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
