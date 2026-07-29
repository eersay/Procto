import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import { handleError } from '../utils/errors';

const prisma = new PrismaClient();

// GET MY RESULTS (Student)
export const getMyResults = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user!.userId;

    const sessions = await prisma.examSession.findMany({
      where: {
        studentId,
        status: { in: ['SUBMITTED', 'INVALIDATED'] },
      },
      include: {
        exam: {
          select: {
            id: true,
            title: true,
            durationMinutes: true,
            course: {
              select: { name: true, code: true },
            },
          },
        },
        result: true,
        _count: { select: { suspiciousEvents: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });

    res.json({ results: sessions });
  } catch (error) {
    return handleError(res, error, 'Get my results');
  }
};

// GET RESULT BY SESSION ID (with detailed breakdown)
export const getResultById = async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        exam: {
          include: {
            course: { select: { id: true, name: true, code: true, facultyId: true } },
            examQuestions: {
              include: { question: { select: { id: true, type: true, content: true, points: true } } },
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
        answers: {
          include: { question: { select: { id: true, type: true, content: true, points: true } } },
        },
        result: true,
        suspiciousEvents: { orderBy: { timestamp: 'asc' } },
      },
    });

    if (!session) return res.status(404).json({ error: 'Result not found' });

    if (userRole === 'STUDENT' && session.studentId !== userId)
      return res.status(403).json({ error: 'Not authorized' });
    if (userRole === 'FACULTY' && session.exam.course.facultyId !== userId)
      return res.status(403).json({ error: 'Not authorized' });

    const breakdown = session.exam.examQuestions.map((eq) => {
      const answer = session.answers.find((a) => a.questionId === eq.question.id);
      return {
        questionNumber: eq.orderIndex + 1,
        question: eq.question,
        studentAnswer: answer?.response ?? null,
        autoScore: answer?.autoScore ?? 0,
        manualScore: answer?.manualScore ?? null,
        finalScore: answer?.manualScore != null ? answer.manualScore : (answer?.autoScore ?? 0),
        maxPoints: eq.question.points,
      };
    });

    res.json({ session, result: session.result, breakdown });
  } catch (error) {
    return handleError(res, error, 'Get result');
  }
};

// ─── FACULTY GRADING ENDPOINTS ────────────────────────────────────────────────

