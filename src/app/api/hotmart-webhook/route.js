import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db'; // CORRECCIÓN
import crypto from 'crypto';

export async function POST(req) {
    const { usersDb } = getDb(); // CORRECCIÓN
    const signature = req.headers.get('x-hotmart-hmac-sha256');
    const payload = await req.json();

    // Lógica de verificación del webhook (muy importante en producción)
    const secret = process.env.HOTMART_WEBHOOK_SECRET;
    const hash = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');

    if (hash !== signature) {
        return NextResponse.json({ message: 'Firma inválida' }, { status: 401 });
    }

    try {
        const email = payload.data.buyer.email;
        const query = { selector: { email: email }, limit: 1 };
        const users = await usersDb.find(query);

        if (users.docs.length > 0) {
            const user = users.docs[0];
            // Lógica para actualizar la suscripción del usuario
            user.subscriptionStatus = 'active';
            await usersDb.insert(user);
        }
        return NextResponse.json({ message: 'Webhook procesado' }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: 'Error interno' }, { status: 500 });
    }
}