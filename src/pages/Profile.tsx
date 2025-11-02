import { motion } from "framer-motion";
import { AvatarBlock } from "@/components/profile/AvatarBlock";
import { ProgressCard } from "@/components/profile/ProgressCard";
import { MissionBadge } from "@/components/profile/MissionBadge";
import { AchievementPanel } from "@/components/profile/AchievementPanel";
import { AIAssistantCard } from "@/components/profile/AIAssistantCard";

const Profile = () => {
  const courses = [
    { id: 1, title: "Интегратор 2.0", progress: 45, icon: "⚙️" },
    { id: 2, title: "Creator 1.0", progress: 20, icon: "🎬" },
  ];

  const missions = [
    { id: 1, title: "Создал первого бота", completed: true, icon: "✅" },
    { id: 2, title: "Прошёл 3 урока подряд", completed: true, icon: "🔥" },
    { id: 3, title: "Подключил API", completed: true, icon: "⚙️" },
    { id: 4, title: "Достиг уровня 2", completed: true, icon: "⚡" },
    { id: 5, title: "Разблокировал новый модуль", completed: true, icon: "🧩" },
    { id: 6, title: "Получил отзыв куратора", completed: true, icon: "💬" },
  ];

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-2"
        >
          <h1 className="text-4xl font-bold text-foreground">
            Добро пожаловать, Александр!
          </h1>
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
                icon={course.icon}
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
                icon={mission.icon}
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
