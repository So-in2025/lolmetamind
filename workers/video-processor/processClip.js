const ffmpeg = require('fluent-ffmpeg');
const path = require('path');

// --- Versión Corregida ---
ffmpeg.setFfmpegPath('C:\\Users\\VK 690\\Documents\\PROYECTO LOL\\Metamind\\lol-metamind\\ffmpeg\\bin\\ffmpeg.exe');

/**
 * Procesa un trabajo de la cola para generar un clip de video con branding.
 * @param {object} job - El objeto del trabajo de la cola (ej. BullMQ).
 */
async function processVideoClipWorker(job) {
  const { videoUrl, timestamp, duration, brandingText } = job.data;
  const jobId = job.id || 'unknown';
  const outputFileName = `clip_${path.basename(videoUrl, path.extname(videoUrl))}_${Date.now()}.mp4`;

  console.log(`[Worker] Iniciando procesamiento para job #${jobId}...`);
  console.log(`[Worker] Datos: ${JSON.stringify(job.data)}`);

  try {
    const processedFilePath = await new Promise((resolve, reject) => {
      const sanitizedText = brandingText.replace(/'/g, "'\\''");

      // Usamos una URL de video pública y real para las pruebas.
      const realVideoUrl = "https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4";

      ffmpeg(realVideoUrl)
        .setStartTime(timestamp)
        .setDuration(duration)
        .videoFilter({
          filter: 'drawtext',
          options: {
            text: sanitizedText,
            fontsize: 24,
            fontcolor: 'white',
            x: 'w-text_w-15',
            y: 'h-text_h-15',
            box: 1,
            boxcolor: 'black@0.5',
            boxborderw: 8,
          }
        })
        .outputOptions(['-preset fast', '-c:a copy'])
        .on('end', () => {
          console.log(`[FFmpeg] Procesamiento finalizado para: ${outputFileName}`);
          resolve(outputFileName);
        })
        .on('error', (err) => {
          console.error(`[FFmpeg] Error: ${err.message}`);
          reject(err);
        })
        .save(outputFileName);
    });

    console.log(`[S3 Sim] Subiendo '${processedFilePath}' al bucket 'soin-metamind-clips'...`);
    console.log(`[Worker] Job #${jobId} completado exitosamente.`);
    return processedFilePath;
  } catch (error) {
    console.error(`[Worker] Falló el procesamiento del job #${jobId}. Error: ${error.message}`);
    throw error;
  }
}

module.exports = { processVideoClipWorker };
