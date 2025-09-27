import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db'; // CORRECCIÓN: Usamos la nueva función
import { getToken } from 'next-auth/jwt'; // CORRECCIÓN: Esta importación ahora funcionará

export async function POST(req) {
  const token = await getToken({ req, secret: process.env.JWT_SECRET }); // Se usa JWT_SECRET

  if (!token) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  try {
    const { usersDb } = getDb(); // Obtenemos la conexión a la DB
    const { userId, lolUsername, mainRole, secondaryRole, playStyle } = await req.json();

    if (token.id !== userId) { // Comparamos con el ID del token
      return NextResponse.json({ message: 'Conflicto de ID de usuario' }, { status: 403 });
    }

    const userDoc = await usersDb.get(userId);
    userDoc.lolUsername = lolUsername;
    userDoc.mainRole = mainRole;
    userDoc.secondaryRole = secondaryRole;
    userDoc.playStyle = playStyle;
    userDoc.has_completed_onboarding = true;

    await usersDb.insert(userDoc);
    return NextResponse.json({ message: 'Perfil actualizado con éxito' }, { status: 200 });
  } catch (error) {
    console.error('Error al actualizar el perfil:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}
