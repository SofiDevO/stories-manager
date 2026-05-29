# Lección: Repositorios e Interfaces (Repository Pattern)

¡Continuamos nuestro recorrido por la capa de **Dominio**! En esta ocasión, vamos a analizar la carpeta `src/domain/repositories`. 

Aquí dentro tenemos seis archivos, y todos ellos tienen una particularidad: empiezan por la letra `I` (ej. `IStoryRepository.ts`) y solo contienen `interfaces`.

1. `IAdminRepository.ts`
2. `ICommentRepository.ts`
3. `ILikeRepository.ts`
4. `IModerationRepository.ts`
5. `IStorageService.ts`
6. `IStoryRepository.ts`

Vamos a entender por qué esto es una de las piezas más brillantes del diseño de software (y de Clean Architecture).

---

## 1. El Patrón Repositorio (Repository Pattern)

En palabras sencillas, el patrón repositorio actúa como un **intermediario** entre tu lógica de negocio (los Casos de Uso que vimos antes) y el lugar donde se guardan los datos (la base de datos, una API externa, el sistema de archivos, etc.).

Al usar un Repositorio, tu aplicación puede decir: *"Guarda esta historia"*, sin tener que saber si se está guardando usando sentencias SQL, consultas a MongoDB, o guardándolo en un simple archivo de texto.

### ¿Por qué solo Interfaces?

Si abres cualquiera de estos archivos, notarás que no hay **nada de código funcional**, solo definiciones (firmas) de métodos.

```typescript
// Ejemplo de src/domain/repositories/IStoryRepository.ts
import type { Story } from "../entities/Story";

export interface IStoryRepository {
  create(story: Story): Promise<void>;
  getActiveStories(): Promise<Story[]>;
  deleteExpiredStories(): Promise<void>;
}
```

> [!NOTE]
> **El Principio de Inversión de Dependencias (SOLID):**
> Las capas de alto nivel (como nuestros Casos de Uso) no deben depender de las capas de bajo nivel (como las bases de datos SQL). Ambas deben depender de **abstracciones** (las Interfaces).

Estas interfaces actúan como un **Contrato**. Le están diciendo al resto de la aplicación: *"No importa qué base de datos uses en el futuro, me comprometo a que siempre tendrás un método `create` que recibe un objeto `Story`, un método `getActiveStories` y un método `deleteExpiredStories`"*.

Esto es lo que nos permite cambiar la base de datos entera de nuestra aplicación simplemente escribiendo una nueva clase que "firme" o "implemente" este contrato, sin modificar ni un solo Caso de Uso.

---

## 2. Análisis de nuestros Repositorios

Veamos qué capacidades nos definen nuestros contratos.

### A. Repositorios Clásicos de Base de Datos
- **`IStoryRepository`**: Define las operaciones para las historias. Destaca `deleteExpiredStories()`, lo que indica que nuestra aplicación tiene un concepto temporal de contenido efímero (tipo Instagram/Snapchat).
- **`ICommentRepository`**: Permite crear y listar comentarios por historia. Al igual que las historias, también tiene un método `deleteExpiredComments()`.
- **`ILikeRepository`**: Define acciones simples: contar likes, añadir un like y saber si un usuario (por IP) ya le dio like a una historia.
- **`IAdminRepository`**: Un simple contrato para buscar administradores por su nombre de usuario (necesario para el login).

### B. El Repositorio de Moderación
```typescript
export interface IModerationRepository {
  banIp(ipAddress: string, reason?: string): Promise<void>;
  isIpBanned(ipAddress: string): Promise<boolean>;
  getBannedIps(): Promise<{ ipAddress: string; bannedAt: string }[]>;
  unBanIp(ipAddress: string): Promise<void>;
}
```
Este repositorio maneja la lista negra (bans) basada en direcciones IP. En una aplicación sin registro obligatorio, banear IPs es la principal herramienta contra el abuso, el spam o el acoso.

### C. El Servicio de Almacenamiento
```typescript
export interface IStorageService {
  generateUploadUrl(fileName: string): Promise<string>;
}
```
> [!TIP]
> **¿Por qué se llama `Service` y no `Repository`?**
> Técnicamente, cumple la misma función: abstraer una tecnología externa. Sin embargo, por convención, llamamos `Repository` a las interfaces que manejan colecciones de entidades de nuestro dominio (como sacar datos de una tabla SQL), y llamamos `Service` a los que interactúan con servicios externos que no devuelven entidades propias (en este caso, un proveedor de almacenamiento como Cloudflare R2 o AWS S3 que solo nos devuelve URLs).

---

## 3. ¿Dónde está el código de verdad?

Te estarás preguntando, *"Vale, si aquí solo hay contratos, ¿dónde escribo las consultas SQL `SELECT * FROM stories`?"*

El código real (la **implementación**) vive en una capa más externa, típicamente llamada **Infraestructura** (`src/infrastructure/repositories`). Allí encontrarás archivos como `D1StoryRepository.ts` que "implementan" (`implements IStoryRepository`) esta interfaz y contienen el código específico para hablar con Cloudflare D1 (nuestro SQLite en la nube).

## Resumen de la Lección

La carpeta `src/domain/repositories` es la "aduana" de nuestra aplicación.
Aquí definimos estrictamente **qué** necesitamos del mundo exterior (bases de datos, APIs de almacenamiento), sin importarnos el **cómo** lo consiguen. 

Esto hace que nuestro código sea:
*   **A prueba de futuro:** Cambiar de D1 a Postgres es tan fácil como crear una clase nueva, sin romper el dominio.
*   **Fácil de probar (Testable):** En nuestros tests, podemos crear un "Repositorio Falso en Memoria" (Mock) que cumpla con esta interfaz sin necesidad de encender una base de datos real.
