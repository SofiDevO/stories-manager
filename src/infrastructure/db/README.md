# Lección: Esquema de Base de Datos (Database Schema)

Dentro de `src/infrastructure/db/schema.sql` encontramos la definición pura de nuestra base de datos relacional. Como estamos usando **Cloudflare D1** (que corre sobre SQLite), este archivo contiene sintaxis SQL estándar de SQLite.

A diferencia de las bases de datos NoSQL (como MongoDB), aquí tenemos que definir la estructura exacta de nuestros datos antes de usarlos.

---

## 1. Claves Primarias y Tipos de Datos

```sql
CREATE TABLE IF NOT EXISTS stories (
    id          TEXT PRIMARY KEY,
    video_url   TEXT NOT NULL,
    created_at  TEXT NOT NULL
);
```
*   `TEXT PRIMARY KEY`: En SQLite, no tenemos tipos UUID nativos o VARCHAR estrictos. Usamos `TEXT` para guardar nuestros UUIDs generados por el código (ej. `crypto.randomUUID()`).
*   `NOT NULL`: Es una restricción vital. Le dice a la base de datos que *nunca* permita insertar una historia si falta la URL o la fecha. Esto nos protege de tener datos corruptos o incompletos.

## 2. Relaciones y la magia de `CASCADE`

La parte más interesante del esquema es cómo relacionamos las tablas. Fíjate en los comentarios y los likes:

```sql
CREATE TABLE IF NOT EXISTS comments (
    -- ...
    story_id    TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    -- ...
);
```

### `REFERENCES stories(id)`
Esto es una **Foreign Key (Clave Foránea)**. Garantiza la *Integridad Referencial*. Significa que es imposible insertar un comentario si el `story_id` no existe previamente en la tabla `stories`. ¡La base de datos lanzará un error para protegernos de tener comentarios huérfanos!

### `ON DELETE CASCADE`
Este es un superpoder de las bases de datos relacionales. Recuerda que tenemos un caso de uso que borra historias de más de 24 horas (`deleteExpiredStories()`).
Si no tuviéramos `ON DELETE CASCADE`, al intentar borrar una historia, la base de datos daría un error diciendo: *"Oye, no puedes borrar esta historia porque tiene comentarios pegados a ella"*.
Tendríamos que hacer dos consultas: primero borrar los comentarios y luego la historia.

Al añadir `ON DELETE CASCADE`, le estamos diciendo a SQLite: *"Si borras una historia, destruye automáticamente todos los comentarios y likes asociados a ella en cadena"*. Esto simplifica enormemente nuestro código backend.

## 3. Claves Primarias Compuestas (Composite Primary Keys)

Miremos la tabla de "Me gusta":

```sql
CREATE TABLE IF NOT EXISTS likes (
    story_id    TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    ip_address  TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    PRIMARY KEY (story_id, ip_address)
);
```

¿Por qué no hay una columna `id TEXT PRIMARY KEY` aquí?
Porque la regla de negocio dicta que **un usuario (por IP) solo puede dar un like por historia**.
Al definir `PRIMARY KEY (story_id, ip_address)`, estamos combinando ambas columnas para formar la clave única. 
Si alguien con la IP `192.168.1.1` intenta hacer un `INSERT` en la misma `story_id` dos veces, la base de datos lo rechazará automáticamente por violación de Primary Key. 

¡Es una regla de negocio impuesta a nivel de base de datos!
