import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";

export const AvatarBlock = () => {
  const navigate = useNavigate();
  const avatarUrl = localStorage.getItem("selectedAvatar") || "";
  const currentXP = 1300;
  const maxXP = 2000;
  const xpProgress = (currentXP / maxXP) * 100;

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-6 shadow-lg hover:shadow-neon/20 transition-all duration-300">
      <div className="flex flex-col items-center space-y-4">
        {/* Avatar with Neon Border */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-neon/20 blur-xl"></div>
          <Avatar className="h-32 w-32 border-4 border-neon relative">
            <AvatarImage src={avatarUrl} alt="User Avatar" />
            <AvatarFallback className="bg-secondary text-4xl">АИ</AvatarFallback>
          </Avatar>
        </div>

        {/* Level Badge */}
        <div className="text-center space-y-1">
          <h3 className="text-2xl font-bold text-neon">Уровень 3</h3>
          <p className="text-muted-foreground">Интегратор I</p>
        </div>
      </div>

      {/* XP Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Прогресс</span>
          <span className="text-neon font-semibold">{Math.round(xpProgress)}%</span>
        </div>
        <Progress 
          value={xpProgress} 
          className="h-3 bg-secondary/50 shadow-inner"
        />
        <p className="text-xs text-muted-foreground text-center">
          {currentXP} / {maxXP} XP
        </p>
      </div>

      {/* Change Avatar Button */}
      <Button
        onClick={() => navigate("/avatar")}
        variant="outline"
        className="w-full border-neon/30 hover:bg-neon/10 hover:border-neon transition-all"
      >
        Сменить аватар
      </Button>
    </div>
  );
};
