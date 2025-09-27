import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
  const { id } = params;
  console.log(`Recibiendo solicitud para completar el reto con ID: ${id}`);
  
  // Aquí iría la lógica para verificar si el usuario cumplió el reto
  // y para otorgar la recompensa.
  
  const isChallengeCompleted = true; // Simulación: siempre es verdadero
  
  if (isChallengeCompleted) {
    return NextResponse.json({
      status: "success",
      message: "Reto completado y recompensa otorgada con éxito.",
      challengeId: id
    });
  } else {
    return NextResponse.json({
      status: "error",
      message: "El reto no ha sido completado aún.",
    }, { status: 400 });
  }
}
