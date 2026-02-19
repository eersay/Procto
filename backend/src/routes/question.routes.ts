import { Router } from 'express';
import {
  createQuestion,
  getQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  importQuestions,
} from '../controllers/question.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Faculty only routes
router.post('/', authorize(['FACULTY', 'ADMIN']), createQuestion);
router.put('/:id', authorize(['FACULTY', 'ADMIN']), updateQuestion);
router.delete('/:id', authorize(['FACULTY', 'ADMIN']), deleteQuestion);
router.post('/import', authorize(['FACULTY', 'ADMIN']), importQuestions);

// Shared routes (faculty can see all, students only see in exam context)
router.get('/', getQuestions);
router.get('/:id', getQuestionById);

export default router;
