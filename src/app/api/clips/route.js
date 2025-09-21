import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const clipData = await request.json();
    console.log('API de Clips recibiendo datos:', clipData);

    // En un proyecto real, aquí se añadiría un job a una cola de trabajos (ej. Redis).
    // Por ahora, simulamos el procesamiento.
    const mockWorker = require('../../../../workers/video-processor/processClip');
    await mockWorker.processVideoClipWorker({
      id: Date.now(),
      data: {
        videoUrl: "https://example.com/video.mp4",
        timestamp: clipData.timestamp || 60,
        duration: clipData.duration || 15,
        brandingText: clipData.brandingText || 'SOIN LoL MetaMind'
      }
    });

    return NextResponse.json({ status: 'success', message: 'Procesamiento de clip iniciado.' });
  } catch (error) {
    console.error('Error en la API de Clips:', error);
    return NextResponse.json({ error: 'Hubo un error al iniciar el procesamiento del clip' }, { status: 500 });
  }
}
