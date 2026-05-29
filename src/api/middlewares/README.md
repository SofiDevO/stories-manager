# Lección: Middlewares en Hono

¡Hola! En la lección anterior sobre rutas vimos que los **Middlewares** actúan como "guardias de seguridad". Hoy vamos a abrir la puerta de la carpeta `src/api/middlewares` para ver exactamente **cómo** están escritos esos guardias.

Tenemos dos archivos principales aquí:
1. `auth.middleware.ts`
2. `ipBan.middleware.ts`

Ambos utilizan la función `createMiddleware` de Hono, lo que nos permite escribirlos con tipado estricto. Vamos a desglosar cada uno.

---

## 1. Middleware de Autenticación (`auth.middleware.ts`)

Este middleware es el encargado de proteger nuestras rutas de administración (como la de crear nuevas historias). En lugar de escribir nosotros mismos toda la lógica para desencriptar y verificar tokens, usamos la librería nativa de JWT que nos provee Hono.

```typescript
export const authMiddleware = createMiddleware<Env>(async (c, next) => {
  if (!c.env.JWT_SECRET) {
    return c.json({ error: "Missing JWT_SECRET configuration" }, 500);
  }
  const jwtMiddleware = jwt({
    secret: c.env.JWT_SECRET,
    alg: "HS256",
  });
  return jwtMiddleware(c, next);
});
```

### El patrón `next()`
En el mundo de los middlewares (ya sea en Hono, Express o Koa), siempre verás la función `next()`. 
*   Si todo va bien (el token es válido), el middleware llama a `next()`, lo que significa "puedes pasar al siguiente middleware o al controlador final".
*   Si algo falla (el token es falso o ha expirado), el `jwtMiddleware` interno devolverá un error (típicamente HTTP 401 Unauthorized) y la petición se detendrá allí mismo, sin llamar a `next()`.

## 2. Middleware de Moderación (`ipBan.middleware.ts`)

Este es un middleware **personalizado**, escrito 100% por nosotros para proteger nuestra aplicación de usuarios maliciosos, incluso si son anónimos.

```typescript
export const ipBanMiddleware = createMiddleware<Env>(async (c, next) => {
  // 1. Extraer la IP
  const clientIp = c.req.header("cf-connecting-ip") || "";

  // 2. Verificar en la base de datos
  const moderationRepo = new D1ModerationRepository(c.env.stories_manager);
  const isBanned = await moderationRepo.isIpBanned(clientIp);

  // 3. Bloquear si es necesario
  if (isBanned) {
    return c.json({ success: false, error: "FORBIDDEN", message: "Ip address is banned" }, 403);
  }

  // 4. Compartir información con el Controlador
  c.set("clientIp", clientIp);
  
  // 5. Dejar pasar
  await next();
});
```

### Conceptos Clave aquí:

#### A. `cf-connecting-ip` (Magia de Cloudflare)
En una aplicación de servidor tradicional, obtener la IP real del usuario puede ser complicado si estás detrás de un balanceador de carga o un proxy inverso (te llegaría la IP del proxy, no la del usuario). 
Sin embargo, como nuestro código se ejecuta en **Cloudflare Workers** (directamente en la red global de Cloudflare), podemos confiar ciegamente en la cabecera `cf-connecting-ip`, inyectada por el propio Cloudflare, garantizándonos la IP real del cliente final.

#### B. Inyección Manual de Repositorios
A diferencia de los Controladores (donde inyectamos los Casos de Uso), aquí instanciamos el repositorio `D1ModerationRepository` directamente. ¿Por qué? Porque un middleware debe ser lo más rápido posible. Estamos haciendo una comprobación muy simple y puramente de infraestructura (buscar una cadena de texto en una tabla) antes de llegar a la verdadera capa de "Aplicación" (donde viven los casos de uso complejos).

#### C. Compartir estado con `c.set()`
> [!IMPORTANT]
> **El Contexto de Hono (`c`)**:
> Fíjate en la línea `c.set("clientIp", clientIp);`. Como el middleware ya ha hecho el esfuerzo computacional de buscar cuál es la IP del cliente, la guarda en las "Variables" del contexto (`c.get('clientIp')`). 
> De esta forma, cuando la petición llegue finalmente a nuestro Controlador (por ejemplo, para añadir un like), el controlador no tiene que volver a leer las cabeceras; simplemente lee la variable que el middleware le dejó preparada.

## Resumen

Los Middlewares son filtros que ponemos en nuestras tuberías (Rutas). 
*   **Aíslan la lógica común:** No tenemos que escribir `const ip = c.req.header("cf-connecting-ip")` en cada uno de los 20 controladores que tengamos. Lo escribimos una vez en un middleware.
*   **Frenan ataques temprano:** Consultar la base de datos para ver si alguien está baneado *antes* de cargar en memoria un "Caso de Uso" ahorra muchísimos recursos del servidor si estamos bajo ataque.
*   **Pasan el testigo:** A través de la función `next()` y de guardar variables en el contexto (`c.set`), preparan el terreno para que los Controladores hagan su trabajo mucho más fácil.
