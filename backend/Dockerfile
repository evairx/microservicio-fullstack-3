FROM oven/bun:alpine
 
WORKDIR /app
 
COPY package.json bun.lock* ./
 
EXPOSE 3000
 
CMD sh -c '\
  if [ ! -f /app/.env ]; then \
    JWT_SECRET=$(head -c 32 /dev/urandom | base64 | tr -d "\n/+=" | head -c 44); \
    echo "JWT_SECRET=${JWT_SECRET}" > /app/.env; \
    echo "✅ .env generado"; \
  else \
    echo "📄 .env ya existe"; \
  fi && \
  echo "📦 Instalando deps..." && \
  bun install && \
  echo "🚀 Iniciando backend..." && \
  bun run dev \
'
