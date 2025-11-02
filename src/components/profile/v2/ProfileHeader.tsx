import { Brain, Sparkles } from "lucide-react";

export const ProfileHeader = () => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="absolute inset-0 bg-neon/30 rounded-xl blur-lg" />
          <div className="relative bg-gradient-to-br from-neon/20 to-[hsl(var(--cyber-blue))]/20 border border-neon/30 rounded-xl p-3">
            <Brain className="w-8 h-8 text-neon" strokeWidth={1.5} />
          </div>
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            <span className="text-neon">onAI</span>
            <span className="text-foreground"> Academy</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            Интеллектуальная платформа обучения
          </p>
        </div>
      </div>
    </div>
  );
};
