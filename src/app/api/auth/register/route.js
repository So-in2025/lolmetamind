// src/app/api/auth/register/route.js
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { hashPassword } from '@/lib/auth/utils';

export async function POST(request) {
  const { username, email, password } = await request.json();

  if (!username || !email || !password) {
    return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 });
  }

  try {
    // Verificar si el usuario ya existe
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1 OR username = $2', [email, username]);
    if (existingUser.rows.length > 0) {
      return NextResponse.json({ error: 'El email o nombre de usuario ya está en uso' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    // Insertar nuevo usuario
    const newUserResult = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at',
      [username, email, passwordHash]
    );

    const newUser = newUserResult.rows[0];

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('Error en el registro:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
