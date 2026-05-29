# Lección: Entidades de Dominio (Domain Entities)

¡Hola de nuevo! En esta lección, vamos a explorar el corazón absoluto de nuestra aplicación: la capa de **Dominio** (`src/domain/entities`).

Si abres esta carpeta, verás archivos muy pequeños y simples:
1. `Admin.ts`
2. `Comment.ts`
3. `Like.ts`
4. `Story.ts`

A primera vista pueden parecer simples definiciones de tipos, pero en Clean Architecture, representan mucho más que eso.

---

## 1. ¿Qué es una Entidad de Dominio?

En el desarrollo de software, la capa de Dominio es el centro de nuestro universo. Representa las **reglas de negocio centrales** y los **conceptos fundamentales** de nuestra aplicación, sin importar qué tecnología utilicemos alrededor.

> [!NOTE]
> **Regla de oro de las Entidades:** Las entidades no saben **NADA** sobre bases de datos, frameworks web (Express/Hono), o APIs externas. Son completamente "agnósticas". Si mañana cambiamos de base de datos D1 a PostgreSQL, o de Cloudflare Workers a un servidor Node.js tradicional, las Entidades no deberían cambiar ni una sola línea de código.

### ¿Por qué usamos `interfaces`?

En TypeScript, usar `interface` para definir nuestras entidades nos da un contrato estricto de qué forma deben tener nuestros datos.

```typescript
// Ejemplo de src/domain/entities/Story.ts
export interface Story {
  id: string;
  videoUrl: string;
  createdAt: string;
}
```

Esto nos asegura que en cualquier parte de la aplicación (ya sea en un Caso de Uso, un Repositorio o un Controlador), si alguien dice que tiene un objeto `Story`, el compilador de TypeScript nos garantizará que tiene un `id`, un `videoUrl` y un `createdAt`. No puede faltar nada, ni sobrar nada.

---

## 2. Análisis de nuestras Entidades

Veamos las decisiones de diseño en cada una de ellas:

### A. La Entidad `Story`
```typescript
export interface Story {
  id: string;
  videoUrl: string;
  createdAt: string;
}
```
Representa el contenido principal de nuestra app. Fíjate que solo guarda la `videoUrl`. No guarda el archivo en sí, ni sabe de la existencia de R2 (nuestro almacenamiento en la nube). Para el dominio, solo importa que la historia tiene una URL donde se puede ver el video.

### B. Las Entidades `Like` y `Comment`
```typescript
// Like.ts
export interface Like {
  storyId: string;
  ipAddress: string;
  createdAt: string;
}

// Comment.ts
export interface Comment {
  id: string;
  storyId: string;
  content: string;
  ipAddress: string;
  createdAt: string;
}
```

**La importancia del `ipAddress`:**
En una aplicación tradicional, estos modelos probablemente tendrían un `userId` para vincular el "Me Gusta" o el "Comentario" a un usuario registrado.
Sin embargo, nuestra regla de negocio aquí dictamina que la aplicación es anónima y controlamos el abuso rastreando la **dirección IP** (`ipAddress`).
¡Esto es puro modelado de dominio! La estructura de la entidad refleja directamente cómo funciona nuestro modelo de negocio.

### C. La Entidad `Admin`
```typescript
export interface Admin {
  username: string;
  passwordHash: string;
}
```
Aquí aplicamos una regla de seguridad básica: nunca guardamos ni modelamos la contraseña en texto plano en la entidad, sino el `passwordHash`. De esta forma, si algún desarrollador usa esta entidad en la capa de interfaz de usuario por error, no filtrará la contraseña original.

---

## 3. ¿Por qué no usar Clases (Classes)?

En algunos paradigmas de Programación Orientada a Objetos (OOP) puros, las entidades se escriben como `class` y contienen métodos con lógica de negocio interna (ej. `story.isExpired()`). A esto se le llama **Modelo de Dominio Rico** (*Rich Domain Model*).

Nosotros hemos optado por interfaces planas (también conocidas como **Modelo de Dominio Anémico** o *Anemic Domain Model*).
**¿Por qué?**
1. **Simplicidad:** En aplicaciones modernas y APIs serverless (como en Cloudflare Workers), a menudo solo necesitamos pasar datos puros (estructuras de datos) entre las capas.
2. **Serialización:** Las interfaces se traducen directamente a objetos JSON simples que son fáciles de guardar en una base de datos o enviar como respuesta HTTP sin necesidad de "instanciar" o "deshidratar" clases complejas.
3. **Casos de Uso Fuertes:** Hemos delegado la lógica de negocio a nuestros Casos de Uso (`src/application/use-cases`), dejando a las entidades como meras estructuras de datos.

> [!TIP]
> Empezar con interfaces simples es ideal. Si más adelante la entidad `Story` empieza a tener un estado muy complejo (ej. `draft`, `published`, `archived`) y reglas que limitan cómo pasa de un estado a otro, podríamos considerar convertirla en una `class` para encapsular esa lógica.

## Resumen

Las Entidades de Dominio definen el "lenguaje ubicuo" (Ubiquitous Language) de nuestra aplicación. Cuando el equipo de desarrollo, los administradores o los usuarios hablan de "Historias", "Likes" o "Comentarios", todos saben exactamente de qué datos estamos hablando gracias a estos pequeños archivos.
