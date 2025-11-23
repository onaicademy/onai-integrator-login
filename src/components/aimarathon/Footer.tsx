import { OnAILogo } from "@/components/OnAILogo";

const Footer = () => {
  return (
    <footer 
      className="relative pt-10 sm:pt-12 md:pt-14 pb-6 sm:pb-8 px-4 overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #050505 0%, #0a0a0a 30%, #050505 100%)",
      }}
    >
      {/* Графитовый фон */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute top-0 left-0 right-0 h-1/2"
          style={{
            background: "radial-gradient(ellipse 1000px 400px at 50% 0%, rgba(178, 255, 46, 0.08) 0%, rgba(178, 255, 46, 0.03) 50%, transparent 100%)",
          }}
        />
        <div 
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(255, 255, 255, 0.08) 1px, rgba(255, 255, 255, 0.08) 2px, transparent 2px, transparent 12px)",
          }}
        />
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noisefooter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noisefooter)' opacity='0.6'/%3E%3C/svg%3E')",
            backgroundSize: "180px 180px",
            mixBlendMode: "soft-light",
          }}
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 md:px-8 relative z-10 max-w-7xl">
        {/* Тонкая зеленая линия сверху */}
        <div 
          className="h-px mb-8 sm:mb-10 md:mb-12"
          style={{
            background: "linear-gradient(90deg, transparent 0%, #b2ff2e 50%, transparent 100%)",
            opacity: 0.3,
          }}
        />

        {/* Адаптивный Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 md:gap-10 mb-8 sm:mb-10">
          
          {/* Column 1: Logo + Description */}
          <div className="space-y-3 sm:space-y-4">
            <OnAILogo className="h-8 sm:h-10 w-auto" variant="full" />
            <p 
              className="text-xs sm:text-sm text-gray-400 leading-relaxed max-w-xs"
              style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300 }}
            >
              Обучаем зарабатывать на AI технологиях
            </p>
          </div>

          {/* Column 2: Legal Info */}
          <div className="space-y-2 sm:space-y-3">
            <h3 
              className="text-sm sm:text-base font-bold text-white mb-3 uppercase tracking-wider"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Юридическая информация
            </h3>
            <div className="space-y-1 text-xs text-gray-500" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300 }}>
              <p className="text-gray-300 font-semibold text-sm">ТОО "ONAI ACADEMY"</p>
              <p>БИН: <span className="text-gray-400">250240029481</span></p>
              <p>БИК: <span className="text-gray-400">CASPKZKA</span></p>
              <p className="break-all">Счёт: <span className="text-gray-400">KZ17722S000044026963</span></p>
              <p className="mt-1.5 text-gray-400">Павлодар Г.А., Павлодар, улица Сейфуллина</p>
            </div>
          </div>

          {/* Column 3: Links */}
          <div className="space-y-2 sm:space-y-3">
            <h3 
              className="text-sm sm:text-base font-bold text-white mb-3 uppercase tracking-wider"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Документы
            </h3>
            <ul className="space-y-1.5 text-xs sm:text-sm">
              <li>
                <a 
                  href="#" 
                  className="text-gray-400 hover:text-[#b2ff2e] transition-colors duration-200 inline-block"
                  style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300 }}
                >
                  Публичная оферта
                </a>
              </li>
              <li>
                <a 
                  href="#" 
                  className="text-gray-400 hover:text-[#b2ff2e] transition-colors duration-200 inline-block"
                  style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300 }}
                >
                  Политика конфиденциальности
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div 
          className="pt-4 sm:pt-6 border-t border-white/5 text-center"
        >
          <p className="text-xs text-gray-600" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300 }}>
            © 2025 ТОО "ONAI ACADEMY". Все права защищены
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
