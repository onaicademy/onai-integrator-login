import { Progress } from "@/components/ui/progress";
import { Zap } from "lucide-react";

export const AchievementPanel = () => {
  const stats = {
    xp: 1240,
    maxXp: 2000,
    status: "online",
    lastSeen: "2 часа назад",
    energy: 78,
  };

  return (
    <div className="bg-[#111111]/80 backdrop-blur-md border border-border/50 rounded-2xl p-6 space-y-6 shadow-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Панель достижений</h2>
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${stats.status === 'online' ? 'bg-neon' : 'bg-destructive'} animate-pulse`}></span>
          <span className="text-sm text-muted-foreground">
            {stats.status === 'online' ? 'Онлайн' : 'Оффлайн'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* XP Section */}
        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-muted-foreground">Опыт</span>
            <span className="text-2xl font-bold text-neon">
              {stats.xp} / {stats.maxXp} XP
            </span>
          </div>
          <Progress 
            value={(stats.xp / stats.maxXp) * 100} 
            className="h-3 bg-secondary/50"
          />
        </div>

        {/* Energy Section */}
        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-muted-foreground">Уровень энергии</span>
            <span className="text-2xl font-bold text-neon flex items-center gap-1">
              <Zap className="w-5 h-5" />
              {stats.energy}%
            </span>
          </div>
          <Progress 
            value={stats.energy} 
            className="h-3 bg-secondary/50"
          />
        </div>
      </div>

      {/* Additional Info */}
      <div className="pt-4 border-t border-border/50 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Последний вход</span>
          <span className="text-foreground">{stats.lastSeen}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          AI-ассистент следит за твоим прогрессом и выдаёт бонус XP
        </p>
      </div>
    </div>
  );
};
