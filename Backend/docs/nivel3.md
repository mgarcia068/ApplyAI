# Nivel 3 - Pruebas, Calidad y Documentación Exhaustiva

> Objetivo: Asegurar que el código implementado sea confiable, verificable y esté documentado de forma completa, elevando el estándar de calidad del proyecto.

1. **Pruebas unitarias**
   - Escribí pruebas unitarias que validen el comportamiento de cada función, clase o componente clave.
   - Priorizá casos normales, bordes y fallos esperados.
   - Usá frameworks de prueba estandarizados según el lenguaje.

2. **Pruebas de integración**
   - Asegurate de que los distintos módulos trabajen correctamente entre sí.
   - Escribí pruebas para flujos que involucren múltiples componentes.
   - Validá conexiones con servicios externos o dependencias (mockeando cuando sea necesario).

3. **Cobertura de pruebas eficiente**
   - Buscá el equilibrio ideal: la **mínima cantidad de pruebas** que logre la **máxima cobertura significativa**.
   - No se requiere cobertura absoluta del 100%, pero sí que los caminos críticos estén completamente verificados.

4. **Ejecución de pruebas**
   - Al finalizar este nivel, todas las pruebas nuevas y preexistentes deben ejecutarse sin errores.
   - Automatizá la ejecución mediante comandos o scripts disponibles en el proyecto.

5. **Linting y calidad del código**
   - Corré un linter apropiado para el lenguaje y corregí advertencias y errores de estilo o sintaxis.
   - Asegurate de que el código cumpla con las convenciones del equipo o comunidad.
   - Aplicá formateo automático si corresponde.

6. **Documentación exhaustiva**
   - Documentá cada función pública, clase y módulo:
     - Qué hace, qué parámetros recibe, qué devuelve.
     - Casos de uso, comportamientos esperados y excepciones.
   - Mantené actualizada la documentación si el comportamiento del código cambia.
   - Agregá ejemplos de uso donde sea útil o no obvio.

7. **Verificación final**
   - Confirmá que:
     - Todo el código está probado adecuadamente.
     - No quedan comentarios o bloques sin terminar.
     - La estructura es consistente con los niveles anteriores.
     - La documentación y las pruebas reflejan fielmente el comportamiento actual del código.

---

Este nivel representa la consolidación de la funcionalidad desarrollada, garantizando que sea confiable, mantenible y comprensible para cualquier miembro del equipo o para desarrollos futuros.

## Notas para NestJS (backend del proyecto)

1. **Pruebas unitarias y de integración**

   NestJS ya incluye Jest preconfigurado. Organizá las pruebas así:

   ```
   src/
   ├── auth/
   │   ├── auth.service.spec.ts       # pruebas unitarias del servicio
   │   └── auth.controller.spec.ts
   ├── jobs/
   │   └── jobs.service.spec.ts
   ├── cv/
   │   └── cv.service.spec.ts         # incluir mock de AiAnalysisService
   test/
   ├── auth.e2e-spec.ts               # pruebas de integración de endpoints
   ├── jobs.e2e-spec.ts
   └── applications.e2e-spec.ts
   ```

   **Flujos críticos a cubrir obligatoriamente:**

   - Registro y login de candidato y empresa (roles distintos)
   - Protección de rutas: empresa no puede postularse, candidato no puede crear ofertas
   - Subida y análisis de CV (mockear la llamada a la API de Anthropic)
   - Postulación a una oferta y verificación del estado

2. **Mocking de dependencias externas**

   La API de Anthropic debe mockearse en pruebas para no depender de conectividad ni consumir créditos:

   ```typescript
   // cv/cv.service.spec.ts
   const mockAiAnalyzer = {
     analyze: jest.fn().mockResolvedValue({
       skills: ['TypeScript', 'NestJS'],
       experience: '2 años como desarrollador backend',
       summary: 'Desarrollador backend con experiencia en Node.js',
       technologies: ['Node.js', 'PostgreSQL', 'Prisma'],
     }),
   };

   providers: [
     CvService,
     { provide: IAiAnalyzer, useValue: mockAiAnalyzer },
   ]
   ```

   Prisma también debe mockearse en pruebas unitarias usando `jest.fn()` o la librería `jest-mock-extended`.

