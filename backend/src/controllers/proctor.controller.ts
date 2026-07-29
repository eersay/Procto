import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { handleError } from '../utils/errors';

const prisma = new PrismaClient();

// GET ALL ACTIVE EXAM SESSIONS (across all exams faculty teaches)
export const getActiveExamSessions = async (req: AuthRequest, res: Response) => {
  try {
    const facultyId = req.user!.userId;

    // Get all courses taught by this faculty
    const courses = await prisma.course.findMany({
      where: req.user!.role === 'FACULTY' ? { facultyId } : {},
      select: { id: true },
    });

    const courseIds = courses.map(c => c.id);

    // Get all active sessions for exams in these courses
    const sessions = await prisma.examSession.findMany({
      where: {
        status: 'ACTIVE',
        exam: {
          courseId: { in: courseIds },
        },
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        exam: {
          select: {
            id: true,
            title: true,
            durationMinutes: true,
            course: {
              select: {
                name: true,
                code: true,
              },
            },
          },
        },
        suspiciousEvents: {
          orderBy: { timestamp: 'desc' },
          take: 5, // Latest 5 events
        },
        _count: {
          select: {
            suspiciousEvents: true,
            answers: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    // Calculate time elapsed for each session
    const sessionsWithTime = sessions.map(session => {
      const elapsed = Math.floor((Date.now() - session.startedAt.getTime()) / 1000 / 60); // minutes
      const remaining = session.exam.durationMinutes - elapsed;
      
      return {
        ...session,
        timeElapsed: elapsed,
        timeRemaining: Math.max(0, remaining),
      };
    });

    res.json({ 
      sessions: sessionsWithTime,
      totalActive: sessionsWithTime.length,
    });
  } catch (error) {
    return handleError(res, error, 'Get active sessions');
  }
};

// GET ALL SESSIONS FOR A SPECIFIC EXAM
export const getAllExamSessions = async (req: AuthRequest, res: Response) => {
  try {
    const { examId } = req.params;
    const facultyId = req.user!.userId;

    // Verify faculty owns this exam
    if (req.user!.role === 'FACULTY') {
      const exam = await prisma.exam.findUnique({
        where: { id: examId },
        include: { course: true },
      });

      if (!exam || exam.course.facultyId !== facultyId) {
        return res.status(403).json({ error: 'Not authorized' });
      }
    }

    const sessions = await prisma.examSession.findMany({
      where: { examId },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            suspiciousEvents: true,
            answers: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    res.json({ sessions });
  } catch (error) {
    return handleError(res, error, 'Get exam sessions');
  }
};

// GET DETAILED SESSION VIEW (timeline with all events)
export const getSessionDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const facultyId = req.user!.userId;

    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        exam: {
          include: {
            course: {
              select: {
                id: true,
                name: true,
                facultyId: true,
              },
            },
          },
        },
        suspiciousEvents: {
          orderBy: { timestamp: 'asc' },
        },
        answers: {
          include: {
            question: {
              select: {
                type: true,
                points: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Verify faculty owns this exam
    if (req.user!.role === 'FACULTY' && session.exam.course.facultyId !== facultyId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Group events by severity
    const eventsSummary = {
      high: session.suspiciousEvents.filter(e => e.severity === 'HIGH').length,
      medium: session.suspiciousEvents.filter(e => e.severity === 'MEDIUM').length,
      low: session.suspiciousEvents.filter(e => e.severity === 'LOW').length,
    };

    res.json({ 
      session,
      eventsSummary,
    });
  } catch (error) {
    return handleError(res, error, 'Get session details');
  }
};

// INVALIDATE SESSION (mark as cheating)
export const invalidateSession = async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const facultyId = req.user!.userId;

    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        exam: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Verify faculty owns this exam
    if (req.user!.role === 'FACULTY' && session.exam.course.facultyId !== facultyId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Update session status to INVALIDATED
    await prisma.examSession.update({
      where: { id: sessionId },
      data: {
        status: 'INVALIDATED',
        submittedAt: new Date(),
      },
    });

    res.json({ 
      message: 'Session invalidated successfully',
      sessionId,
    });
  } catch (error) {
    return handleError(res, error, 'Invalidate session');
  }
};
