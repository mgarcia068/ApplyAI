<div align="center">

# ApplyAI

**La seleccion de personal, potenciada por inteligencia artificial.**

</div>

---

## Resumen

ApplyAI es una plataforma web para conectar candidatos y empresas. Los candidatos cargan su perfil y CV en PDF, las empresas publican ofertas y el sistema utiliza IA para analizar curriculums y generar insights de compatibilidad.

Este proyecto fue desarrollado para **Ingenieria Web II (2026)** y aplica arquitectura cliente-servidor, APIs REST, procesamiento de documentos, integracion con IA y despliegue en la nube.

---

## Objetivos del proyecto (segun enunciado)

- Facilitar la conexion entre candidatos y empresas.
- Permitir perfiles profesionales y carga de CV en PDF.
- Permitir publicaciones de ofertas laborales.
- Incorporar busqueda y filtrado de candidatos.
- Integrar IA para analizar CVs y sugerir candidatos.
- Publicar el sistema en hosting gratuito.

---

## Roles

### Candidato

- Registro e inicio de sesion.
- Edicion de perfil profesional.
- Carga de CV en PDF.
- Postulacion a ofertas.
- Visualizacion del estado de sus postulaciones.

### Empresa

- Registro e inicio de sesion.
- Publicacion, edicion y baja de ofertas.
- Busqueda y filtrado de candidatos.
- Analisis de CVs con IA.
- Actualizacion del estado de postulaciones.

---

## Funcionalidades implementadas

- Autenticacion con roles (candidato/empresa) y login con Google.
- Gestion de perfiles de candidatos y empresas.
- Subida y visualizacion de CVs en PDF con validacion por contenido.
- Publicacion y administracion de ofertas laborales.
- Postulaciones con estados (pendiente, visto, aceptado, rechazado).
- Analisis de CV con IA y puntaje general del documento.
- Calculo de compatibilidad (match score) entre CV y oferta.
- Notificaciones por email (bienvenida, postulación, aceptacion, rechazo).
- Almacenamiento de archivos en S3 con fallback local para CVs.

---

## IA: analisis de CV y compatibilidad

- Se extrae el texto del PDF y se envia a un prompt estructurado.
- La IA devuelve JSON con: `summary`, `skills`, `technologies`, `experience`, `strengths`, `weaknesses` y `overallScore`.
- El analisis se persiste en base de datos para reuso.
- Proveedores configurados con fallback (CV): **Gemini** -> **Groq** -> **Anthropic** -> **OpenAI** -> **XAI**.
- El match score de ofertas se calcula con IA a partir del CV analizado y la oferta.

---

## Arquitectura

Cliente (HTML/CSS/JS) -> API REST (NestJS) -> Base de datos (PostgreSQL/Supabase)

- El frontend consume la API via `fetch`.
- El backend expone endpoints REST para autenticacion, ofertas, CVs y postulaciones.

---

## Modelo de datos (Prisma)

- **User**: credenciales y rol.
- **CandidateProfile**: datos del candidato y link al CV.
- **CompanyProfile**: datos de la empresa.
- **JobOffer**: ofertas publicadas.
- **Application**: postulaciones con estado y match score.
- **CvAnalysis**: resultado del analisis IA del CV.

---

## API

### Auth

```
POST /auth/register
POST /auth/login
POST /auth/google
```

### Jobs

```
GET    /jobs
GET    /jobs/me/offers
GET    /jobs/:id
POST   /jobs
POST   /jobs/:id
DELETE /jobs/:id
```

### Applications

```
POST   /applications
GET    /applications
POST   /applications/:id/evaluate
GET    /applications/offer/:offerId
POST   /applications/:id/status
DELETE /applications/offer/:offerId/withdraw
```

### CV

```
POST /cv/upload
POST /cv/analyze/me
POST /cv/analyze/:id
GET  /cv/my-cv
GET  /cv/file/:userId/:filename
```

### Users

```
GET    /users/me
PATCH  /users/me
POST   /users/me/photo
DELETE /users/me
GET    /users
GET    /users/:id
GET    /users/company/:email
```

---

## Stack tecnologico

| Capa | Tecnologia |
| --- | --- |
| Frontend | HTML, CSS, JavaScript |
| Backend | NestJS |
| ORM | Prisma |
| Base de datos | PostgreSQL (Supabase) |
| IA | Gemini, Groq, Anthropic, OpenAI, XAI |
| Storage | AWS S3 (con fallback local para CVs) |
| Email | Nodemailer + Handlebars |
| Deploy | Render (backend), Vercel (frontend) |

---

## Estructura del proyecto

```
Proyecto-web-2/
├── Backend/            # API REST con NestJS
│   ├── src/
│   ├── prisma/
│   └── docs/
├── Frontend/           # HTML/CSS/JS
└── README.md
```

---

## Variables de entorno

Crear `.env` en la raiz o en `Backend/`.

```
PORT=3000
DATABASE_URL=
DIRECT_URL=
JWT_SECRET=
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5500
GOOGLE_CLIENT_ID=

GEMINI_API_KEY=
GROQ_API_KEY=
ANTHROPIC_API_KEY=
GPT_API_KEY=
XAI_API_KEY=

AWS_BUCKET_NAME=
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_ACCESS_KEY=
AWS_SECRET_ACCESS_KEY=
S3_PUBLIC_BASE_URL=
S3_CV_PREFIX=cv

MAIL_HOST=smtp.gmail.com
MAIL_USER=
MAIL_PASS=
MAIL_ENABLED=true
```

---

## Instalacion local

```
# Backend
cd Backend
npm install
npm run prisma:generate
npm run start:dev

# Frontend
# Abrir Frontend/src/index.html o usar Live Server
```

---

## Despliegue

- Backend (Render): https://applyai-umuw.onrender.com
- Frontend: https://apply-mjlqfcu70-mateo-iua.vercel.app/

---

## Equipo

- Santino Bertola
- Mateo Garcia
