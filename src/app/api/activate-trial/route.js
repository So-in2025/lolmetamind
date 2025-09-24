import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server'; // Volvemos a la ruta '/server' que es la correcta

export async function POST(req) {
    try {
        const { userId } = auth();
        if (!userId) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const userResult = await db.query('SELECT * FROM users WHERE google_id = ', [userId]);
        const user = userResult.rows[0];

        if (!user) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }
        
        if (user.subscription_tier !== 'FREE' || user.trial_ends_at) {
            return NextResponse.json({ error: 'Este usuario no es elegible para una prueba.' }, { status: 403 });
        }

        const trialEndDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        await db.query(
            'UPDATE users SET "subscription_tier" = \'TRIAL\', "trial_ends_at" =  WHERE id = ',
            [trialEndDate, user.id]
        );

        return NextResponse.json({ message: 'Prueba de 3 días activada con éxito.' });

    } catch (error) {
        console.error('Error al activar la prueba:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
