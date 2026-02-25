import { Router } from 'express';
import {
  startExamSession,
  saveAnswers,
  submitExam,
  getSession,
  webcamCapture,
  logSuspiciousEvent,
  terminateSession,
} from '../controllers/examSession.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Student routes
router.post('/', authorize(['STUDENT']), startExamSession);
router.get('/:id', getSession);
router.post('/:id/answers', authorize(['STUDENT']), saveAnswers);
router.post('/:id/webcam-capture', authorize(['STUDENT']), webcamCapture);
router.post('/:id/suspicious-event', authorize(['STUDENT']), logSuspiciousEvent);
router.post('/:id/terminate', authorize(['STUDENT']), terminateSession);
router.post('/:id/submit', authorize(['STUDENT']), submitExam);

export default router;
