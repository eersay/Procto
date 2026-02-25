import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import { gradeExamSession } from '../utils/grading';

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

const webcamCaptureSchema = z.object({
  imageData: z.string(),
  timestamp: z.string(),
});

const suspiciousEventSchema = z.object({
  type: z.string(),
  description: z.string(),
  timestamp: z.string(),
});

// START EXAM SESSION
export const startExamSession = async (req: AuthRequest, res: Response) => {
  try {
    const data = startSessionSchema.parse(req.body);
    const studentId = req.user!.userId;

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

    const now = new Date();
    if (now < exam.startAt) {
      return res.status(403).json({ error: 'Exam has not started yet' });
    }
    if (now > exam.endAt) {
      return res.status(403).json({ error: 'Exam window has ended' });
    }

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

    const previousAttempts = await prisma.examSession.count({
      where: {
        examId: data.examId,
        studentId,
        status: { in: ['SUBMITTED', 'TERMINATED', 'INVALIDATED'] },
      },
    });

    const maxAttempts = exam.examRules?.maxAttempts || 1;
    if (previousAttempts >= maxAttempts) {
      return res.status(403).json({ error: 'Maximum attempts reached' });
    }

    // Check for existing session (ACTIVE or PENDING)
    const existingSession = await prisma.examSession.findFirst({
      where: {
        examId: data.examId,
        studentId,
        status: { in: ['ACTIVE', 'PENDING'] },
      },
    });

    if (existingSession) {
      // Update to ACTIVE and return
      const session = await prisma.examSession.update({
        where: { id: existingSession.id },
        data: { status: 'ACTIVE' },
      });

      return res.json({
        message: 'Resuming existing session',
        session,
      });
    }

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

// SAVE ANSWERS
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

// WEBCAM CAPTURE
export const webcamCapture = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = webcamCaptureSchema.parse(req.body);
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

    console.log(`Webcam capture for session ${id} at ${data.timestamp}`);

    res.json({ message: 'Webcam capture received' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed' });
    }
    console.error('Webcam capture error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// LOG SUSPICIOUS EVENT
export const logSuspiciousEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = suspiciousEventSchema.parse(req.body);
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

    const severityMap: Record<string, 'LOW' | 'MEDIUM' | 'HIGH'> = {
      MULTIPLE_FACES: 'HIGH',
      FACE_NOT_DETECTED: 'HIGH',
      TAB_SWITCH: 'HIGH',
      WEBCAM_DENIED: 'HIGH',
      LOOKING_AWAY: 'MEDIUM',
      WINDOW_BLUR: 'MEDIUM',
      SCREEN_EXIT: 'MEDIUM',
      NOISE_DETECTED: 'LOW',
      COPY_PASTE: 'LOW',
      RIGHT_CLICK: 'LOW',
    };
    const severity: 'LOW' | 'MEDIUM' | 'HIGH' = severityMap[data.type] ?? 'MEDIUM';

    const event = await prisma.suspiciousEvent.create({
      data: {
        sessionId: id,
        type: data.type as any,
        severity,
        timestamp: new Date(data.timestamp),
      },
    });

    console.log(`Suspicious event logged: ${data.type} for session ${id}`);

    res.status(201).json({
      message: 'Event logged',
      event,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed' });
    }
    console.error('Log suspicious event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// SUBMIT EXAM (with auto-grading)
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

    // Update session status to SUBMITTED
    await prisma.examSession.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });

    // Auto-grade the exam
    try {
      const gradingResult = await gradeExamSession(id);

      res.json({
        message: 'Exam submitted and graded successfully',
        result: gradingResult.result,
        needsManualGrading: gradingResult.needsManualGrading,
      });
    } catch (gradingError) {
      console.error('Grading error:', gradingError);
      res.json({
        message: 'Exam submitted successfully, but auto-grading encountered an error. Your instructor will grade it manually.',
      });
    }
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
        suspiciousEvents: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (req.user!.role === 'STUDENT' && session.studentId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json({ session });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// TERMINATE SESSION (student closed tab mid-exam)
// Called by sendBeacon on pagehide — marks ACTIVE session as TERMINATED
// so the proctor dashboard doesn't show ghost sessions indefinitely
export const terminateSession = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    // sendBeacon may pass token in body instead of auth header
    const studentId = req.user?.userId;

    const session = await prisma.examSession.findUnique({ where: { id } });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.status !== 'ACTIVE') return res.status(400).json({ error: 'Session not active' });
    if (studentId && session.studentId !== studentId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await prisma.examSession.update({
      where: { id },
      data: { status: 'TERMINATED', submittedAt: new Date() },
    });

    console.log(`Session ${id} terminated (student left without submitting)`);
    res.json({ message: 'Session terminated' });
  } catch (error) {
    console.error('Terminate session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
