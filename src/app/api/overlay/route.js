import { NextResponse } from 'next/server';

export async function GET() {
  // Datos simulados de la partida en tiempo real
  const overlayData = {
    summonerName: "Faker",
    champion: "LeBlanc",
    role: "Mid",
    tips: [
      {
        id: 1,
        content: "Aprovecha tu 'Distorsión' (W) para entrar, infligir daño y reposicionarte de manera segura."
      },
      {
        id: 2,
        content: "Usa tu 'Cadenas Etéreas' (E) para inmovilizar a un objetivo y preparar un combo letal."
      },
      {
        id: 3,
        content: "Tu pasiva 'Espejismo' puede confundir a los enemigos y ayudarte a escapar de situaciones peligrosas."
      }
    ],
    // Simulación de los consejos más importantes en el momento
    currentAdvice: "¡Atención! La definitiva de tu oponente (Zed) está disponible. Juega con cuidado y guarda tu W para esquivar su daño."
  };
  return NextResponse.json(overlayData);
}
