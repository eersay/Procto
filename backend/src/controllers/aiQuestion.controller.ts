import { Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

const generateSchema = z.object({
  courseId: z.string().uuid(),
  topic: z.string().min(2).max(200),
  count: z.number().int().min(1).max(20),
  questionTypes: z
    .array(
      z.enum([
        'MULTIPLE_CHOICE',
        'MULTIPLE_SELECT',
        'TRUE_FALSE',
        'SHORT_ANSWER',
        'FILL_BLANK',
        'NUMERICAL',
      ])
    )
    .min(1),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildPrompt(
  topic: string,
  count: number,
  questionTypes: string[],
  difficulty: string
): string {
  const typeDescriptions: Record<string, string> = {
    MULTIPLE_CHOICE:
      'Multiple choice (exactly 4 options, exactly one correct answer stored in correctAnswer as a string)',
    MULTIPLE_SELECT:
      'Multiple select (4-5 options, 2-3 correct answers stored in correctAnswer as a JSON array of strings)',
    TRUE_FALSE:
      'True or False (no options array, correctAnswer must be exactly "true" or "false")',
    SHORT_ANSWER:
      'Short answer (no options array, correctAnswer is a concise 1-3 word answer)',
    FILL_BLANK:
      'Fill in the blank (the question text contains a blank shown as ___, correctAnswer is the word or phrase that fills it)',
    NUMERICAL:
      'Numerical (correctAnswer is a number stored as a string, optionally include tolerance)',
  };

  const typesText = questionTypes
    .map((t) => `- ${typeDescriptions[t] || t}`)
    .join('\n');

  return `You are an expert educator. Generate exactly ${count} exam question(s) about the topic: "${topic}".

Difficulty level: ${difficulty}

Use ONLY these question types (mix them if multiple are listed):
${typesText}

Return ONLY a valid JSON array with no markdown, no code fences, no extra text. Each element must have this exact shape:

{
  "type": "<TYPE>",            // one of the allowed types above, in SCREAMING_SNAKE_CASE
  "content": {
    "question": "<string>",    // the question text
    "options": ["<string>"],   // REQUIRED for MULTIPLE_CHOICE and MULTIPLE_SELECT; omit for others
    "correctAnswer": "<string | string[]>",
    "explanation": "<string>"  // a brief explanation of the correct answer
  },
  "points": <number>,          // EASY=1, MEDIUM=2, HARD=3
  "difficulty": "${difficulty}",
  "topicTags": ["<string>"]    // 1-3 relevant tags
}

Rules:
- For MULTIPLE_CHOICE always include exactly 4 options and correctAnswer as a plain string matching one option exactly.
- For MULTIPLE_SELECT always include 4+ options and correctAnswer as a JSON array.
- For TRUE_FALSE correctAnswer must be "true" or "false" (lowercase string), no options array.
- Do NOT include any text outside the JSON array.
- Ensure all JSON is valid and parseable.`;
}

function sanitizeGeneratedQuestion(q: any, courseId: string) {
  // Map type aliases the model might return
  const validTypes = new Set([
    'MULTIPLE_CHOICE',
    'MULTIPLE_SELECT',
    'TRUE_FALSE',
    'SHORT_ANSWER',
    'FILL_BLANK',
    'NUMERICAL',
  ]);

  const type = (q.type ?? '').toString().toUpperCase().replace(/ /g, '_');
  if (!validTypes.has(type)) return null;

  const content = q.content ?? {};
  if (!content.question || typeof content.question !== 'string') return null;

  // Normalise correctAnswer for TRUE_FALSE
  if (type === 'TRUE_FALSE') {
    const ca = (content.correctAnswer ?? '').toString().toLowerCase().trim();
    if (ca !== 'true' && ca !== 'false') return null;
    content.correctAnswer = ca;
    delete content.options;
  }

  return {
    courseId,
    type,
    content: {
      question: content.question.trim(),
      options: Array.isArray(content.options)
        ? (content.options as string[]).map((o: string) => o.trim())
        : undefined,
      correctAnswer: content.correctAnswer,
      explanation: content.explanation ?? '',
    },
    points:
      typeof q.points === 'number' && q.points > 0 ? q.points : 1,
    difficulty: ['EASY', 'MEDIUM', 'HARD'].includes(q.difficulty)
      ? q.difficulty
      : 'MEDIUM',
    topicTags: Array.isArray(q.topicTags)
      ? (q.topicTags as string[]).slice(0, 5)
      : [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Controller
// ─────────────────────────────────────────────────────────────────────────────

export const generateQuestionsWithAI = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    // Validate input
    const data = generateSchema.parse(req.body);

    // Verify faculty owns the course
    if (req.user!.role === 'FACULTY') {
      const course = await prisma.course.findUnique({
        where: { id: data.courseId, facultyId: req.user!.userId },
      });
      if (!course) {
        return res
          .status(403)
          .json({ error: 'Not authorized for this course' });
      }
    }

    // Check API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'AI generation is not configured. Please add GEMINI_API_KEY to your .env file.',
      });
    }

    // Call Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const questions: any[] = [];
    let attempts = 0;

    // Retry a few times to fill shortfalls after sanitization/parsing.
    while (questions.length < data.count && attempts < 3) {
      const remaining = data.count - questions.length;
      const prompt = buildPrompt(
        data.topic,
        remaining,
        data.questionTypes,
        data.difficulty
      );

      const result = await model.generateContent(prompt);
      const rawText = result.response.text().trim();

      // Strip any accidental markdown fences the model may prepend
      const jsonText = rawText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();

      let parsed: any[];
      try {
        parsed = JSON.parse(jsonText);
        if (!Array.isArray(parsed)) throw new Error('Not an array');
      } catch {
        attempts += 1;
        console.error('Gemini JSON parse error, raw text:', rawText);
        continue;
      }

      const sanitized = parsed
        .map((q) => sanitizeGeneratedQuestion(q, data.courseId))
        .filter(Boolean) as any[];

      questions.push(...sanitized);
      attempts += 1;
    }

    if (questions.length === 0) {
      return res.status(502).json({
        error: 'AI could not generate valid questions for that topic. Try rephrasing.',
      });
    }

    const finalQuestions = questions.slice(0, data.count);
    return res.json({ questions: finalQuestions, generatedCount: finalQuestions.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: 'Validation failed', details: error.errors });
    }
    console.error('AI generate questions error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
