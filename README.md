
# Red Social — Tarea Fullstack

Proyecto fullstack desarrollado con **Hono + Bun** en el backend y **Astro** en el frontend, containerizado con Docker.

---

## Requisitos

- [Docker](https://www.docker.com/get-started) instalado y corriendo
---

  

## Levantar el proyecto
### Paso 1 — Clonar el repositorio
```bash
git clone https://github.com/evairx/redsocial-tarea-fullstack-3.git
```
### Paso 2 — Entrar al directorio
```bash
cd redsocial-tarea-fullstack-3
```
### Paso 3 — Levantar con Docker Compose
```bash
docker compose up -d
```

Esto va a:
- Construir las imágenes del backend y frontend
- Instalar todas las dependencias con `bun install`
- Generar automáticamente el archivo `.env` con un `JWT_SECRET` aleatorio
- Iniciar ambos servidores en modo desarrollo

### Paso 4 — Abrir el frontend
```
http://localhost:4321
```
---
## URLs

  

| Servicio | URL |

|-----------|--------------------------|

| Frontend | http://localhost:4321 |

| Backend | http://localhost:3000 |

  

---
## Detener el proyecto
```bash
docker compose down
```