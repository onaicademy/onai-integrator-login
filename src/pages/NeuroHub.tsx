import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Target, MessageCircle, TrendingUp, Flame, CheckCircle, Sparkles, Zap, Award, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

const NeuroHub = () => {
  const navigate = useNavigate();
  const [streak] = useState(4);

  const missions = [
    { id: 1, title: "Пройди 3 урока подряд", completed: false, progress: 1 },
    { id: 2, title: "Создай первого бота", completed: false, progress: 0 },
    { id: 3, title: "Заработай +100 XP за день", completed: true, progress: 100 },
  ];

  const updates = [
    { id: 1, title: "Добавлен новый модуль 'Продажи на высокий чек'", date: "Сегодня" },
    { id: 2, title: "AI-ассистент теперь умеет анализировать твой прогресс", date: "2 дня назад" },
  ];

  // Генерация частиц для фона (один раз)
  const particles = useMemo(() => 
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: 10 + Math.random() * 20,
      delay: Math.random() * 5,
    })), []
  );

  // Генерация линий данных
  const dataStreams = useMemo(() => 
    Array.from({ length: 5 }, (_, i) => ({
      id: i,
      left: 10 + i * 20,
      delay: i * 0.5,
    })), []
  );

  return (
    <div className="relative overflow-hidden min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black">
      {/* ===== КИБЕРПАНК ФОН ===== */}
      
      {/* Киберпанк сетка */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div 
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(to right, #00ff00 1px, transparent 1px),
              linear-gradient(to bottom, #00ff00 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Зеленые светящиеся блобы */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute w-96 h-96 rounded-full bg-[#00ff00]/20 blur-3xl"
          style={{ top: '10%', left: '15%' }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute w-96 h-96 rounded-full bg-[#00ff00]/15 blur-3xl"
          style={{ bottom: '10%', right: '15%' }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Летающие частицы */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-1 h-1 rounded-full bg-[#00ff00]"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
            }}
            animate={{
              y: ['-10%', '110%'],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* Вертикальные потоки данных */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
        {dataStreams.map((stream) => (
          <motion.div
            key={stream.id}
            className="absolute w-px h-20 bg-gradient-to-b from-transparent via-[#00ff00] to-transparent"
            style={{ left: `${stream.left}%` }}
            animate={{
              y: ['-100px', 'calc(100vh + 100px)'],
            }}
            transition={{
              duration: 3,
              delay: stream.delay,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* Сканирующие линии */}
      <motion.div
        className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-[#00ff00] to-transparent"
        animate={{
          top: ['0%', '100%'],
          opacity: [0, 1, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* ===== КОНТЕНТ ===== */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        
        {/* Hero Header с 3D AI Brain */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center relative"
        >
          {/* 3D Rotating AI Brain */}
          <div className="relative inline-block mb-6">
            <motion.div
              className="relative w-24 h-24 mx-auto"
              animate={{
                rotateY: [0, 360],
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{
                transformStyle: "preserve-3d",
              }}
            >
              {/* Brain Core */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#00ff00] via-[#00cc00] to-[#008800] shadow-[0_0_40px_rgba(0,255,0,0.6)]" />
              
              {/* Orbital Rings */}
              <motion.div
                className="absolute inset-0 border-2 border-[#00ff00]/40 rounded-full"
                animate={{
                  rotate: 360,
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  rotate: { duration: 4, repeat: Infinity, ease: "linear" },
                  scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                }}
                style={{ transform: "rotateX(60deg)" }}
              />
              <motion.div
                className="absolute inset-0 border-2 border-[#00ff00]/30 rounded-full"
                animate={{
                  rotate: -360,
                  scale: [1.1, 1, 1.1],
                }}
                transition={{
                  rotate: { duration: 6, repeat: Infinity, ease: "linear" },
                  scale: { duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1 },
                }}
                style={{ transform: "rotateY(60deg)" }}
              />

              {/* Particles around Brain */}
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-[#00ff00] rounded-full"
                  style={{
                    top: '50%',
                    left: '50%',
                  }}
                  animate={{
                    x: [
                      Math.cos((i / 6) * Math.PI * 2) * 50,
                      Math.cos((i / 6) * Math.PI * 2 + Math.PI * 2) * 50,
                    ],
                    y: [
                      Math.sin((i / 6) * Math.PI * 2) * 50,
                      Math.sin((i / 6) * Math.PI * 2 + Math.PI * 2) * 50,
                    ],
                    opacity: [0.3, 1, 0.3],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "linear",
                    delay: i * 0.2,
                  }}
                />
              ))}
            </motion.div>
          </div>

          <h1 className="text-5xl sm:text-6xl font-black mb-3">
            <span className="text-[#00ff00] drop-shadow-[0_0_20px_rgba(0,255,0,0.8)]">Neuro</span>
            <span className="text-white">HUB</span>
          </h1>
          <motion.p
            className="text-gray-400 text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            🧠 AI Control Center • Твой персональный центр управления
          </motion.p>
        </motion.div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* AI-Наставник - БОЛЬШАЯ КАРТОЧКА */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Card className="border-[#00ff00]/30 bg-black/50 backdrop-blur-md shadow-[0_0_30px_rgba(0,255,0,0.15)] relative overflow-hidden">
              {/* Corner Accents */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00ff00]/60" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#00ff00]/60" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#00ff00]/60" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00ff00]/60" />

              {/* Scan Line Effect */}
              <motion.div
                className="absolute inset-x-0 h-px bg-[#00ff00]/50"
                animate={{
                  top: ['0%', '100%'],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />

              <CardHeader>
                <div className="flex items-center gap-4">
                  <motion.div
                    className="w-16 h-16 rounded-lg bg-[#00ff00]/10 border border-[#00ff00]/30 flex items-center justify-center relative overflow-hidden"
                    whileHover={{ scale: 1.05 }}
                  >
                    <Brain className="w-8 h-8 text-[#00ff00] relative z-10" />
                    <motion.div
                      className="absolute inset-0 bg-[#00ff00]/20"
                      animate={{
                        opacity: [0, 0.5, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                      }}
                    />
                  </motion.div>
                  <div>
                    <CardTitle className="text-2xl text-white">AI-Наставник</CardTitle>
                    <CardDescription className="text-gray-400">
                      Персональный AI помогает тебе учиться быстрее и эффективнее
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start border-[#00ff00]/40 hover:bg-[#00ff00]/10 hover:border-[#00ff00] group transition-all duration-300 text-white"
                  onClick={() => navigate("/course/1")}
                >
                  <Target className="w-5 h-5 mr-3 text-[#00ff00]" />
                  <span className="flex-1 text-left">Рекомендовать следующий урок</span>
                  <motion.span
                    className="opacity-0 group-hover:opacity-100"
                    initial={{ x: -10 }}
                    whileHover={{ x: 0 }}
                  >
                    →
                  </motion.span>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-[#00ff00]/40 hover:bg-[#00ff00]/10 hover:border-[#00ff00] group transition-all duration-300 text-white"
                >
                  <Sparkles className="w-5 h-5 mr-3 text-[#00ff00]" />
                  <span className="flex-1 text-left">Установить цель недели</span>
                  <motion.span
                    className="opacity-0 group-hover:opacity-100"
                    initial={{ x: -10 }}
                    whileHover={{ x: 0 }}
                  >
                    →
                  </motion.span>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-[#00ff00]/40 hover:bg-[#00ff00]/10 hover:border-[#00ff00] group transition-all duration-300 text-white"
                >
                  <MessageCircle className="w-5 h-5 mr-3 text-[#00ff00]" />
                  <span className="flex-1 text-left">Задать вопрос AI</span>
                  <motion.span
                    className="opacity-0 group-hover:opacity-100"
                    initial={{ x: -10 }}
                    whileHover={{ x: 0 }}
                  >
                    →
                  </motion.span>
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Активность - КОМПАКТНАЯ КАРТОЧКА */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card className="border-[#00ff00]/30 bg-black/50 backdrop-blur-md relative overflow-hidden group hover:shadow-[0_0_40px_rgba(0,255,0,0.2)] transition-all">
              {/* Glow Effect on Hover */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-[#00ff00]/0 via-[#00ff00]/10 to-[#00ff00]/0 opacity-0 group-hover:opacity-100"
                transition={{ duration: 0.3 }}
              />
              
              <CardHeader className="relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-[#00ff00]/10 border border-[#00ff00]/30 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-[#00ff00]" />
                  </div>
                  <CardTitle className="text-white">Активность</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 relative z-10">
                <div className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg border border-[#00ff00]/20">
                  <div className="flex items-center gap-3">
                    <Flame className="w-6 h-6 text-orange-500" />
                    <div>
                      <p className="text-sm text-gray-400">Стрик</p>
                      <p className="text-xl font-bold text-white">{streak} дней</p>
                    </div>
                  </div>
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                  >
                    🔥
                  </motion.div>
                </div>

                <div className="p-3 bg-zinc-900/50 rounded-lg border border-[#00ff00]/20">
                  <div className="flex items-center gap-3 mb-2">
                    <Award className="w-5 h-5 text-[#00ff00]" />
                    <p className="text-sm text-gray-400">Недельная цель</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-[#00ff00] to-[#00cc00]"
                        initial={{ width: 0 }}
                        animate={{ width: "65%" }}
                        transition={{ duration: 1, delay: 0.5 }}
                      />
                    </div>
                    <span className="text-sm font-bold text-white ml-3">65%</span>
                  </div>
                </div>

                <div className="p-3 bg-zinc-900/50 rounded-lg border border-[#00ff00]/20">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-[#00ff00]" />
                    <div>
                      <p className="text-sm text-gray-400">Время обучения</p>
                      <p className="text-lg font-bold text-white">2ч 15м</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Второй ряд: Мини-миссии и Обновления */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Мини-миссии */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card className="border-[#00ff00]/30 bg-black/50 backdrop-blur-md">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#00ff00]/10 border border-[#00ff00]/30 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-[#00ff00]" />
                  </div>
                  <CardTitle className="text-white">Мини-миссии</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {missions.map((mission) => (
                  <motion.div
                    key={mission.id}
                    className="p-3 bg-zinc-900/50 rounded-lg border border-[#00ff00]/20 flex items-center justify-between group hover:bg-zinc-900/70 transition-colors"
                    whileHover={{ x: 5 }}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <motion.div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          mission.completed
                            ? 'bg-[#00ff00] border-[#00ff00]'
                            : 'border-[#00ff00]/40'
                        }`}
                        animate={
                          mission.completed
                            ? {
                                boxShadow: [
                                  '0 0 0px rgba(0,255,0,0.5)',
                                  '0 0 15px rgba(0,255,0,0.8)',
                                  '0 0 0px rgba(0,255,0,0.5)',
                                ],
                              }
                            : {}
                        }
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        {mission.completed && (
                          <CheckCircle className="w-4 h-4 text-black" />
                        )}
                      </motion.div>
                      <span className={`text-sm ${mission.completed ? 'text-white' : 'text-gray-400'}`}>
                        {mission.title}
                      </span>
                    </div>
                    {!mission.completed && mission.progress > 0 && (
                      <span className="text-xs text-[#00ff00] font-semibold">{mission.progress}/3</span>
                    )}
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Обновления платформы */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <Card className="border-[#00ff00]/30 bg-black/50 backdrop-blur-md">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#00ff00]/10 border border-[#00ff00]/30 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-[#00ff00]" />
                  </div>
                  <CardTitle className="text-white">Обновления</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {updates.map((update) => (
                  <motion.div
                    key={update.id}
                    className="p-3 bg-zinc-900/50 rounded-lg border border-[#00ff00]/20 group hover:bg-zinc-900/70 transition-colors relative overflow-hidden"
                    whileHover={{ x: 5 }}
                  >
                    {/* Hover Line */}
                    <motion.div
                      className="absolute left-0 top-0 bottom-0 w-1 bg-[#00ff00]"
                      initial={{ scaleY: 0 }}
                      whileHover={{ scaleY: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                    <div className="pl-2">
                      <p className="text-sm text-white mb-1">{update.title}</p>
                      <p className="text-xs text-gray-500">{update.date}</p>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Совет дня - ШИРОКАЯ КАРТОЧКА */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <Card className="border-[#00ff00]/30 bg-black/50 backdrop-blur-md relative overflow-hidden">
            {/* Animated Glow */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00ff00]/10 to-transparent"
              animate={{
                x: ['-100%', '200%'],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear",
              }}
            />
            <CardContent className="py-6 flex items-center gap-4 relative z-10">
              <motion.div
                animate={{
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 20,
                  repeat: Infinity,
                  ease: "linear",
                }}
              >
                <Brain className="w-12 h-12 text-[#00ff00]" />
              </motion.div>
              <div>
                <p className="text-sm text-gray-400 mb-1">💡 Совет дня от AI</p>
                <p className="text-lg text-white font-semibold">
                  Используй технику Pomodoro: 25 минут учёбы → 5 минут отдыха. Твоя продуктивность вырастет на 40%!
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default NeuroHub;
