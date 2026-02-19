import { Response } from 'express';
import { PrismaClient, QuestionType } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

// Validation schemas
const createQuestionSchema = z.object({
  courseId: z.string().uuid(),
  type: z.enum([
    'MULTIPLE_CHOICE',
    'MULTIPLE_SELECT',
    'TRUE_FALSE',
    'SHORT_ANSWER',
    'ESSAY',
    'FILL_BLANK',
    'NUMERICAL',
    'CODE',
  ]),
  content: z.object({
    question: z.string().min(1),
    options: z.array(z.string()).optional(),
    correctAnswer: z.union([z.string(), z.array(z.string())]).optional(),
    explanation: z.string().optional(),
    caseInsensitive: z.boolean().optional(),
    acceptedAnswers: z.array(z.string()).optional(),
  }),
  points: z.number().positive(),
  difficulty: z.string().optional(),
  topicTags: z.array(z.string()).optional(),
});

const updateQuestionSchema = createQuestionSchema.partial();

// CREATE QUESTION
export const createQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const data = createQuestionSchema.parse(req.body);

    // Verify faculty owns this course
    if (req.user!.role === 'FACULTY') {
      const course = await prisma.course.findUnique({
        where: { id: data.courseId, facultyId: req.user!.userId },
      });

      if (!course) {
        return res.status(403).json({ error: 'Not authorized for this course' });
      }
    }

    // Validate question type-specific requirements
    if (data.type === 'MULTIPLE_CHOICE' || data.type === 'MULTIPLE_SELECT') {
      if (!data.content.options || data.content.options.length < 2) {
        return res.status(400).json({ error: 'Multiple choice questions need at least 2 options' });
      }
      if (!data.content.correctAnswer) {
        return res.status(400).json({ error: 'Correct answer is required' });
      }
    }

    if (data.type === 'TRUE_FALSE') {
      if (!data.content.correctAnswer || !['true', 'false'].includes(data.content.correctAnswer as string)) {
        return res.status(400).json({ error: 'True/False questions need correctAnswer as "true" or "false"' });
      }
    }

    const question = await prisma.question.create({
      data: {
        courseId: data.courseId,
        type: data.type,
        content: data.content as any,
        points: data.points,
        difficulty: data.difficulty,
        topicTags: data.topicTags || [],
      },
    });

    res.status(201).json({
      message: 'Question created successfully',
      question,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Create question error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET QUESTIONS (by course)
export const getQuestions = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId, type, difficulty, tags } = req.query;

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

    // Build filter
    const where: any = {
      courseId: courseId as string,
      deletedAt: null,
    };

    if (type) {
      where.type = type as QuestionType;
    }

    if (difficulty) {
      where.difficulty = difficulty as string;
    }

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      where.topicTags = {
        hasSome: tagArray as string[],
      };
    }

    const questions = await prisma.question.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ questions });
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET QUESTION BY ID
export const getQuestionById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const question = await prisma.question.findUnique({
      where: { id, deletedAt: null },
      include: {
        course: {
          select: {
            id: true,
            name: true,
            facultyId: true,
          },
        },
      },
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Verify access
    if (req.user!.role === 'FACULTY' && question.course.facultyId !== req.user!.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json({ question });
  } catch (error) {
    console.error('Get question error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// UPDATE QUESTION
export const updateQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateQuestionSchema.parse(req.body);

    const existing = await prisma.question.findUnique({
      where: { id, deletedAt: null },
      include: { course: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Question not found' });
    }

    if (req.user!.role === 'FACULTY' && existing.course.facultyId !== req.user!.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const question = await prisma.question.update({
      where: { id },
      data: {
        ...(data.type && { type: data.type }),
        ...(data.content && { content: data.content as any }),
        ...(data.points !== undefined && { points: data.points }),
        ...(data.difficulty && { difficulty: data.difficulty }),
        ...(data.topicTags && { topicTags: data.topicTags }),
      },
    });

    res.json({
      message: 'Question updated successfully',
      question,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Update question error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE QUESTION (soft delete)
export const deleteQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.question.findUnique({
      where: { id, deletedAt: null },
      include: { course: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Question not found' });
    }

    if (req.user!.role === 'FACULTY' && existing.course.facultyId !== req.user!.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await prisma.question.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// IMPORT QUESTIONS (bulk create - CSV or JSON)
export const importQuestions = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId, questions } = req.body;

    if (!courseId || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'courseId and questions array required' });
    }

    // Verify faculty owns course
    if (req.user!.role === 'FACULTY') {
      const course = await prisma.course.findUnique({
        where: { id: courseId, facultyId: req.user!.userId },
      });

      if (!course) {
        return res.status(403).json({ error: 'Not authorized for this course' });
      }
    }

    // Validate all questions
    const validatedQuestions = questions.map((q: any) => createQuestionSchema.parse(q));

    // Bulk create
    const created = await prisma.question.createMany({
      data: validatedQuestions.map((q: any) => ({
        courseId,
        type: q.type,
        content: q.content,
        points: q.points,
        difficulty: q.difficulty,
        topicTags: q.topicTags || [],
      })),
    });

    res.status(201).json({
      message: `${created.count} questions imported successfully`,
      count: created.count,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Import questions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
