import { motion } from "framer-motion";
import { Users, Brain, Sparkles, Zap, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";

export default function AdminDashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 relative overflow-hidden">
      {/* ===== ФОНОВЫЕ ЭФФЕКТЫ ===== */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Светящиеся круги */}
        <motion.div
          className="absolute top-20 left-20 w-96 h-96 bg-neon/5 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-96 h-96 bg-[hsl(var(--cyber-blue))]/5 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />

        {/* Particles (звёздочки) */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-neon rounded-full"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 3,
            }}
          />
        ))}
      </div>

      {/* ===== КОНТЕНТ ===== */}
      <div className="relative z-10 container mx-auto px-4 py-12">
        {/* Заголовок */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 mb-4"
            animate={{
              textShadow: [
                "0 0 10px rgba(0,255,0,0.3)",
                "0 0 20px rgba(0,255,0,0.5)",
                "0 0 10px rgba(0,255,0,0.3)",
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="w-8 h-8 text-neon" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-neon via-[hsl(var(--cyber-blue))] to-neon bg-clip-text text-transparent">
              Админ-панель
            </h1>
            <Sparkles className="w-8 h-8 text-neon" />
          </motion.div>
          <p className="text-muted-foreground text-lg">
            Выберите раздел для управления платформой
          </p>
        </motion.div>

        {/* Карточки */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {/* Карточка 1: Управление студентами */}
          <AdminCard
            title="Управление студентами"
            description="Добавление, удаление, роли, приглашения"
            icon={<Users className="w-16 h-16" />}
            color="neon"
            onClick={() => navigate("/admin/students-activity")}
            stats={[
              { label: "Всего студентов", value: "150" },
              { label: "Активных", value: "120" },
              { label: "Новых за неделю", value: "+12" },
            ]}
          />

          {/* Карточка 2: Activity (старая панель) */}
          <AdminCard
            title="Activity"
            description="Общая статистика и метрики платформы"
            icon={<Sparkles className="w-16 h-16" />}
            color="purple"
            onClick={() => navigate("/admin/activity")}
            stats={[
              { label: "Активность", value: "85%" },
              { label: "Онлайн", value: "47" },
              { label: "Завершений", value: "234" },
            ]}
          />

          {/* Карточка 3: AI-аналитика */}
          <AdminCard
            title="AI-аналитика"
            description="Дашборд AI-куратора, наставника и аналитика"
            icon={<Brain className="w-16 h-16" />}
            color="cyber-blue"
            onClick={() => navigate("/admin/ai-analytics")}
            stats={[
              { label: "AI диалогов", value: "89" },
              { label: "Настроение", value: "😊 7.2/10" },
              { label: "Проблем выявлено", value: "8" },
            ]}
          />

          {/* Карточка 4: Токены AI-агентов */}
          <AdminCard
            title="Токены AI-агентов"
            description="Затраты OpenAI, статистика, бюджет"
            icon={<DollarSign className="w-16 h-16" />}
            color="orange"
            onClick={() => navigate("/admin/token-usage")}
            stats={[
              { label: "Затраты сегодня", value: "2,450₸" },
              { label: "Всего токенов", value: "125K" },
              { label: "Запросов", value: "342" },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

// ===================================
// КОМПОНЕНТ КАРТОЧКИ С ЭФФЕКТАМИ
// ===================================

interface AdminCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: "neon" | "purple" | "cyber-blue" | "orange";
  onClick: () => void;
  stats: { label: string; value: string }[];
}

function AdminCard({ title, description, icon, color, onClick, stats }: AdminCardProps) {
  const colorClasses = {
    neon: {
      gradient: "from-neon/10 via-neon/5 to-transparent",
      border: "border-neon/30 hover:border-neon",
      shadow: "shadow-neon/20 hover:shadow-neon/50",
      glow: "bg-neon",
      text: "text-neon",
    },
    purple: {
      gradient: "from-purple-500/10 via-purple-500/5 to-transparent",
      border: "border-purple-500/30 hover:border-purple-500",
      shadow: "shadow-purple-500/20 hover:shadow-purple-500/50",
      glow: "bg-purple-500",
      text: "text-purple-500",
    },
    "cyber-blue": {
      gradient: "from-[hsl(var(--cyber-blue))]/10 via-[hsl(var(--cyber-blue))]/5 to-transparent",
      border: "border-[hsl(var(--cyber-blue))]/30 hover:border-[hsl(var(--cyber-blue))]",
      shadow: "shadow-[hsl(var(--cyber-blue))]/20 hover:shadow-[hsl(var(--cyber-blue))]/50",
      glow: "bg-[hsl(var(--cyber-blue))]",
      text: "text-[hsl(var(--cyber-blue))]",
    },
    orange: {
      gradient: "from-orange-500/10 via-orange-500/5 to-transparent",
      border: "border-orange-500/30 hover:border-orange-500",
      shadow: "shadow-orange-500/20 hover:shadow-orange-500/50",
      glow: "bg-orange-500",
      text: "text-orange-500",
    },
  };

  const colors = colorClasses[color];

  return (
    <motion.div
      className="relative group"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.05 }}
    >
      {/* Светящийся ореол */}
      <motion.div
        className={`absolute inset-0 ${colors.glow} opacity-0 group-hover:opacity-20 blur-2xl rounded-3xl transition-opacity duration-500`}
      />

      {/* Particles вокруг карточки при hover */}
      <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className={`absolute w-2 h-2 ${colors.glow} rounded-full opacity-0 group-hover:opacity-100`}
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -50, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>

      {/* Карточка */}
      <Card
        className={`
          relative p-8 cursor-pointer
          bg-gradient-to-br ${colors.gradient}
          border-2 ${colors.border}
          shadow-xl ${colors.shadow}
          transition-all duration-500
          hover:shadow-2xl
          backdrop-blur-sm
        `}
        onClick={onClick}
      >
        {/* Иконка с 3D эффектом */}
        <motion.div
          className="flex justify-center mb-6"
          animate={{
            y: [0, -10, 0],
            rotateY: [0, 15, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <motion.div
            className={`
              ${colors.text}
              relative
              p-6
              rounded-2xl
              bg-gradient-to-br from-background/80 to-background/40
              border-2 ${colors.border}
              shadow-lg
            `}
            whileHover={{
              scale: 1.1,
              rotateZ: 5,
            }}
          >
            {/* Свечение иконки */}
            <motion.div
              className={`absolute inset-0 ${colors.glow} opacity-0 group-hover:opacity-30 blur-xl rounded-2xl`}
            />
            
            {icon}

            {/* Пульсирующий круг */}
            <motion.div
              className={`absolute -inset-2 ${colors.glow} opacity-20 rounded-2xl`}
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.2, 0.4, 0.2],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            />
          </motion.div>
        </motion.div>

        {/* Текст */}
        <h2 className="text-3xl font-bold text-center mb-3 text-foreground">
          {title}
        </h2>
        <p className="text-muted-foreground text-center mb-6">
          {description}
        </p>

        {/* Статистика */}
        <div className="space-y-3 pt-6 border-t border-border/50">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              className="flex justify-between items-center"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <span className={`text-lg font-bold ${colors.text}`}>{stat.value}</span>
            </motion.div>
          ))}
        </div>

        {/* Стрелка (появляется при hover) */}
        <motion.div
          className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100"
          initial={{ x: -10 }}
          animate={{ x: 0 }}
        >
          <Zap className={`w-6 h-6 ${colors.text}`} />
        </motion.div>

        {/* Светящаяся линия сверху */}
        <motion.div
          className={`absolute top-0 left-0 right-0 h-1 ${colors.glow} opacity-0 group-hover:opacity-100`}
          initial={{ scaleX: 0 }}
          whileHover={{ scaleX: 1 }}
          transition={{ duration: 0.3 }}
        />
      </Card>
    </motion.div>
  );
}

