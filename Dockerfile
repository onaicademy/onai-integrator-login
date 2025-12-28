# ============================================
# Multi-stage Dockerfile для Frontend (React + Vite)
# ============================================

# Stage 1: Build
FROM node:20-alpine AS builder

# Установка рабочей директории
WORKDIR /app

# Копирование package файлов
COPY package*.json ./

# Установка зависимостей
RUN npm ci --legacy-peer-deps

# Копирование исходного кода
COPY . .

# Сборка приложения
RUN npm run build

# Stage 2: Production с Nginx
FROM nginx:alpine

# Установка необходимых пакетов
RUN apk add --no-cache curl

# Копирование конфигурации Nginx
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Копирование собранного приложения из builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Создание директории для health check
RUN mkdir -p /usr/share/nginx/html/health

# Создание health check файла
RUN echo "OK" > /usr/share/nginx/html/health/index.html

# Открытие порта
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/health/ || exit 1

# Запуск Nginx
CMD ["nginx", "-g", "daemon off;"]
