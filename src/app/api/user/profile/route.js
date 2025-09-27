// src/app/api/user/profile/route.js

import { NextResponse } from 'next/server';
// --- CORRECCIÓN: Se usa una importación nombrada en lugar de una por defecto ---
import { usersDb } from '@/lib/db';
import { getToken } from 'next-auth/jwt';

export async function POST(req) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
        return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    try {
        const { userId, lolUsername, mainRole, secondaryRole, playStyle } = await req.json();

        // Verificamos que el userId del token coincida con el de la petición
        if (token.sub !== userId) {
            return NextResponse.json({ message: 'Conflicto de ID de usuario' }, { status: 403 });
        }

        const userDoc = await usersDb.get(userId);

        // Actualizamos el documento del usuario
        userDoc.lolUsername = lolUsername;
        userDoc.mainRole = mainRole;
        userDoc.secondaryRole = secondaryRole;
        userDoc.playStyle = playStyle;
        userDoc.has_completed_onboarding = true; // Marcamos el onboarding como completado

        await usersDb.insert(userDoc);

        return NextResponse.json({ message: 'Perfil actualizado con éxito' }, { status: 200 });

    } catch (error) {
        console.error('Error al actualizar el perfil:', error);
        return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
    }
}