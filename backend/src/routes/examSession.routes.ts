import { Router } from 'express';
import {
  startExamSession,
  saveAnswers,
  submitExam,
  getSession,
} from '../controllers/examSession.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Student routes
router.post('/', authorize(['STUDENT']), startExamSession);
router.get('/:id', getSession);
router.post('/:id/answers', authorize(['STUDENT']), saveAnswers);
router.post('/:id/submit', authorize(['STUDENT']), submitExam);

export default router;
