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
    <Card className={cn("bg-card border-border", className)}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg bg-opacity-10", iconColor.replace("text-", "bg-") + "/10")}>
            <Icon className={cn("h-5 w-5", iconColor)} />
          </div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            {description && (
              <CardDescription className="mt-1">{description}</CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                {item.subtext && (
                  <p className="text-xs text-muted-foreground/70 mt-0.5">{item.subtext}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-foreground">{item.value}</span>
                {item.badge && (
                  <Badge variant={item.badge.variant || "secondary"}>
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

