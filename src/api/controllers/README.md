# Lección: Controladores (Controllers)

¡Hemos llegado a la pieza que une todo el rompecabezas! En la carpeta `src/api/controllers` encontramos `stories.controller.ts`. 

Si recuerdas las lecciones anteriores:
1. Las **Rutas** dicen "quién" se encarga de la petición.
2. Los **Middlewares** verifican si "tienes permiso" para hacer la petición.
3. Los **Casos de Uso** (Aplicación) contienen la "lógica de negocio" pura.
4. Los **Repositorios** (Infraestructura) hablan con la base de datos.

Entonces, ¿qué hace el Controlador? **El Controlador es el Orquestador.** Es el traductor entre el mundo exterior (la web, HTTP, JSON) y nuestro mundo interior (Reglas de negocio, TypeScript puro).

---

## 1. La anatomía de un Controlador

Veamos el método `addComment` como ejemplo:

```typescript
static async addComment(c: Context) {
  try {
    // 1. Extraer datos del mundo exterior (HTTP)
    const storyId = c.req.param("id");
    if (!storyId) throw new Error("Invalid story ID");
    
    const body = await c.req.json();
    const clientIP = c.get("clientIp") || "";

    // 2. Preparar las herramientas (Repositorios de Infraestructura)
    const commentRepo = new D1CommentRepository(c.env.stories_manager);
    const modRepo = new D1ModerationRepository(c.env.stories_manager);

    // 3. Ensamblar la lógica (Caso de Uso de Aplicación)
    const useCase = new AddCommentUseCase(commentRepo, modRepo);
    
    // 4. Ejecutar la acción
    await useCase.execute(storyId, body.content, clientIP);

    // 5. Devolver una respuesta al mundo exterior (HTTP)
    return c.json({ success: true, message: "Comment added" }, 201);
    
  } catch (error: any) {
    // ... manejo de errores (ver más abajo)
  }
}
```

### ¿Por qué lo hacemos así?
El caso de uso `AddCommentUseCase` no sabe nada sobre objetos `Request` o `Response`. No sabe leer una URL. Solo entiende cadenas de texto (`storyId`, `content`, `clientIP`). 

El Controlador es el traductor. Saca los datos del framework web (Hono), se los pasa en un formato limpio al Caso de Uso, espera el resultado, y luego lo vuelve a empaquetar en una respuesta HTTP (código 201 Created y un JSON).

---

## 2. Inyección Manual de Dependencias

Notarás que dentro de cada método de nuestro controlador, estamos instanciando clases usando `new`:

```typescript
const storyRepo = new D1StoryRepository(c.env.stories_manager);
const useCase = new GetActiveStoriesUseCase(storyRepo);
```

En aplicaciones empresariales muy grandes (como las construidas con NestJS o Spring Boot), esto suele hacerse de forma automática mediante un "Contenedor de Inyección de Dependencias" que instancia todo al arrancar la app.

Sin embargo, como estamos en **Cloudflare Workers** (un entorno Serverless/Edge), nos cobran por milisegundo de ejecución de CPU. Instanciar manualmente *solo lo que necesitamos* en el momento exacto en que llega la petición es mucho más eficiente y mantiene el "Cold Start" (tiempo de arranque) casi en 0 milisegundos.

Además, recuerda que el contexto de Hono (`c.env`) solo está disponible *durante* la petición, por lo que instanciamos los repositorios pasándoles directamente la base de datos `c.env.stories_manager`.

---

## 3. Manejo de Errores y Códigos de Estado (HTTP Status)

Una de las responsabilidades más importantes del Controlador es saber cómo traducir una falla de la lógica de negocio en el código HTTP correcto.

Mira cómo manejamos el bloque `catch` en `addComment`:

```typescript
} catch (error: any) {
  if (error instanceof UnauthorizedError) {
    // Si la IP está baneada -> 403 Forbidden
    return c.json({ success: false, error: error.message }, 403);
  }
  if (error instanceof BadRequestError) {
    // Si el comentario está vacío -> 400 Bad Request
    return c.json({ success: false, error: error.message }, 400);
  }
  
  // Cualquier otro fallo inesperado -> 500 Internal Server Error
  return c.json({ success: false, error: error.message }, 500);
}
```

En nuestro Caso de Uso (`AddCommentUseCase.ts`), lanzamos errores específicos (`throw new UnauthorizedError(...)`). El Controlador captura esos errores, evalúa de qué tipo son, y le dice al navegador web o a la aplicación móvil exactamente qué salió mal usando los estándares de internet (HTTP Status Codes).

## Resumen

El **Controlador** es el puente. Es la única capa (además de los middlewares y las rutas) que importa paquetes específicos del framework web (`Context` de Hono).

*   **Entrada:** Extrae parámetros, body y cabeceras.
*   **Preparación:** Inicializa los repositorios de base de datos pasando las variables de entorno.
*   **Orquestación:** Inicializa el Caso de Uso pasándole los repositorios (cumpliendo así con las interfaces del dominio).
*   **Salida:** Formatea el resultado o el error en un JSON entendible por el cliente HTTP.

¡Con esto completas el mapa mental de Clean Architecture! Desde que la petición entra en el Enrutador, es verificada por el Middleware, parseada por el Controlador, procesada por el Caso de Uso (con reglas de Entidades), y finalmente guardada por el Repositorio. ¡Una arquitectura robusta, escalable y muy fácil de mantener!
