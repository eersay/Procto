import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import { generateCourseCode } from '../utils/courseCode';

const prisma = new PrismaClient();

// Validation schemas
const createCourseSchema = z.object({
  name: z.string().min(1, 'Course name is required'),
  description: z.string().optional(),
});

const enrollByCodeSchema = z.object({
  courseCode: z.string().min(3).max(20),
});

// CREATE COURSE (Faculty only) - Auto-generates course code
export const createCourse = async (req: AuthRequest, res: Response) => {
  try {
    const data = createCourseSchema.parse(req.body);

    // Generate unique course code
    let courseCode: string;
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      courseCode = generateCourseCode();
      const existing = await prisma.course.findUnique({
        where: { code: courseCode },
      });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return res.status(500).json({ error: 'Failed to generate unique course code' });
    }

    const course = await prisma.course.create({
      data: {
        name: data.name,
        description: data.description,
        code: courseCode!,
        facultyId: req.user!.userId,
      },
      include: {
        faculty: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json({
      message: 'Course created successfully',
      course,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET MY COURSES (role-based)
export const getCourses = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;

    let courses;

    if (role === 'FACULTY' || role === 'ADMIN') {
      courses = await prisma.course.findMany({
        where: role === 'FACULTY' ? { facultyId: userId, deletedAt: null } : { deletedAt: null },
        include: {
          faculty: {
            select: { firstName: true, lastName: true, email: true },
          },
          _count: {
            select: { enrollments: true, exams: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      const enrollments = await prisma.enrollment.findMany({
        where: { 
          studentId: userId,
          droppedAt: null,
        },
        include: {
          course: {
            include: {
              faculty: {
                select: { firstName: true, lastName: true },
              },
              _count: { select: { enrollments: true } },
            },
          },
        },
        orderBy: { enrolledAt: 'desc' },
      });

      courses = enrollments.map(e => e.course);
    }

    res.json({ courses });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET COURSE BY ID
export const getCourseById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const course = await prisma.course.findUnique({
      where: { id, deletedAt: null },
      include: {
        faculty: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        _count: {
          select: { enrollments: true, exams: true, questions: true },
        },
      },
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Verify access
    if (req.user!.role === 'STUDENT') {
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          courseId: id,
          studentId: req.user!.userId,
          droppedAt: null,
        },
      });

      if (!enrollment) {
        return res.status(403).json({ error: 'Not enrolled in this course' });
      }
    } else if (req.user!.role === 'FACULTY' && course.facultyId !== req.user!.userId) {
      return res.status(403).json({ error: 'Not authorized for this course' });
    }

    res.json({ course });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ENROLL BY COURSE CODE (Student only)
export const enrollByCourseCode = async (req: AuthRequest, res: Response) => {
  try {
    const data = enrollByCodeSchema.parse(req.body);
    const studentId = req.user!.userId;

    // Normalize course code (remove spaces, lowercase)
    const normalizedCode = data.courseCode.trim().toLowerCase();

    const course = await prisma.course.findUnique({
      where: { code: normalizedCode },
      include: {
        faculty: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!course) {
      return res.status(404).json({ error: 'Invalid course code. Please check and try again.' });
    }

    if (!course.isActive) {
      return res.status(400).json({ error: 'This course is not accepting enrollments' });
    }

    const existing = await prisma.enrollment.findUnique({
      where: {
        courseId_studentId: {
          courseId: course.id,
          studentId,
        },
      },
    });

    if (existing && !existing.droppedAt) {
      return res.status(400).json({ error: 'You are already enrolled in this course' });
    }

    await prisma.enrollment.upsert({
      where: {
        courseId_studentId: {
          courseId: course.id,
          studentId,
        },
      },
      update: {
        droppedAt: null,
        enrolledAt: new Date(),
      },
      create: {
        courseId: course.id,
        studentId,
      },
    });

    res.status(201).json({
      message: 'Successfully enrolled in course',
      course: {
        id: course.id,
        name: course.name,
        code: course.code,
        description: course.description,
        faculty: course.faculty,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid course code format' });
    }
    console.error('Enroll error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ENROLL STUDENT BY ID (legacy - for direct enrollment)
export const enrollStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const studentId = req.user!.userId;

    const course = await prisma.course.findUnique({ 
      where: { id },
      include: {
        faculty: { select: { firstName: true, lastName: true } },
      },
    });
    
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (!course.isActive) {
      return res.status(400).json({ error: 'Course is not active' });
    }

    const existing = await prisma.enrollment.findUnique({
      where: {
        courseId_studentId: {
          courseId: id,
          studentId,
        },
      },
    });

    if (existing && !existing.droppedAt) {
      return res.status(400).json({ error: 'Already enrolled in this course' });
    }

    await prisma.enrollment.upsert({
      where: {
        courseId_studentId: {
          courseId: id,
          studentId,
        },
      },
      update: {
        droppedAt: null,
      },
      create: {
        courseId: id,
        studentId,
      },
    });

    res.status(201).json({
      message: 'Enrolled successfully',
      course,
    });
  } catch (error) {
    console.error('Enroll error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET COURSE ROSTER (Faculty only)
export const getCourseRoster = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (req.user!.role === 'FACULTY') {
      const course = await prisma.course.findUnique({
        where: { id, facultyId: req.user!.userId },
      });

      if (!course) {
        return res.status(403).json({ error: 'Not authorized for this course' });
      }
    }

    const enrollments = await prisma.enrollment.findMany({
      where: {
        courseId: id,
        droppedAt: null,
      },
      include: {
        student: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            createdAt: true,
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    res.json({
      roster: enrollments.map(e => ({
        enrollmentId: e.id,
        enrolledAt: e.enrolledAt,
        student: e.student,
      })),
    });
  } catch (error) {
    console.error('Get roster error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// UNENROLL STUDENT (Faculty only)
export const unenrollStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { id, studentId } = req.params;

    if (req.user!.role === 'FACULTY') {
      const course = await prisma.course.findUnique({
        where: { id, facultyId: req.user!.userId },
      });

      if (!course) {
        return res.status(403).json({ error: 'Not authorized' });
      }
    }

    const enrollment = await prisma.enrollment.updateMany({
      where: {
        courseId: id,
        studentId,
        droppedAt: null,
      },
      data: {
        droppedAt: new Date(),
      },
    });

    if (enrollment.count === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    res.json({ message: 'Student removed successfully' });
  } catch (error) {
    console.error('Unenroll error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
