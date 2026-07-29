import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface GradingResult {
  autoScore: number;
  needsManualGrading: boolean;
}

// Question.content is stored as Prisma Json; shape it for the grading functions below.
interface QuestionContent {
  correctAnswer?: any;
  caseInsensitive?: boolean;
  tolerance?: number;
}

/**
 * Grade a single answer automatically
 */
export async function gradeAnswer(
  questionId: string,
  studentResponse: any
): Promise<GradingResult> {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
  });

  if (!question) {
    return { autoScore: 0, needsManualGrading: false };
  }

  const { type, points } = question;
  const content = question.content as unknown as QuestionContent;

  switch (type) {
    case 'MULTIPLE_CHOICE':
      return gradeMCQ(studentResponse, content.correctAnswer, points);

    case 'MULTIPLE_SELECT':
      return gradeMultipleSelect(studentResponse, content.correctAnswer, points);

    case 'TRUE_FALSE':
      return gradeTrueFalse(studentResponse, content.correctAnswer, points);

    case 'SHORT_ANSWER':
      return gradeShortAnswer(
        studentResponse,
        content.correctAnswer,
        points,
        content.caseInsensitive
      );

    case 'ESSAY':
    case 'CODE':
      return { autoScore: 0, needsManualGrading: true };

    case 'NUMERICAL':
      return gradeNumerical(studentResponse, content.correctAnswer, points, content.tolerance);

    default:
      return { autoScore: 0, needsManualGrading: false };
  }
}

function gradeMCQ(studentAnswer: string, correctAnswer: string, points: number): GradingResult {
  const isCorrect = studentAnswer === correctAnswer;
  return {
    autoScore: isCorrect ? points : 0,
    needsManualGrading: false,
  };
}

function gradeMultipleSelect(
  studentAnswers: string[],
  correctAnswers: string[],
  points: number
): GradingResult {
  if (!Array.isArray(studentAnswers) || !Array.isArray(correctAnswers)) {
    return { autoScore: 0, needsManualGrading: false };
  }

  // Partial credit: +1 for each correct selection, -1 for each wrong selection, floored at 0
  const correctSet = new Set(correctAnswers);
  const correctlySelected = studentAnswers.filter(a => correctSet.has(a)).length;
  const wronglySelected = studentAnswers.filter(a => !correctSet.has(a)).length;
  const ratio = Math.max(0, (correctlySelected - wronglySelected) / correctAnswers.length);
  const autoScore = Math.round(ratio * points * 100) / 100; // round to 2dp

  return { autoScore, needsManualGrading: false };
}

function gradeTrueFalse(
  studentAnswer: string,
  correctAnswer: string,
  points: number
): GradingResult {
  const isCorrect = studentAnswer?.toLowerCase() === correctAnswer?.toLowerCase();
  return {
    autoScore: isCorrect ? points : 0,
    needsManualGrading: false,
  };
}

function gradeShortAnswer(
  studentAnswer: string,
  correctAnswer: string,
  points: number,
  caseInsensitive: boolean = true
): GradingResult {
  if (!studentAnswer || !correctAnswer) {
    return { autoScore: 0, needsManualGrading: false };
  }

  // Normalize: collapse whitespace, strip punctuation for fuzzy matching
  const normalize = (s: string) =>
    s.trim()
      .replace(/[^\w\s]/g, '')   // remove punctuation (apostrophes, commas, etc.)
      .replace(/\s+/g, ' ')       // collapse multiple spaces
      .trim();

  let student = normalize(studentAnswer);
  let correct = normalize(correctAnswer);

  if (caseInsensitive) {
    student = student.toLowerCase();
    correct = correct.toLowerCase();
  }

  const isCorrect = student === correct;
  return {
    autoScore: isCorrect ? points : 0,
    needsManualGrading: false,
  };
}

function gradeNumerical(
  studentAnswer: number,
  correctAnswer: number,
  points: number,
  tolerance: number = 0.01 // faculty-configurable per question, defaults to 0.01
): GradingResult {
  const isCorrect = Math.abs(studentAnswer - correctAnswer) <= tolerance;
  return {
    autoScore: isCorrect ? points : 0,
    needsManualGrading: false,
  };
}

/**
 * Grade an entire exam session
 */
export async function gradeExamSession(sessionId: string) {
  const session = await prisma.examSession.findUnique({
    where: { id: sessionId },
    include: {
      exam: {
        include: {
          examQuestions: {
            include: {
              question: true,
            },
          },
        },
      },
      answers: {
        include: {
          question: true,
        },
      },
    },
  });

  if (!session) {
    throw new Error('Session not found');
  }

  let totalScore = 0;
  let maxPossibleScore = 0;
  let needsManualGrading = false;

  // Grade each answer
  for (const examQuestion of session.exam.examQuestions) {
    const question = examQuestion.question;
    maxPossibleScore += question.points;

    const answer = session.answers.find((a) => a.questionId === question.id);

    if (!answer) {
      // No answer submitted
      await prisma.answer.create({
        data: {
          sessionId,
          questionId: question.id,
          response: Prisma.JsonNull,
          autoScore: 0,
        },
      });
      continue;
    }

    const result = await gradeAnswer(question.id, answer.response);

    if (result.needsManualGrading) {
      needsManualGrading = true;
    }

    // Update answer with auto score
    await prisma.answer.update({
      where: { id: answer.id },
      data: {
        autoScore: result.autoScore,
      },
    });

    totalScore += result.autoScore;
  }

  // Calculate percentage
  const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;

  // Get pass threshold from exam rules
  const examRules = await prisma.examRules.findUnique({
    where: { examId: session.examId },
  });

  const passThreshold = examRules?.passThreshold || 60;
  const passStatus = percentage >= passThreshold;

  // Create or update result.
  // Auto-publish if all questions were auto-gradable (no ESSAY / CODE).
  const isPublished = !needsManualGrading;

  const result = await prisma.result.upsert({
    where: { sessionId },
    update: {
      totalScore,
      percentage,
      passStatus,
      isPublished,
      finalizedAt: needsManualGrading ? null : new Date(),
    },
    create: {
      sessionId,
      totalScore,
      percentage,
      passStatus,
      isPublished,
      finalizedAt: needsManualGrading ? null : new Date(),
    },
  });

  return {
    result,
    needsManualGrading,
    maxPossibleScore,
  };
}
