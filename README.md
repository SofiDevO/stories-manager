# Stories Manager

> **Estado:** Alpha — capa de API operativa
> **Última actualización:** 29 de mayo de 2026

API REST serverless para gestionar **historias efímeras en video** (al estilo Instagram/WhatsApp Stories), desplegada sobre **Cloudflare Workers** con arquitectura limpia (Clean Architecture / DDD).

---

## Tabla de contenidos

1. [Stack tecnológico](#stack-tecnológico)
2. [Arquitectura](#arquitectura)
3. [Estructura de directorios](#estructura-de-directorios)
4. [Capa de Dominio](#capa-de-dominio)
5. [Capa de Aplicación](#capa-de-aplicación)
6. [Capa de API](#capa-de-api)
7. [Capa de Infraestructura](#capa-de-infraestructura)
8. [Helpers](#helpers)
9. [Infraestructura Cloud](#infraestructura-cloud)
10. [Base de datos](#base-de-datos)
11. [Configuración](#configuración)
12. [Comandos](#comandos)
13. [Correcciones aplicadas](#correcciones-aplicadas)

---

## Stack tecnológico

| Tecnología             | Versión  | Rol                                   |
| ---------------------- | -------- | ------------------------------------- |
| **TypeScript**         | ESNext   | Lenguaje principal                    |
| **Hono**               | ^4.12.14 | Framework web para Cloudflare Workers |
| **Cloudflare Workers** | —        | Runtime serverless en el edge         |
| **Cloudflare D1**      | —        | Base de datos SQLite serverless       |
| **Cloudflare R2**      | —        | Almacenamiento de objetos (videos)    |
| **Wrangler**           | ^4.4.0   | CLI para desarrollo y despliegue      |
| **pnpm**               | —        | Gestor de paquetes                    |

---

## Arquitectura

El proyecto implementa una **arquitectura en capas** que separa responsabilidades en cuatro niveles. La dirección de dependencia siempre apunta hacia adentro: las capas internas no conocen a las externas.

```
┌─────────────────────────────────────────────┐
│                  API Layer                  │  ← HTTP, rutas, controladores, middlewares
├─────────────────────────────────────────────┤
│             Application Layer               │  ← Casos de uso, DTOs
├─────────────────────────────────────────────┤
│               Domain Layer                  │  ← Entidades, interfaces de repositorios
├─────────────────────────────────────────────┤
│            Infrastructure Layer             │  ← Implementaciones concretas (D1, R2)
└─────────────────────────────────────────────┘

Flujo de dependencias:  API → Application → Domain ← Infrastructure
```

---

## Estructura de directorios

```
stories-manager/
├── src/
│   ├── index.ts                         # Punto de entrada: app Hono + cron handler
│   ├── helpers/
│   │   └── error.ts                     # ✅ Jerarquía de errores HTTP tipados
│   ├── api/
│   │   ├── controllers/
│   │   │   └── stories.controller.ts    # ✅ StroriesController (3 métodos estáticos)
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.ts        # ✅ Validación JWT via hono/jwt
│   │   │   └── ipBan.middleware.ts       # ✅ Bloqueo de IPs baneadas
│   │   └── routes/
│   │       └── stories.routes.ts        # ✅ Router montado en /api/v1/stories
│   ├── application/
│   │   ├── dtos/                        # (pendiente)
│   │   └── use-cases/
│   │       ├── AddCommentUseCase.ts     # ✅ Implementado
│   │       └── CreateStoryUseCase.ts    # ✅ Implementado
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── Admin.ts
│   │   │   ├── Comment.ts
│   │   │   ├── Like.ts
│   │   │   └── Story.ts
│   │   └── repositories/
│   │       ├── IAdminRepository.ts
│   │       ├── ICommentRepository.ts
│   │       ├── ILikeRepository.ts
│   │       ├── IModerationRepository.ts
│   │       ├── IStorageService.ts
│   │       └── IStoryRepository.ts
│   └── infrastructure/
│       ├── db/
│       │   └── schema.sql
│       ├── repositories/
│       │   ├── D1StoryRepository.ts      # ✅ Implementado
│       │   ├── D1CommentRepository.ts    # ✅ Implementado
│       │   ├── D1LikeRepository.ts       # ✅ Implementado
│       │   ├── D1ModerationRepository.ts # ✅ Implementado
│       │   └── D1AdminRepository.ts      # ✅ Implementado
│       └── storage/
│           └── R2StorageService.ts       # ✅ Implementado (AWS SDK v3 + S3 presigned)
├── package.json
├── tsconfig.json
└── wrangler.jsonc
```

---

## Capa de Dominio

### Entidades

#### `Story`

```typescript
interface Story {
  id: string; // UUID único
  videoUrl: string; // URL del video en R2
  createdAt: string; // Timestamp ISO 8601
}
```

#### `Comment`

```typescript
interface Comment {
  id: string; // UUID único
  storyId: string; // Referencia a la Story
  content: string; // Texto del comentario
  ipAddress: string; // IP del autor (para moderación)
  createdAt: string; // Timestamp ISO 8601
}
```

#### `Like`

```typescript
interface Like {
  storyId: string; // Historia que recibió el like
  ipAddress: string; // IP del usuario (clave de unicidad)
  createdAt: string; // Timestamp ISO 8601
}
```

#### `Admin`

```typescript
interface Admin {
  username: string; // Nombre de usuario único
  passwordHash: string; // Hash bcrypt de la contraseña
}
```

### Interfaces de Repositorios

#### `IStoryRepository`

| Método                   | Descripción                                 |
| ------------------------ | ------------------------------------------- |
| `create(story)`          | Persiste una nueva historia                 |
| `getActiveStories()`     | Retorna las historias que no han expirado   |
| `deleteExpiredStories()` | Limpieza automática (ejecutada por el cron) |

#### `ICommentRepository`

| Método                    | Descripción                                 |
| ------------------------- | ------------------------------------------- |
| `create(comment)`         | Agrega un comentario a una historia         |
| `getByStoryId(storyId)`   | Lista comentarios de una historia           |
| `deleteById(commentId)`   | Eliminación administrativa                  |
| `deleteExpiredComments()` | Limpieza automática (ejecutada por el cron) |

#### `ILikeRepository`

| Método                             | Descripción                |
| ---------------------------------- | -------------------------- |
| `addLike(storyId, ipAddress)`      | Registra un like           |
| `getLikesCount(storyId)`           | Cuenta total de likes      |
| `hasUserLiked(storyId, ipAddress)` | Verifica duplicados por IP |

#### `IModerationRepository`

| Método                      | Descripción                            |
| --------------------------- | -------------------------------------- |
| `banIp(ipAddress, reason?)` | Banea una IP con razón opcional        |
| `isIpBanned(ipAddress)`     | Consulta usada en middleware de acceso |
| `getBannedIps()`            | Lista todas las IPs baneadas           |
| `unBanIp(ipAddress)`        | Levanta el baneo                       |

#### `IStorageService`

| Método                        | Descripción                                     |
| ----------------------------- | ----------------------------------------------- |
| `generateUploadUrl(fileName)` | Genera URL pre-firmada para subida directa a R2 |

#### `IAdminRepository`

| Método                     | Descripción                                   |
| -------------------------- | --------------------------------------------- |
| `findByUsername(username)` | Recupera el admin para verificar credenciales |

---

## Capa de Aplicación

Orquesta la lógica de negocio usando únicamente las interfaces del dominio. **No depende** de Cloudflare, SQL ni HTTP.

### `CreateStoryUseCase` ✅

**Archivo:** `src/application/use-cases/CreateStoryUseCase.ts`

**Firma:** `execute(): Promise<{ uploadUrl: string; storyId: string }>`

**Flujo interno:**

1. Genera un `storyId` con `crypto.randomUUID()`.
2. Construye el `fileName` con el patrón `stories/{storyId}.mp4`.
3. Llama a `IStorageService.generateUploadUrl(fileName)` → obtiene URL pre-firmada S3.
4. Calcula la `finalVideoUrl` pública: `${publicR2Url}/${fileName}`.
5. Persiste la entidad `Story` en D1 via `IStoryRepository.create()`.
6. Retorna `{ uploadUrl, storyId }` al controlador.

> La URL pre-firmada tiene una vigencia de **3600 segundos** (1 hora).

### `AddCommentUseCase` ✅

**Archivo:** `src/application/use-cases/AddCommentUseCase.ts`

**Firma:** `execute(storyId, content, ipAddress): Promise<void>`

**Flujo interno:**

1. Consulta `IModerationRepository.isIpBanned(ipAddress)` → lanza `UnauthorizedError` (HTTP 403) si está baneada.
2. Valida que `content` no sea vacío → lanza `BadRequestError` (HTTP 400).
3. Construye la entidad `Comment` con `crypto.randomUUID()` como `id` y `content.trim()`.
4. Persiste via `ICommentRepository.create()`.

### Casos de uso pendientes

| Caso de uso               | Descripción                                   |
| ------------------------- | --------------------------------------------- |
| `AddLikeUseCase`          | Verifica duplicado por IP y registra el like  |
| `LoginAdminUseCase`       | Verifica credenciales y emite JWT             |
| `BanIpUseCase`            | Banea una IP (acción administrativa)          |
| `CleanExpiredDataUseCase` | Limpia stories y comentarios expirados (cron) |

---

## Capa de API

### Punto de entrada — `src/index.ts`

Instancia la aplicación Hono con tipado de bindings de Cloudflare y configura CORS de forma dinámica:

```typescript
const app = new Hono<{ Bindings: CloudflareBindings }>();

app.use(
  "*",
  cors({
    origin: (origin, c) => c.env.ASTRO_SITE ?? "*", // origen dinámico desde env
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS", "DELETE"],
  }),
);

app.route("/api/v1/stories", storiesRouter); // único router montado
```

El `scheduled` handler del cron está registrado pero aún sin lógica de limpieza:

```typescript
export default {
  fetch: app.fetch,
  async scheduled(event, env, ctx) {
    console.log(
      `[Cron Trigger] Iniciando limpieza a las ${new Date().toISOString()}`,
    );
    // TODO: invocar CleanExpiredDataUseCase
  },
};
```

### Router — `src/api/routes/stories.routes.ts`

Define un sub-router Hono tipado montado en `/api/v1/stories`:

```typescript
type Env = {
  Bindings: { stories_manager: D1Database; JWT_SECRET: string };
  Variables: { clientIp: string }; // propagada por ipBanMiddleware
};

export const storiesRouter = new Hono<Env>();
```

#### Rutas operativas

| Método | Ruta completa                  | Middlewares       | Controlador  | Auth          |
| ------ | ------------------------------ | ----------------- | ------------ | ------------- |
| `GET`  | `/api/v1/stories`              | —                 | `getActive`  | No            |
| `POST` | `/api/v1/stories/:id/comments` | `ipBanMiddleware` | `addComment` | No (IP check) |
| `POST` | `/api/v1/stories`              | `authMiddleware`  | `create`     | JWT           |

#### Rutas pendientes

| Método   | Ruta                           | Descripción        | Auth          |
| -------- | ------------------------------ | ------------------ | ------------- |
| `GET`    | `/api/v1/stories/:id/comments` | Listar comentarios | No            |
| `DELETE` | `/api/v1/stories/:id`          | Eliminar story     | Admin         |
| `POST`   | `/api/v1/stories/:id/likes`    | Dar like           | No (IP check) |
| `GET`    | `/api/v1/stories/:id/likes`    | Conteo de likes    | No            |
| `GET`    | `/api/v1/admin/bans`           | IPs baneadas       | Admin         |
| `POST`   | `/api/v1/admin/bans`           | Banear IP          | Admin         |
| `DELETE` | `/api/v1/admin/bans/:ip`       | Desbanear IP       | Admin         |
| `POST`   | `/api/v1/auth/login`           | Login admin        | No            |

### Controlador — `src/api/controllers/stories.controller.ts`

Clase con métodos estáticos que actúan como handlers de Hono. Cada método instancia sus dependencias directamente desde `c.env` (sin inyección de dependencias externa).

#### `getActive(c)`

Llama a `D1StoryRepository.getActiveStories()` y retorna `{ success: true, data: stories }` con HTTP 200. Sin manejo de errores (asume que D1 siempre responde).

#### `create(c)` — requiere JWT

Instancia `R2StorageService` con las credenciales de cuenta de Cloudflare (`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ACCESS_KEY`, `CLOUDFLARE_SECRET_KEY`) y ejecuta `CreateStoryUseCase`. Retorna `{ uploadUrl, storyId }` con HTTP 201 o `{ error }` con HTTP 500.

#### `addComment(c)` — requiere IP no baneada

1. Extrae `storyId` de `c.req.param("id")` — lanza `Error` si es `undefined`.
2. Lee `body.content` de `c.req.json()`.
3. Obtiene la IP del cliente desde la variable de contexto `clientIp` (inyectada por `ipBanMiddleware`).
4. Ejecuta `AddCommentUseCase`. Retorna HTTP 201 o HTTP 403 en caso de error.

### Middlewares — `src/api/middlewares/`

#### `authMiddleware`

```typescript
// Delega en hono/jwt con el secreto JWT del binding de Cloudflare
export const authMiddleware = createMiddleware<Env>(async (c, next) => {
  if (!c.env.JWT_SECRET) return c.json({ error: "Missing JWT" });
  const jwtMiddleware = jwt({ secret: c.env.JWT_SECRET, alg: "HS256" });
  return jwtMiddleware(c, next);
});
```

Usa el helper `createMiddleware` de `hono/factory` para mantener el tipado genérico del `Env`. Si `JWT_SECRET` no está configurado en los bindings, responde con error sin código de estado explícito (pendiente corregir a HTTP 500).

#### `ipBanMiddleware`

```typescript
// Lee la IP real del header de Cloudflare y consulta la tabla banned_ips
export const ipBanMiddleware = createMiddleware<Env>(async (c, next) => {
  const clientIp = c.req.header("cf-connecting-ip") || ""; // header correcto de Cloudflare
  const moderationRepo = new D1ModerationRepository(c.env.stories_manager);
  const isBanned = await moderationRepo.isIpBanned(clientIp);
  if (isBanned) return c.json({ success: false, error: "FORBIDDEN" }, 403);
  c.set("clientIp", clientIp); // propaga IP a los handlers siguientes
  await next();
});
```

---

## Capa de Infraestructura

### Repositorios D1

Todos los repositorios reciben un `D1Database` por constructor y usan la API de D1 (`prepare → bind → run/first/all`) con parámetros posicionales para prevenir SQL injection.

#### `D1StoryRepository` ✅

| Método                 | Query                                             | Notas                    |
| ---------------------- | ------------------------------------------------- | ------------------------ |
| `create`               | `INSERT INTO stories (id, video_url, created_at)` | —                        |
| `getActiveStories`     | `WHERE created_at > datetime('now', '-1 day')`    | Alias camelCase via `AS` |
| `deleteExpiredStories` | `WHERE created_at <= datetime('now','-1 day')`    | Para el cron             |

El período de expiración está hardcodeado en **24 horas**.

#### `D1CommentRepository` ✅

| Método                  | Query                                                                                     | Notas                     |
| ----------------------- | ----------------------------------------------------------------------------------------- | ------------------------- |
| `create`                | `INSERT INTO comments (id, story_id, content, ip_address, created_at) VALUES (?,?,?,?,?)` | ✅ SQL corregido          |
| `getByStoryId`          | `SELECT ... FROM comments WHERE story_id = ?`                                             | Alias camelCase correctos |
| `deleteById`            | `DELETE FROM comments WHERE id = ?`                                                       | —                         |
| `deleteExpiredComments` | `WHERE created_at <= datetime('now', '-1 day')`                                           | Para el cron              |

#### `D1LikeRepository` ✅

| Método          | Query                                                                           | Notas                           |
| --------------- | ------------------------------------------------------------------------------- | ------------------------------- |
| `addLike`       | `INSERT OR IGNORE INTO likes (story_id, ip_address, created_at) VALUES (?,?,?)` | ✅ Columna `story_id` corregida |
| `getLikesCount` | `SELECT COUNT(*) as count FROM likes WHERE story_id = ?`                        | `.first<{count:number}>()`      |
| `hasUserLiked`  | `SELECT 1 FROM likes WHERE story_id = ? AND ip_address = ?`                     | Retorna `result !== null`       |

#### `D1ModerationRepository` ✅

| Método         | Query                                                                               | Notas                     |
| -------------- | ----------------------------------------------------------------------------------- | ------------------------- |
| `banIp`        | `INSERT OR IGNORE INTO banned_ips (ip_address, reason, banned_at) VALUES (?, ?, ?)` | ✅ Corregido a 3 `?`      |
| `isIpBanned`   | `SELECT ip_address FROM banned_ips WHERE ip_address = ?`                            | Retorna `result !== null` |
| `getBannedIps` | `SELECT ip_address as ipAddress, banned_at as bannedAt`                             | Orden DESC                |
| `unBanIp`      | `DELETE FROM banned_ips WHERE ip_address = ?`                                       | —                         |

### `R2StorageService` ✅

**Archivo:** `src/infrastructure/storage/R2StorageService.ts`
**Dependencias:** `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`

Implementa `IStorageService` usando el SDK de AWS v3, aprovechando la compatibilidad S3 de Cloudflare R2:

```typescript
constructor(accountId, accessKeyId, secretAccessKey, bucketName) {
  this.s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

async generateUploadUrl(fileName: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: this.bucketName,
    Key: fileName,
    ContentType: 'video/mp4',  // siempre forzado a mp4
  });
  return getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
}
```

**Variables de entorno requeridas:** `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ACCESS_KEY`, `CLOUDFLARE_SECRET_KEY`, `PUBLIC_R2_URL`.

---

## Helpers

### `src/helpers/error.ts`

Jerarquía de clases de error que extienden `Error` nativo con un código HTTP adjunto. Permite que los casos de uso lancen errores semánticamente tipados sin conocer el framework HTTP.

```typescript
class HttpError extends Error    { httpCode: number }
class NotFoundError    extends HttpError  // 404
class UnauthorizedError extends HttpError // 403
class BadRequestError  extends HttpError  // 400
class ServerError      extends HttpError  // 500
```

Uso actual en `AddCommentUseCase`:

- `UnauthorizedError` — IP baneada
- `BadRequestError` — contenido vacío

---

## Infraestructura Cloud

Configurado en `wrangler.jsonc` (excluido de git para proteger credenciales de producción).

### D1 — Base de datos relacional

```jsonc
{
  "binding": "stories_manager", // c.env.stories_manager en el Worker
  "database_name": "stories-manager",
  "database_id": "bc661fe9-...",
}
```

### R2 — Almacenamiento de objetos

```jsonc
{
  "binding": "R2_BUCKET", // c.env.R2_BUCKET en el Worker
  "bucket_name": "stories-bucket",
}
```

### Cron Trigger

```jsonc
"triggers": { "crons": ["0 * * * *"] }  // Cada hora en punto
```

Ejecuta la limpieza automática de stories y comentarios expirados.

---

## Base de datos

### Esquema (`src/infrastructure/db/schema.sql`)

```sql
CREATE TABLE IF NOT EXISTS stories (
    id          TEXT PRIMARY KEY,
    video_url   TEXT NOT NULL,
    created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS comments (
    id          TEXT PRIMARY KEY,
    story_id    TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    ip_address  TEXT NOT NULL,
    created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS likes (
    story_id    TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    ip_address  TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    PRIMARY KEY (story_id, ip_address)
);

CREATE TABLE IF NOT EXISTS admins (
    username        TEXT PRIMARY KEY,
    password_hash   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS banned_ips (
    ip_address  TEXT PRIMARY KEY,
    reason      TEXT,
    banned_at   TEXT NOT NULL
);
```

### Aplicar migraciones

```bash
# Entorno local
wrangler d1 execute stories-manager --local --file=src/infrastructure/db/schema.sql

# Producción
wrangler d1 execute stories-manager --file=src/infrastructure/db/schema.sql
```

---

## Configuración

### TypeScript (`tsconfig.json`)

| Opción             | Valor      | Justificación                             |
| ------------------ | ---------- | ----------------------------------------- |
| `target`           | `ESNext`   | Workers soportan JS moderno completamente |
| `moduleResolution` | `Bundler`  | Compatible con Wrangler (esbuild)         |
| `strict`           | `true`     | Máxima seguridad de tipos                 |
| `jsxImportSource`  | `hono/jsx` | Runtime JSX de Hono en lugar de React     |

### Generar tipos de Cloudflare

```bash
pnpm cf-typegen
```

Genera `worker-configuration.d.ts` con los tipos de los bindings. Luego úsalos al instanciar Hono:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>();
```

---

## Comandos

```bash
# Instalar dependencias
pnpm install

# Desarrollo local (D1 y R2 simulados)
pnpm dev

# Desplegar a producción (con minificación)
pnpm deploy

# Generar tipos de bindings de Cloudflare
pnpm cf-typegen
```
