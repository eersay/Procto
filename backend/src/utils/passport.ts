import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Only register Google strategy when credentials are configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: process.env.GOOGLE_CALLBACK_URL!,
                passReqToCallback: true,
            },
            async (req: any, _accessToken: any, _refreshToken: any, profile: Profile, done: any) => {
                try {
                    const email = profile.emails?.[0]?.value;
                    if (!email) return done(new Error('No email from Google'), undefined);

                    // Role is passed via OAuth state (set in the /auth/google route)
                    const role = (req.query.state as string) || 'STUDENT';
                    const safeRole = role === 'FACULTY' ? 'FACULTY' : 'STUDENT';

                    // Find existing user by googleId or email
                    let user = await prisma.user.findFirst({
                        where: {
                            OR: [{ googleId: profile.id }, { email }],
                        },
                    });

                    if (user) {
                        // Update googleId if signing in via Google for the first time on an existing email account
                        if (!user.googleId) {
                            user = await prisma.user.update({
                                where: { id: user.id },
                                data: { googleId: profile.id, isVerified: true },
                            });
                        }
                    } else {
                        // New user — create account
                        user = await prisma.user.create({
                            data: {
                                email,
                                googleId: profile.id,
                                firstName: profile.name?.givenName || profile.displayName.split(' ')[0] || 'User',
                                lastName: profile.name?.familyName || profile.displayName.split(' ').slice(1).join(' ') || '',
                                profilePhotoUrl: profile.photos?.[0]?.value,
                                role: safeRole as any,
                                isVerified: true,
                            },
                        });
                    }

                    return done(null, user);
                } catch (err) {
                    return done(err as Error, undefined);
                }
            }
        )
    );
}

// Minimal serialization (not using sessions — we issue JWTs instead)
passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser(async (id: string, done) => {
    try {
        const user = await prisma.user.findUnique({ where: { id } });
        done(null, user as any);
    } catch (err) {
        done(err, null);
    }
});

export default passport;
