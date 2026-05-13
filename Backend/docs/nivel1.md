# Nivel 1 - Planificación de Desarrollo Asistido por IA

> Objetivo: Implementar una funcionalidad mínima viable (MVP) de forma rápida, funcional y sin sobreingeniería.

1. **MVP funcional con el mínimo código posible**
   - Implementá la funcionalidad requerida con el menor conjunto de código que logre el resultado deseado.
   - Evitá código superfluo, decorativo o anticipatorio.

2. **Modularización y estructuración mínima**
   - Organizá el código en módulos o funciones solo cuando sea claramente necesario para mantener orden básico.
   - No sobreestructures ni anticipes escenarios futuros.

3. **Evitar el caos sin caer en la sobreingeniería**
   - No ensuciar el proyecto con código desprolijo, duplicado o inconsistente.
   - Tampoco añadir capas innecesarias como abstracciones genéricas, patrones de diseño adelantados o configuraciones extensas.

4. **Variables sensibles o configurables**
   - Si hay variables que deberían eventualmente ir a un `.env`, dejalas definidas en el código, pero:
     - Documentalas con comentarios indicando su propósito.
     - Usá nombres descriptivos para que su futura extracción al entorno sea sencilla.

5. **Documentación en comentarios**
   - Agregá comentarios breves, claros y enfocados en:
     - Qué hace cada bloque de código.
     - Qué parte representa una configuración temporal.
     - Qué se debe tener en cuenta para una futura mejora si es evidente.

---

Este nivel es ideal para validar ideas, hacer pruebas de concepto o avanzar rápidamente en funcionalidades que luego serán refactorizadas en niveles superiores.

## Notas para NestJS (backend del proyecto)

1. **Scripting directo y claro**

   Usá módulos ES con TypeScript de forma coherente en todo el proyecto.

   En `main.ts`, mantené el flujo principal (configuración de Prisma, middlewares, prefijo global de API) en el nivel superior y colocá la lógica secundaria en módulos importados.

   Cada módulo de NestJS (`auth`, `users`, `jobs`, `applications`, `cv`) debe tener su propio archivo de módulo, controlador y servicio desde el inicio.

2. **Variables configurables**

   Centralizá las variables de entorno en un archivo `.env` y accedelas con `process.env` directamente en esta etapa.

   Variables mínimas necesarias para el MVP:

   ```
   PORT=3000
   DATABASE_URL=           # URL de conexión para Prisma
   JWT_SECRET=             # Clave para firmar tokens JWT
   JWT_EXPIRES_IN=         # Tiempo de expiración del token (ej: 7d)
   ANTHROPIC_API_KEY=      # API key para análisis de CVs con IA
   FRONTEND_URL=           # URL del frontend para CORS
   ```

   Documentá en el README cuáles son obligatorias.

3. **Estructura mínima de módulos**

   Implementá los módulos en este orden de prioridad para el MVP:

   1. `auth` — registro y login con JWT, diferenciación de roles (candidato/empresa)
   2. `jobs` — CRUD de ofertas laborales (empresas crean, candidatos leen)
   3. `applications` — postulaciones de candidatos a ofertas
   4. `cv` — carga de PDF y análisis básico con IA

   El módulo `search` (búsqueda con filtros) puede dejarse para Nivel 2.

4. **Uso del schema de Prisma existente**

   El schema de Prisma ya fue definido por el equipo. No lo modifiques en esta etapa sin coordinación.

   Usá `PrismaService` como wrapper del cliente de Prisma e inyectalo en los servicios que lo necesiten.

   Ejemplo mínimo de servicio:

   ```typescript
   // jobs/jobs.service.ts
   // Servicio de ofertas laborales - solo lógica de acceso a datos en esta etapa
   @Injectable()
   export class JobsService {
     constructor(private prisma: PrismaService) {}

     findAll() {
       return this.prisma.job.findMany(); // TODO: agregar filtros en Nivel 2
     }
   }
   ```

5. **Autenticación y roles**

   En esta etapa, implementá JWT de forma directa con `@nestjs/jwt` y `passport-jwt`.

   Usá un guard básico que verifique el token y exponga el usuario en `req.user`.

   El rol del usuario (candidato/empresa) debe incluirse en el payload del JWT para poder proteger rutas según rol.

   ```typescript
   // Ejemplo de payload del JWT
   // { sub: userId, email: string, role: 'CANDIDATE' | 'COMPANY' }
   ```

6. **Endpoints mínimos del MVP**

   ```
   POST /auth/register   — registro con rol (candidato o empresa)
   POST /auth/login      — login, devuelve JWT
   GET  /jobs            — listar ofertas (público)
   POST /jobs            — crear oferta (solo empresa)
   GET  /jobs/:id        — detalle de oferta
   POST /applications    — postularse a una oferta (solo candidato)
   GET  /applications    — ver postulaciones propias
   POST /cv/upload       — subir CV en PDF (solo candidato)
   ```

7. **Análisis de CV con IA (mínimo viable)**

   En esta etapa, el análisis de CV puede ser un endpoint simple que:
   - Reciba el texto extraído del PDF (o el ID del CV ya subido).
   - Lo envíe a la API de Anthropic con un prompt básico.
   - Devuelva el resultado sin persistirlo todavía.

   ```typescript
   // cv/cv.service.ts
   // CONFIGURACIÓN TEMPORAL — mover ANTHROPIC_API_KEY a .env antes de producción
   const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
   ```

8. **Depuración**

   En esta etapa, `console.log()` está bien para trazas rápidas.

   NestJS tiene un logger integrado (`Logger`) que podés usar desde el inicio sin configuración extra:

   ```typescript
   private readonly logger = new Logger(JobsService.name);
   this.logger.log('Listando ofertas laborales');
   ```
