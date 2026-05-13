# Backend - Plataforma de Selección de Personal (Ingeniería Web II)

## Stack
- NestJS
- Prisma ORM (schema ya definido por el equipo)
- JWT para autenticación (implementación estándar para el sistema de roles requerido)
- API REST

## Roles de usuario
Hay dos roles con permisos distintos:

**Candidato** puede:
- Registrarse e iniciar sesión
- Completar y editar su perfil profesional
- Subir su CV en formato PDF
- Ver ofertas laborales
- Postularse a ofertas
- Ver el estado de sus postulaciones

**Empresa** puede:
- Registrarse e iniciar sesión
- Publicar ofertas laborales
- Buscar y filtrar candidatos
- Ver perfiles y CVs de candidatos
- Analizar CVs con IA
- Seleccionar candidatos para entrevistas

## Estructura de módulos a implementar
- auth (registro y login con JWT, diferenciación de roles)
- users (gestión de perfiles según rol: candidato/empresa)
- jobs (CRUD de ofertas laborales)
- applications (postulaciones de candidatos a ofertas)
- cv (carga de PDFs y análisis con IA)
- search (búsqueda y filtrado de candidatos por habilidades, experiencia, ubicación y área profesional)

## Endpoints principales (según el PDF)
- POST /auth/register
- POST /auth/login
- GET /jobs
- POST /jobs
- GET /jobs/:id
- POST /applications
- GET /applications
- POST /cv/upload
- GET /candidates (búsqueda con filtros)

## Convenciones
- Un módulo por recurso
- DTOs con class-validator para validaciones
- Guards de JWT en rutas protegidas
- Rutas protegidas según rol (candidato o empresa)
- Separar lógica en service, no en controller

## Contexto importante
El schema de Prisma ya está definido. Al generar código,
siempre respetarlo y usarlo como fuente de verdad para los modelos.
