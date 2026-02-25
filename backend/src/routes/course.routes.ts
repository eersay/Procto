import { Router } from 'express';
import {
  createCourse,
  getCourses,
  getCourseById,
  enrollStudent,
  enrollByCourseCode,
  getCourseRoster,
  unenrollStudent,
  getCourseDetail,
  createAnnouncement,
  getAnnouncements,
  deleteAnnouncement,
  getStudentPerformance,
  dropCourse,
} from '../controllers/course.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

// Faculty only
router.post('/', authorize(['FACULTY', 'ADMIN']), createCourse);
router.get('/:id/roster', authorize(['FACULTY', 'ADMIN']), getCourseRoster);
router.delete('/:id/students/:studentId', authorize(['FACULTY', 'ADMIN']), unenrollStudent);
router.post('/:id/announcements', authorize(['FACULTY', 'ADMIN']), createAnnouncement);
router.delete('/:id/announcements/:announcementId', authorize(['FACULTY', 'ADMIN']), deleteAnnouncement);
router.get('/:id/performance', authorize(['FACULTY', 'ADMIN']), getStudentPerformance);

// Student only
router.post('/enroll', authorize(['STUDENT']), enrollByCourseCode);
router.post('/drop', authorize(['STUDENT']), dropCourse);
router.post('/:id/enroll', authorize(['STUDENT']), enrollStudent);

// Shared
router.get('/', getCourses);
router.get('/:id/detail', getCourseDetail);
router.get('/:id/announcements', getAnnouncements);
router.get('/:id', getCourseById);

export default router;
