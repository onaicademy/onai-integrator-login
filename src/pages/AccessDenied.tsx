import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, Home } from 'lucide-react';

export default function AccessDenied() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-background to-destructive/5">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <ShieldAlert className="h-16 w-16 text-destructive" />
          </div>
          <CardTitle className="text-2xl text-center">Доступ запрещён</CardTitle>
          <CardDescription className="text-center">
            У вас нет прав для просмотра этой страницы
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            Эта страница доступна только администраторам платформы.
            Если вы считаете что это ошибка, обратитесь к администратору.
          </p>

          <Button
            onClick={() => navigate('/dashboard')}
            className="w-full"
          >
            <Home className="mr-2 h-4 w-4" />
            Вернуться на главную
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

