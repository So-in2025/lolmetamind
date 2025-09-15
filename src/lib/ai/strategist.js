export async function getStrategicAnalysis(playersData) {
  console.log("Generando análisis para:", playersData);
  const analysis = {
    champion: 'Lux',
    role: 'Mid',
    archetype: 'Mago de Artillería',
    teamAnalysis: {
      strength: "Iniciación y peleas en equipo. Tu equipo (Malphite, Jarvan IV, Leona) tiene una capacidad devastadora para forzar peleas y encadenar control de masas (CC), creando el escenario perfecto para campeones de daño en área como tú.",
      weakness: "Vulnerable al juego dividido (split-push). La composición enemiga con Fiora y Zed puede ejercer mucha presión en las líneas laterales, forzando a tu equipo a separarse, lo que anula su principal fortaleza."
    },
    enemyWeaknesses: [
      "Composición muy frágil (squishy) y susceptible al CC. A excepción de Fiora, el equipo enemigo tiene poca durabilidad y puede ser eliminado rápidamente si es atrapado por la iniciación de Leona o Jarvan IV.",
      "Falta de una línea frontal robusta. No tienen un tanque dedicado, lo que significa que una vez que tu equipo inicia, pueden acceder directamente a sus campeones de alto daño (Master Yi, Zed, Ezreal)."
    ],
    strategicAdvice: [
      {
        priority: "HIGH",
        content: "Zed inevitablemente usará su definitiva sobre ti. Tu prioridad MÁXIMA es comprar 'Zhonya's Hourglass' como segundo ítem. Actívalo justo después de que él reaparezca de su definitiva para anular todo el daño de la explosión."
      },
      {
        priority: "HIGH",
        content: "No te posiciones de forma aislada. El equipo enemigo tiene múltiples amenazas (Zed, Fiora, Master Yi) que pueden eliminarte fácilmente si te encuentran solo. Mantente siempre detrás de tu línea frontal (Malphite, Jarvan IV, Leona) en las peleas."
      },
      {
        priority: "MEDIUM",
        content: "Tu combinación de 'Enlace de Luz' (Q) y 'Chispa Final' (R) es crucial para eliminar objetivos clave. Espera a que Leona o Malphite apliquen su CC y luego descarga todo tu daño sobre el objetivo inmovilizado."
      }
    ]
  };
  return analysis;
}