3. **Pruebas de integración con Supertest**

   Usá el módulo de testing de NestJS junto con Supertest para pruebas de endpoints end-to-end:

   ```typescript
   // test/jobs.e2e-spec.ts
   it('POST /jobs debería requerir rol COMPANY', async () => {
     const candidateToken = await loginAs('candidate');
     return request(app.getHttpServer())
       .post('/jobs')
       .set('Authorization', `Bearer ${candidateToken}`)
       .expect(403);
   });
   ```

4. **Medición de cobertura**

   Jest ya viene configurado en NestJS. Agregá en `package.json`:

   ```json
   {
     "scripts": {
       "test": "jest",
       "test:e2e": "jest --config ./test/jest-e2e.json",
       "test:cov": "jest --coverage"
     }
   }
   ```

   Umbrales recomendados para este proyecto (configurar en `jest.config.js`):

   ```js
   coverageThreshold: {
     global: {
       branches: 80,
       functions: 85,
       lines: 85,
     }
   }
   ```

5. **Linting y calidad de código**

   NestJS genera el proyecto con ESLint y Prettier preconfigurados. En este nivel:

   - Corré `npm run lint` y corregí todos los errores y warnings.
   - Corré `npm run format` para aplicar formateo consistente.
   - Configurá Husky para que lint y formato corran automáticamente antes de cada commit:

   ```bash
   npm install --save-dev husky lint-staged
   npx husky init
   ```

   ```json
   // package.json
   "lint-staged": {
     "*.ts": ["eslint --fix", "prettier --write"]
   }
   ```

6. **Documentación con Swagger**

   NestJS tiene integración nativa con Swagger a través de `@nestjs/swagger`. Documentá todos los endpoints:

   ```typescript
   // main.ts
   const config = new DocumentBuilder()
     .setTitle('Plataforma de Selección de Personal')
     .setDescription('API REST para gestión de candidatos, empresas y ofertas laborales')
     .setVersion('1.0')
     .addBearerAuth()
     .build();
   const document = SwaggerModule.createDocument(app, config);
   SwaggerModule.setup('api/docs', app, document);
   ```

   Decorá los DTOs y controladores con `@ApiProperty`, `@ApiOperation` y `@ApiResponse` para que la documentación sea útil y completa.

7. **Documentación del uso de IA (requerido por la cátedra)**

   El proyecto requiere documentar el uso de IA. Incluí en el README una sección explicando:

   - Qué modelo de IA se usa (Anthropic Claude).
   - Qué prompt se le envía al analizar un CV.
   - Qué información extrae (habilidades, experiencia, tecnologías, resumen).
   - Cómo se integra en el flujo: quién lo puede usar (solo empresas), desde qué endpoint, y qué se persiste.

   Ejemplo de estructura para el README:

   ```markdown
   ## Integración con Inteligencia Artificial

   El sistema utiliza la API de Anthropic (Claude Sonnet) para analizar los CVs
   cargados por los candidatos.

   **Endpoint:** `POST /cv/analyze/:cvId`
   **Acceso:** solo usuarios con rol COMPANY

   **Qué analiza:**
   - Habilidades técnicas y blandas
   - Experiencia laboral (años y área)
   - Tecnologías mencionadas
   - Resumen profesional generado automáticamente

   **Flujo:** la empresa solicita el análisis → el backend extrae el texto del PDF
   almacenado → se envía a la API de Anthropic → el resultado se persiste
   en la base de datos y se devuelve al cliente.
   ```

8. **Scripts NPM recomendados**

   ```json
   {
     "scripts": {
       "start": "nest start",
       "start:dev": "nest start --watch",
       "start:prod": "node dist/main",
       "build": "nest build",
       "test": "jest",
       "test:e2e": "jest --config ./test/jest-e2e.json",
       "test:cov": "jest --coverage",
       "lint": "eslint \"{src,apps,libs,test}/**/*.ts\"",
       "format": "prettier --write \"src/**/*.ts\""
     }
   }
   ```
