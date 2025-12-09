import { motion } from "framer-motion";

export const Footer = () => {
  const currentYear = new Date().getFullYear();
  const version = "1.10.00";

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mt-auto py-6 border-t border-[#00FF88]/10 bg-[#030303]"
    >
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Copyright */}
          <div className="text-center md:text-left">
            <p className="text-gray-400 font-['JetBrains_Mono'] text-sm">
              © {currentYear} <span className="text-[#00FF88]">onAI Academy</span>. Все права защищены
            </p>
          </div>

          {/* Version */}
          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-['JetBrains_Mono'] text-xs uppercase tracking-wider">
              Версия платформы:
            </span>
            <span className="font-['JetBrains_Mono'] text-sm font-bold text-[#00FF88] bg-[#00FF88]/10 px-3 py-1 rounded-md border border-[#00FF88]/20">
              v{version}
            </span>
          </div>
        </div>
      </div>
    </motion.footer>
  );
};

