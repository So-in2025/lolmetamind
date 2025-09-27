// src/app/api/challenges/weekly/route.js

import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db'; // CORRECCIÓN: Usamos la nueva función de conexión

export async function GET(req) {
    try {
        const db = getPool(); // Obtenemos la conexión a la base de datos
        
        // Asumimos que tienes una tabla llamada 'challenges'
        // Esta es una consulta de ejemplo para obtener los desafíos marcados como semanales
        const result = await db.query('SELECT * FROM challenges WHERE type = $1', ['weekly']);
        
        const weeklyChallenges = result.rows;

        return NextResponse.json(weeklyChallenges, { status: 200 });
    } catch (error) {
        console.error("Error al obtener desafíos semanales:", error);
        // Devolvemos un array vacío en caso de error para no romper el frontend
        return NextResponse.json([], { status: 500 });
    }
}