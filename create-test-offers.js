const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Conectando con la base de datos...");
  const companies = await prisma.companyProfile.findMany({
    include: { user: true }
  });

  if (companies.length === 0) {
    console.log("No se encontró ningún perfil de empresa en la base de datos.");
    console.log("Por favor, asegúrate de registrarte primero en la aplicación y completar el perfil básico.");
    return;
  }

  const globant = companies.find(c => c.name.toLowerCase().includes('globant'));
  const meli = companies.find(c => c.name.toLowerCase().includes('mercado libre') || c.name.toLowerCase().includes('mercadolibre'));

  if (!globant) {
    console.log("AVISO: No se encontró una empresa con el nombre 'Globant'.");
  } else {
    // Crear ofertas para Globant
    const globantOffers = [
      {
        title: "Senior React Developer (Studio Web)",
        description: "En Globant buscamos un Senior Frontend Developer para liderar la evolución de nuestros componentes web core usando React 18, TypeScript y microfrontends. Diseñarás arquitecturas modulares de alto rendimiento y guiarás a perfiles Junior y Ssr en el stack técnico.",
        skillsRequired: ["React", "TypeScript", "Redux", "Webpack", "CSS Modules", "Git"],
        minExperience: 5,
        location: "Buenos Aires, Argentina",
        modality: "HYBRID"
      },
      {
        title: "Node.js Architect & Technical Lead",
        description: "Buscamos un Tech Lead Backend con experiencia en Node.js, NestJS y PostgreSQL. Definirás la arquitectura de microservicios de una de nuestras plataformas fintech más grandes a nivel internacional, asegurando escalabilidad, buenas prácticas de desarrollo y testing con Jest.",
        skillsRequired: ["Node.js", "NestJS", "PostgreSQL", "Docker", "Redis", "TypeScript", "Jest", "Microservicios"],
        minExperience: 7,
        location: "Remoto (Toda Latinoamérica)",
        modality: "REMOTE"
      }
    ];

    for (const off of globantOffers) {
      // Verificar si ya existe para no duplicar
      const exists = await prisma.jobOffer.findFirst({
        where: { companyId: globant.userId, title: off.title }
      });
      if (exists) {
        console.log(`La oferta '${off.title}' ya existe para Globant.`);
        continue;
      }

      const created = await prisma.jobOffer.create({
        data: {
          companyId: globant.userId,
          title: off.title,
          description: off.description,
          skillsRequired: off.skillsRequired,
          minExperience: off.minExperience,
          location: off.location,
          modality: off.modality
        }
      });
      console.log(`✓ Creada oferta para Globant: ${created.title}`);
    }
  }

  if (!meli) {
    console.log("AVISO: No se encontró una empresa con el nombre 'Mercado Libre' o 'Mercadolibre'.");
  } else {
    // Crear ofertas para Mercado Libre
    const meliOffers = [
      {
        title: "Software Engineer Ssr - Mercado Pago Backend (Golang)",
        description: "En Mercado Libre y Mercado Pago nos encontramos en la búsqueda de perfiles de Ingeniería de Backend para sumarse al equipo de cobros y transferencias. El foco técnico principal es Golang, diseñando APIs de ultra-alta concurrencia y optimizando consultas de bases de datos relacionales y no relacionales a gran escala.",
        skillsRequired: ["Go", "SQL", "Redis", "REST APIs", "Clean Architecture", "Docker", "Concurrencia"],
        minExperience: 3,
        location: "Córdoba, Argentina",
        modality: "HYBRID"
      },
      {
        title: "Product Manager - UX Payments & Checkout",
        description: "Buscamos un Product Manager para el flujo de checkout web de Mercado Pago. Serás responsable de la conversión, optimización del embudo de compras, y coordinación directa con UX y Tech para definir el roadmap de mejoras basadas en A/B testing y data analytics.",
        skillsRequired: ["Product Management", "A/B Testing", "Data Analytics", "UX/UI", "Agile", "Amplitude"],
        minExperience: 4,
        location: "Buenos Aires, Argentina",
        modality: "HYBRID"
      }
    ];

    for (const off of meliOffers) {
      // Verificar si ya existe para no duplicar
      const exists = await prisma.jobOffer.findFirst({
        where: { companyId: meli.userId, title: off.title }
      });
      if (exists) {
        console.log(`La oferta '${off.title}' ya existe para Mercado Libre.`);
        continue;
      }

      const created = await prisma.jobOffer.create({
        data: {
          companyId: meli.userId,
          title: off.title,
          description: off.description,
          skillsRequired: off.skillsRequired,
          minExperience: off.minExperience,
          location: off.location,
          modality: off.modality
        }
      });
      console.log(`✓ Creada oferta para Mercado Libre: ${created.title}`);
    }
  }
}

main()
  .catch(e => {
    console.error("Error al ejecutar el script:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
