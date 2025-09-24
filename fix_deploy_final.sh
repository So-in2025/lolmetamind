#!/bin/bash

echo "Corrigiendo errores de despliegue para Vercel y Render..."

# --- Paso 1: Instalar la dependencia 'uuid' y guardarla en package.json ---
echo "Instalando la librería 'uuid' y añadiéndola a las dependencias..."
npm install uuid --save

# --- Paso 2: Corregir el endpoint para activar la prueba ---
echo "Corrigiendo src/app/api/activate-trial/route.js para usar la importación de Clerk correcta..."
cat > src/app/api/activate-trial/route.js << EOL
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs'; // RUTA CORREGIDA: Usamos la importación principal

export async function POST(req) {
    try {
        const { userId } = auth(); // Obtenemos el ID del usuario logueado con Clerk
        if (!userId) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const userResult = await db.query('SELECT * FROM users WHERE google_id = $1', [userId]);
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
echo "Ahora, haz 'git add .', 'git commit -m \"Fix clerk import path and add uuid dependency\"' y 'git push'."
echo "Después de subir los cambios, el despliegue debería funcionar."