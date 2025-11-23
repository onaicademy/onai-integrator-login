import { useRef } from "react";
import { Button } from "@/components/ui/button";

interface ProgramSectionNewProps {
  onOpenModal?: () => void;
}

// Компонент для визуальных превью каждого дня
const DayPreview = ({ day }: { day: string }) => {
  switch (day) {
    case "01":
      return (
        <div className="relative w-full h-48 sm:h-56 md:h-64 rounded-lg overflow-hidden bg-gradient-to-br from-gray-900 to-gray-950 border border-white/5">
          {/* Имитация интерфейса выбора направления */}
          <div className="absolute inset-0 p-4 sm:p-6">
            <div className="flex flex-col gap-2">
              <div className="h-8 bg-gradient-to-r from-purple-500/20 to-transparent rounded border-l-2 border-purple-500/50 px-3 flex items-center">
                <span className="text-xs text-purple-300 font-mono">AI Automation</span>
              </div>
              <div className="h-8 bg-gradient-to-r from-blue-500/20 to-transparent rounded border-l-2 border-blue-500/50 px-3 flex items-center">
                <span className="text-xs text-blue-300 font-mono">AI Development</span>
              </div>
              <div className="h-8 bg-gradient-to-r from-[#b2ff2e]/20 to-transparent rounded border-l-2 border-[#b2ff2e]/50 px-3 flex items-center">
                <span className="text-xs text-[#b2ff2e] font-mono">AI Integration</span>
              </div>
            </div>
            <div className="absolute bottom-4 right-4 text-6xl opacity-5 font-black">01</div>
          </div>
        </div>
      );
    case "02":
      return (
        <div className="relative w-full h-48 sm:h-56 md:h-64 rounded-lg overflow-hidden bg-gradient-to-br from-gray-900 to-gray-950 border border-white/5">
          {/* Имитация чат-бота */}
          <div className="absolute inset-0 p-4 sm:p-6 flex flex-col gap-2">
            <div className="bg-white/5 rounded-lg p-2 max-w-[70%]">
              <div className="h-2 w-24 bg-gray-600 rounded mb-1"></div>
              <div className="h-2 w-32 bg-gray-700 rounded"></div>
            </div>
            <div className="bg-[#b2ff2e]/10 border border-[#b2ff2e]/30 rounded-lg p-2 max-w-[70%] ml-auto">
              <div className="h-2 w-28 bg-[#b2ff2e]/40 rounded mb-1 ml-auto"></div>
              <div className="h-2 w-20 bg-[#b2ff2e]/40 rounded ml-auto"></div>
            </div>
            <div className="bg-white/5 rounded-lg p-2 max-w-[70%]">
              <div className="h-2 w-28 bg-gray-600 rounded mb-1"></div>
              <div className="h-2 w-24 bg-gray-700 rounded"></div>
            </div>
            <div className="absolute bottom-4 right-4 text-6xl opacity-5 font-black">02</div>
          </div>
        </div>
      );
    case "03":
      return (
        <div className="relative w-full h-48 sm:h-56 md:h-64 rounded-lg overflow-hidden bg-gradient-to-br from-gray-900 to-gray-950 border border-white/5">
          {/* Имитация видео-редактора */}
          <div className="absolute inset-0 p-4 sm:p-6">
            {/* Timeline */}
            <div className="absolute bottom-4 left-4 right-4 h-12 bg-black/40 rounded border border-white/10">
              <div className="flex h-full items-center px-2 gap-1">
                <div className="w-16 h-8 bg-purple-500/20 rounded border border-purple-500/30"></div>
                <div className="w-24 h-8 bg-blue-500/20 rounded border border-blue-500/30"></div>
                <div className="w-20 h-8 bg-[#b2ff2e]/20 rounded border border-[#b2ff2e]/30"></div>
              </div>
            </div>
            {/* Preview */}
            <div className="w-full h-32 bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded border border-white/5 flex items-center justify-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path d="M8 5V19L19 12L8 5Z" fill="#b2ff2e" opacity="0.3"/>
              </svg>
            </div>
            <div className="absolute bottom-4 right-4 text-6xl opacity-5 font-black">03</div>
          </div>
        </div>
      );
    case "LIVE":
      return (
        <div className="relative w-full h-48 sm:h-56 md:h-64 rounded-lg overflow-hidden bg-gradient-to-br from-gray-900 to-gray-950 border border-white/5">
          {/* Имитация дизайн-системы */}
          <div className="absolute inset-0 p-4 sm:p-6">
            {/* Grid of UI elements */}
            <div className="grid grid-cols-3 gap-2">
              <div className="h-16 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded border border-pink-500/30"></div>
              <div className="h-16 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded border border-blue-500/30"></div>
              <div className="h-16 bg-gradient-to-br from-[#b2ff2e]/20 to-green-500/20 rounded border border-[#b2ff2e]/30"></div>
            </div>
            {/* Code snippet */}
            <div className="mt-3 bg-black/40 rounded border border-white/10 p-2 font-mono text-[10px]">
              <div className="flex gap-2">
                <span className="text-purple-400">const</span>
                <span className="text-blue-300">platform</span>
                <span className="text-gray-500">=</span>
                <span className="text-green-300">"ready"</span>
              </div>
            </div>
            <div className="absolute top-4 right-4 px-2 py-1 bg-red-500/20 border border-red-500/50 rounded text-xs text-red-300 font-bold">
              LIVE
            </div>
            <div className="absolute bottom-4 right-4 text-6xl opacity-5 font-black">04</div>
          </div>
        </div>
      );
    default:
      return null;
  }
};

