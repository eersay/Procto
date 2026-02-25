import { Router } from 'express';
import {
  getMyResults,
  getResultById,
  getPendingGrading,
  getExamSessionsForGrading,
  submitManualGrades,
  togglePublishResult,
  publishAllResults,
  getClassAnalytics,
} from '../controllers/result.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

// Student routes
router.get('/my-results', authorize(['STUDENT']), getMyResults);

// Faculty grading routes
router.get('/faculty/pending', authorize(['FACULTY', 'ADMIN']), getPendingGrading);
router.get('/faculty/exam/:examId/sessions', authorize(['FACULTY', 'ADMIN']), getExamSessionsForGrading);
router.get('/faculty/exam/:examId/analytics', authorize(['FACULTY', 'ADMIN']), getClassAnalytics);
router.post('/faculty/session/:sessionId/grade', authorize(['FACULTY', 'ADMIN']), submitManualGrades);
router.patch('/faculty/session/:sessionId/publish', authorize(['FACULTY', 'ADMIN']), togglePublishResult);
router.patch('/faculty/exam/:examId/publish-all', authorize(['FACULTY', 'ADMIN']), publishAllResults);

// Shared (student sees own, faculty sees any in their course)
router.get('/:sessionId', getResultById);

export default router;
