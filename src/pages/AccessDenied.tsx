import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';

export default function AccessDenied() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-black p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-10 w-10 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Доступ запрещён</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            У вас недостаточно прав для доступа к этой странице.
          </p>
          <p className="text-sm text-muted-foreground">
            Эта страница доступна только для администраторов.
          </p>
          <div className="flex flex-col gap-2 mt-6">
            <Button onClick={() => navigate('/')} className="w-full">
              Вернуться в профиль
            </Button>
            <Button 
              onClick={() => navigate('/login')} 
              variant="outline" 
              className="w-full"
            >
              Войти как администратор
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
