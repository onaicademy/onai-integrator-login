import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from "fs";

// Проверяем наличие SSL сертификатов
const useHttps = fs.existsSync(path.resolve(__dirname, "ssl/cert.pem")) && 
                 fs.existsSync(path.resolve(__dirname, "ssl/key.pem"));

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Загружаем env переменные
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    base: '/', // Важно: указываем корневой путь для правильной работы роутинга
    server: {
      host: "0.0.0.0", // Слушаем на всех интерфейсах (IPv4 и IPv6)
      port: 8080,
      strictPort: true, // Не менять порт, если занят
      // ✅ PROXY: Перенаправляем API запросы на localhost backend
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path
        }
      },
      // 🧹 CACHE-BUSTING: Отключаем кэш для CSS/JS в dev mode
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
      // ✅ ФИКС: HMR конфигурация для Windows
      watch: {
        usePolling: true,  // Используй polling вместо file watcher
        interval: 100,     // Проверяй каждые 100ms
        ignored: ['!**/src/**/*.{js,ts,jsx,tsx,css}'],
      },
      hmr: {
        protocol: 'ws',
        host: 'localhost',
        port: 8080,
        timeout: 60000,
      },
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
  // ✅ CSS конфигурация
  css: {
    postcss: './postcss.config.js',
  },
  // ✅ ВАЖНО: Дисейбл кэш зависимостей
  optimizeDeps: {
    exclude: ['tailwindcss'],
    force: true,
  },
  // 🧹 CACHE-BUSTING: Очищаем кэш при каждом старте
  cacheDir: '.vite',
  build: {
    minify: 'esbuild', // Используем esbuild (быстрее, встроен в Vite)
    sourcemap: mode === "development", // Source maps только в development
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // 🔥 CACHE-BUSTING: Уникальные хеши для файлов
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['framer-motion'],
          'openai': ['openai'],
          'supabase': ['@supabase/supabase-js'],
        },
      },
    },
    target: 'esnext',
    esbuild: {
      // 🔥 SECURITY: Remove ALL console.* calls in production (including error/warn)
      // Use proper logging service for production error tracking (e.g., Sentry)
      drop: mode === 'production' ? ['console', 'debugger'] : [],
      // Alternative: Keep only critical errors (uncomment if needed)
      // pure: mode === 'production' ? ['console.log', 'console.debug', 'console.info', 'console.trace'] : [],
    },
    // ✅ Явно встраиваем env переменные в build (для production)
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
      'import.meta.env.VITE_TRIPWIRE_SUPABASE_URL': JSON.stringify(env.VITE_TRIPWIRE_SUPABASE_URL),
      'import.meta.env.VITE_TRIPWIRE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_TRIPWIRE_SUPABASE_ANON_KEY),
      'import.meta.env.VITE_LANDING_SUPABASE_URL': JSON.stringify(env.VITE_LANDING_SUPABASE_URL),
      'import.meta.env.VITE_LANDING_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_LANDING_SUPABASE_ANON_KEY),
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL),
    },
  },
  };
});
