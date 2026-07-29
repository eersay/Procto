import { Response } from 'express';
import { z } from 'zod';

/**
 * Shared catch-block handler: Zod validation failures become 400s with details,
 * anything else is logged with its route context and returned as a generic 500.
 */
export function handleError(res: Response, error: unknown, context: string) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ error: 'Validation failed', details: error.errors });
  }
  console.error(`${context} error:`, error);
  return res.status(500).json({ error: 'Internal server error' });
}
