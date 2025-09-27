// src/app/api/auth/google/route.js

import passport from '@/lib/auth/utils';

// Esta es la forma correcta y moderna.
// Next.js entiende que debe ceder el control a Passport para que maneje la redirección.
export const GET = passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false // No usamos sesiones del lado del servidor
});