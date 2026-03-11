import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

// GET /notifications — all notifications for the logged-in user, newest first
export const getNotifications = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;

        const notifications = await prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        const unreadCount = notifications.filter(n => !n.isRead).length;

        res.json({ notifications, unreadCount });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// POST /notifications/read-all — mark every notification read for the logged-in user
export const markAllRead = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;

        await prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark all read error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