// GET PENDING GRADING — sessions grouped by exam
export const getPendingGrading = async (req: AuthRequest, res: Response) => {
  try {
    const facultyId = req.user!.userId;

    const courses = await prisma.course.findMany({
      where: req.user!.role === 'FACULTY' ? { facultyId } : {},
      select: { id: true },
    });
    const courseIds = courses.map((c) => c.id);

    const sessions = await prisma.examSession.findMany({
      where: {
        status: { in: ['SUBMITTED', 'INVALIDATED'] },
        exam: { courseId: { in: courseIds } },
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
        exam: {
          select: {
            id: true,
            title: true,
            course: { select: { name: true, code: true } },
            examQuestions: { include: { question: { select: { type: true } } } },
          },
        },
        result: { select: { id: true, totalScore: true, percentage: true, passStatus: true, isPublished: true, finalizedAt: true } },
        _count: { select: { answers: true, suspiciousEvents: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });

    // Group by exam
    const examMap = new Map<string, any>();
    for (const session of sessions) {
      const examId = session.exam.id;
      if (!examMap.has(examId)) {
        const hasEssay = session.exam.examQuestions.some(
          (q) => q.question.type === 'ESSAY' || q.question.type === 'CODE'
        );
        examMap.set(examId, {
          exam: { id: examId, title: session.exam.title, course: session.exam.course, hasEssayQuestions: hasEssay },
          sessions: [],
          totalSubmissions: 0,
          pendingGrading: 0,
          unpublished: 0,
        });
      }
      const group = examMap.get(examId);
      group.sessions.push(session);
      group.totalSubmissions++;
      if (!session.result || !session.result.finalizedAt) group.pendingGrading++;
      if (!session.result?.isPublished) group.unpublished++;
    }

    res.json({ exams: Array.from(examMap.values()) });
  } catch (error) {
    return handleError(res, error, 'Get pending grading');
  }
};

// GET ALL SESSIONS FOR AN EXAM (grading list view)
export const getExamSessionsForGrading = async (req: AuthRequest, res: Response) => {
  try {
    const { examId } = req.params;
    const facultyId = req.user!.userId;

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { course: { select: { facultyId: true, name: true, code: true } } },
    });
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    if (req.user!.role === 'FACULTY' && exam.course.facultyId !== facultyId)
      return res.status(403).json({ error: 'Not authorized' });

    const sessions = await prisma.examSession.findMany({
      where: { examId, status: { in: ['SUBMITTED', 'INVALIDATED'] } },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
        result: true,
        _count: { select: { answers: true, suspiciousEvents: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });

    res.json({ exam, sessions });
  } catch (error) {
    return handleError(res, error, 'Get exam sessions for grading');
  }
};

// SUBMIT MANUAL GRADES
const gradeSubmitSchema = z.object({
  scores: z.array(z.object({
    answerId: z.string().uuid(),
    manualScore: z.number().min(0),
  })),
  finalize: z.boolean().default(false),
});

export const submitManualGrades = async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const facultyId = req.user!.userId;
    const data = gradeSubmitSchema.parse(req.body);

    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        exam: { include: { course: true, examRules: true } },
        answers: { include: { question: { select: { points: true } } } },
        result: true,
      },
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (req.user!.role === 'FACULTY' && session.exam.course.facultyId !== facultyId)
      return res.status(403).json({ error: 'Not authorized' });

    // Update manual scores
    for (const score of data.scores) {
      const answer = session.answers.find((a) => a.id === score.answerId);
      if (!answer) continue;
      const capped = Math.min(score.manualScore, answer.question.points);
      await prisma.answer.update({
        where: { id: score.answerId },
        data: { manualScore: capped, gradedBy: facultyId },
      });
    }

    // Recalculate total
    const updatedAnswers = await prisma.answer.findMany({
      where: { sessionId },
      include: { question: { select: { points: true } } },
    });

    let totalScore = 0;
    let maxPossible = 0;
    for (const a of updatedAnswers) {
      maxPossible += a.question.points;
      totalScore += a.manualScore != null ? a.manualScore : (a.autoScore || 0);
    }

    const percentage = maxPossible > 0 ? (totalScore / maxPossible) * 100 : 0;
    const passThreshold = session.exam.examRules?.passThreshold ?? 60;

    const result = await prisma.result.upsert({
      where: { sessionId },
      update: { totalScore, percentage, passStatus: percentage >= passThreshold, finalizedAt: data.finalize ? new Date() : null },
      create: { sessionId, totalScore, percentage, passStatus: percentage >= passThreshold, finalizedAt: data.finalize ? new Date() : null },
    });

    res.json({ message: data.finalize ? 'Grades finalized' : 'Grades saved as draft', result });
  } catch (error) {
    return handleError(res, error, 'Submit manual grades');
  }
};

// TOGGLE PUBLISH on one result
export const togglePublishResult = async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { publish } = req.body;
    const facultyId = req.user!.userId;

    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: { exam: { include: { course: true } }, result: true },
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (req.user!.role === 'FACULTY' && session.exam.course.facultyId !== facultyId)
      return res.status(403).json({ error: 'Not authorized' });
    if (!session.result)
      return res.status(400).json({ error: 'No result to publish. Finalize grading first.' });

    const result = await prisma.result.update({
      where: { sessionId },
      data: { isPublished: publish },
    });

    res.json({ message: publish ? 'Result published' : 'Result unpublished', result });
  } catch (error) {
    return handleError(res, error, 'Toggle publish');
  }
};

