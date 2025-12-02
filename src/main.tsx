import { createRoot } from "react-dom/client";
import App from "./App.tsx";

// 🎯 ТРЕНДОВЫЙ ШРИФТ ДЛЯ AI-ПЛАТФОРМЫ: INTER (№1 для AI сайтов)
import '@fontsource/inter/900.css'; // Extra Bold для заголовков
import '@fontsource/inter/700.css'; // Bold для подзаголовков
import '@fontsource/inter/400.css'; // Regular для текста

import "./index.css";

// ✅ Глобальная обработка ошибок
window.addEventListener('error', (event) => {
  console.error('Global Error:', event.error);
  console.error('Error details:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise Rejection:', event.reason);
  // Можно отправить в Sentry или другой сервис мониторинга
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(<App />);
