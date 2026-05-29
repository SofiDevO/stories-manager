# Lección: Enrutamiento y Middlewares (API Routes)

¡Seguimos ascendiendo en las capas de nuestra arquitectura! Ahora hemos llegado a la capa más externa: la **Capa de Presentación** o **API**. 

Específicamente, vamos a analizar la carpeta `src/api/routes`, tomando como ejemplo principal el archivo `stories.routes.ts`. Aquí es donde definimos "las puertas de entrada" a nuestra aplicación.

---

## 1. El Enrutador (Router) con Hono

En este proyecto estamos utilizando **Hono**, un framework web ultrarrápido diseñado específicamente para funcionar en entornos *Edge* como Cloudflare Workers.

```typescript
import { Hono } from "hono";

// Definición del entorno (Tipado estricto)
type Env = {
  Bindings: {
    stories_manager: D1Database;
    JWT_SECRET: string;
  };
  Variables: {
    clientIp: string;
  };
};

export const storiesRouter = new Hono<Env>();
```

### Tipado del Entorno (`Env`)
Una de las mejores prácticas que puedes ver aquí es la definición del tipo `Env`. En Cloudflare Workers, los recursos (como la base de datos `D1Database` o las variables de entorno como `JWT_SECRET`) se inyectan dinámicamente. Al pasarle este tipo a Hono (`new Hono<Env>()`), nos aseguramos de que TypeScript sepa exactamente qué variables están disponibles cuando procesamos una petición, evitando errores en tiempo de ejecución.

---

## 2. Definición de Rutas y Delegación

La función principal de este archivo es mapear una URL (ej. `GET /`) y un verbo HTTP con la función que debe manejar esa petición (el Controlador).

```typescript
// Obtener historias activas (Público)
storiesRouter.get("/", StroriesController.getActive);

// Crear una nueva historia (Protegido por Admin)
storiesRouter.post("/", authMiddleware, StroriesController.create);
```

### Regla de Oro del Enrutador
Fíjate que **no hay lógica de negocio aquí**. El enrutador no valida si el comentario está vacío, ni inserta datos en la base de datos. Su único trabajo es decir: *"Si alguien hace un GET a la raíz (`/`), que se encargue `StroriesController.getActive`"*.

Esta separación es clave en Clean Architecture. El enrutador solo actúa como un director de tráfico.

---

## 3. Middlewares: Los Guardias de Seguridad

Un concepto fundamental que vemos aplicado en este archivo es el uso de **Middlewares**. Un middleware es una función que se ejecuta *antes* de llegar al controlador final.

Vemos dos ejemplos claros:

### A. Middleware de Baneo de IP (`ipBanMiddleware`)
```typescript
storiesRouter.post(
  "/:id/comments",
  ipBanMiddleware,
  StroriesController.addComment,
);
```
Cuando un usuario intenta publicar un comentario, primero pasa por `ipBanMiddleware`. Si ese middleware detecta que la IP está baneada, rechazará la petición inmediatamente (devolviendo un error 403 o 401) y la petición **nunca llegará** a `StroriesController.addComment`. Es un escudo protector.

### B. Middleware de Autenticación (`authMiddleware`)
```typescript
storiesRouter.post("/", authMiddleware, StroriesController.create);
```
Para crear una nueva historia, no queremos que cualquier usuario de internet pueda hacerlo. El `authMiddleware` intercepta la petición, verifica si hay un token JWT válido (indicando que es un administrador que ha iniciado sesión) y, solo si es válido, deja pasar la petición al controlador `create`.

## Resumen

El archivo `stories.routes.ts` es un excelente ejemplo de un enrutador limpio:

1. **Es declarativo:** Al leerlo, puedes entender de un vistazo qué rutas existen (Endpoints) y qué nivel de seguridad tienen (gracias a los middlewares inyectados).
2. **Es tipado:** Define exactamente el entorno (`Env`) que espera recibir de Cloudflare Workers.
3. **Es delegador:** No contiene lógica pesada, simplemente conecta la web HTTP con nuestra capa de controladores.

¡Con esto completamos el entendimiento de cómo una petición entra a nuestra aplicación web antes de tocar la lógica profunda!
