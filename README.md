# Stories Manager

API REST serverless para gestionar **historias efímeras en video** (al estilo Instagram/WhatsApp Stories), desplegada sobre **Cloudflare Workers** con arquitectura limpia (Clean Architecture / DDD).

---

## Tabla de contenidos

1. [Stack tecnológico](#stack-tecnológico)
2. [Arquitectura](#arquitectura)
3. [Estructura de directorios](#estructura-de-directorios)
4. [Capa de Dominio](#capa-de-dominio)
5. [Capa de Aplicación](#capa-de-aplicación)
6. [Capa de API](#capa-de-api)
7. [Infraestructura Cloud](#infraestructura-cloud)
8. [Base de datos](#base-de-datos)
9. [Configuración](#configuración)
10. [Comandos](#comandos)

---

## Stack tecnológico

| Tecnología | Versión | Rol |
|---|---|---|
| **TypeScript** | ESNext | Lenguaje principal |
| **Hono** | ^4.12.14 | Framework web para Cloudflare Workers |
| **Cloudflare Workers** | — | Runtime serverless en el edge |
| **Cloudflare D1** | — | Base de datos SQLite serverless |
| **Cloudflare R2** | — | Almacenamiento de objetos (videos) |
| **Wrangler** | ^4.4.0 | CLI para desarrollo y despliegue |
| **pnpm** | — | Gestor de paquetes |

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
│   ├── index.ts                    # Punto de entrada del Worker
│   ├── api/
│   │   ├── controllers/            # Manejadores de peticiones HTTP
│   │   ├── middlewares/            # Auth, IP ban, rate limit
│   │   └── routes/                 # Definición de rutas Hono
│   ├── application/
│   │   ├── dtos/                   # Data Transfer Objects
│   │   └── use-cases/              # Lógica de negocio orquestada
│   ├── domain/
│   │   ├── entities/               # Tipos de negocio (Story, Comment, Like, Admin)
│   │   ├── errors/                 # Errores de dominio tipados
│   │   └── repositories/          # Interfaces (contratos) de acceso a datos
│   └── infrastructure/
│       └── db/
│           └── schema.sql          # Esquema de la base de datos D1
├── package.json
├── tsconfig.json
└── wrangler.jsonc                  # Configuración de Cloudflare (en .gitignore)
```

---

## Capa de Dominio

### Entidades

#### `Story`
```typescript
interface Story {
  id: string;        // UUID único
  videoUrl: string;  // URL del video en R2
  createdAt: string; // Timestamp ISO 8601
}
```

#### `Comment`
```typescript
interface Comment {
  id: string;        // UUID único
  storyId: string;   // Referencia a la Story
  content: string;   // Texto del comentario
  ipAddress: string; // IP del autor (para moderación)
  createdAt: string; // Timestamp ISO 8601
}
```

#### `Like`
```typescript
interface Like {
  storyId: string;   // Historia que recibió el like
  ipAddress: string; // IP del usuario (clave de unicidad)
  createdAt: string; // Timestamp ISO 8601
}
```

#### `Admin`
```typescript
interface Admin {
  username: string;     // Nombre de usuario único
  passwordHash: string; // Hash bcrypt de la contraseña
}
```

### Interfaces de Repositorios

#### `IStoryRepository`
| Método | Descripción |
|---|---|
| `create(story)` | Persiste una nueva historia |
| `getActiveStories()` | Retorna las historias que no han expirado |
| `deleteExpiredStories()` | Limpieza automática (ejecutada por el cron) |

#### `ICommentRepository`
| Método | Descripción |
|---|---|
| `create(comment)` | Agrega un comentario a una historia |
| `getByStoryId(storyId)` | Lista comentarios de una historia |
| `deleteById(commentId)` | Eliminación administrativa |
| `deleteExpiredComments()` | Limpieza automática (ejecutada por el cron) |

#### `ILikeRepository`
| Método | Descripción |
|---|---|
| `addLike(storyId, ipAddress)` | Registra un like |
| `getLikesCount(storyId)` | Cuenta total de likes |
| `hasUserLiked(storyId, ipAddress)` | Verifica duplicados por IP |

#### `IModerationRepository`
| Método | Descripción |
|---|---|
| `banIp(ipAddress, reason?)` | Banea una IP con razón opcional |
| `isIpBanned(ipAddress)` | Consulta usada en middleware de acceso |
| `getBannedIps()` | Lista todas las IPs baneadas |
| `unBanIp(ipAddress)` | Levanta el baneo |

#### `IStorageService`
| Método | Descripción |
|---|---|
| `generateUploadUrl(fileName)` | Genera URL pre-firmada para subida directa a R2 |

#### `IAdminRepository`
| Método | Descripción |
|---|---|
| `findByUsername(username)` | Recupera el admin para verificar credenciales |

---

## Capa de Aplicación

Orquesta la lógica de negocio usando únicamente las interfaces del dominio. **No depende** de Cloudflare, SQL ni HTTP.

### Casos de uso previstos

| Caso de uso | Descripción |
|---|---|
| `GetActiveStoriesUseCase` | Obtiene las historias activas |
| `CreateStoryUseCase` | Crea una historia y genera URL de subida a R2 |
| `AddCommentUseCase` | Valida IP, verifica baneo y crea el comentario |
| `AddLikeUseCase` | Verifica duplicado y registra el like |
| `LoginAdminUseCase` | Verifica credenciales y emite token de sesión |
| `BanIpUseCase` | Banea una IP (acción administrativa) |
| `CleanExpiredDataUseCase` | Limpia stories y comentarios expirados (cron) |

---

## Capa de API

### Endpoints previstos

#### Stories
| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| `GET` | `/stories` | Listar stories activas | No |
| `POST` | `/stories` | Crear story / obtener URL de subida | Admin |
| `DELETE` | `/stories/:id` | Eliminar story | Admin |

#### Comentarios
| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| `GET` | `/stories/:id/comments` | Listar comentarios | No |
| `POST` | `/stories/:id/comments` | Publicar comentario | No (IP check) |
| `DELETE` | `/comments/:id` | Eliminar comentario | Admin |

#### Likes
| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| `POST` | `/stories/:id/likes` | Dar like | No (IP check) |
| `GET` | `/stories/:id/likes` | Obtener conteo | No |

#### Moderación
| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| `GET` | `/admin/bans` | Listar IPs baneadas | Admin |
| `POST` | `/admin/bans` | Banear una IP | Admin |
| `DELETE` | `/admin/bans/:ip` | Desbanear una IP | Admin |

#### Autenticación
| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/auth/login` | Login del administrador |

### Middlewares previstos
- **`authMiddleware`** — Valida JWT del administrador en rutas protegidas
- **`ipBanMiddleware`** — Bloquea IPs baneadas antes de procesar comentarios/likes
- **`rateLimitMiddleware`** — Control de tasa de peticiones por IP

---

## Infraestructura Cloud

Configurado en `wrangler.jsonc` (excluido de git para proteger credenciales de producción).

### D1 — Base de datos relacional

```jsonc
{
  "binding": "stories_manager",      // c.env.stories_manager en el Worker
  "database_name": "stories-manager",
  "database_id": "bc661fe9-..."
}
```

### R2 — Almacenamiento de objetos

```jsonc
{
  "binding": "R2_BUCKET",            // c.env.R2_BUCKET en el Worker
  "bucket_name": "stories-bucket"
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

| Opción | Valor | Justificación |
|---|---|---|
| `target` | `ESNext` | Workers soportan JS moderno completamente |
| `moduleResolution` | `Bundler` | Compatible con Wrangler (esbuild) |
| `strict` | `true` | Máxima seguridad de tipos |
| `jsxImportSource` | `hono/jsx` | Runtime JSX de Hono en lugar de React |

### Generar tipos de Cloudflare

```bash
pnpm cf-typegen
```

Genera `worker-configuration.d.ts` con los tipos de los bindings. Luego úsalos al instanciar Hono:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
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
