# ============================================
# Dockerfile для Backend API (Node.js + Express)
# ============================================

# Base image
FROM node:20-alpine

# Установка зависимостей для ffmpeg (для обработки видео/аудио)
RUN apk add --no-cache \
    ffmpeg \
    imagemagick \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# Установка рабочей директории
WORKDIR /app

# Копирование package файлов
COPY package*.json ./

# Установка всех зависимостей (включая devDependencies для build)
RUN npm ci

# Копирование исходного кода
COPY . .

# Сборка TypeScript
RUN npm run build

# Удаление devDependencies для уменьшения размера
RUN npm prune --production

# Создание директории для logs
RUN mkdir -p /app/logs

# Создание пользователя для безопасности
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Изменение прав доступа
RUN chown -R nodejs:nodejs /app /app/logs

# Переключение на пользователя
USER nodejs

# Открытие порта
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Запуск приложения
CMD ["node", "dist/server.js"]
