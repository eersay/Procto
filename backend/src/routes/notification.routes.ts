/**
 * Procto — AI-powered online exam proctoring system
 * Copyright (c) 2026 Bhagyasree Roy. All rights reserved.
 */

import { Router } from 'express';
import { getNotifications, markAllRead } from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', getNotifications);
router.post('/read-all', markAllRead);

export default router;
