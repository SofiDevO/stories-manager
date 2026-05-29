# Lección: Almacenamiento S3/R2 (Storage Service)

¡Continuamos con la capa de **Infraestructura**! Aquí en `src/infrastructure/storage/R2StorageService.ts` tenemos algo muy especial que no es una base de datos relacional, sino un servicio de almacenamiento de objetos (Object Storage).

Estamos usando la librería `@aws-sdk/client-s3` para conectarnos a **Cloudflare R2** (que es 100% compatible con la API de Amazon S3).

---

## 1. El Patrón de URLs Prefirmadas (Presigned URLs)

La parte más importante de este archivo es la función `generateUploadUrl`:

```typescript
async generateUploadUrl(fileName: string): Promise<string> {
    const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
        ContentType: 'video/mp4',
    });

    const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
    return signedUrl;
}
```

### ¿Por qué lo hacemos así? El Problema Tradicional
En una arquitectura web clásica (como PHP o un servidor Node.js antiguo), si un usuario quiere subir un video de 50MB:
1. El usuario envía el video de 50MB a tu servidor Node.js.
2. Tu servidor Node.js recibe los 50MB (consumiendo memoria y ancho de banda).
3. Tu servidor Node.js envía esos mismos 50MB a AWS S3 o Cloudflare R2.

Esto es ineficiente, caro y en entornos Serverless (como Cloudflare Workers) ¡a menudo está prohibido por los límites de tamaño de carga (Payload Size limits)!

### La Solución: Presigned URLs
Con este patrón, el flujo cambia:
1. Tu cliente (el frontend) le dice a tu API: *"Oye, quiero subir un video llamado `123.mp4`"*.
2. Tu API usa el AWS SDK para generar una firma criptográfica (con `getSignedUrl`). Esta firma le dice a R2: *"Le doy permiso a quien tenga esta URL de subir un archivo exactamente aquí, pero solo durante los próximos 3600 segundos (1 hora)"*.
3. Tu API le devuelve esta URL (un simple texto) al frontend.
4. **El frontend sube el video de 50MB DIRECTAMENTE a Cloudflare R2**, saltándose tu servidor por completo.

## Resumen

El `R2StorageService` es una clase pequeña pero súper poderosa. Encapsula la complejidad del SDK de AWS y nos permite implementar un patrón arquitectónico moderno que ahorra ancho de banda, reduce costos y hace que nuestra aplicación en el Edge sea increíblemente escalable. ¡Tu API nunca se asfixiará procesando videos!
