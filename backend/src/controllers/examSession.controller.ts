import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

const startSessionSchema = z.object({
  examId: z.string().uuid(),
});

const saveAnswersSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      response: z.any(),
    })
  ),
});

// START EXAM SESSION
export const startExamSession = async (req: AuthRequest, res: Response) => {
  try {
    const data = startSessionSchema.parse(req.body);
    const studentId = req.user!.userId;

    // Get exam
    const exam = await prisma.exam.findUnique({
      where: { id: data.examId },
      include: {
        examRules: true,
      },
    });

    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    if (!exam.isPublished) {
      return res.status(403).json({ error: 'Exam not available' });
    }

    // Check if exam window is valid
    const now = new Date();
    if (now < exam.startAt) {
      return res.status(403).json({ error: 'Exam has not started yet' });
    }
    if (now > exam.endAt) {
      return res.status(403).json({ error: 'Exam window has ended' });
    }

    // Check if student is enrolled
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        courseId_studentId: {
          courseId: exam.courseId,
          studentId,
        },
      },
    });

    if (!enrollment || enrollment.droppedAt) {
      return res.status(403).json({ error: 'Not enrolled in this course' });
    }

    // Check max attempts
    const previousAttempts = await prisma.examSession.count({
      where: {
        examId: data.examId,
        studentId,
        status: { in: ['SUBMITTED', 'TERMINATED'] },
      },
    });

    const maxAttempts = exam.examRules?.maxAttempts || 1;
    if (previousAttempts >= maxAttempts) {
      return res.status(403).json({ error: 'Maximum attempts reached' });
    }

    // Check if there's an active session
    const activeSession = await prisma.examSession.findFirst({
      where: {
        examId: data.examId,
        studentId,
        status: 'ACTIVE',
      },
    });

    if (activeSession) {
      return res.json({
        message: 'Resuming existing session',
        session: activeSession,
      });
    }

    // Create new session
    const session = await prisma.examSession.create({
      data: {
        examId: data.examId,
        studentId,
        status: 'ACTIVE',
        ipAddress: req.ip,
      },
    });

    res.status(201).json({
      message: 'Exam session started',
      session,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Start session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// SAVE ANSWERS (auto-save)
export const saveAnswers = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = saveAnswersSchema.parse(req.body);
    const studentId = req.user!.userId;

    const session = await prisma.examSession.findUnique({
      where: { id },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.studentId !== studentId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (session.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Session is not active' });
    }

    // Upsert answers
    for (const answer of data.answers) {
      await prisma.answer.upsert({
        where: {
          sessionId_questionId: {
            sessionId: id,
            questionId: answer.questionId,
          },
        },
        update: {
          response: answer.response,
        },
        create: {
          sessionId: id,
          questionId: answer.questionId,
          response: answer.response,
        },
      });
    }

    res.json({ message: 'Answers saved' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed' });
    }
    console.error('Save answers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// SUBMIT EXAM
export const submitExam = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const studentId = req.user!.userId;

    const session = await prisma.examSession.findUnique({
      where: { id },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.studentId !== studentId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (session.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Session already submitted' });
    }

    await prisma.examSession.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });

    // TODO: Auto-grade objective questions here
    // Will implement in the next phase

    res.json({ message: 'Exam submitted successfully' });
  } catch (error) {
    console.error('Submit exam error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET SESSION
export const getSession = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const session = await prisma.examSession.findUnique({
      where: { id },
      include: {
        exam: true,
        answers: true,
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Verify access
    if (req.user!.role === 'STUDENT' && session.studentId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json({ session });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
