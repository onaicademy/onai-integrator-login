import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricItem {
  label: string;
  value: string | number;
  badge?: {
    text: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
  subtext?: string;
}

interface MetricCardProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  items: MetricItem[];
  className?: string;
  iconColor?: string;
}

export function MetricCard({
  title,
  description,
  icon: Icon,
  items,
  className,
  iconColor = "text-primary",
}: MetricCardProps) {
  return (
    <Card className={cn("bg-[#1a1a24] border-gray-800", className)}>
      <CardHeader>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={cn("p-1.5 sm:p-2 rounded-lg bg-opacity-10", iconColor.replace("text-", "bg-") + "/10")}>
            <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", iconColor)} />
          </div>
          <div>
            <CardTitle className="text-base sm:text-lg text-white">{title}</CardTitle>
            {description && (
              <CardDescription className="mt-1 text-xs sm:text-sm text-gray-400">{description}</CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 sm:space-y-4">
          {items.map((item, index) => (
            <div key={index} className="flex items-center justify-between gap-2">
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-gray-400">{item.label}</p>
                {item.subtext && (
                  <p className="text-xs text-gray-500 mt-0.5">{item.subtext}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-bold text-white">{item.value}</span>
                {item.badge && (
                  <Badge 
                    variant={item.badge.variant || "secondary"}
                    className={cn(
                      "text-xs",
                      item.badge.variant === "default" && "bg-[#00FF88] text-black",
                      item.badge.variant === "destructive" && "bg-red-600 text-white"
                    )}
                  >
                    {item.badge.text}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

