"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.generateStrategicAnalysis = void 0;
var _apiConfig = require("../../services/apiConfig");
var _prompts = require("./prompts");
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${_apiConfig.GEMINI_API_KEY}`;
const generateStrategicAnalysis = async analysisData => {
  // Ahora el prompt se crea con los datos reales, incluyendo la maestría.
  const prompt = (0, _prompts.createInitialAnalysisPrompt)(analysisData);
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Error de la API de Gemini: ${response.status} ${errorBody}`);
    }
    const data = await response.json();
    const rawText = data.candidates[0].content.parts[0].text;
    const jsonText = rawText.replace(/\\\`\`\`json/g, '').replace(/\\\`\`\`/g, '').replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Error al generar análisis estratégico:', error);
    return {
      error: true,
      message: "El coach de IA no está disponible en este momento. Inténtalo de nuevo más tarde."
    };
  }
};
exports.generateStrategicAnalysis = generateStrategicAnalysis;