// Компонент для инструментов/иконок
const ToolBadge = ({ name, color }: { name: string; color: string }) => {
  return (
    <div 
      className="px-2.5 py-1 rounded-md text-xs font-medium backdrop-blur-sm"
      style={{
        background: `${color}15`,
        border: `1px solid ${color}30`,
        color: color,
      }}
    >
      {name}
    </div>
  );
};

const programData = [
  {
    day: "01",
    label: "День 1",
    title: "Вводный модуль",
    description: "Определим какое направление в ИИ твое",
    tools: [
      { name: "n8n", color: "#EA4B71" },
      { name: "Make", color: "#6D28D9" },
      { name: "Cursor", color: "#0EA5E9" },
      { name: "Claude", color: "#D97757" },
    ],
  },
  {
    day: "02",
    label: "День 2",
    title: "Практика по созданию GPT-бота",
    description: "Instagram, WhatsApp | Стоимость от 500$",
    tools: [
      { name: "Instagram", color: "#E4405F" },
      { name: "WhatsApp", color: "#25D366" },
      { name: "ChatGPT", color: "#10A37F" },
    ],
  },
  {
    day: "03",
    label: "День 3",
    title: "Практика по созданию видео на 100 000 просмотров",
    description: "Сценарий, создание, монтаж",
    tools: [
      { name: "YouTube", color: "#FF0000" },
      { name: "TikTok", color: "#00F2EA" },
      { name: "Instagram", color: "#E4405F" },
      { name: "Midjourney", color: "#9999FF" },
      { name: "Kling", color: "#FFA500" },
      { name: "Veo 3", color: "#b2ff2e" },
    ],
  },
  {
    day: "LIVE",
    label: "Live Эфир",
    title: "Заключительный прямой эфир с основателями академии",
    description: "Как создать платформу стоимостью 10 000$ без навыков программирования",
    tools: [
      { name: "UI/UX", color: "#F24E1E" },
      { name: "Cursor", color: "#0EA5E9" },
      { name: "VSCode", color: "#007ACC" },
      { name: "Code", color: "#b2ff2e" },
    ],
  },
];

