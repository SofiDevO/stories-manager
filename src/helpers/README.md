# Lección: Manejo de Errores (Helpers)

En la carpeta `src/helpers/error.ts` encontramos un patrón muy elegante para gestionar qué sale mal en nuestra aplicación: **Clases de Error Personalizadas**.

## 1. El Problema con el `Error` nativo

En JavaScript/TypeScript clásico, cuando algo falla, solemos hacer esto:
`throw new Error("No tienes permiso");`

El problema es que cuando ese error llega a la capa de Rutas o Controladores, el controlador solo ve un objeto genérico `Error`. ¿Fue un error de validación del usuario? ¿Fue que la base de datos se cayó? ¿Fue falta de permisos? El controlador no lo sabe, y probablemente devuelva un código HTTP `500 Internal Server Error` genérico.

## 2. La Solución: Herencia Orientada a Objetos

Aquí hemos creado una estructura jerárquica de clases que heredan de la clase base nativa `Error`.

```typescript
export class HttpError extends Error {
  public httpCode: number;
  constructor(message: string, httpCode: number) {
    super(message);
    this.httpCode = httpCode;
  }
}
```
Primero, creamos `HttpError`. Es igual que un `Error` normal, pero le añadimos una propiedad nueva obligatoria: `httpCode`.

A partir de ahí, creamos hijos específicos para cada situación de negocio:

```typescript
export class UnauthorizedError extends HttpError {
  constructor(message: string) {
    super(message, 403);
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string) {
    super(message, 400);
  }
}
```

## 3. ¿Cómo mejora esto la arquitectura?

1. **Claridad en los Casos de Uso:**
   Ahora, en nuestro `AddCommentUseCase`, en lugar de un error genérico, escribimos:
   `throw new UnauthorizedError('Your IP address has been banned');`
   Esto hace que el código sea autodocumentado. El desarrollador sabe exactamente qué *tipo* de excepción está ocurriendo.

2. **Controladores Inteligentes:**
   Gracias a estas clases, en el bloque `catch` del controlador podemos usar la palabra clave `instanceof` para tomar decisiones precisas:
   ```typescript
   } catch (error: any) {
     if (error instanceof UnauthorizedError) {
       // ¡Ajá! El usuario está baneado. Le devuelvo un 403 exacto.
       return c.json({ error: error.message }, 403);
     }
     if (error instanceof BadRequestError) {
       // El usuario envió mal los datos. Le devuelvo un 400.
       return c.json({ error: error.message }, 400);
     }
   }
   ```

## Resumen

Tener un archivo `error.ts` centralizado unifica el lenguaje de fallos de tu aplicación. Transforma "algo salió mal" en "pasó esto específico y este es el código HTTP que debes devolverle al cliente". Es una pequeña pieza de código que mejora drásticamente la mantenibilidad y la experiencia de los desarrolladores (DX) y de los usuarios que consumen la API.
