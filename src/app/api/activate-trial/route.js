import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth'; // Asumo que tienes una función para obtener la sesión

export async function POST(req) {
    try {
        const session = await getSession(); // Obtener la sesión del usuario logueado
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const userResult = await db.query('SELECT * FROM users WHERE id = ', [session.user.id]);
        const user = userResult.rows[0];

        if (!user) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }
        
        // Verificar que el usuario sea elegible para la prueba
        if (user.subscription_tier !== 'FREE' || user.trial_ends_at) {
            return NextResponse.json({ error: 'Este usuario no es elegible para una prueba.' }, { status: 403 });
        }

        // Activar la prueba
        const trialEndDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 días desde ahora
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
