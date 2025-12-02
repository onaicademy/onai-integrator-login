import { useState } from 'react';
import { motion } from 'framer-motion';
import { TripwireUserProfile } from '@/lib/tripwire-utils';
import { Eye, Lock } from 'lucide-react';

interface CertificatePreviewProps {
  profile: TripwireUserProfile;
  isLocked?: boolean;
  certificateNumber?: string;
  issuedAt?: string;
}

/**
 * Профессиональный шаблон сертификата в Cyber-Architecture стиле
 * Готов к конвертации в PDF через Puppeteer
 */
export function CertificatePreview({ 
  profile, 
  isLocked = false,
  certificateNumber = 'ONAI-TW-2025-XXXXXX',
  issuedAt 
}: CertificatePreviewProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const displayName = profile.full_name || 'Имя Фамилия';
  const displayDate = issuedAt 
    ? new Date(issuedAt).toLocaleDateString('ru-RU', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      })
    : '01 декабря 2025 г.';

  // Если нажали "Открыть", то блокировка снимается визуально
  const showLockOverlay = isLocked && !isPreviewOpen;

  return (
    <div className="relative w-full">
      {/* A4 Landscape Container */}
      <div className="relative w-full aspect-[1.414/1] bg-gradient-to-br from-[#030303] via-[#0A0A0A] to-[#050505] rounded-xl overflow-hidden shadow-2xl">
        <svg 
          width="100%" 
          height="100%" 
          viewBox="0 0 1200 848" 
          xmlns="http://www.w3.org/2000/svg" 
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full"
        >
          <defs>
            {/* Градиенты */}
            <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#030303', stopOpacity: 1 }} />
              <stop offset="50%" style={{ stopColor: '#0A0A0A', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#050505', stopOpacity: 1 }} />
            </linearGradient>
            
            <linearGradient id="greenGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: '#00FF94', stopOpacity: 0.6 }} />
              <stop offset="50%" style={{ stopColor: '#00FF94', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#00CC6A', stopOpacity: 0.6 }} />
            </linearGradient>

            <radialGradient id="glowEffect" cx="50%" cy="50%">
              <stop offset="0%" style={{ stopColor: '#00FF94', stopOpacity: 0.2 }} />
              <stop offset="100%" style={{ stopColor: '#00FF94', stopOpacity: 0 }} />
            </radialGradient>

            {/* Фильтры */}
            <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feFlood floodColor="#00FF94" floodOpacity="0.6" />
              <feComposite in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Паттерн для сетки */}
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#00FF94" strokeWidth="0.5" opacity="0.05"/>
            </pattern>
          </defs>

          {/* Фон */}
          <rect width="1200" height="848" fill="url(#bgGradient)" />
          
          {/* Сетка фона */}
          <rect width="1200" height="848" fill="url(#grid)" opacity="0.3" />

          {/* Декоративные угловые элементы */}
          {/* Верхний левый угол */}
          <g opacity="0.8">
            <line x1="60" y1="60" x2="60" y2="140" stroke="#00FF94" strokeWidth="3" />
            <line x1="60" y1="60" x2="140" y2="60" stroke="#00FF94" strokeWidth="3" />
            <circle cx="60" cy="60" r="4" fill="#00FF94" />
          </g>

          {/* Верхний правый угол */}
          <g opacity="0.8">
            <line x1="1140" y1="60" x2="1140" y2="140" stroke="#00FF94" strokeWidth="3" />
            <line x1="1140" y1="60" x2="1060" y2="60" stroke="#00FF94" strokeWidth="3" />
            <circle cx="1140" cy="60" r="4" fill="#00FF94" />
          </g>

          {/* Нижний левый угол */}
          <g opacity="0.8">
            <line x1="60" y1="788" x2="60" y2="708" stroke="#00FF94" strokeWidth="3" />
            <line x1="60" y1="788" x2="140" y2="788" stroke="#00FF94" strokeWidth="3" />
            <circle cx="60" cy="788" r="4" fill="#00FF94" />
          </g>

          {/* Нижний правый угол */}
          <g opacity="0.8">
            <line x1="1140" y1="788" x2="1140" y2="708" stroke="#00FF94" strokeWidth="3" />
            <line x1="1140" y1="788" x2="1060" y2="788" stroke="#00FF94" strokeWidth="3" />
            <circle cx="1140" cy="788" r="4" fill="#00FF94" />
          </g>

          {/* Логотип onAI Academy - Настоящий из платформы */}
          <g transform="translate(60, 60)">
            <text 
              x="0" 
              y="28" 
              fill="#00FF88" 
              fontSize="28" 
              fontFamily="Space Grotesk, sans-serif" 
              fontWeight="bold"
              letterSpacing="0"
            >
              on
            </text>
            <text 
              x="42" 
              y="28" 
              fill="#FFFFFF" 
              fontSize="28" 
              fontFamily="Space Grotesk, sans-serif" 
              fontWeight="bold"
              letterSpacing="0"
            >
              AI
            </text>
            <rect x="88" y="8" width="1.5" height="22" fill="#333333" />
            <text 
              x="98" 
              y="16" 
              fill="#666666" 
              fontSize="8" 
              fontFamily="JetBrains Mono, monospace" 
              letterSpacing="1"
            >
              DIGITAL
            </text>
            <text 
              x="98" 
              y="26" 
              fill="#666666" 
              fontSize="8" 
              fontFamily="JetBrains Mono, monospace" 
              letterSpacing="1"
            >
              ACADEMY
            </text>
          </g>

          {/* Светящийся круг в центре (декоративный) */}
          <circle cx="600" cy="280" r="120" fill="url(#glowEffect)" opacity="0.4" />

          {/* Заголовок "СЕРТИФИКАТ" */}
          <text 
            x="600" 
            y="200" 
            textAnchor="middle" 
            fill="url(#greenGlow)" 
            fontSize="24" 
            fontFamily="JetBrains Mono, monospace" 
            letterSpacing="8"
            filter="url(#neonGlow)"
          >
            СЕРТИФИКАТ О ЗАВЕРШЕНИИ
          </text>

          {/* Декоративная линия под заголовком */}
          <line 
            x1="400" 
            y1="220" 
            x2="800" 
            y2="220" 
            stroke="#00FF94" 
            strokeWidth="1" 
            opacity="0.3" 
          />

          {/* ИМЯ СТУДЕНТА (крупный текст) */}
          <text 
            x="600" 
            y="330" 
            textAnchor="middle" 
            fill="#FFFFFF" 
            fontSize="64" 
            fontFamily="Space Grotesk, sans-serif" 
            fontWeight="bold"
            letterSpacing="4"
            style={{ textTransform: 'uppercase' }}
          >
            {displayName}
          </text>

          {/* Описание */}
          <text 
            x="600" 
            y="390" 
            textAnchor="middle" 
            fill="#9CA3AF" 
            fontSize="20" 
            fontFamily="Manrope, sans-serif"
          >
            успешно завершил(а) интенсивный курс
          </text>

          {/* Название курса */}
          <text 
            x="600" 
            y="450" 
            textAnchor="middle" 
            fill="#FFFFFF" 
            fontSize="36" 
            fontFamily="Space Grotesk, sans-serif" 
            fontWeight="bold"
            letterSpacing="4"
          >
            TRIPWIRE: ВВЕДЕНИЕ В AI
          </text>

          {/* Декоративная линия */}
          <line 
            x1="300" 
            y1="480" 
            x2="900" 
            y2="480" 
            stroke="#00FF94" 
            strokeWidth="1" 
            opacity="0.2" 
          />

          {/* Дополнительное описание */}
          <text 
            x="600" 
            y="520" 
            textAnchor="middle" 
            fill="#666666" 
            fontSize="16" 
            fontFamily="Manrope, sans-serif"
          >
            Освоение основ искусственного интеллекта и практических навыков
          </text>
          <text 
            x="600" 
            y="545" 
            textAnchor="middle" 
            fill="#666666" 
            fontSize="16" 
            fontFamily="Manrope, sans-serif"
          >
            работы с нейросетями и AI-инструментами
          </text>

          {/* Печать (Официальная синяя на белом фоне) */}
          <g transform="translate(550, 590)">
            {/* Белая подложка под печать */}
            <circle cx="50" cy="50" r="55" fill="#FFFFFF" filter="url(#neonGlow)" opacity="0.9" />
            
            {/* Синяя печать #10A4FF */}
            <circle cx="50" cy="50" r="50" fill="none" stroke="#10A4FF" strokeWidth="3" />
            <circle cx="50" cy="50" r="42" fill="none" stroke="#10A4FF" strokeWidth="1" opacity="0.5" />
            <circle cx="50" cy="50" r="35" fill="none" stroke="#10A4FF" strokeWidth="0.5" opacity="0.3" />
            
            {/* Текст на печати */}
            <path id="sealText" d="M 20,50 A 30,30 0 1,1 80,50" fill="none" />
            <text fontSize="8" fontFamily="JetBrains Mono, monospace" fill="#10A4FF" fontWeight="bold" letterSpacing="2">
              <textPath href="#sealText" startOffset="50%" textAnchor="middle">
                onAI ACADEMY
              </textPath>
            </text>
            
            <text 
              x="50" 
              y="55" 
              textAnchor="middle" 
              fill="#10A4FF" 
              fontSize="10" 
              fontFamily="JetBrains Mono, monospace"
              fontWeight="bold"
            >
              CERTIFIED
            </text>
            
            <text 
              x="50" 
              y="65" 
              textAnchor="middle" 
              fill="#10A4FF" 
              fontSize="6" 
              fontFamily="JetBrains Mono, monospace"
            >
              2025
            </text>
          </g>

          {/* Подписи CEO */}
          <g transform="translate(120, 650)">
            <line x1="0" y1="0" x2="160" y2="0" stroke="#333333" strokeWidth="1.5" />
            <text 
              x="80" 
              y="25" 
              textAnchor="middle" 
              fill="#666666" 
              fontSize="13" 
              fontFamily="Manrope, sans-serif"
            >
              CEO onAI Academy
            </text>
            <text 
              x="80" 
              y="45" 
              textAnchor="middle" 
              fill="#9CA3AF" 
              fontSize="10" 
              fontFamily="JetBrains Mono, monospace"
            >
              Александр Тарарушкин
            </text>
          </g>

          {/* Вторая подпись CEO */}
          <g transform="translate(920, 650)">
            <line x1="0" y1="0" x2="160" y2="0" stroke="#333333" strokeWidth="1.5" />
            <text 
              x="80" 
              y="25" 
              textAnchor="middle" 
              fill="#666666" 
              fontSize="13" 
              fontFamily="Manrope, sans-serif"
            >
              CEO onAI Academy
            </text>
            <text 
              x="80" 
              y="45" 
              textAnchor="middle" 
              fill="#9CA3AF" 
              fontSize="10" 
              fontFamily="JetBrains Mono, monospace"
            >
              Диас Серекбай
            </text>
          </g>

          {/* Дата выдачи - перемещена в центр */}
          <g transform="translate(500, 650)">
            <line x1="0" y1="0" x2="200" y2="0" stroke="#333333" strokeWidth="1.5" />
            <text 
              x="100" 
              y="25" 
              textAnchor="middle" 
              fill="#666666" 
              fontSize="13" 
              fontFamily="Manrope, sans-serif"
            >
              Дата выдачи
            </text>
            <text 
              x="100" 
              y="45" 
              textAnchor="middle" 
              fill="#9CA3AF" 
              fontSize="13" 
              fontFamily="JetBrains Mono, monospace"
              fontWeight="500"
            >
              {displayDate}
            </text>
          </g>

          {/* Номер сертификата (внизу) */}
          <text 
            x="600" 
            y="760" 
            textAnchor="middle" 
            fill="#333333" 
            fontSize="12" 
            fontFamily="JetBrains Mono, monospace"
            letterSpacing="2"
          >
            {certificateNumber}
          </text>

          {/* QR код удален по запросу пользователя */}
          {/* <g transform="translate(1050, 710)"> ... </g> */}
        </svg>

        {/* Overlay для заблокированного состояния */}
        {showLockOverlay && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md z-10">
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm flex flex-col items-center">
              <div className="flex items-center gap-4 mb-4">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <div>
                  <h3 className="text-xl text-white font-['Space_Grotesk'] font-bold uppercase tracking-wider mb-1">
                    Сертификат заблокирован
                  </h3>
                  <p className="text-sm text-gray-400 font-['Manrope']">
                    Завершите все модули для получения доступа
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 font-['JetBrains_Mono'] uppercase mb-6">
                <span>/// ПРОГРЕСС:</span>
                <span className="text-[#00FF94]">{profile.modules_completed}/3 модулей</span>
              </div>

              {/* Кнопка просмотра (временная) */}
              <button
                onClick={() => setIsPreviewOpen(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 border border-white/10 
                         hover:bg-white/20 hover:border-[#00FF94]/50 transition-all duration-300 group"
              >
                <Eye className="w-4 h-4 text-[#00FF94] group-hover:scale-110 transition-transform" />
                <span className="text-white font-['JetBrains_Mono'] font-bold uppercase tracking-wide text-sm">
                  ОТКРЫТЬ СЕРТИФИКАТ
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
