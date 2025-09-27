import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db'; // CORRECCIÓN

// Asumimos que tienes una DB o un servicio para los desafíos
// const challengesDb = getDb().couch.use('challenges');

export async function GET(req) {
    try {
        // Lógica para obtener los desafíos de la semana
        const weeklyChallenges = [
            { id: 'wc1', title: 'Gana 3 partidas con un campeón de Jonia', reward: 100 },
            { id: 'wc2', title: 'Consigue 5 Heraldos de la Grieta', reward: 150 },
        ];
        return NextResponse.json(weeklyChallenges, { status: 200 });
    } catch (error) {
        console.error("Error al obtener desafíos semanales:", error);
        return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
    }
}