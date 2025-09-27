import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import crypto from 'crypto';

export async function POST(req) {
    const signature = req.headers.get('x-hotmart-hmac-sha256');
    const payload = await req.json();

    const secret = process.env.HOTMART_WEBHOOK_SECRET;
    const hash = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');

    if (hash !== signature) {
        return NextResponse.json({ message: 'Firma inválida' }, { status: 401 });
    }

    try {
        const db = getPool();
        const email = payload.data.buyer.email;
        await db.query('UPDATE users SET "subscriptionStatus" = $1 WHERE email = $2', ['active', email]);
        return NextResponse.json({ message: 'Webhook procesado' }, { status: 200 });
    } catch (error) {
        console.error('Error en webhook de Hotmart:', error);
        return NextResponse.json({ message: 'Error interno' }, { status: 500 });
    }
}