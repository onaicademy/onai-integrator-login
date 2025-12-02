import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivitySectionProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
  badge?: string;
}

export function ActivitySection({
  title,
  description,
  icon: Icon,
  children,
  className,
  badge,
}: ActivitySectionProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-[#00FF88]/10 rounded-lg border border-[#00FF88]/30">
            <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-[#00FF88]" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              {title}
            </h2>
            {description && (
              <p className="text-xs sm:text-sm text-gray-400 mt-1">{description}</p>
            )}
          </div>
        </div>
        {badge && (
          <div className="px-3 py-1 bg-[#00FF88]/20 rounded-full border border-[#00FF88]/30">
            <span className="text-xs sm:text-sm font-medium text-[#00FF88]">{badge}</span>
          </div>
        )}
      </div>
      <div>
        {children}
      </div>
    </div>
  );
}

