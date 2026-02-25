import { PrismaClient, QuestionType } from '@prisma/client';

const prisma = new PrismaClient();

interface GradingResult {
  autoScore: number;
  needsManualGrading: boolean;
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

  const { type, content, points } = question;

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
      return gradeNumerical(studentResponse, content.correctAnswer, points);

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

  // Must select ALL correct answers and NO wrong answers
  const studentSet = new Set(studentAnswers);
  const correctSet = new Set(correctAnswers);

  if (studentSet.size !== correctSet.size) {
    return { autoScore: 0, needsManualGrading: false };
  }

  for (const answer of correctAnswers) {
    if (!studentSet.has(answer)) {
      return { autoScore: 0, needsManualGrading: false };
    }
  }

  return { autoScore: points, needsManualGrading: false };
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

  let student = studentAnswer.trim();
  let correct = correctAnswer.trim();

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
  points: number
): GradingResult {
  const isCorrect = Math.abs(studentAnswer - correctAnswer) < 0.01; // Allow small floating point errors
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
          response: null,
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

  // Create or update result
  const result = await prisma.result.upsert({
    where: { sessionId },
    update: {
      totalScore,
      percentage,
      passStatus,
      finalizedAt: needsManualGrading ? null : new Date(),
    },
    create: {
      sessionId,
      totalScore,
      percentage,
      passStatus,
      finalizedAt: needsManualGrading ? null : new Date(),
    },
  });

  return {
    result,
    needsManualGrading,
    maxPossibleScore,
  };
}
