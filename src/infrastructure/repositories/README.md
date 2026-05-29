# Lección: Implementación de Repositorios (Infrastructure Layer)

¡Bienvenidos a la capa de **Infraestructura**! En nuestra lección anterior vimos que la capa de Dominio define "Contratos" o "Interfaces" (qué queremos hacer). Ahora, en la carpeta `src/infrastructure/repositories`, encontraremos las **implementaciones reales** de esos contratos (cómo lo hacemos).

En esta carpeta tenemos cinco archivos que conectan nuestra aplicación con nuestra base de datos (Cloudflare D1):

1. `D1AdminRepository.ts`
2. `D1CommentRepository.ts`
3. `D1LikeRepository.ts`
4. `D1ModerationRepository.ts`
5. `D1StoryRepository.ts`

---

## 1. ¿Por qué el prefijo "D1"?

En Clean Architecture, el nombre de la clase de implementación suele incluir la tecnología que utiliza. Si estos repositorios usaran PostgreSQL, se llamarían `PostgresStoryRepository`. Como estamos usando **Cloudflare D1** (una base de datos SQLite distribuida en el borde/edge), las llamamos con el prefijo `D1`.

Esta convención de nombres ayuda a cualquier desarrollador a saber instantáneamente qué motor de persistencia se está utilizando al leer la inicialización en la capa de controladores.

## 2. Analizando la Implementación

Vamos a tomar como ejemplo la clase `D1StoryRepository`.

```typescript
import { IStoryRepository } from "../../domain/repositories/IStoryRepository";
import type { Story } from "../../domain/entities/Story";

export class D1StoryRepository implements IStoryRepository {
    constructor(private db :D1Database){}

    // ...
}
```

### A. La palabra clave `implements`
Al decir `implements IStoryRepository`, TypeScript nos obliga a escribir el código para todos los métodos que prometimos en la interfaz del dominio. Si olvidamos implementar `deleteExpiredStories()`, el proyecto simplemente no compilará. ¡Esta es nuestra red de seguridad!

### B. El Constructor y `D1Database`
Fíjate que el constructor recibe un objeto de tipo `D1Database`. Esta es la conexión real proporcionada por el entorno de Cloudflare Workers (lo pasamos desde `c.env.stories_manager` en nuestros controladores). La clase guarda esta conexión en una propiedad privada (`this.db`) para usarla en los métodos.

---

## 3. SQL Puro en la Nube

Si revisas el código de estos repositorios, notarás que **no estamos usando un ORM** complejo (como Prisma, TypeORM o Sequelize). Estamos escribiendo SQL puro.

```typescript
// En D1StoryRepository.ts
async create(story: Story): Promise<void> {
    await this.db.prepare(
        'INSERT INTO stories (id, video_url, created_at) VALUES(?,?,?)'
    ).bind(story.id, story.videoUrl, story.createdAt).run();
}
```

### ¿Por qué SQL puro y no un ORM?

En entornos "Edge" o "Serverless" como Cloudflare Workers, la velocidad de arranque (*cold start*) y el tamaño del bundle son críticos. 
1. Los ORMs tradicionales suelen ser pesados y lentos de inicializar.
2. Cloudflare D1 ofrece un cliente nativo (`D1Database`) que es extremadamente ligero y rápido, diseñado para ejecutar consultas SQLite preparadas (`prepare(...).bind(...)`).
3. Para una aplicación sencilla de historias, usar SQL plano es más directo, eficiente y evita la sobrecarga de un motor intermedio.

### Cuidado con los alias de columnas

Un detalle importante es cómo leemos de la base de datos para que encaje con nuestras Entidades. En SQL usamos "snake_case" (ej. `video_url`), pero en TypeScript usamos "camelCase" (`videoUrl`).

Fíjate en cómo lo solucionamos en la misma consulta SQL usando alias (`as`):

```typescript
// En D1StoryRepository.ts
async getActiveStories(): Promise<Story[]>{
    const {results} = await this.db.prepare(
        "SELECT id, video_url as videoUrl, created_at as createdAt FROM stories ..."
    ).all<Story>();
    return results || [];
}
```
Esto permite que el motor de la base de datos formatee el objeto JSON directamente como lo espera nuestra entidad `Story`, sin necesidad de transformarlo manualmente en TypeScript (lo que ahorra memoria y CPU).

---

## 4. Reglas de Negocio en SQL

Aunque decimos que la lógica de negocio debe estar en los "Casos de Uso", algunas reglas relacionadas con el tiempo y los datos se pueden delegar eficientemente al motor de la base de datos.

Miremos cómo funciona `getActiveStories` y `deleteExpiredStories`:
```sql
-- Obtener las historias de las últimas 24 horas:
SELECT ... WHERE created_at > datetime('now', '-1 day')

-- Borrar historias más antiguas de 24 horas:
DELETE FROM stories WHERE created_at <= datetime('now','-1 day')
```
Al usar las funciones nativas de SQLite (`datetime('now', '-1 day')`), la base de datos se encarga de calcular qué está expirado y qué no, lo cual es mucho más rápido que traer todos los registros a JavaScript y filtrarlos uno por uno.

## Resumen

La carpeta `src/infrastructure/repositories` es la única parte de nuestra aplicación (junto con la configuración inicial) que sabe de la existencia de Cloudflare D1 y de las sentencias SQL.

Esta separación de responsabilidades significa que si el día de mañana Cloudflare cierra D1 y tenemos que migrar a AWS Aurora o PostgreSQL, **solo tocaremos los archivos de esta carpeta**. Los Casos de Uso, las Entidades y los Controladores permanecerán intactos, porque ellos solo hablan con las "Interfaces", no con la "Infraestructura".
