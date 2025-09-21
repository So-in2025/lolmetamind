import { NextResponse } from 'next/server';
import { paddle } from '@/lib/paddle';

export async function POST(request) {
  const { priceId } = await request.json();

  if (!priceId) {
    return NextResponse.json({ error: 'Price ID es requerido' }, { status: 400 });
  }

  try {
    // Crear un link de pago para una suscripción
    const transaction = await paddle.transactions.create({
      items: [{ priceId: priceId, quantity: 1 }],
      // Opcional: puedes asociar el checkout a un cliente si ya está registrado
      // customer_id: 'cus_xxxxxxxx',
      customData: {
        // Aquí puedes pasar datos adicionales que necesites
        userId: 'usr_12345', // Ejemplo
      }
    });

    return NextResponse.json({ checkoutUrl: transaction.checkout.url });

  } catch (error) {
    console.error('Error creando transacción de Paddle:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
