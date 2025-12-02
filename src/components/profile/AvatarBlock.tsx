import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { CircularProgress } from "./CircularProgress";

export const AvatarBlock = () => {
  const navigate = useNavigate();
  const avatarUrl = localStorage.getItem("selectedAvatar") || "";
  const currentXP = 1240;
  const maxXP = 2000;

  return (
    <div className="bg-[#111111]/80 backdrop-blur-md border border-border/50 rounded-2xl p-6 space-y-6 shadow-2xl">
      <div className="flex flex-col items-center space-y-4">
        {/* Avatar with Neon Border */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-neon/20 blur-xl"></div>
          <Avatar className="h-32 w-32 border-4 border-neon relative shadow-xl shadow-neon/40">
            <AvatarImage src={avatarUrl} alt="User Avatar" />
            <AvatarFallback className="bg-secondary text-4xl">AI</AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-neon/20 border border-neon/50 rounded-full backdrop-blur-sm">
            <span className="text-xs font-bold text-neon">Уровень 3</span>
          </div>
        </div>

        {/* Level Badge */}
        <div className="text-center space-y-1">
          <h3 className="text-2xl font-bold text-foreground">Александр</h3>
          <p className="text-sm text-neon">Интегратор I</p>
        </div>
      </div>

      {/* Circular XP Progress */}
      <div className="flex flex-col items-center space-y-2">
        <CircularProgress value={currentXP} max={maxXP} size={120} strokeWidth={8} />
        <p className="text-xs text-muted-foreground">Опыт (XP)</p>
      </div>

      {/* Change Avatar Button */}
      <Button
        onClick={() => navigate("/avatar")}
        variant="outline"
        className="w-full border-neon/50 hover:bg-neon/10 hover:border-neon/80 transition-all backdrop-blur-sm"
      >
        Сменить аватар
      </Button>
    </div>
  );
};
