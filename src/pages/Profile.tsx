import { motion } from "framer-motion";
import { AvatarBlock } from "@/components/profile/AvatarBlock";
import { ProgressCard } from "@/components/profile/ProgressCard";
import { MissionBadge } from "@/components/profile/MissionBadge";
import { AchievementPanel } from "@/components/profile/AchievementPanel";
import { AIAssistantCard } from "@/components/profile/AIAssistantCard";
import { Settings, Video, CheckCircle2, Flame, Zap, Puzzle, MessageCircle } from "lucide-react";

const Profile = () => {
  const courses = [
    { id: 1, title: "Интегратор 2.0", progress: 45, Icon: Settings },
    { id: 2, title: "Creator 1.0", progress: 20, Icon: Video },
  ];

  const missions = [
    { id: 1, title: "Создал первого бота", completed: true, Icon: CheckCircle2 },
    { id: 2, title: "Прошёл 3 урока подряд", completed: true, Icon: Flame },
    { id: 3, title: "Подключил API", completed: true, Icon: Settings },
    { id: 4, title: "Достиг уровня 2", completed: true, Icon: Zap },
    { id: 5, title: "Разблокировал новый модуль", completed: true, Icon: Puzzle },
    { id: 6, title: "Получил отзыв куратора", completed: true, Icon: MessageCircle },
  ];

  return (
    <div className="min-h-screen bg-[#0b0b0b] px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-1"
        >
          <h1 className="text-3xl font-bold">
            <span className="text-neon">onAI</span>
            <span className="text-white"> Academy</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Интегратор 2.0 — Самый полноценный курс по автоматизации при помощи нейросетей
          </p>
        </motion.div>

        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center space-y-2"
        >
          <h2 className="text-4xl font-bold text-foreground">
            Добро пожаловать, Александр!
          </h2>
          <p className="text-muted-foreground text-lg">
            Курс: Интегратор 2.0 — твой путь к мастерству автоматизации
          </p>
        </motion.div>

        {/* Avatar and Stats Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <AvatarBlock />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <AchievementPanel />
          </motion.div>
        </div>

        {/* Course Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h2 className="text-2xl font-bold mb-6 text-foreground">Прогресс по курсам</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {courses.map((course, index) => (
              <ProgressCard
                key={course.id}
                title={course.title}
                progress={course.progress}
                Icon={course.Icon}
                delay={0.4 + index * 0.1}
              />
            ))}
          </div>
        </motion.div>

        {/* Missions and Achievements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <h2 className="text-2xl font-bold mb-6 text-foreground">Миссии и достижения</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {missions.map((mission, index) => (
              <MissionBadge
                key={mission.id}
                title={mission.title}
                completed={mission.completed}
                Icon={mission.Icon}
                delay={0.7 + index * 0.05}
              />
            ))}
          </div>
        </motion.div>

        {/* AI Assistant */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1 }}
        >
          <AIAssistantCard />
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;
