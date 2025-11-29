import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, TrendingUp, TrendingDown } from "lucide-react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
  tooltip?: string;
  gradientFrom?: string;
  gradientTo?: string;
  iconColor?: string;
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  tooltip,
  gradientFrom = "from-card",
  gradientTo = "to-card/50",
  iconColor = "text-primary",
  onClick,
}: StatCardProps) {
  // Определяем цвет border на основе iconColor
  const getBorderColor = () => {
    if (iconColor.includes("green") || iconColor.includes("#00FF88")) return "hover:border-[#00FF88]/50";
    if (iconColor.includes("yellow")) return "hover:border-yellow-500/50";
    if (iconColor.includes("blue")) return "hover:border-blue-500/50";
    if (iconColor.includes("purple")) return "hover:border-purple-500/50";
    if (iconColor.includes("red")) return "hover:border-red-500/50";
    if (iconColor.includes("orange")) return "hover:border-orange-500/50";
    if (iconColor.includes("cyan")) return "hover:border-cyan-500/50";
    if (iconColor.includes("pink")) return "hover:border-pink-500/50";
    return "hover:border-[#00FF88]/50";
  };

  return (
    <Card 
      className={cn(
        "bg-[#1a1a24] border-gray-800 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]",
        getBorderColor(),
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <div className="flex items-center gap-2">
          <CardTitle className="text-xs sm:text-sm font-medium text-gray-400">
            {title}
          </CardTitle>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-3 w-3 text-gray-400 hover:text-white transition-colors" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-[#1a1a24] border-gray-700">
                <p className="text-sm text-white">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className={cn("p-1.5 sm:p-2 rounded-lg bg-opacity-10", iconColor.replace("text-", "bg-") + "/10")}>
          <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", iconColor)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl sm:text-3xl font-bold text-white">{value}</div>
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            {trend.isPositive ? (
              <TrendingUp className="h-3 w-3 text-[#00FF88]" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500" />
            )}
            <p className={cn(
              "text-xs font-medium",
              trend.isPositive ? "text-[#00FF88]" : "text-red-500"
            )}>
              {trend.isPositive ? "+" : ""}{trend.value}% {trend.label}
            </p>
          </div>
        )}
        {description && !trend && (
          <p className="text-xs text-gray-500 mt-2">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

