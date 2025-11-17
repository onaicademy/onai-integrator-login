import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface CourseHeaderProps {
  title: string;
  description: string;
  totalLessons: number;
  completedLessons: number;
  onContinue: () => void;
}

export function CourseHeader({ 
  title, 
  description, 
  totalLessons, 
  completedLessons,
  onContinue 
}: CourseHeaderProps) {
  const progress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  return (
    <Card className="p-6 mb-8">
      <div className="space-y-4">
        <div className="flex items-start justify-between flex-col sm:flex-row gap-4">
          <div className="space-y-2 flex-1">
            <h1 className="text-3xl font-bold">{title}</h1>
            <p className="text-muted-foreground">{description}</p>
          </div>
          <Badge variant="secondary" className="self-start">
            {completedLessons} / {totalLessons} уроков
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Прогресс курса</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Button onClick={onContinue} size="lg" className="w-full sm:w-auto">
          Продолжить обучение
        </Button>
      </div>
    </Card>
  );
}