// PUBLISH ALL results for an exam
export const publishAllResults = async (req: AuthRequest, res: Response) => {
  try {
    const { examId } = req.params;
    const { publish } = req.body;
    const facultyId = req.user!.userId;

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { course: true },
    });
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    if (req.user!.role === 'FACULTY' && exam.course.facultyId !== facultyId)
      return res.status(403).json({ error: 'Not authorized' });

    const sessions = await prisma.examSession.findMany({
      where: { examId, status: { in: ['SUBMITTED', 'INVALIDATED'] } },
      select: { id: true },
    });
    const sessionIds = sessions.map((s) => s.id);

    await prisma.result.updateMany({
      where: { sessionId: { in: sessionIds } },
      data: { isPublished: publish },
    });

    res.json({ message: `${publish ? 'Published' : 'Unpublished'} results for ${sessionIds.length} student(s)` });
  } catch (error) {
    return handleError(res, error, 'Publish all results');
  }
};

// CLASS ANALYTICS
export const getClassAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const { examId } = req.params;
    const facultyId = req.user!.userId;

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        course: true,
        examQuestions: {
          include: { question: { select: { id: true, type: true, content: true, points: true } } },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    if (req.user!.role === 'FACULTY' && exam.course.facultyId !== facultyId)
      return res.status(403).json({ error: 'Not authorized' });

    const sessions = await prisma.examSession.findMany({
      where: { examId, status: { in: ['SUBMITTED', 'INVALIDATED'] } },
      include: {
        result: true,
        answers: { select: { questionId: true, autoScore: true, manualScore: true, response: true } },
      },
    });

    const withResults = sessions.filter((s) => s.result);
    const totalSubmissions = sessions.length;
    const gradedCount = withResults.length;

    if (gradedCount === 0) {
      return res.json({
        exam: { id: exam.id, title: exam.title, course: exam.course },
        totalSubmissions, gradedCount: 0,
        avgScore: 0, highestScore: 0, lowestScore: 0, passRate: 0,
        scoreDistribution: [], questionStats: [],
      });
    }

    const scores = withResults.map((s) => s.result!.percentage);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const passCount = withResults.filter((s) => s.result!.passStatus).length;

    const buckets = Array(10).fill(0);
    for (const pct of scores) {
      buckets[Math.min(Math.floor(pct / 10), 9)]++;
    }

    const questionStats = exam.examQuestions.map((eq) => {
      const qId = eq.question.id;
      const qAnswers = sessions.flatMap((s) => s.answers.filter((a) => a.questionId === qId));
      const maxPts = eq.question.points;
      const qScores = qAnswers.map((a) => (a.manualScore != null ? a.manualScore : (a.autoScore ?? 0)) as number);
      const avgQScore = qScores.length > 0 ? qScores.reduce((a, b) => a + b, 0) / qScores.length : 0;
      const fullCredit = qScores.filter((s) => s >= maxPts).length;
      return {
        questionNumber: eq.orderIndex + 1,
        type: eq.question.type,
        maxPoints: maxPts,
        avgScore: Math.round(avgQScore * 10) / 10,
        fullCreditCount: fullCredit,
        attemptCount: qAnswers.filter((a) => a.response !== null).length,
        fullCreditPct: qScores.length > 0 ? Math.round((fullCredit / qScores.length) * 100) : 0,
      };
    });

    res.json({
      exam: { id: exam.id, title: exam.title, course: exam.course },
      totalSubmissions,
      gradedCount,
      avgScore: Math.round(avgScore * 10) / 10,
      highestScore: Math.round(Math.max(...scores) * 10) / 10,
      lowestScore: Math.round(Math.min(...scores) * 10) / 10,
      passRate: Math.round((passCount / gradedCount) * 1000) / 10,
      scoreDistribution: buckets.map((count, i) => ({ range: `${i * 10}–${i * 10 + 10}%`, count })),
      questionStats,
    });
  } catch (error) {
    return handleError(res, error, 'Class analytics');
  }
};
