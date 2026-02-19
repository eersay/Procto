import { Router } from 'express';
import {
  createExam,
  getExams,
  getExamById,
  updateExam,
  deleteExam,
  publishExam,
  addQuestionsToExam,
  removeQuestionFromExam,
} from '../controllers/exam.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Faculty only routes
router.post('/', authorize(['FACULTY', 'ADMIN']), createExam);
router.put('/:id', authorize(['FACULTY', 'ADMIN']), updateExam);
router.delete('/:id', authorize(['FACULTY', 'ADMIN']), deleteExam);
router.post('/:id/publish', authorize(['FACULTY', 'ADMIN']), publishExam);
router.post('/:id/questions', authorize(['FACULTY', 'ADMIN']), addQuestionsToExam);
router.delete('/:id/questions/:questionId', authorize(['FACULTY', 'ADMIN']), removeQuestionFromExam);

// Shared routes
router.get('/', getExams);
router.get('/:id', getExamById);

export default router;
