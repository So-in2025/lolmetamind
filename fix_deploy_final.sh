#!/bin/bash

echo "Corrigiendo errores de importación en el backend..."

# --- Paso 1: Corregir la exportación de la base de datos ---
echo "Modificando src/lib/db/index.js para usar ES Modules..."
cat > src/lib/db/index.js << EOL
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Usamos 'export const' para que sea un módulo ES compatible con Next.js
export const db = {
  query: (text, params) => pool.query(text, params),
};
EOL

# --- Paso 2: Corregir la importación de Clerk ---
echo "Corrigiendo src/app/api/activate-trial/route.js..."
cat > src/app/api/activate-trial/route.js << EOL
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server'; // Volvemos a la ruta '/server' que es la correcta

export async function POST(req) {
    try {
        const { userId } = auth();
        if (!userId) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const userResult = await db.query('SELECT * FROM users WHERE google_id = $1', [userId]);
        const user = userResult.rows[0];

        if (!user) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }
        
        if (user.subscription_tier !== 'FREE' || user.trial_ends_at) {
            return NextResponse.json({ error: 'Este usuario no es elegible para una prueba.' }, { status: 403 });
        }

        const trialEndDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        await db.query(
            'UPDATE users SET "subscription_tier" = \\'TRIAL\\', "trial_ends_at" = $1 WHERE id = $2',
            [trialEndDate, user.id]
        );

        return NextResponse.json({ message: 'Prueba de 3 días activada con éxito.' });

    } catch (error) {
        console.error('Error al activar la prueba:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
EOL

echo "¡Corrección completada!"
echo "Sube los cambios a GitHub (add, commit, push) para que Vercel/Render se actualicen."