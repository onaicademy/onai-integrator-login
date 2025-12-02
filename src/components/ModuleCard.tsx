import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Edit, Trash2, GripVertical, Plus, CheckCircle2 } from 'lucide-react';
import { LessonItem } from './LessonItem';

interface Lesson {
  id: number;
  title: string;
  duration_minutes: number;
  is_completed: boolean;
  is_locked: boolean;
}

interface ModuleCardProps {
  title: string;
  description?: string;
  lessons: Lesson[];
  order_index: number;
  module_id?: number;
  userRole?: string;
  onEditModule?: () => void;
  onDeleteModule?: () => void;
  onAddLesson?: () => void;
  onEditLesson?: (lessonId: number) => void;
  onDeleteLesson?: (lessonId: number) => void;
}

export function ModuleCard({ 
  title,
  description,
  lessons,
  order_index,
  userRole,
  onEditModule,
  onDeleteModule,
  onAddLesson,
  onEditLesson,
  onDeleteLesson
}: ModuleCardProps) {
  const isAdmin = userRole === 'admin';
  const completedCount = lessons.filter(l => l.is_completed).length;
  const progress = lessons.length > 0 ? (completedCount / lessons.length) * 100 : 0;

  return (
    <Card className="p-6 space-y-4 bg-slate-900/50 border-slate-700 backdrop-blur-xl hover:bg-slate-900/70 transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          {isAdmin && (
            <div className="cursor-grab pt-1">
              <GripVertical className="h-5 w-5 text-slate-500" />
            </div>
          )}
          
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-#00FF88]/50 text-#00FF88] bg-#00FF88]/10">
                Модуль {order_index + 1}
              </Badge>
              {completedCount === lessons.length && lessons.length > 0 && !isAdmin && (
                <CheckCircle2 className="h-5 w-5 text-#00FF88]" />
              )}
            </div>
            <h3 className="text-xl font-semibold text-white">{title}</h3>
            {description && (
              <p className="text-sm text-slate-400">{description}</p>
            )}
          </div>
        </div>

        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onEditModule} className="text-#00FF88] hover:text-[#00FF88] 300 hover:bg-#00FF88]/10">
              <Edit className="h-4 w-4 mr-1" />
              Редактировать
            </Button>
            <Button variant="ghost" size="sm" onClick={onDeleteModule} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
              <Trash2 className="h-4 w-4 mr-1" />
              Удалить
            </Button>
          </div>
        )}
      </div>

      {!isAdmin && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-400">
            <span>{completedCount} из {lessons.length} уроков пройдено</span>
            <span className="text-#00FF88] font-bold">{Math.round(progress)}%</span>
          </div>
          <Progress 
            value={progress} 
            className="h-2 bg-slate-800" 
          />
        </div>
      )}

      <div className="space-y-2">
        {lessons.map((lesson) => (
          <LessonItem 
            key={lesson.id} 
            lesson={lesson}
            userRole={userRole}
            onEdit={isAdmin ? () => onEditLesson?.(lesson.id) : undefined}
            onDelete={isAdmin ? () => onDeleteLesson?.(lesson.id) : undefined}
          />
        ))}
      </div>

      {isAdmin && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onAddLesson} 
          className="w-full border-#00FF88]/50 text-#00FF88] hover:bg-#00FF88]/10"
        >
          <Plus className="h-4 w-4 mr-2" />
          Добавить урок
        </Button>
      )}
    </Card>
  );
}
