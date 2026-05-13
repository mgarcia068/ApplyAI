# Nivel 2 - Estructuración y Principios de Diseño

> Objetivo:
1. Tomar la funcionalidad creada en Nivel 1 y reorganizarla aplicando principios de diseño que aseguren escalabilidad, mantenibilidad y calidad de código.
2. Durante el proceso proteger la funcionalidad lograda en la etapa 1 a toda costa evitando decisiones de ingeniería que la comprometan.

1. **Estructura del proyecto**
   - Reorganizá el código en módulos, carpetas y archivos según responsabilidades claramente delimitadas.
   - Nombrá los archivos y carpetas de manera coherente con el dominio funcional.
   - Evitá estructuras innecesariamente profundas.

2. **Aplicación de principios SOLID**
   - **S**: Cada clase, función o módulo debe tener una sola responsabilidad clara.
   - **O**: El código debe poder extenderse sin modificar su comportamiento interno.
   - **L**: Usá interfaces o clases base que puedan ser sustituidas sin romper el sistema.
   - **I**: No obligues a las implementaciones a depender de métodos que no usen.
   - **D**: Dependé de abstracciones, no de implementaciones concretas.

3. **Aplicación de patrones de diseño**
   - Elegí el patrón de diseño más adecuado según el contexto.
   - El patrón debe facilitar el cumplimiento de SOLID y Clean Code.
   - No fuerces la aplicación de un patrón si no hay una necesidad concreta.

4. **Aprovechamiento del ecosistema del proyecto**
   - Reutilizá componentes, módulos o servicios ya implementados siempre que sean pertinentes.
   - Evitá duplicación de lógica o estructuras ya existentes.
   - Alineá el nuevo código con las convenciones y herramientas propias del proyecto.

5. **Principios de Clean Code**
   - Nombrá funciones, variables y clases de forma descriptiva y consistente.
   - Eliminá código muerto, duplicado o comentado sin sentido.
   - Cada función debe hacer una sola cosa y hacerlo bien.
   - Mantené la legibilidad como prioridad sin sacrificar funcionalidad.

6. **Configuraciones y variables de entorno**
   - Extraé al archivo `.env` las variables previamente documentadas en Nivel 1.
   - Usá `@nestjs/config` con `ConfigService` para la carga y validación de variables de entorno.

7. **Documentación mínima pero útil**
   - Comentá aquellas decisiones arquitectónicas o de diseño que se aparten de lo evidente.
   - No repitas en comentarios lo que ya expresa el código bien nombrado.
   - Si el patrón o estructura elegida no es trivial, documentá su intención en una nota breve.

---

Este nivel representa una transición hacia un diseño más profesional, limpio y preparado para crecer en complejidad. Aún se prioriza la claridad y funcionalidad, pero con un enfoque más estructurado y sostenible.

## Notas para NestJS (backend del proyecto)

1. **Organización modular**

   Estructura de carpetas recomendada para el backend:

   ```
   src/
   ├── auth/
   │   ├── auth.module.ts
   │   ├── auth.controller.ts
   │   ├── auth.service.ts
   │   ├── strategies/        # passport strategies (jwt.strategy.ts)
   │   ├── guards/            # guards de autenticación y roles
   │   └── dto/
   ├── users/
   ├── jobs/
   ├── applications/
   ├── cv/
   │   ├── cv.module.ts
   │   ├── cv.controller.ts
   │   ├── cv.service.ts
   │   └── ai/                # lógica de análisis con IA separada
   ├── search/                # módulo de búsqueda con filtros (nuevo en este nivel)
   ├── common/
   │   ├── decorators/        # @Roles(), @CurrentUser()
   │   ├── guards/            # RolesGuard, JwtAuthGuard
   │   ├── filters/           # filtros de excepciones globales
   │   └── pipes/             # pipes de validación
   └── prisma/
       ├── prisma.module.ts
       └── prisma.service.ts
   ```

2. **Aplicación de SOLID**

   **Single Responsibility**

   Separar la lógica de análisis de IA del servicio de CV en su propio servicio (`AiAnalysisService`), ya que son responsabilidades distintas: una maneja archivos, la otra comunica con una API externa.

   **Open/Closed**

   Definí una interfaz `IAiAnalyzer` con un método `analyze(text: string)`. Si en el futuro se cambia el proveedor de IA (de Anthropic a OpenAI, por ejemplo), solo se crea una nueva implementación sin tocar el servicio de CV.

   ```typescript
   // common/interfaces/ai-analyzer.interface.ts
   export interface IAiAnalyzer {
     analyze(cvText: string): Promise<CvAnalysisResult>;
   }
   ```

   **Dependency Inversion**

   Inyectá `IAiAnalyzer` en `CvService` en lugar de depender directamente de `AnthropicAiService`.

3. **Patrones de diseño recomendados**

   **Strategy** — para análisis de CV con IA

   Encapsulá la lógica de llamada a Anthropic en una clase separada que implemente `IAiAnalyzer`. Permite cambiar el proveedor de IA sin modificar `CvService`.

   **Decorator (NestJS)** — para roles y usuario actual

   Creá decoradores personalizados para simplificar el acceso al usuario autenticado y la protección por rol:

   ```typescript
   // Uso limpio en controladores:
   @Get('profile')
   @Roles('COMPANY')
   getProfile(@CurrentUser() user: User) { ... }
   ```

   **Guard compuesto** — para autenticación + rol en un solo paso

   Combiná `JwtAuthGuard` y `RolesGuard` de forma que las rutas protegidas solo necesiten declarar el rol requerido.

4. **Módulo de búsqueda (nuevo en este nivel)**

   Implementá el módulo `search` con filtros para que las empresas puedan buscar candidatos por:
   - habilidades
   - experiencia
   - ubicación
   - área profesional

   Usá query params tipados con un DTO de búsqueda y construí la query de Prisma dinámicamente en el servicio.

   ```typescript
   // search/dto/search-candidates.dto.ts
   export class SearchCandidatesDto {
     @IsOptional() skills?: string;
     @IsOptional() location?: string;
     @IsOptional() area?: string;
     @IsOptional() @Type(() => Number) minExperience?: number;
   }
   ```

5. **Carga de configuración y variables de entorno**

   Reemplazá el uso directo de `process.env` por `ConfigService` de `@nestjs/config`:

   ```typescript
   // app.module.ts
   ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' })

   // En los servicios:
   constructor(private config: ConfigService) {}
   const secret = this.config.get<string>('JWT_SECRET');
   ```

   Variables de entorno a consolidar desde Nivel 1:

   ```
   PORT=3000
   DATABASE_URL=
   JWT_SECRET=
   JWT_EXPIRES_IN=7d
   ANTHROPIC_API_KEY=
   FRONTEND_URL=
   ```

6. **Tipado y limpieza de código**

   NestJS ya usa TypeScript. En este nivel:
   - Definí tipos para todos los DTOs con `class-validator` y `class-transformer`.
   - Tipá los retornos de los servicios explícitamente (evitá `any`).
   - Configurá `"strict": true` en `tsconfig.json`.
   - Integrá `Prettier` y `ESLint` con las reglas del proyecto.

7. **Manejo de errores**

   Reemplazá los `try/catch` sueltos por un filtro de excepciones global que devuelva respuestas consistentes:

   ```typescript
   // common/filters/http-exception.filter.ts
   // Captura todas las excepciones y responde con { statusCode, message, timestamp }
   ```

   Usá las excepciones de NestJS (`NotFoundException`, `UnauthorizedException`, `ForbiddenException`) en lugar de lanzar errores genéricos.
