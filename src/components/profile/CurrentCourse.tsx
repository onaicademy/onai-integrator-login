import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export const CurrentCourse = () => {
  const navigate = useNavigate();
  const [courseProgress, setCourseProgress] = useState(0);
  const [courseName, setCourseName] = useState("Основы AI");
  const [courseId, setCourseId] = useState("1");

  useEffect(() => {
    // Load from localStorage or API
    const savedProgress = parseInt(localStorage.getItem("currentCourseProgress") || "0");
    const savedName = localStorage.getItem("currentCourseName") || "Основы AI";
    const savedId = localStorage.getItem("currentCourseId") || "1";
    
    setCourseProgress(savedProgress);
    setCourseName(savedName);
    setCourseId(savedId);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-sm border border-border/50 p-6"
    >
      {/* Gradient overlay */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-neon/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative z-10 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">
              Текущий курс
            </h3>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {courseName}
            </h2>
          </div>
          
          {/* Course icon/image */}
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-neon/20 to-[hsl(var(--cyber-blue))]/20 border border-neon/30 flex items-center justify-center">
            <span className="text-2xl">🧠</span>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Прогресс</span>
            <span className="text-neon font-semibold">{courseProgress}%</span>
          </div>
          <Progress value={courseProgress} className="h-2" />
        </div>

        {/* Continue button */}
        <Button
          onClick={() => navigate(`/course/${courseId}`)}
          variant="neon"
          className="w-full group"
        >
          Продолжить обучение
          <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </motion.div>
  );
};
