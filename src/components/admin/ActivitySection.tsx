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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              {title}
            </h2>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        </div>
        {badge && (
          <div className="px-3 py-1 bg-primary/20 rounded-full">
            <span className="text-sm font-medium text-primary">{badge}</span>
          </div>
        )}
      </div>
      <div>
        {children}
      </div>
    </div>
  );
}

