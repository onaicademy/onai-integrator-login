import { motion } from "framer-motion";

export const Footer = () => {
  const currentYear = new Date().getFullYear();
  const version = "1.10.00";

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mt-auto py-3 border-t border-[#00FF88]/5 bg-[#030303]"
    >
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-2">
          {/* Copyright */}
          <div className="text-center md:text-left">
            <p className="text-gray-600 font-['JetBrains_Mono'] text-[10px] opacity-50">
              © {currentYear} <span className="text-[#00FF88]">onAI Academy</span>. Все права защищены
            </p>
          </div>

          {/* Version */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-700 font-['JetBrains_Mono'] text-[9px] uppercase tracking-wider opacity-40">
              Версия платформы:
            </span>
            <span className="font-['JetBrains_Mono'] text-[10px] font-bold text-[#00FF88] bg-[#00FF88]/5 px-2 py-0.5 rounded border border-[#00FF88]/10 opacity-60">
              v{version}
            </span>
          </div>
        </div>
      </div>
    </motion.footer>
  );
};

