import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request) {
  const { amount, referenceCode, description } = await request.json();

  const apiKey = process.env.PAYU_API_KEY;
  const merchantId = process.env.NEXT_PUBLIC_PAYU_MERCHANT_ID;
  const accountId = process.env.PAYU_ACCOUNT_ID;
  const currency = 'ARS'; // O la moneda que corresponda

  if (!apiKey || !merchantId || !accountId) {
    return NextResponse.json({ error: 'Variables de entorno de PayU no configuradas' }, { status: 500 });
  }

  // Creación de la firma de seguridad (muy importante para PayU)
  const signatureString = `${apiKey}~${merchantId}~${referenceCode}~${amount}~${currency}`;
  const signature = crypto.createHash('md5').update(signatureString).digest('hex');

  const formData = {
    merchantId,
    accountId,
    description,
    referenceCode,
    amount,
    tax: 0,
    taxReturnBase: 0,
    currency,
    signature,
    test: process.env.NODE_ENV === 'development' ? '1' : '0', // 1 para pruebas, 0 para producción
    responseUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    confirmationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/confirmation`,
  };

  return NextResponse.json(formData);
}
