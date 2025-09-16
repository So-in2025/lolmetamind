import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(request) {
  const { priceId } = await request.json();

  if (!priceId) {
    return NextResponse.json({ error: 'Price ID es requerido' }, { status: 400 });
  }

  const YOUR_DOMAIN = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${YOUR_DOMAIN}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${YOUR_DOMAIN}/`,
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creando sesión de Stripe:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
