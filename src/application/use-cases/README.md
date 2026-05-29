# Lección: Casos de Uso (Use Cases) en Clean Architecture

¡Hola! Hoy vamos a adentrarnos en la capa de **Aplicación** de nuestro proyecto `stories-manager`, específicamente en los **Casos de Uso** (o *Use Cases*).

Si observamos el directorio `src/application/use-cases`, encontraremos cuatro archivos principales que dictan qué es lo que nuestra aplicación "sabe hacer":

1. `AddCommentUseCase.ts`
2. `AddLikeuseCase.ts`
3. `CreateStoryUseCase.ts`
4. `GetActiveStoriesUseCase.ts`

Vamos a desglosar cómo funcionan, qué conceptos aplican y, lo más importante, **por qué** los hemos estructurado de esta manera.

---

## 1. El Concepto de "Caso de Uso"

En el diseño de software moderno (especialmente en *Clean Architecture* o *Hexagonal Architecture*), un Caso de Uso representa una **acción o flujo de negocio específico** que un usuario o sistema puede realizar.

> [!NOTE]
> **Regla de oro:** Un caso de uso debe hacer **una sola cosa** y hacerla bien (Principio de Responsabilidad Única - SRP). No debe saber nada sobre si estamos usando Express, Fastify, Cloudflare Workers, Hono, o si la base de datos es MySQL, D1, o MongoDB.

### Inyección de Dependencias (Dependency Injection)

Si miras el constructor de cualquiera de estos archivos, notarás un patrón repetitivo:

```typescript
export class AddCommentUseCase {
    constructor(
        private commentRepo: ICommentRepository,
        private moderationRepo: IModerationRepository
    ) { }
    // ...
}
```

**¿Por qué hacemos esto?**
En lugar de importar directamente la base de datos dentro del caso de uso (ej. `import { db } from '...'`), le pasamos la dependencia a través del constructor utilizando **Interfaces** (`ICommentRepository`).

Esto se conoce como **Inversión de Dependencias** (La "D" en SOLID). Nos permite:
1. **Desacoplar el código:** El caso de uso no sabe *cómo* se guarda el comentario, solo sabe que existe un método para hacerlo.
2. **Facilitar el testing:** Podemos pasar un "Mock" (una versión falsa) del repositorio para probar la lógica de negocio sin tocar una base de datos real.

---

## 2. Análisis de los Casos de Uso

Veamos qué hace cada uno de ellos y qué reglas de negocio aplican.

### A. Añadir un Comentario (`AddCommentUseCase.ts`)

Este caso de uso se encarga de procesar un nuevo comentario en una historia.

**Flujo de trabajo:**
1. **Verificación de Baneo:** Lo primero que hace es consultar `this.moderationRepo.isIpBanned(ipAddress)`. Si la IP está baneada, lanza un `UnauthorizedError`.
2. **Validación Básica:** Verifica que el contenido (`content`) no esté vacío, lanzando un `BadRequestError` si es necesario.
3. **Creación de la Entidad:** Crea un objeto de tipo `Comment`, generando un ID único (`crypto.randomUUID()`) y añadiendo la fecha actual.
4. **Persistencia:** Finalmente, llama a `this.commentRepo.create(newComment)` para guardar el dato.

> [!TIP]
> **¿Por qué generar el ID aquí?**
> En muchas arquitecturas, los IDs se generan en la capa de negocio antes de tocar la base de datos. Esto nos da control total sobre la entidad y asegura que sea válida y completa antes de intentar guardarla.

### B. Añadir un "Me Gusta" (`AddLikeuseCase.ts`)

Este caso de uso gestiona los "Likes" de las historias.

**Flujo de trabajo:**
1. **Verificación de Baneo:** Igual que en los comentarios, primero se protege de usuarios baneados.
2. **Verificación de Duplicados:** Llama a `this.likeRepo.hasUserLiked(storyId, ipAddress)`. Esta es una regla de negocio crucial: *un usuario (identificado por su IP) solo puede dar "Like" una vez por historia*.
3. **Acción:** Si no ha dado like antes, lo registra llamando a `this.likeRepo.addLike()`.

> [!WARNING]
> Fíjate en cómo los errores se manejan creando instancias de `Error` y asignándoles un `name` (`UnauthorizedError`, `BadRequestError`). Esto permite a la capa de controladores (la capa que expone nuestra API) saber qué código de estado HTTP devolver (401 o 400).

### C. Crear una Historia (`CreateStoryUseCase.ts`)

Este caso de uso es muy interesante porque interactúa con almacenamiento externo (R2).

**Flujo de trabajo:**
1. **Generación de ID:** Crea un UUID para la nueva historia.
2. **Ruta del Archivo:** Define dónde se guardará el video: `stories/{storyId}.mp4`.
3. **URL de Subida (Presigned URL):** Llama a `this.storageService.generateUploadUrl(fileName)`. Este es un patrón muy seguro. En lugar de que el servidor reciba el video pesado, le pide a R2 una "URL temporal" y se la devuelve al cliente. El cliente subirá el video *directamente* a R2.
4. **Registro en Base de Datos:** Guarda el registro de la historia con la URL final pública del video.

> [!IMPORTANT]
> **Patrón de Carga Directa (Direct Upload):**
> Al devolver el `uploadUrl` junto con el `storyId`, estamos delegando la carga pesada al cliente (frontend). Nuestro servidor solo maneja la lógica, sin saturarse procesando megabytes de video.

### D. Obtener Historias Activas (`GetActiveStoriesUseCase.ts`)

Este es el caso de uso más sencillo.

```typescript
export class GetActiveStoriesUseCase {
  constructor(private storyRepo: IStoryRepository) {}
  async execute(): Promise<Story[]> {
    const stories = await this.storyRepo.getActiveStories();
    return stories;
  }
}
```

**¿Por qué crear una clase para algo tan simple?**
Podrías pensar que es código innecesario y que el controlador podría llamar directamente al repositorio. Sin embargo, lo hacemos por **consistencia**.
Si mañana decidimos que obtener las historias activas requiere filtrar por usuario, validar caché, o registrar métricas de uso, toda esa lógica vivirá aquí, sin necesidad de ensuciar los controladores.

---

## Resumen de la Lección

La implementación en `src/application/use-cases` es un excelente ejemplo de código limpio:

*   **Agnóstico del framework:** No hay `req` o `res` de Express o Hono aquí. Solo reciben cadenas de texto y devuelven datos puros.
*   **Basado en Interfaces:** Utilizan abstracciones (`IRepository`) en lugar de implementaciones concretas, facilitando el cambio de bases de datos o servicios.
*   **Encapsulamiento del Negocio:** Las reglas de negocio (ej. "No puedes dar like dos veces", "Los usuarios baneados no comentan") viven y se documentan en estas clases, lo que las hace fáciles de encontrar y mantener.

¡Espero que esta lección haya aclarado por qué estructuramos la aplicación de esta manera!
