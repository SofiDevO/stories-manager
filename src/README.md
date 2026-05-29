# Lección: Punto de Entrada (Index)

Hemos llegado al nivel más alto de nuestra aplicación. El archivo `src/index.ts` es donde arranca todo. Es el "Main" de nuestro proyecto.

Como estamos desarrollando para **Cloudflare Workers**, este archivo tiene una estructura particular dictada por el entorno *Serverless* / *Edge*.

---

## 1. Inicialización de la Aplicación

```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";
import { storiesRouter } from "./api/routes/stories.routes";

const app = new Hono<{ Bindings: CloudflareBindings }>();
```
Aquí es donde `Hono` nace. Fíjate que al instanciarlo, le decimos qué tipos globales de Cloudflare va a recibir (`CloudflareBindings`). Esto alimenta a todo el resto de la aplicación con los tipos correctos para la base de datos `D1`, las variables de entorno, etc.

---

## 2. Configuración Global (CORS)

Antes de registrar ninguna ruta, configuramos los Middlewares globales, como el CORS (Cross-Origin Resource Sharing).

```typescript
app.use(
  "*",
  cors({
    origin: (origin, c) => {
      const allowed = c.env.ASTRO_SITE;
      return allowed ?? "*";
    },
    // ...
  }),
);
```
CORS es un mecanismo de seguridad de los navegadores. Le dice al navegador: *"¿Debería permitir que una página web en `misitio.com` haga peticiones a esta API?"*.
Aquí estamos haciendo algo dinámico: leemos la variable de entorno `c.env.ASTRO_SITE` para saber cuál es el dominio de nuestro Frontend oficial (nuestro sitio hecho en Astro). Si está configurado, solo aceptaremos peticiones de allí; si no, aceptamos de cualquier lado (`*`).

---

## 3. Registro de Rutas (Montaje)

```typescript
app.route("/api/v1/stories", storiesRouter);
```
En lugar de escribir todas las rutas aquí, importamos el `storiesRouter` que analizamos en lecciones pasadas y lo "montamos" bajo un prefijo común.
Esto significa que cualquier ruta definida en `stories.routes.ts` (como `GET /`) ahora responderá bajo la URL base `https://tu-api.com/api/v1/stories`. Esto facilita el versionado de la API (v1, v2, etc.).

---

## 4. El Objeto Exportado (`export default`)

La mayor diferencia entre una app tradicional en Node.js y un Cloudflare Worker es cómo se arranca el servidor.
En Node.js verías algo como `app.listen(3000)`. En un Worker, no "escuchas" un puerto, sino que **exportas manejadores de eventos**.

```typescript
export default {
  // Manejador HTTP
  fetch: app.fetch,

  // Manejador Cron (Tareas programadas)
  async scheduled(event: ScheduledEvent, env: CloudflareBindings, ctx: ExecutionContext) {
    console.log(`[Cron Trigger] Iniciando limpieza a las ${new Date().toISOString()}`);
    // Aquí pondríamos la lógica para llamar a deleteExpiredStories()
  },
};
```

*   **`fetch`**: Le dice a Cloudflare: *"Cada vez que recibas una petición HTTP, entrégasela a la función `app.fetch` de Hono"*. Hono tomará la petición y la pasará por nuestros middlewares y controladores.
*   **`scheduled`**: Cloudflare Workers permite definir tareas recurrentes (Cron Jobs). Cuando se dispare el evento programado (por ejemplo, cada hora), Cloudflare ejecutará esta función en lugar del flujo HTTP normal. ¡Es el lugar perfecto para limpiar la base de datos de historias expiradas sin necesitar un servidor extra!

## Resumen Final

El archivo `index.ts` es el pegamento de la infraestructura. Combina el framework web (Hono), la seguridad global (CORS), el árbol de rutas (`/api/v1`) y los disparadores del entorno de ejecución de Cloudflare (`fetch` y `scheduled`). A partir de aquí, la responsabilidad cae en las capas inferiores que hemos estudiado previamente.
