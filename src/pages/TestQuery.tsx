import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Database, CheckCircle, XCircle } from 'lucide-react';
import { api } from '@/utils/apiClient';

interface TableCheck {
  name: string;
  exists: boolean;
  count: number;
  error?: string;
}

export default function TestQuery() {
  const [tables, setTables] = useState<TableCheck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbConnection, setDbConnection] = useState<'connected' | 'error' | 'checking'>('checking');

  useEffect(() => {
    const checkDatabase = async () => {
      console.log('🔍 Проверка структуры БД через Backend API...');
      
      try {
        // TODO: Backend API обработает диагностику БД
        // Endpoint: GET /api/diagnostics/database
        const response = await api.get<{
          connection: 'connected' | 'error';
          tables: TableCheck[];
        }>('/api/diagnostics/database');
        
        console.log('✅ Данные получены от Backend API');
        setDbConnection(response.connection);
        setTables(response.tables);
        
      } catch (error: any) {
        console.error('❌ Ошибка при проверке БД:', error.message);
        
        // Если Backend недоступен - показываем ошибку
        setDbConnection('error');
        setTables([]);
        
        // Показываем уведомление
        alert('Backend API недоступен. Убедитесь, что сервер запущен.');
      } finally {
        setIsLoading(false);
      }
    };

    checkDatabase();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg">Проверка базы данных...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Database className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">🔍 Диагностика БД Supabase</h1>
          <p className="text-muted-foreground">Проверка структуры базы данных</p>
        </div>
      </div>

      {/* Статус подключения */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {dbConnection === 'connected' && <CheckCircle className="w-5 h-5 text-green-500" />}
            {dbConnection === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
            {dbConnection === 'checking' && <Loader2 className="w-5 h-5 animate-spin" />}
            Статус подключения
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dbConnection === 'connected' && (
            <div className="text-green-600 font-semibold">✅ Подключено к Supabase</div>
          )}
          {dbConnection === 'error' && (
            <div className="text-red-600 font-semibold">❌ Ошибка подключения к БД</div>
          )}
        </CardContent>
      </Card>

      {/* Таблицы */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tables.map((table) => (
          <Card key={table.name} className={table.exists ? 'border-green-500' : 'border-red-500'}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{table.name}</CardTitle>
                {table.exists ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
              </div>
              <CardDescription>
                {table.exists ? (
                  <Badge variant="default" className="bg-green-500">
                    {table.count} записей
                  </Badge>
                ) : (
                  <Badge variant="destructive">Не найдена</Badge>
                )}
              </CardDescription>
            </CardHeader>
            {table.error && (
              <CardContent>
                <div className="text-xs text-red-500 font-mono">{table.error}</div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Итоги */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Итоги проверки</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Всего таблиц проверено:</span>
              <span className="font-bold">{tables.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Существуют:</span>
              <span className="font-bold text-green-600">
                {tables.filter((t) => t.exists).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Отсутствуют:</span>
              <span className="font-bold text-red-600">
                {tables.filter((t) => !t.exists).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Всего записей:</span>
              <span className="font-bold">
                {tables.reduce((sum, t) => sum + t.count, 0)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

