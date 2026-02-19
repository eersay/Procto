import { Router } from 'express';
import {
  createCourse,
  getCourses,
  getCourseById,
  enrollStudent,
  enrollByCourseCode,
  getCourseRoster,
  unenrollStudent,
} from '../controllers/course.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Faculty only
router.post('/', authorize(['FACULTY', 'ADMIN']), createCourse);
router.get('/:id/roster', authorize(['FACULTY', 'ADMIN']), getCourseRoster);
router.delete('/:id/students/:studentId', authorize(['FACULTY', 'ADMIN']), unenrollStudent);

// Student enrollment by course code (Google Classroom style)
router.post('/enroll', authorize(['STUDENT']), enrollByCourseCode);

// Shared routes
router.get('/', getCourses);
router.get('/:id', getCourseById);

// Legacy enrollment by ID (keep for compatibility)
router.post('/:id/enroll', authorize(['STUDENT']), enrollStudent);

export default router;
