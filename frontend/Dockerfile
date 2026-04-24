FROM oven/bun:alpine
 
RUN apk add --no-cache nodejs
 
WORKDIR /app
 
COPY package.json bun.lock* ./
 
EXPOSE 4321
 
CMD sh -c '\
  echo "📦 Instalando deps..." && \
  bun install && \
  echo "🚀 Iniciando frontend..." && \
  bun run dev --host 0.0.0.0 \
'
 