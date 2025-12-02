import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, PlayCircle, Lock, Clock, Edit, Trash2, GripVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LessonItemProps {
  lesson: {
    id: number;
    title: string;
    duration_minutes: number;
    is_completed: boolean;
    is_locked: boolean;
  };
  userRole?: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function LessonItem({ lesson, userRole, onEdit, onDelete }: LessonItemProps) {
  const navigate = useNavigate();
  const isAdmin = userRole === 'admin';

  const handleClick = () => {
    if (!lesson.is_locked && !isAdmin) {
      navigate(`/lesson/${lesson.id}`);
    }
  };

  return (
    <div 
      className={`
        flex items-center justify-between p-4 rounded-lg 
        border border-slate-700
        transition-all duration-300
        ${lesson.is_locked ? 'opacity-50' : ''}
        ${!isAdmin && !lesson.is_locked ? 'hover:bg-slate-800/50 hover:border-#00FF88]/50 cursor-pointer hover:shadow-lg hover:shadow-#00FF88]/10' : ''}
      `}
      onClick={!isAdmin ? handleClick : undefined}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {isAdmin && (
          <div className="cursor-grab">
            <GripVertical className="h-4 w-4 text-slate-500" />
          </div>
        )}

        <div className="flex-shrink-0">
          {lesson.is_completed ? (
            <CheckCircle2 className="h-5 w-5 text-#00FF88]" />
          ) : lesson.is_locked ? (
            <Lock className="h-5 w-5 text-slate-500" />
          ) : (
            <PlayCircle className="h-5 w-5 text-cyan-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-medium truncate text-white">{lesson.title}</h4>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Clock className="h-3 w-3" />
            <span>{lesson.duration_minutes} мин</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {lesson.is_completed && !isAdmin && (
            <Badge variant="secondary" className="text-xs bg-#00FF88]/20 text-#00FF88] border-#00FF88]/50">
              Пройдено
            </Badge>
          )}
          
          {isAdmin ? (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onEdit} className="text-#00FF88] hover:text-[#00FF88] 300 hover:bg-#00FF88]/10">
                <Edit className="h-4 w-4 mr-1" />
                Редактировать
              </Button>
              <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                <Trash2 className="h-4 w-4 mr-1" />
                Удалить
              </Button>
            </div>
          ) : (
            !lesson.is_locked && !lesson.is_completed && (
              <Button 
                variant="ghost" 
                size="sm"
                className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
              >
                Смотреть
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
