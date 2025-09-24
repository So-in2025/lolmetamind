#!/bin/bash

echo "Corrigiendo dependencias y errores de importación..."

# --- Paso 1: Instalar las dependencias que faltan ---
echo "Instalando @clerk/nextjs y uuid..."
npm install @clerk/nextjs uuid --save

# --- Paso 2: Corregir la importación en el endpoint de la prueba ---
echo "Corrigiendo la ruta de importación de Clerk en 'activate-trial'..."
cat > src/app/api/activate-trial/route.js << EOL
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs'; // RUTA CORREGIDA

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

        const trialEndDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 días
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
echo "Ahora, sube los cambios a GitHub para que el despliegue funcione."
echo "Ejecuta los siguientes comandos:"
echo "1. git add ."
echo "2. git commit -m \"Fix: add missing clerk/uuid dependencies and correct import path\""
echo "3. git push"