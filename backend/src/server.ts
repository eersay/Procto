import 'dotenv/config'; // Must be first
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes';
import courseRoutes from './routes/course.routes';
import questionRoutes from './routes/question.routes';
import examRoutes from './routes/exam.routes';
import examSessionRoutes from './routes/examSession.routes';
import proctorRoutes from './routes/proctor.routes';
import resultRoutes from './routes/result.routes';
import notificationRoutes from './routes/notification.routes';
import passport from './utils/passport';

// dotenv.config(); // Loaded at top

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(','),
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/questions', questionRoutes);
app.use('/api/v1/exams', examRoutes);
app.use('/api/v1/exam-sessions', examSessionRoutes);
app.use('/api/v1/proctor', proctorRoutes);
app.use('/api/v1/results', resultRoutes);
app.use('/api/v1/notifications', notificationRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 PROCTO Backend running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
});
