import { Router } from 'express';
import {
  getActiveExamSessions,
  getSessionDetails,
  invalidateSession,
  getAllExamSessions,
} from '../controllers/proctor.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// All routes require faculty/admin authentication
router.use(authenticate);
router.use(authorize(['FACULTY', 'ADMIN']));

// Get all active sessions across all exams
router.get('/active-sessions', getActiveExamSessions);

// Get all sessions for a specific exam
router.get('/exam/:examId/sessions', getAllExamSessions);

// Get detailed view of a single session
router.get('/session/:sessionId', getSessionDetails);

// Invalidate a session (mark as cheating)
router.post('/session/:sessionId/invalidate', invalidateSession);

export default router;
