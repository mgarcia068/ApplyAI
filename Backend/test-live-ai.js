require('dotenv').config({ path: '../.env' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    console.log('No GEMINI_API_KEY found in .env');
    return;
  }

  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.0-flash',
    generationConfig: { responseMimeType: 'application/json' }
  });

  const prompt = `
    Eres un experto seleccionador de personal de IT y un Coach de Carrera. Lee el siguiente CV y realiza dos tareas: 
    1. Extraer los datos profesionales del perfil.
    2. Evaluar el documento (el CV como tal) para darle feedback constructivo al candidato sobre cómo mejorar su hoja de vida.

    Devuelve la información en formato JSON estricto con esta estructura:
    - "summary": Un resumen profesional de máximo 3 oraciones sobre la trayectoria.
    - "skills": Un array de strings con habilidades blandas y métodos de trabajo.
    - "technologies": Un array de strings listando únicamente tecnologías, lenguajes, frameworks o herramientas.
    - "experience": Un array de strings resumiendo su experiencia laboral.
    - "strengths": Un array de strings con 3 puntos fuertes DE ESTE DOCUMENTO CV basandote en la estructura y claridad.
    - "weaknesses": Un array de strings con 3 críticas constructivas reales sobre CÓMO MEJORAR EL DOCUMENTO.
    - "overallScore": Un número del 1 al 100 que califique EXCLUSIVAMENTE la calidad de redacción, legibilidad y formato de este CV.

    Texto del CV:
    """
    Juan Perez
    Desarrollador Full Stack Javascript con 5 años de experiencia en React y Node.js.
    He trabajado en proyectos de e-commerce y fintech.
    Estudios: Ingeniería en Sistemas.
    Idiomas: Inglés avanzado.
    """
  `;

  try {
    console.log('Sending request to Gemini...');
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    console.log('--- RESPONSE ---');
    console.log(text);
    console.log('--- END RESPONSE ---');
    
    // Test parsing
    let jsonRaw = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (jsonMatch) {
      jsonRaw = jsonMatch[1].trim();
    } else {
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonRaw = text.substring(firstBrace, lastBrace + 1).trim();
      }
    }
    jsonRaw = jsonRaw.replace(/,(?=\s*[}\]])/g, '');
    
    const parsed = JSON.parse(jsonRaw);
    console.log('Parsed successfully:', Object.keys(parsed));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
