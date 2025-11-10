import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from "fs";

// Проверяем наличие SSL сертификатов
const useHttps = fs.existsSync(path.resolve(__dirname, "ssl/cert.pem")) && 
                 fs.existsSync(path.resolve(__dirname, "ssl/key.pem"));

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/', // Важно: указываем корневой путь для правильной работы роутинга
  server: {
    host: "0.0.0.0", // Слушаем на всех интерфейсах (IPv4 и IPv6)
    port: 8080,
    strictPort: true, // Не менять порт, если занят
    // Включаем HTTPS если есть сертификаты
    ...(useHttps && {
      https: {
        key: fs.readFileSync(path.resolve(__dirname, "ssl/key.pem")),
        cert: fs.readFileSync(path.resolve(__dirname, "ssl/cert.pem")),
      },
    }),
  },
  preview: {
    host: "0.0.0.0", // Для production preview тоже
    port: 8080,
    strictPort: true,
    // Включаем HTTPS если есть сертификаты
    ...(useHttps && {
      https: {
        key: fs.readFileSync(path.resolve(__dirname, "ssl/key.pem")),
        cert: fs.readFileSync(path.resolve(__dirname, "ssl/cert.pem")),
      },
    }),
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    minify: 'esbuild', // Используем esbuild (быстрее, встроен в Vite)
    sourcemap: mode === "development", // Source maps только в development
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['framer-motion'],
          'openai': ['openai'],
          'supabase': ['@supabase/supabase-js'],
        },
      },
    },
    // Оставляем console.log для отладки (можно включить drop позже)
    target: 'esnext',
    esbuild: {
      drop: [], // Временно не удаляем console.log для отладки авторизации
    },
  },
}));