const ProgramSectionNew = ({ onOpenModal }: ProgramSectionNewProps = {}) => {
  const ref = useRef(null);

  return (
    <section 
      ref={ref} 
      className="relative pt-12 sm:pt-16 md:pt-20 lg:pt-24 pb-16 sm:pb-20 md:pb-24 lg:pb-28 px-4 overflow-hidden"
      style={{ 
        background: "linear-gradient(180deg, rgba(10, 10, 10, 0.8) 0%, #0a0a0a 10%, #0f0f0f 40%, #151515 70%, #0a0a0a 100%)" 
      }}
    >
      {/* Премиальный графитовый фон */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Зеленое свечение сверху (продолжение Hero) */}
        <div 
          className="absolute top-0 left-0 right-0 h-1/2"
          style={{
            background: "radial-gradient(ellipse 1400px 500px at 50% 0%, rgba(178, 255, 46, 0.10) 0%, rgba(178, 255, 46, 0.05) 40%, rgba(178, 255, 46, 0.02) 70%, transparent 100%)",
          }}
        />
        
        {/* Графитовые линии */}
        <div 
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(255, 255, 255, 0.08) 1px, rgba(255, 255, 255, 0.08) 2px, transparent 2px, transparent 12px)",
          }}
        />
        
        {/* Зернистость */}
        <div 
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise4'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise4)' opacity='0.6'/%3E%3C/svg%3E')",
            backgroundSize: "180px 180px",
            mixBlendMode: "soft-light",
          }}
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-10 relative z-10 max-w-6xl">
        {/* Заголовок */}
        <div className="text-center mb-12 sm:mb-16 md:mb-20">
          <h2
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-3"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 900,
              letterSpacing: "-2px",
              background: "linear-gradient(135deg, #ffffff 0%, #f5f5f5 50%, #b2ff2e 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 30px rgba(178, 255, 46, 0.15))",
            }}
          >
            3 ДНЯ ОБУЧЕНИЯ
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-400" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300 }}>
            с домашними заданиями
          </p>
        </div>

        {/* Модули-карточки в виде Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 md:gap-10 mb-12 sm:mb-16 md:mb-20">
          {programData.map((item, index) => (
            <div
              key={index}
              className="relative group"
            >
              {/* Карточка модуля с 3D эффектом */}
              <div 
                className="relative bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl overflow-hidden border border-white/10"
                style={{
                  boxShadow: `
                    0 4px 6px rgba(0, 0, 0, 0.3),
                    0 10px 20px rgba(0, 0, 0, 0.2),
                    inset 0 1px 0 rgba(255, 255, 255, 0.05),
                    0 0 40px rgba(178, 255, 46, 0.03)
                  `,
                }}
              >
                {/* Номер дня - абсолютный, большой, графитовый */}
                <div 
                  className="absolute top-4 left-4 z-10 text-6xl sm:text-7xl md:text-8xl font-black"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    WebkitTextStroke: "2px rgba(178, 255, 46, 0.3)",
                    color: "transparent",
                    textShadow: "0 0 30px rgba(178, 255, 46, 0.15)",
                  }}
                >
                  {item.day}
                </div>

                {/* Визуальное превью */}
                <div className="relative z-0">
                  <DayPreview day={item.day} />
                </div>

                {/* Контент */}
                <div className="p-4 sm:p-5 md:p-6 relative z-10">
                  {/* Label */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-px flex-1 bg-gradient-to-r from-[#b2ff2e]/50 to-transparent"></div>
                    <span className="text-xs font-bold text-[#b2ff2e] uppercase tracking-widest" style={{ fontFamily: "'Inter', sans-serif" }}>
                      {item.label}
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-l from-[#b2ff2e]/50 to-transparent"></div>
                  </div>

                  {/* Title */}
                  <h3 
                    className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2 leading-tight"
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 700,
                    }}
                  >
                    {item.title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm sm:text-base text-gray-400 mb-4 leading-relaxed" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300 }}>
                    {item.description}
                  </p>

                  {/* Tools */}
                  <div className="flex flex-wrap gap-2">
                    {item.tools.map((tool, idx) => (
                      <ToolBadge key={idx} name={tool.name} color={tool.color} />
                    ))}
                  </div>
                </div>

                {/* Графитовая текстура поверх карточки */}
                <div 
                  className="absolute inset-0 pointer-events-none opacity-[0.03]"
                  style={{
                    backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255, 255, 255, 0.1) 2px, rgba(255, 255, 255, 0.1) 4px)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-5 sm:gap-6">
          <Button
            onClick={onOpenModal}
            className="group px-8 py-5 sm:px-10 sm:py-6 md:px-12 md:py-7 text-base sm:text-lg md:text-xl font-medium rounded-lg md:rounded-xl flex items-center gap-2 sm:gap-3 hover:scale-105 transition-transform duration-300"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 500,
              background: "linear-gradient(180deg, #FFFFFF 0%, #F0F0F0 100%)",
              color: "#000000",
              boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.15), 0px 2px 6px rgba(0, 0, 0, 0.08)",
              border: "none"
            }}
          >
            <svg 
              className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 group-hover:scale-110 transition-transform" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
              <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
              <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
              <path d="M2 12a10 10 0 0 1 18-6" />
              <path d="M2 16h.01" />
              <path d="M21.8 16c.2-2 .131-5.354 0-6" />
              <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
              <path d="M8.65 22c.21-.66.45-1.32.57-2" />
              <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
            </svg>
            Занять место
          </Button>
          
          <p className="text-sm sm:text-base text-gray-500" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300 }}>
            Всего <span className="text-white font-semibold">100</span> мест
          </p>
        </div>

      </div>
    </section>
  );
};

export default ProgramSectionNew;
