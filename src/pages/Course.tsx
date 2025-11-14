import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ModuleCard } from "@/components/course/ModuleCard";
import { CourseStats } from "@/components/course/CourseStats";
import { AIChatDialog } from "@/components/profile/v2/AIChatDialog";
import { useMemo, useState } from "react";
import {
  DoorOpen,
  MessagesSquare,
  Cable,
  Workflow,
  Network,
  FileCheck,
  Megaphone,
  CreditCard,
  Gift,
  Users,
  Download,
  Bot
} from "lucide-react";

const modules = [
  { id: 1, title: "Введение в профессию", progress: 100, icon: DoorOpen },
  { id: 2, title: "Создание GPT бота и CRM", progress: 90, icon: MessagesSquare },
  { id: 3, title: "Интеграция amoCRM и Bitrix24", progress: 80, icon: Cable },
  { id: 4, title: "Автоматизация при помощи Make", progress: 60, icon: Workflow },
  { id: 5, title: "N8N автоматизация и работа с API", progress: 50, icon: Network },
  { id: 6, title: "Реализация и закрытие проекта", progress: 40, icon: FileCheck },
  { id: 7, title: "Упаковка и продвижение", progress: 30, icon: Megaphone },
  { id: 8, title: "Продажи на высокий чек", progress: 20, icon: CreditCard },
  { id: 9, title: "Бонусы", progress: 10, icon: Gift },
  { id: 10, title: "Воркшопы", progress: 0, icon: Users }
];

