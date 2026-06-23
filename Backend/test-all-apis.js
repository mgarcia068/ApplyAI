require('dotenv').config({ path: '../.env' });
const { CvService } = require('./src/cv/cv.service');

async function testAll() {
  const mockPrisma = {};
  const mockStorage = {};
  const mockConfig = {
    get: (key) => process.env[key]
  };

  const service = new CvService(mockPrisma, mockStorage, mockConfig);

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

  console.log("Testing generateTextWithFallback...");
  try {
    const responseText = await service.generateTextWithFallback(prompt);
    console.log("--- SUCCESSFUL AI RESPONSE ---");
    console.log(responseText);
    console.log("------------------------------");

    try {
      const parsed = service.extractJsonFromAiResponse(responseText);
      console.log("JSON parsed successfully:", Object.keys(parsed));
    } catch (err) {
      console.error("JSON PARSE ERROR:", err.message);
    }

  } catch (err) {
    console.error("FALLBACK ERROR:", err);
  }
}

testAll();
