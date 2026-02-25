import { Router } from 'express';
import { register, login, logout, refreshToken, googleCallback, getMe } from '../controllers/auth.controller';
import passport from '../utils/passport';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh', refreshToken);

// Google OAuth — role is passed as the state param so one callback URL handles both roles
router.get(
    '/google',
    (req, res, next) => {
        const role = (req.query.role as string) || 'STUDENT';
        passport.authenticate('google', {
            scope: ['profile', 'email'],
            state: role,
            session: false,
        })(req, res, next);
    }
);

router.get(
    '/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth` }),
    googleCallback
);

router.get('/me', getMe);

export default router;
