import { Response } from 'express';
import { PrismaClient, ExamStatus } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

// Validation schemas
const createExamSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(1),
  instructions: z.string().optional(),
  durationMinutes: z.number().int().positive(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  proctoringLevel: z.string().default('STANDARD'),
  rules: z.object({
    shuffleQuestions: z.boolean().default(true),
    shuffleChoices: z.boolean().default(true),
    maxAttempts: z.number().int().positive().default(1),
    negativeMarkingFactor: z.number().min(0).default(0),
    passThreshold: z.number().min(0).max(100).default(60),
    allowCalculator: z.boolean().default(false),
    allowFormulaSheet: z.boolean().default(false),
  }).optional(),
});

const updateExamSchema = createExamSchema.partial();

const addQuestionsSchema = z.object({
  questionIds: z.array(z.string().uuid()).min(1),
});

// CREATE EXAM
export const createExam = async (req: AuthRequest, res: Response) => {
  try {
    const data = createExamSchema.parse(req.body);

    // Verify faculty owns this course
    if (req.user!.role === 'FACULTY') {
      const course = await prisma.course.findUnique({
        where: { id: data.courseId, facultyId: req.user!.userId },
      });

      if (!course) {
        return res.status(403).json({ error: 'Not authorized for this course' });
      }
    }

    // Validate date range
    const startAt = new Date(data.startAt);
    const endAt = new Date(data.endAt);

    if (endAt <= startAt) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    const exam = await prisma.exam.create({
      data: {
        courseId: data.courseId,
        title: data.title,
        instructions: data.instructions,
        durationMinutes: data.durationMinutes,
        startAt,
        endAt,
        proctoringLevel: data.proctoringLevel,
        status: 'DRAFT',
        isPublished: false,
      },
    });

    // Create exam rules if provided
    if (data.rules) {
      await prisma.examRules.create({
        data: {
          examId: exam.id,
          ...data.rules,
        },
      });
    }

    res.status(201).json({
      message: 'Exam created successfully',
      exam,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Create exam error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET EXAMS (by course)
export const getExams = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.query;

    if (!courseId) {
      return res.status(400).json({ error: 'courseId query parameter is required' });
    }

    // Verify access to course
    const course = await prisma.course.findUnique({
      where: { id: courseId as string },
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (req.user!.role === 'FACULTY' && course.facultyId !== req.user!.userId) {
      return res.status(403).json({ error: 'Not authorized for this course' });
    }

    if (req.user!.role === 'STUDENT') {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          courseId_studentId: {
            courseId: courseId as string,
            studentId: req.user!.userId,
          },
        },
      });

      if (!enrollment || enrollment.droppedAt) {
        return res.status(403).json({ error: 'Not enrolled in this course' });
      }
    }

    const where: any = {
      courseId: courseId as string,
      deletedAt: null,
    };

    // Students only see published exams
    if (req.user!.role === 'STUDENT') {
      where.isPublished = true;
    }

    const exams = await prisma.exam.findMany({
      where,
      include: {
        examRules: true,
        _count: {
          select: { examQuestions: true, examSessions: true },
        },
      },
      orderBy: { startAt: 'desc' },
    });

    res.json({ exams });
  } catch (error) {
    console.error('Get exams error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET EXAM BY ID
export const getExamById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const exam = await prisma.exam.findUnique({
      where: { id, deletedAt: null },
      include: {
        course: {
          select: {
            id: true,
            name: true,
            code: true,
            facultyId: true,
          },
        },
        examRules: true,
        examQuestions: {
          include: {
            question: true,
          },
          orderBy: { orderIndex: 'asc' },
        },
        _count: {
          select: { examSessions: true },
        },
      },
    });

    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    // Verify access
    if (req.user!.role === 'FACULTY' && exam.course.facultyId !== req.user!.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (req.user!.role === 'STUDENT' && !exam.isPublished) {
      return res.status(403).json({ error: 'Exam not available' });
    }

    if (req.user!.role === 'STUDENT') {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          courseId_studentId: {
            courseId: exam.courseId,
            studentId: req.user!.userId,
          },
        },
      });

      if (!enrollment || enrollment.droppedAt) {
        return res.status(403).json({ error: 'Not enrolled in this course' });
      }
    }

    res.json({ exam });
  } catch (error) {
    console.error('Get exam error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// UPDATE EXAM
export const updateExam = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateExamSchema.parse(req.body);

    const existing = await prisma.exam.findUnique({
      where: { id, deletedAt: null },
      include: { course: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    if (req.user!.role === 'FACULTY' && existing.course.facultyId !== req.user!.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Don't allow editing published exams that have started
    if (existing.isPublished && new Date() >= existing.startAt) {
      return res.status(400).json({ error: 'Cannot edit exam that has already started' });
    }

    const updateData: any = {};

    if (data.title) updateData.title = data.title;
    if (data.instructions !== undefined) updateData.instructions = data.instructions;
    if (data.durationMinutes) updateData.durationMinutes = data.durationMinutes;
    if (data.startAt) updateData.startAt = new Date(data.startAt);
    if (data.endAt) updateData.endAt = new Date(data.endAt);
    if (data.proctoringLevel) updateData.proctoringLevel = data.proctoringLevel;

    const exam = await prisma.exam.update({
      where: { id },
      data: updateData,
    });

    // Update rules if provided
    if (data.rules) {
      await prisma.examRules.upsert({
        where: { examId: id },
        update: data.rules,
        create: {
          examId: id,
          ...data.rules,
        },
      });
    }

    res.json({
      message: 'Exam updated successfully',
      exam,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Update exam error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE EXAM (soft delete)
export const deleteExam = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.exam.findUnique({
      where: { id, deletedAt: null },
      include: { course: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    if (req.user!.role === 'FACULTY' && existing.course.facultyId !== req.user!.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Don't allow deleting if students have taken it
    const sessionCount = await prisma.examSession.count({
      where: { examId: id },
    });

    if (sessionCount > 0) {
      return res.status(400).json({ error: 'Cannot delete exam with existing submissions' });
    }

    await prisma.exam.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    res.json({ message: 'Exam deleted successfully' });
  } catch (error) {
    console.error('Delete exam error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUBLISH EXAM
export const publishExam = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const exam = await prisma.exam.findUnique({
      where: { id, deletedAt: null },
      include: {
        course: true,
        _count: { select: { examQuestions: true } },
      },
    });

    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    if (req.user!.role === 'FACULTY' && exam.course.facultyId !== req.user!.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (exam._count.examQuestions === 0) {
      return res.status(400).json({ error: 'Cannot publish exam without questions' });
    }

    await prisma.exam.update({
      where: { id },
      data: {
        isPublished: true,
        status: 'SCHEDULED',
      },
    });

    res.json({ message: 'Exam published successfully' });
  } catch (error) {
    console.error('Publish exam error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ADD QUESTIONS TO EXAM
export const addQuestionsToExam = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = addQuestionsSchema.parse(req.body);

    const exam = await prisma.exam.findUnique({
      where: { id, deletedAt: null },
      include: { course: true },
    });

    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    if (req.user!.role === 'FACULTY' && exam.course.facultyId !== req.user!.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get current max order index
    const maxOrder = await prisma.examQuestion.findFirst({
      where: { examId: id },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });

    let orderIndex = maxOrder ? maxOrder.orderIndex + 1 : 0;

    // Add questions
    const examQuestions = data.questionIds.map((questionId) => ({
      examId: id,
      questionId,
      orderIndex: orderIndex++,
    }));

    await prisma.examQuestion.createMany({
      data: examQuestions,
      skipDuplicates: true,
    });

    res.status(201).json({
      message: `${data.questionIds.length} question(s) added to exam`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Add questions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// REMOVE QUESTION FROM EXAM
export const removeQuestionFromExam = async (req: AuthRequest, res: Response) => {
  try {
    const { id, questionId } = req.params;

    const exam = await prisma.exam.findUnique({
      where: { id, deletedAt: null },
      include: { course: true },
    });

    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    if (req.user!.role === 'FACULTY' && exam.course.facultyId !== req.user!.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await prisma.examQuestion.deleteMany({
      where: {
        examId: id,
        questionId,
      },
    });

    res.json({ message: 'Question removed from exam' });
  } catch (error) {
    console.error('Remove question error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
