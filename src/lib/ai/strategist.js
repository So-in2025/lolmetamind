import { GEMINI_API_KEY } from '@/services/apiConfig';
// CRÍTICO: Importar la nueva función para Live Coaching
import { createInitialAnalysisPrompt, createChallengeGenerationPrompt, createLiveCoachingPrompt } from './prompts';

const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

export const generateStrategicAnalysis = async (analysisData) => {
  let prompt;
  
  // CRÍTICO: Lógica para decidir qué prompt generar
  if (analysisData.liveGameData) {
    // Caso de Live Coaching (llamado desde websocket-server.js)
    prompt = createLiveCoachingPrompt(analysisData.liveGameData, analysisData.zodiacSign);
  } else {
    // Caso de Análisis Inicial o Generación de Desafíos (usando el prompt pre-construido)
    prompt = analysisData.customPrompt;
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Error de la API de Gemini: ${response.status} ${errorBody}`);
      // Fallback a datos simulados si la API falla
      return handleSimulatedResponse(prompt, analysisData);
    }

    const data = await response.json();
    // Limpieza de JSON estándar
    const rawText = data.candidates[0].content.parts[0].text;
    const jsonText = rawText.replace(/\\\`\`\`json/g, '').replace(/\\\`\`\`/g, '').replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(jsonText);

  } catch (error) {
    console.error('Error al generar análisis estratégico:', error);
    // Fallback a datos simulados si el JSON es inválido
    return handleSimulatedResponse(prompt, analysisData);
  }
};

const handleSimulatedResponse = (prompt, analysisData) => {
    
  if (prompt.includes('Tu misión es proporcionar un consejo estratégico de alta prioridad')) {
    // SIMULACIÓN para Live Coach
    return {
      "realtimeAdvice": "¡Atención! El jungla enemigo (Elise) está en el top-side, considera rotar a bot para presionar el objetivo.",
      "priorityAction": "ROAM",
      "message": "Consejo generado por simulación para prueba de Live Coach."
    };
  }
    
  if (prompt.includes('crear 3 desafíos de mejora')) {
    // Simulación de respuesta para desafíos, más realista y variada
    return [
      {
        "title": "Control de Visión Avanzado",
        "description": "En tus próximas 3 partidas, asegúrate de tener una puntuación de visión superior a 1.2 por minuto. La información es la clave de la victoria.",
        "challenge_type": "daily",
        "metric": "visionScore",
        "goal": 1.2
      },
      {
        "title": "Impacto en las Peleas de Equipo",
        "description": "Logra una participación en asesinatos (KP) del 60% o más en tus próximas 5 partidas clasificatorias.",
        "challenge_type": "weekly",
        "metric": "killParticipation",
        "goal": 60
      },
      {
        "title": "Gestión de Oleadas Eficiente",
        "description": "Mantén un promedio de súbditos por minuto (CS/min) de 8.0 o más en 4 de tus próximas 5 partidas.",
        "challenge_type": "weekly",
        "metric": "csPerMinute",
        "goal": 8.0
      }
    ];
  } else if (prompt.includes('análisis exhaustivo para')) {
    // Simulación de respuesta para análisis estratégico, con más detalle
    const analysisMap = {
      'Aries': {
        "playstyleAnalysis": {
          "title": "Diagnóstico de tu Estilo de Juego",
          "style": "Duelista Agresivo de Flanco",
          "description": "Tu estilo de juego es audaz y orientado al ataque, buscando duelos 1v1 y flanqueos para desorganizar al enemigo. Tienes la valentía de un Aries y te sientes más cómodo cuando eres el iniciador de la acción."
        },
        "astroTacticSynergy": {
          "title": "Tu Directiva Táctica del Día",
          "description": "Marte, tu planeta regente, te impulsa a la acción. Canaliza esta energía para ser decisivo en los intercambios en línea. No temas un all-in calculado, pero evita la imprudencia que te haga retroceder. Lucha con propósito."
        },
        "masteryCoaching": {
          "title": "Instrucciones para tu Arsenal Principal",
          "tips": [
            {
              "championName": "Yasuo",
              "advice": "Utiliza tu Muro de Viento (W) no solo para bloquear proyectiles, sino también para crear espacio y proteger a tus aliados de habilidades clave durante los asedios."
            },
            {
              "championName": "Lee Sin",
              "advice": "Domina la mecánica de InSec. Tu capacidad para patear a un carry enemigo hacia tu equipo puede ganar una partida en un instante."
            }
          ]
        },
        "newChampionRecommendations": {
          "title": "Expansión de Arsenal",
          "synergy": {
            "champion": "Irelia",
            "reason": "Irelia complementa tu estilo de duelista agresivo con su movilidad y capacidad de daño sostenido en peleas prolongadas. Te hará imparable en el 1v1."
          },
          "development": {
            "champion": "Riven",
            "reason": "Dominar las cancelaciones de animación de Riven mejorará tu velocidad de ejecución y tu toma de decisiones en momentos de alta presión. Te hará un jugador más impredecible y técnico."
          }
        }
      },
      'Tauro': {
        "playstyleAnalysis": {
          "title": "Diagnóstico de tu Estilo de Juego",
          "style": "Coloso Inamovible",
          "description": "Como un muro de contención, tu estilo de juego es defensivo y de alto sostenimiento. Priorizas la supervivencia y el crecimiento a largo plazo, castigando a los enemigos que se exceden."
        },
        "astroTacticSynergy": {
          "title": "Tu Directiva Táctica del Día",
          "description": "Venus te otorga paciencia y resistencia. Utiliza esta energía para farmear con seguridad y construir tu ventaja de oro y experiencia. Tu poder reside en la constancia, no en la agresión prematura."
        },
        "masteryCoaching": {
          "title": "Instrucciones para tu Arsenal Principal",
          "tips": [
            {
              "championName": "Ornn",
              "advice": "No olvides mejorar los objetos de tus aliados. Tu presencia en el equipo se magnifica exponencialmente a medida que la partida avanza."
            }
          ]
        },
        "newChampionRecommendations": {
          "title": "Expansión de Arsenal",
          "synergy": {
            "champion": "Dr. Mundo",
            "reason": "Mundo se alinea con tu estilo defensivo y de sostenimiento. Su capacidad para resistir daño y volver a la vida lo convierte en una fuerza inamovible en el mapa."
          },
          "development": {
            "champion": "Sion",
            "reason": "Jugar con Sion te obligará a pensar en cómo dividir la atención del enemigo y ser una amenaza constante de presión en el mapa."
          }
        }
      },
      'Géminis': {
        "playstyleAnalysis": {
          "title": "Diagnóstico de tu Estilo de Juego",
          "style": "Pícaro Adaptable",
          "description": "Tu juego es versátil y se adapta a cualquier situación. Buscas flanquear, sorprender y castigar los errores del enemigo, siempre un paso adelante."
        },
        "astroTacticSynergy": {
          "title": "Tu Directiva Táctica del Día",
          "description": "Mercurio te dota de una mente ágil. Usa esta energía para rotar por el mapa, ayudar a otras líneas y generar superioridad numérica. Tu movilidad es tu mejor arma."
        },
        "masteryCoaching": {
          "title": "Instrucciones para tu Arsenal Principal",
          "tips": [
            {
              "championName": "LeBlanc",
              "advice": "Usa tu Mímica (R) de forma creativa para confundir al enemigo, simulando una habilidad diferente para un efecto sorpresa."
            }
          ]
        },
        "newChampionRecommendations": {
          "title": "Expansión de Arsenal",
          "synergy": {
            "champion": "Ekko",
            "reason": "Ekko encaja con tu estilo pícaro y adaptable. Su movilidad y capacidad para entrar y salir de las peleas lo convierten en un asesino impredecible."
          },
          "development": {
            "champion": "Fizz",
            "reason": "Dominar a Fizz te enseñará a ser más paciente y a buscar el momento perfecto para entrar a una pelea y eliminar a un objetivo clave."
          }
        }
      },
      'Cáncer': {
        "playstyleAnalysis": {
          "title": "Diagnóstico de tu Estilo de Juego",
          "style": "Guardián Protector",
          "description": "Tu estilo de juego es protector y de apoyo. Eres el ancla de tu equipo, priorizando la seguridad y el crecimiento de tus aliados por encima de tu propio daño."
        },
        "astroTacticSynergy": {
          "title": "Tu Directiva Táctica del Día",
          "description": "La Luna te da empatía y un instinto protector. Usa esta energía para cuidar de tus aliados. La visión y la comunicación son tus mayores fortalezas en este día."
        },
        "masteryCoaching": {
          "title": "Instrucciones para tu Arsenal Principal",
          "tips": [
            {
              "championName": "Nami",
              "advice": "Utiliza tu Maremoto (R) para iniciar peleas o para desenganchar, separando al equipo enemigo y creando oportunidades para tu carry."
            }
          ]
        },
        "newChampionRecommendations": {
          "title": "Expansión de Arsenal",
          "synergy": {
            "champion": "Lulu",
            "reason": "Lulu se alinea perfectamente con tu estilo protector. Su capacidad para potenciar a los aliados y frustrar a los enemigos te hará un guardián aún más formidable."
          },
          "development": {
            "champion": "Taric",
            "reason": "Dominar a Taric te enseñará a proteger a tu equipo de forma pasiva y activa, además de coordinar tus habilidades con el jungla."
          }
        }
      }
    };
    return analysisMap[analysisData.zodiacSign] || analysisMap['Aries']; 
  }
  return { error: true, message: "No se pudo generar un análisis simulado." };
};