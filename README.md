<div align="center">

# ApplyAI

**La selección de personal, potenciada por inteligencia artificial.**

ApplyAI conecta talento con oportunidad eliminando el ruido del proceso de reclutamiento tradicional. Los candidatos construyen su perfil profesional, las empresas publican sus vacantes, y la IA se encarga del análisis pesado.

[![Frontend](https://img.shields.io/badge/Frontend-En%20vivo-brightgreen?style=flat-square)](https://your-frontend-url.com)
[![Backend](https://img.shields.io/badge/API-En%20vivo-blue?style=flat-square)](https://your-backend-url.com)
[![License](https://img.shields.io/badge/Licencia-MIT-gray?style=flat-square)](#)

</div>

---

## ¿Por qué ApplyAI?

Los procesos de selección tradicionales son lentos, repetitivos y costosos. Los reclutadores pierden horas leyendo CVs que no encajan, y los candidatos postulan sin recibir respuesta.

ApplyAI resuelve eso. Es una plataforma web donde candidatos y empresas se encuentran, y donde un motor de inteligencia artificial extrae habilidades, resume experiencia y sugiere automáticamente los perfiles más compatibles con cada puesto — en segundos.

---

## Funcionalidades

### Para candidatos
- Registro y gestión del perfil profesional
- Carga de CV en formato PDF
- Exploración y postulación a ofertas laborales
- Seguimiento del estado de cada postulación

### Para empresas
- Publicación y administración de ofertas de trabajo
- Búsqueda y filtrado de candidatos por habilidades, experiencia y ubicación
- Análisis de CVs con un clic mediante inteligencia artificial
- Visualización de resúmenes generados por IA y scores de compatibilidad

### Motor de IA
- Extrae habilidades, tecnologías y experiencia laboral de cualquier CV
- Genera un resumen profesional estructurado por candidato
- Ordena y sugiere los perfiles más compatibles con una vacante
- Detecta habilidades faltantes entre un candidato y los requisitos del puesto

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | HTML · CSS · JavaScript |
| Backend | NestJS |
| Base de datos | *(Supabase) * |
| Integración IA | Anthropic Claude API |
| Despliegue | Vercel · Render |

La arquitectura es **cliente-servidor**: el frontend se comunica con el backend únicamente a través de la API REST, manteniendo ambas capas completamente desacopladas.

---

## API

```
POST   /auth/register          Registro de usuario (candidato o empresa)
POST   /auth/login             Autenticación y obtención de token

GET    /jobs                   Listar ofertas laborales activas
POST   /jobs                   Crear una nueva oferta
GET    /jobs/:id               Detalle de una oferta específica

POST   /applications           Postularse a una oferta
GET    /applications           Listar postulaciones (filtradas por rol)

POST   /cv/upload              Subir CV en PDF
POST   /cv/:id/analyze         Iniciar análisis de IA sobre un CV
```

---

## Estructura del proyecto

```
applyai/
├── frontend/                  # Cliente HTML/CSS/JS
│   ├── pages/
│   ├── components/
│   └── assets/
├── backend/                   # API REST con NestJS
│   ├── src/
│   │   ├── auth/
│   │   ├── jobs/
│   │   ├── applications/
│   │   ├── cv/
│   │   └── ai/
│   └── test/
└── docs/                      # Arquitectura, modelo de datos, documentación
```

---

## Instalación y uso local

### Requisitos previos

- Node.js 18+
- npm o yarn

### Pasos

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/applyai.git
cd applyai

# Instalar dependencias del backend
cd backend
npm install

# Instalar dependencias del frontend (si aplica)
cd ../frontend
npm install
```

### Variables de entorno

Crear un archivo `.env` dentro de `/backend`:

```env
DATABASE_URL=tu_url_de_base_de_datos
JWT_SECRET=tu_clave_secreta
ANTHROPIC_API_KEY=tu_api_key
```

### Correr en local

```bash
# Iniciar el backend
cd backend
npm run start:dev

# Abrir el frontend
# Abrir frontend/index.html en el navegador o usar un servidor local
```

---

## Despliegue

| Capa | Servicio |
|---|---|
| Frontend | Vercel |
| Backend | Render |
| Base de datos | Supabase |

🔗 **App:** `[agregar URL]`  
🔗 **API:** `[agregar URL]`

---

## Equipo

| | Nombre | Rol |
|---|---|---|
| 👤 | **Santino Bertola** | Desarrollador Full-stack |
| 👤 | **Mateo Garcia** | Desarrollador Full-stack |

---

## Contexto académico

Proyecto final desarrollado para la materia **Ingeniería Web II · 2026**, aplicando conceptos de arquitectura cliente-servidor, diseño de APIs REST, procesamiento de documentos, integración con IA y despliegue en la nube.

---

<div align="center">
  <sub>Hecho con ☕ y muchos <code>npm install</code> de más.</sub>
</div>