const Course = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const courseProgress = 45;
  const studyTime = "6ч 30м";
  const modulesCount = "8 + бонусы";
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  const handleModuleClick = (moduleId: number) => {
    navigate(`/course/${id}/module/${moduleId}`);
  };

  // Генерация узлов для нейронной сети (один раз)
  const neuralNodes = useMemo(() => 
    Array.from({ length: 12 }, (_, i) => {
      const angle = (i / 12) * Math.PI * 2;
      const radius = 80 + Math.random() * 40;
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        delay: i * 0.1,
      };
    }), []
  );

  // Генерация орбитальных атомов (один раз)
  const orbitingAtoms = useMemo(() => 
    Array.from({ length: 8 }, (_, i) => {
      const orbitRadius = 140 + i * 15;
      const speed = 15 + i * 2;
      const startAngle = (i / 8) * 360;
      return {
        orbitRadius,
        speed,
        startAngle,
        size: 3 + Math.random() * 2,
      };
    }), []
  );

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Flying Stars Background (as in Login page) */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 50 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* ЗЕЛЕНАЯ НЕЙРОННАЯ СФЕРА - УЛУЧШЕННАЯ */}
      <div className="fixed top-1/2 right-[10%] -translate-y-1/2 pointer-events-none z-0">
        <svg
          width="500"
          height="500"
          viewBox="-250 -250 500 500"
          className="overflow-visible"
        >
          <defs>
            {/* Зеленый градиент для сферы */}
            <radialGradient id="sphereGradient">
              <stop offset="0%" stopColor="#00ff00" stopOpacity="0.9" />
              <stop offset="30%" stopColor="#00ff00" stopOpacity="0.7" />
              <stop offset="60%" stopColor="#00cc00" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#008800" stopOpacity="0.1" />
            </radialGradient>
            
            {/* Усиленный фильтр свечения */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="6" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            
            {/* Пульсирующее свечение */}
            <filter id="pulsGlow">
              <feGaussianBlur stdDeviation="10" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Связи между узлами */}
          <g opacity="0.3">
            {neuralNodes.map((node, i) => 
              neuralNodes.slice(i + 1).map((otherNode, j) => {
                const distance = Math.sqrt(
                  Math.pow(node.x - otherNode.x, 2) + Math.pow(node.y - otherNode.y, 2)
                );
                if (distance < 120) {
                  return (
                    <motion.line
                      key={`${i}-${j}`}
                      x1={node.x}
                      y1={node.y}
                      x2={otherNode.x}
                      y2={otherNode.y}
                      stroke="#00ff00"
                      strokeWidth="1"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 0.6 }}
                      transition={{
                        duration: 2,
                        delay: node.delay + otherNode.delay,
                        repeat: Infinity,
                        repeatType: "reverse",
                      }}
                    />
                  );
                }
                return null;
              })
            )}
          </g>

          {/* Внешнее пульсирующее кольцо */}
          <motion.circle
            cx="0"
            cy="0"
            r="90"
            fill="none"
            stroke="#00ff00"
            strokeWidth="2"
            strokeOpacity="0.2"
            filter="url(#glow)"
            animate={{ 
              r: [85, 95, 85],
              strokeOpacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Центральная пульсирующая сфера - ЯДРО */}
          <motion.circle
            cx="0"
            cy="0"
            r="70"
            fill="url(#sphereGradient)"
            filter="url(#pulsGlow)"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ 
              scale: [0.9, 1.1, 0.9],
              opacity: [0.8, 1, 0.8],
            }}
            transition={{
              scale: {
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
              },
              opacity: {
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
              },
            }}
          />
          
          {/* Внутренняя яркая сфера */}
          <motion.circle
            cx="0"
            cy="0"
            r="50"
            fill="#00ff00"
            fillOpacity="0.6"
            filter="url(#glow)"
            animate={{ 
              scale: [1, 1.15, 1],
              opacity: [0.6, 0.9, 0.6],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.3,
            }}
          />

          {/* Узлы нейронной сети */}
          {neuralNodes.map((node, i) => (
            <motion.circle
              key={i}
              cx={node.x}
              cy={node.y}
              r="4"
              fill="#00ff00"
              filter="url(#glow)"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [1, 1.3, 1],
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 2,
                delay: node.delay,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}

          {/* Орбитальные сферы - УЛУЧШЕННЫЕ (3D эффект) */}
          {orbitingAtoms.map((atom, i) => (
            <motion.g key={`atom-${i}`}>
              {/* Орбита (путь) */}
              <motion.ellipse
                cx="0"
                cy="0"
                rx={atom.orbitRadius}
                ry={atom.orbitRadius * 0.3}
                fill="none"
                stroke="#00ff00"
                strokeWidth="0.5"
                strokeOpacity="0.1"
                animate={{
                  strokeOpacity: [0.05, 0.15, 0.05],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.2,
                }}
              />
              
              {/* Вращающаяся сфера */}
              <motion.circle
                r={atom.size + 2}
                fill="#00ff00"
                filter="url(#glow)"
                animate={{
                  cx: [
                    Math.cos((atom.startAngle * Math.PI) / 180) * atom.orbitRadius,
                    Math.cos(((atom.startAngle + 360) * Math.PI) / 180) * atom.orbitRadius,
                  ],
                  cy: [
                    Math.sin((atom.startAngle * Math.PI) / 180) * atom.orbitRadius * 0.3,
                    Math.sin(((atom.startAngle + 360) * Math.PI) / 180) * atom.orbitRadius * 0.3,
                  ],
                  opacity: [0.4, 1, 0.4],
                  scale: [0.8, 1.3, 0.8],
                }}
                transition={{
                  duration: atom.speed,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            </motion.g>
          ))}
        </svg>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
        {/* Hero Banner */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="relative bg-black rounded-2xl sm:rounded-3xl overflow-hidden border border-border/30 p-6 sm:p-8 md:p-10 lg:p-12">
            {/* Hero Content */}
            <div className="relative z-10 max-w-2xl">
              <p className="text-[10px] sm:text-xs md:text-sm lg:text-base text-gray-400 mb-2 sm:mb-3 uppercase tracking-wide leading-tight">
                самый полный курс по автоматизации<br className="hidden sm:inline" />
                <span className="sm:hidden"> </span>при помощи нейросетей
              </p>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 sm:mb-6 md:mb-8 text-white font-gilroy leading-tight whitespace-nowrap">
                Интегратор <span className="text-[#00ff00] drop-shadow-[0_0_15px_rgba(0,255,0,0.8)]">2.0</span>
              </h1>
              <Button 
                size="lg" 
                onClick={() => setIsAIChatOpen(true)}
                className="bg-[#00ff00] text-black hover:bg-[#00cc00] font-bold text-xs sm:text-sm md:text-base px-4 sm:px-6 md:px-8 py-3 sm:py-4 md:py-5 rounded-full shadow-[0_0_30px_rgba(0,255,0,0.5)] hover:shadow-[0_0_40px_rgba(0,255,0,0.7)] transition-all w-full sm:w-auto"
                aria-label="onAI Куратор"
              >
                <Bot className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 mr-2 flex-shrink-0" />
                <span className="truncate whitespace-nowrap font-gilroy">onAI Куратор</span>
              </Button>
            </div>
          </div>
        </motion.header>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {/* Modules Section */}
          <section className="lg:col-span-2" aria-labelledby="modules-heading">
            <h2 id="modules-heading" className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-3 sm:mb-4 md:mb-6 leading-tight">
              Модули курса
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {modules.map((module, index) => (
                <ModuleCard
                  key={module.id}
                  {...module}
                  index={index}
                  onClick={() => handleModuleClick(module.id)}
                />
              ))}
            </div>
          </section>

          {/* Right Sidebar */}
          <aside className="space-y-4 sm:space-y-6" aria-label="Дополнительная информация">
            {/* Course Materials */}
            <motion.section
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-[#00ff00] rounded-2xl p-3 sm:p-4 md:p-6"
              aria-labelledby="materials-heading"
            >
              <h3 id="materials-heading" className="text-xs sm:text-sm md:text-base font-bold text-black mb-2 sm:mb-3 md:mb-4 uppercase leading-tight">
                договор-оферта курса интегратор 2.0
              </h3>
              <Button 
                className="w-full bg-black text-[#00ff00] hover:bg-black/90 font-bold rounded-xl mb-2 sm:mb-3 md:mb-4 text-[10px] sm:text-xs md:text-sm h-8 sm:h-9 md:h-10"
                aria-label="Посмотреть договор-оферту"
              >
                <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                <span className="truncate">Посмотреть договор-оферту</span>
              </Button>
              <div className="text-black text-[10px] sm:text-xs md:text-sm mb-2 sm:mb-3 md:mb-4 leading-tight">
                <p className="font-semibold">Режим работы общего чата</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold">10:00—22:00</p>
              </div>
              <Button 
                className="w-full bg-black text-[#00ff00] hover:bg-black/90 font-bold rounded-xl text-[10px] sm:text-xs md:text-sm h-8 sm:h-9 md:h-10"
                aria-label="Перейти в общий чат"
              >
                <span className="truncate">Перейти в общий чат</span>
              </Button>
            </motion.section>

            {/* Schedule */}
            <motion.section
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-[#1a1a24] border border-gray-800 rounded-2xl p-3 sm:p-4 md:p-6"
              aria-labelledby="schedule-heading"
            >
              <h3 id="schedule-heading" className="text-sm sm:text-base md:text-lg font-bold text-white mb-2 sm:mb-3 md:mb-4 leading-tight">
                Расписание Zoom-созвонов
              </h3>
              <div className="space-y-1.5 sm:space-y-2 md:space-y-3" role="list">
                <div className="flex items-center gap-2" role="listitem">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#00ff00] flex-shrink-0" />
                  <span className="text-gray-400 text-[10px] sm:text-xs md:text-sm leading-tight">Каждый понедельник в 20:00</span>
                </div>
                <div className="flex items-center gap-2" role="listitem">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#00ff00] flex-shrink-0" />
                  <span className="text-gray-400 text-[10px] sm:text-xs md:text-sm leading-tight">Каждый четверг в 14:00</span>
                </div>
              </div>
            </motion.section>

            {/* Curators */}
            <motion.section
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-4"
              aria-labelledby="curators-heading"
            >
              <h3 id="curators-heading" className="sr-only">Кураторы</h3>
              
              {/* Curator 1 */}
              <div className="bg-[#00ff00] rounded-2xl p-3 sm:p-4 md:p-6" role="listitem">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 md:mb-4">
                  <div 
                    className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-black flex items-center justify-center flex-shrink-0"
                    aria-hidden="true"
                  >
                    <span className="text-[#00ff00] font-bold text-sm sm:text-base md:text-lg">Е</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-xs md:text-sm text-black/70 leading-tight">Куратор</p>
                    <p className="font-bold text-black text-base sm:text-lg md:text-xl truncate leading-tight">Ерке</p>
                    <p className="text-[10px] sm:text-xs md:text-sm text-black/70 leading-tight">Онлайн 10:00–22:00</p>
                  </div>
                </div>
                <Button 
                  className="w-full bg-black text-[#00ff00] hover:bg-black/90 font-bold rounded-xl text-[10px] sm:text-xs md:text-sm h-8 sm:h-9 md:h-10"
                  aria-label="Написать куратору Ерке"
                >
                  <span className="truncate">Написать куратору</span>
                </Button>
              </div>

              {/* Curator 2 */}
              <div className="bg-[#00ff00] rounded-2xl p-3 sm:p-4 md:p-6" role="listitem">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 md:mb-4">
                  <div 
                    className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-black flex items-center justify-center flex-shrink-0"
                    aria-hidden="true"
                  >
                    <span className="text-[#00ff00] font-bold text-sm sm:text-base md:text-lg">Р</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-xs md:text-sm text-black/70 leading-tight">Куратор</p>
                    <p className="font-bold text-black text-base sm:text-lg md:text-xl truncate leading-tight">Раймжан</p>
                    <p className="text-[10px] sm:text-xs md:text-sm text-black/70 leading-tight">Онлайн 10:00–22:00</p>
                  </div>
                </div>
                <Button 
                  className="w-full bg-black text-[#00ff00] hover:bg-black/90 font-bold rounded-xl text-[10px] sm:text-xs md:text-sm h-8 sm:h-9 md:h-10"
                  aria-label="Написать куратору Раймжан"
                >
                  <span className="truncate">Написать куратору</span>
                </Button>
              </div>
            </motion.section>
          </aside>
        </div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 sm:mt-12 md:mt-16 text-center px-4"
          role="contentinfo"
        >
          <p className="text-[10px] sm:text-xs md:text-sm text-gray-400 leading-relaxed">
            Powered by Neural Education Systems © 2025
          </p>
        </motion.footer>
      </div>

      {/* AI Chat Dialog */}
      <AIChatDialog open={isAIChatOpen} onOpenChange={setIsAIChatOpen} />
    </div>
  );
};

export default Course;
