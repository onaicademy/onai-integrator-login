import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Lock } from "lucide-react";

export default function Messages() {
  // 🚧 ВРЕМЕННО: Раздел в разработке
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-3xl w-full"
      >
        <Card className="bg-gradient-to-br from-[#1a1a24] to-[#0a0a0f] border-[#00FF88]/30 p-12 text-center relative overflow-hidden">
          {/* Фоновый паттерн */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_#00FF88_1px,_transparent_1px)] bg-[length:40px_40px]" />
          </div>

          {/* Иконка с замочком */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mb-8 flex justify-center relative z-10"
          >
            <div className="relative">
              {/* Неоновое свечение */}
              <div className="absolute inset-0 bg-[#00FF88]/20 blur-3xl rounded-full" />
              
              {/* Главная иконка */}
              <div className="relative bg-gradient-to-br from-[#00FF88]/10 to-[#00cc88]/5 p-8 rounded-full border border-[#00FF88]/30">
                <svg className="w-24 h-24 text-[#00FF88]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                
                {/* Замочек поверх */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
                  className="absolute -top-2 -right-2 bg-[#1a1a24] rounded-full p-3 border-2 border-[#00FF88] shadow-lg shadow-[#00FF88]/50"
                >
                  <Lock className="w-6 h-6 text-[#00FF88]" />
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Заголовок */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative z-10"
          >
            <h1 className="text-5xl font-bold text-white mb-2 font-display">
              onAI<span className="text-[#00FF88]">gram</span>
            </h1>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mb-6">
              <Lock className="w-4 h-4" />
              <span>В разработке</span>
            </div>
          </motion.div>

          {/* Описание */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="relative z-10 mb-8"
          >
            <p className="text-gray-300 text-lg leading-relaxed mb-4">
              Мы создаём <span className="text-[#00FF88] font-semibold">закрытую социальную сеть</span> для предпринимателей-интеграторов — 
              экосистему взаимной поддержки, мотивации и профессионального роста.
            </p>
            <p className="text-gray-400 text-base leading-relaxed">
              Здесь вы сможете строить meaningful connections, делиться победами и инсайтами, 
              организовывать оффлайн-встречи и вместе формировать активное предпринимательское сообщество.
            </p>
          </motion.div>

          {/* Список функций */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 relative z-10"
          >
            {[
              { icon: '💬', title: 'Личные и групповые чаты', desc: 'Общайтесь напрямую с коллегами' },
              { icon: '📸', title: 'Посты и Reels', desc: 'Делитесь видео, фото и историями успеха' },
              { icon: '🤝', title: 'Организация встреч', desc: 'Координируйте оффлайн-ивенты и нетворкинг' },
              { icon: '💡', title: 'Обмен инсайтами', desc: 'Делитесь знаниями и best practices' },
              { icon: '🏆', title: 'Форум сообщества', desc: 'Задавайте вопросы и получайте ответы' },
              { icon: '🚀', title: 'Мотивация и поддержка', desc: 'Растите вместе с единомышленниками' }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="bg-[#1a1a24]/50 backdrop-blur-sm border border-[#00FF88]/10 rounded-lg p-4 text-left hover:border-[#00FF88]/30 transition-all duration-300"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{feature.icon}</span>
                  <div>
                    <h3 className="text-white font-semibold text-sm mb-1">{feature.title}</h3>
                    <p className="text-gray-400 text-xs">{feature.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Прогресс бар */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="space-y-3 relative z-10"
          >
            <div className="flex justify-between text-sm text-gray-400">
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#00FF88] rounded-full animate-pulse" />
                Прогресс разработки
              </span>
              <span className="text-[#00FF88] font-semibold">15%</span>
            </div>
            <div className="h-3 bg-gray-800/50 rounded-full overflow-hidden border border-gray-700/50">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "15%" }}
                transition={{ delay: 1.3, duration: 1.5, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-[#00FF88] via-[#00cc88] to-[#00FF88] relative"
              >
                <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)] animate-[shimmer_2s_infinite]" />
              </motion.div>
            </div>
            <p className="text-xs text-gray-500 flex items-center justify-center gap-2">
              <span>🗓️</span>
              <span>Ожидаемый запуск: <span className="text-[#00FF88]">Q1 2026</span></span>
            </p>
          </motion.div>

          {/* Футер */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="mt-8 pt-6 border-t border-gray-800 relative z-10"
          >
            <p className="text-xs text-gray-500">
              Доступ будет открыт автоматически после запуска всем активным студентам платформы
            </p>
          </motion.div>
        </Card>
      </motion.div>
    </div>
  );
}
