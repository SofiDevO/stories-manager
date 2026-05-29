# Arquitectura del Proyecto: Clean Architecture + Hono

¡Bienvenido al documento maestro de arquitectura! Si eres nuevo en este proyecto (`stories-manager`), este es el lugar ideal para empezar. Aquí explicaremos el "panorama general" (Big Picture): cómo estructuramos nuestro código, por qué tomamos esas decisiones y qué tecnologías clave estamos usando.

---

## 1. El Patrón Arquitectónico: Clean Architecture

En este proyecto, hemos adoptado los principios de **Clean Architecture** (Arquitectura Limpia), popularizada por Robert C. Martin ("Uncle Bob"). 

### ¿Qué es y por qué la usamos?
El objetivo principal de Clean Architecture es la **separación de responsabilidades**. Queremos que las reglas de nuestro negocio (ej. "los usuarios baneados no pueden comentar") estén completamente aisladas de las herramientas externas (ej. Bases de datos, Frameworks HTTP, UI).

**Ventajas principales:**
1. **Independencia del Framework:** Nuestro código de negocio no sabe que usamos Hono. Si mañana Hono desaparece, solo reescribiremos la capa de Controladores y Rutas, salvando el 70% de la aplicación.
2. **Independencia de la Base de Datos:** Podemos cambiar de Cloudflare D1 a PostgreSQL sin tocar un solo Caso de Uso o Entidad.
3. **Altamente Testeable:** Como las reglas de negocio no dependen de servidores o bases de datos reales, podemos probarlas fácilmente inyectando "Mocks" (simulacros).

---

## 2. La Estructura de Capas (La "Cebolla")

Piensa en el proyecto como una cebolla. Las capas exteriores ven hacia afuera (el mundo de internet), y las capas interiores contienen las reglas sagradas del negocio. **La regla de oro es la "Regla de Dependencia":** las flechas de código siempre apuntan hacia adentro. Las capas internas nunca deben importar archivos de las capas externas.

Nuestra estructura de directorios en `src/` refleja exactamente esto:

### 🔴 1. Capa de Dominio (`src/domain/`) - *El Núcleo*
*   **`entities/`**: Modelos de datos puros (`interfaces` como `Story`, `Comment`). No saben cómo se guardan ni de dónde vienen.
*   **`repositories/`**: "Contratos" (`interfaces` como `IStoryRepository`). Dicen *qué* datos necesitamos extraer o guardar, pero no dicen *cómo*.

### 🟡 2. Capa de Aplicación (`src/application/`) - *Reglas de Negocio*
*   **`use-cases/`**: Contienen la lógica de lo que nuestra app *sabe hacer* (ej. `AddCommentUseCase`, `CreateStoryUseCase`). Orquestan entidades y repositorios, verificando condiciones lógicas (ej. comprobar baneos, generar UUIDs). Aquí no hay nada de HTTP ni de SQL.

### 🔵 3. Capa de API / Presentación (`src/api/`) - *El Mundo Exterior (Web)*
*   **`routes/`**: Definen las URLs (`GET /stories`) y dirigen el tráfico.
*   **`middlewares/`**: Guardianes que verifican seguridad (ej. JWT, Baneos por IP) *antes* de procesar la petición.
*   **`controllers/`**: Los "Traductores". Reciben JSONs y cabeceras HTTP, inicializan los repositorios reales (pasando variables de entorno), llaman a los Casos de Uso, y luego formatean el resultado en un nuevo JSON con códigos HTTP (200, 400, 403).

### 🟢 4. Capa de Infraestructura (`src/infrastructure/`) - *Tecnologías y Detalles*
*   **`repositories/`**: Clases que *implementan* las interfaces del Dominio (ej. `D1StoryRepository`). Aquí está el código de verdad: las sentencias SQL puras y las llamadas a la base de datos de Cloudflare.
*   **`storage/`**: Conexiones a servicios externos como AWS S3 o Cloudflare R2 para la subida de archivos (Presigned URLs).
*   **`db/`**: Esquemas, migraciones o scripts relacionados netamente con el motor de base de datos.

---

## 3. Nuestro Motor Web: Hono 

En lugar de Express.js o Fastify, el esqueleto web de esta aplicación está construido sobre **[Hono](https://hono.dev/)**.

### ¿Qué es Hono?
Hono (que significa "Fuego" en Hawaiano) es un framework web pequeño, rápido y con tipado estricto diseñado específicamente para funcionar en el "Edge" (Cloudflare Workers, Deno, Bun, Fastly).

### ¿Por qué elegimos Hono?
1. **Velocidad Extrema (Edge-First):** Express.js depende fuertemente de las APIs de Node.js, lo que lo hace incompatible o muy pesado en entornos serverless modernos como Cloudflare Workers. Hono utiliza los estándares web (Fetch API), lo que significa que corre de forma nativa, instantánea y global.
2. **Tipado Estricto (TypeScript):** Hono está construido pensando en TypeScript. Podemos inyectar tipos para nuestro entorno (`<Env>`), lo que nos da autocompletado perfecto para nuestras variables de entorno y recursos externos sin miedo a errores de ejecución.
3. **Manejo de Contexto (`c`):** Todo en Hono gira alrededor del objeto `Context` (`c`). Agrupa la petición (`c.req`), la respuesta (`c.json()`), las variables compartidas (`c.set()`) y el entorno de Cloudflare (`c.env`). ¡Súper limpio!
4. **Middlewares Nativos:** Hono ya trae de fábrica herramientas esenciales como soporte CORS (`hono/cors`) y verificación de JSON Web Tokens (`hono/jwt`), evitándonos instalar pesadas dependencias de terceros.

---

## Conclusión

Al combinar **Clean Architecture** con **Hono** y **Cloudflare Workers/D1**, hemos creado una API que es:
*   **Ultra-rápida:** Se ejecuta cerca del usuario (Edge) con tiempos de arranque milisegundos.
*   **Robusta:** Las reglas de negocio están protegidas de los cambios tecnológicos.
*   **Fácil de Mantener:** Un nuevo desarrollador sabe exactamente dónde buscar (¿Es una regla de negocio? Ve a *Aplicación*. ¿Es una consulta SQL? Ve a *Infraestructura*).
