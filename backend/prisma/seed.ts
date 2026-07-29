import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateCourseCode } from '../src/utils/courseCode';

const prisma = new PrismaClient();

// Course.code doubles as the join code students type in (format from generateCourseCode,
// e.g. "abc-defg-hij") — re-run the seed safely by looking up on name+faculty instead.
async function findOrCreateCourse(data: { name: string; description: string; facultyId: string }) {
  const existing = await prisma.course.findFirst({
    where: { name: data.name, facultyId: data.facultyId },
  });
  if (existing) return existing;
  return prisma.course.create({ data: { ...data, code: generateCourseCode() } });
}

async function main() {
  const passwordHash = await bcrypt.hash('Password@123', 12);

  const faculty = await prisma.user.upsert({
    where: { email: 'priya.sharma@christuniversity.in' },
    update: {},
    create: {
      email: 'priya.sharma@christuniversity.in',
      passwordHash,
      role: 'FACULTY',
      firstName: 'Priya',
      lastName: 'Sharma',
      isVerified: true,
    },
  });

  const student1 = await prisma.user.upsert({
    where: { email: 'aisha.khan@christuniversity.in' },
    update: {},
    create: {
      email: 'aisha.khan@christuniversity.in',
      passwordHash,
      role: 'STUDENT',
      firstName: 'Aisha',
      lastName: 'Khan',
      isVerified: true,
    },
  });

  const student2 = await prisma.user.upsert({
    where: { email: 'rohan.mehta@christuniversity.in' },
    update: {},
    create: {
      email: 'rohan.mehta@christuniversity.in',
      passwordHash,
      role: 'STUDENT',
      firstName: 'Rohan',
      lastName: 'Mehta',
      isVerified: true,
    },
  });

  const dsa = await findOrCreateCourse({
    name: 'Data Structures & Algorithms',
    description: 'Core DSA concepts: trees, graphs, sorting, and complexity analysis.',
    facultyId: faculty.id,
  });

  const dbms = await findOrCreateCourse({
    name: 'Database Management Systems',
    description: 'Relational modeling, SQL, normalization, and transactions.',
    facultyId: faculty.id,
  });

  for (const student of [student1, student2]) {
    for (const course of [dsa, dbms]) {
      await prisma.enrollment.upsert({
        where: { courseId_studentId: { courseId: course.id, studentId: student.id } },
        update: {},
        create: { courseId: course.id, studentId: student.id },
      });
    }
  }

  const questionDefs = [
    {
      type: 'MULTIPLE_CHOICE' as const,
      content: {
        question: 'What is the time complexity of searching in a balanced binary search tree?',
        options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
        correctAnswer: 'O(log n)',
        explanation: 'A balanced BST halves the search space at each step.',
      },
      points: 2,
    },
    {
      type: 'TRUE_FALSE' as const,
      content: {
        question: 'A depth-first search on a graph always visits nodes in increasing order of their value.',
        correctAnswer: 'false',
        explanation: 'DFS order depends on traversal order and graph structure, not node value.',
      },
      points: 1,
    },
    {
      type: 'MULTIPLE_CHOICE' as const,
      content: {
        question: 'Which sorting algorithm has the best average-case time complexity?',
        options: ['Bubble Sort', 'Insertion Sort', 'Merge Sort', 'Selection Sort'],
        correctAnswer: 'Merge Sort',
        explanation: 'Merge sort runs in O(n log n) average and worst case.',
      },
      points: 2,
    },
  ];

  const questions = [];
  for (const q of questionDefs) {
    questions.push(
      await prisma.question.create({
        data: {
          courseId: dsa.id,
          type: q.type,
          content: q.content,
          points: q.points,
          difficulty: 'MEDIUM',
          topicTags: ['dsa'],
        },
      })
    );
  }

  const now = new Date();
  const exam = await prisma.exam.create({
    data: {
      courseId: dsa.id,
      title: 'Midterm — Trees & Graphs',
      instructions: 'Answer all questions. No calculators allowed.',
      durationMinutes: 60,
      startAt: new Date(now.getTime() - 5 * 60 * 1000),
      endAt: new Date(now.getTime() + 55 * 60 * 1000),
      status: 'ACTIVE',
      isPublished: true,
      examRules: {
        create: {
          shuffleQuestions: true,
          shuffleChoices: true,
          maxAttempts: 1,
          passThreshold: 60,
        },
      },
      examQuestions: {
        create: questions.map((q, i) => ({ questionId: q.id, orderIndex: i })),
      },
    },
  });

  // A completed session for student1 with a published result, so dashboards have real data to show.
  const pastExam = await prisma.exam.create({
    data: {
      courseId: dsa.id,
      title: 'Quiz — Sorting Algorithms',
      durationMinutes: 20,
      startAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      endAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 20 * 60 * 1000),
      status: 'COMPLETED',
      isPublished: true,
      examQuestions: {
        create: questions.map((q, i) => ({ questionId: q.id, orderIndex: i })),
      },
    },
  });

  const session = await prisma.examSession.create({
    data: {
      examId: pastExam.id,
      studentId: student1.id,
      startedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      submittedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000),
      status: 'SUBMITTED',
    },
  });

  await prisma.result.create({
    data: {
      sessionId: session.id,
      totalScore: 4.5,
      percentage: 90,
      passStatus: true,
      isPublished: true,
      finalizedAt: now,
    },
  });

  await prisma.notification.create({
    data: {
      userId: student1.id,
      type: 'ANNOUNCEMENT',
      title: 'Midterm exam is live',
      body: `${exam.title} is open now — join before the window closes.`,
    },
  });

  console.log('Seed complete:');
  console.log(`  Faculty:  priya.sharma@christuniversity.in / Password@123`);
  console.log(`  Student:  aisha.khan@christuniversity.in / Password@123`);
  console.log(`  Student:  rohan.mehta@christuniversity.in / Password@123`);
  console.log(`  Courses:  ${dsa.name} (${dsa.code}), ${dbms.name} (${dbms.code})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
