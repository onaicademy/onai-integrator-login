import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Settings, Video, Sparkles } from "lucide-react";

export const AIModules = () => {
  const modules = [
    {
      id: 1,
      title: "Интегратор 2.0",
      subtitle: "Автоматизация с AI",
      progress: 45,
      icon: Settings,
      gradient: "from-neon/20 to-neon/5",
    },
    {
      id: 2,
      title: "Creator 1.0",
      subtitle: "Создание контента",
      progress: 20,
      icon: Video,
      gradient: "from-[hsl(195,100%,50%)]/20 to-[hsl(195,100%,50%)]/5",
    },
    {
      id: 3,
      title: "Future Skills",
      subtitle: "Навыки будущего",
      progress: 5,
      icon: Sparkles,
      gradient: "from-neon/20 via-[hsl(195,100%,50%)]/20 to-neon/5",
    },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-foreground">AI Modules</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((module, index) => {
          const Icon = module.icon;
          const radius = 45;
          const circumference = 2 * Math.PI * radius;
          const offset = circumference - (module.progress / 100) * circumference;

          return (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05, rotateY: 5 }}
              className="group"
            >
              <div 
                className={`relative bg-gradient-to-br ${module.gradient} backdrop-blur-md border border-neon/30 rounded-2xl p-6 overflow-hidden transition-all duration-500 group-hover:border-neon/60`}
                style={{
                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
                }}
              >
                {/* Glow effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-neon/20 rounded-full blur-2xl" />
                </div>

                <div className="relative z-10 space-y-4">
                  {/* Icon and Progress Ring */}
                  <div className="flex items-center justify-between">
                    <div className="relative">
                      <svg className="w-24 h-24" style={{ transform: "rotate(-90deg)" }}>
                        <circle
                          cx="48"
                          cy="48"
                          r={radius}
                          stroke="hsl(var(--border))"
                          strokeWidth="2"
                          fill="none"
                          opacity="0.2"
                        />
                        <motion.circle
                          cx="48"
                          cy="48"
                          r={radius}
                          stroke="hsl(var(--neon))"
                          strokeWidth="2"
                          fill="none"
                          strokeDasharray={circumference}
                          strokeDashoffset={offset}
                          strokeLinecap="round"
                          initial={{ strokeDashoffset: circumference }}
                          animate={{ strokeDashoffset: offset }}
                          transition={{ duration: 1, delay: index * 0.2 }}
                          style={{
                            filter: "drop-shadow(0 0 4px hsl(var(--neon) / 0.6))",
                          }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Icon className="w-8 h-8 text-neon" />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-neon">{module.progress}%</p>
                      <p className="text-xs text-muted-foreground">Прогресс</p>
                    </div>
                  </div>

                  {/* Module info */}
                  <div className="space-y-1">
                    <h4 className="text-lg font-bold text-foreground">{module.title}</h4>
                    <p className="text-xs text-muted-foreground">{module.subtitle}</p>
                  </div>

                  {/* Action button */}
                  <Button
                    variant="outline"
                    className="w-full border-neon/40 hover:bg-neon/10 hover:border-neon/70 transition-all duration-300"
                  >
                    Продолжить курс
                  </Button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
