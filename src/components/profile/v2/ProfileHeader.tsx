import { Brain, Sparkles } from "lucide-react";

export const ProfileHeader = () => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative">
          <div className="absolute inset-0 bg-neon/30 rounded-lg sm:rounded-xl blur-lg" />
          <div className="relative bg-gradient-to-br from-neon/20 to-[hsl(var(--cyber-blue))]/20 border border-neon/30 rounded-lg sm:rounded-xl p-2 sm:p-3">
            <Brain className="w-6 h-6 sm:w-8 sm:h-8 text-neon" strokeWidth={1.5} />
          </div>
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
            <span className="text-neon">onAI</span>
            <span className="text-foreground"> Academy</span>
          </h1>
          <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground flex items-center gap-1 sm:gap-1.5">
            <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
            <span className="truncate">Интеллектуальная платформа обучения</span>
          </p>
        </div>
      </div>
    </div>
  );
};
