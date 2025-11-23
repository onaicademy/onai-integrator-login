import { useRef, useState, useEffect } from "react";

const statsData = [
  {
    number: 1000,
    label: "учеников по СНГ",
    suffix: "+",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    number: 100,
    label: "успешных кейсов",
    suffix: "+",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
        <path d="M4 22h16"/>
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
      </svg>
    ),
  },
  {
    number: 20,
    label: "человек в команде",
    suffix: "+",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    number: 2024,
    label: "года обучаем нейросетям",
    suffix: "",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
];

const AnimatedNumber = ({ value, suffix }: { value: number; suffix: string }) => {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (hasAnimated) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setHasAnimated(true);
          
          const duration = 2000;
          const steps = 60;
          const increment = value / steps;
          let current = 0;

          const timer = setInterval(() => {
            current += increment;
            if (current >= value) {
              setCount(value);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, duration / steps);

          return () => clearInterval(timer);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [value, hasAnimated]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
};

const TrustSection = () => {
  const sectionRef = useRef(null);

  return (
    <section 
      ref={sectionRef} 
      className="relative pt-6 sm:pt-8 md:pt-10 lg:pt-12 pb-16 sm:pb-20 md:pb-24 lg:pb-28 px-4 overflow-hidden"
      style={{ 
        background: "linear-gradient(180deg, #0a0a0a 0%, #0f0f0f 30%, #151515 60%, #0f0f0f 90%, #0a0a0a 100%)" 
      }}
    >
      {/* Премиальный графитовый фон */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Зеленое свечение по центру */}
        <div 
          className="absolute top-1/3 left-0 right-0 h-2/3"
          style={{
            background: "radial-gradient(ellipse 1200px 600px at 50% 30%, rgba(178, 255, 46, 0.12) 0%, rgba(178, 255, 46, 0.06) 40%, rgba(178, 255, 46, 0.02) 70%, transparent 100%)",
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
            backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise7'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise7)' opacity='0.6'/%3E%3C/svg%3E')",
            backgroundSize: "180px 180px",
            mixBlendMode: "soft-light",
          }}
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-10 relative z-10 max-w-7xl">
        {/* Заголовок "КТО ТАКИЕ" и "onAI Academy" */}
        <div className="text-center mb-12 sm:mb-14 md:mb-16 lg:mb-20">
          <p
            className="text-lg sm:text-xl md:text-2xl text-gray-400 uppercase tracking-widest mb-4 sm:mb-5"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 300,
              letterSpacing: "0.15em",
            }}
          >
            КТО ТАКИЕ
          </p>
          <h2
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black text-white"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 900,
              letterSpacing: "-0.02em",
              background: "linear-gradient(135deg, #e8e8e8 0%, #ffffff 50%, #b2ff2e 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 30px rgba(178, 255, 46, 0.15))",
            }}
          >
            onAI Academy
          </h2>
        </div>

        {/* Статистика - асимметричный креативный layout */}
        <div className="relative">
          {/* Большая центральная карточка */}
          <div className="max-w-5xl mx-auto">
            <div 
              className="relative bg-gradient-to-br from-black/60 via-black/40 to-black/60 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden"
              style={{
                boxShadow: `
                  0 20px 60px rgba(0, 0, 0, 0.5),
                  inset 0 1px 0 rgba(255, 255, 255, 0.05),
                  0 0 80px rgba(178, 255, 46, 0.05)
                `,
              }}
            >
              {/* Декоративная зеленая линия сверху */}
              <div 
                className="absolute top-0 left-0 right-0 h-1"
                style={{
                  background: "linear-gradient(90deg, transparent 0%, #b2ff2e 20%, #b2ff2e 80%, transparent 100%)",
                  opacity: 0.6,
                }}
              />

              {/* Grid статистики */}
              <div className="grid grid-cols-2 lg:grid-cols-4">
                {statsData.map((stat, index) => (
                  <div
                    key={index}
                    className="relative p-4 sm:p-6 md:p-8 lg:p-10"
                  >
                    {/* Вертикальные разделители */}
                    {index > 0 && index < 4 && (
                      <div className="hidden lg:block absolute left-0 top-1/4 bottom-1/4 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>
                    )}
                    {index === 2 && (
                      <div className="lg:hidden absolute left-0 top-1/4 bottom-1/4 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>
                    )}

                    {/* Горизонтальный разделитель между рядами на мобиле */}
                    {index === 1 && (
                      <div className="lg:hidden absolute bottom-0 left-1/4 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                    )}

                    {/* Номер и иконка вверху */}
                    <div className="flex items-start justify-between mb-3 sm:mb-4">
                      {/* Номер */}
                      <div 
                        className="text-xs sm:text-sm font-bold opacity-30"
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          color: "#b2ff2e",
                        }}
                      >
                        {String(index + 1).padStart(2, '0')}
                      </div>
                      
                      {/* Иконка */}
                      <div className="text-[#b2ff2e] opacity-40">
                        <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8">
                          {stat.icon}
                        </div>
                      </div>
                    </div>

                    {/* Цифра */}
                    <div className="mb-2 sm:mb-3">
                      <div
                        className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black leading-none"
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontWeight: 900,
                          color: "#ffffff",
                          letterSpacing: "-0.02em",
                        }}
                      >
                        <AnimatedNumber value={stat.number} suffix={stat.suffix} />
                      </div>
                    </div>

                    {/* Описание */}
                    <p 
                      className="text-xs sm:text-sm md:text-base text-gray-400 leading-relaxed"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 300,
                      }}
                    >
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>

              {/* Декоративная зеленая линия снизу */}
              <div 
                className="absolute bottom-0 left-0 right-0 h-px"
                style={{
                  background: "linear-gradient(90deg, transparent 0%, #b2ff2e 20%, #b2ff2e 80%, transparent 100%)",
                  opacity: 0.3,
                }}
              />

              {/* Графитовая текстура поверх */}
              <div 
                className="absolute inset-0 pointer-events-none opacity-[0.02]"
                style={{
                  backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255, 255, 255, 0.1) 2px, rgba(255, 255, 255, 0.1) 4px)",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
