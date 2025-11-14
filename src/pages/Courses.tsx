import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Sparkles, Code, ArrowRight, Clock, Users, Star } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Courses() {
  const navigate = useNavigate();

  const courses = [
    {
      id: 1,
      title: 'Интегратор 2.0',
      description: 'Создавай автоматизации и интеграции с AI для бизнеса',
      icon: <Sparkles className="w-8 h-8" />,
      color: 'from-purple-500 to-pink-500',
      duration: '8 недель',
      students: '1,234',
      rating: '4.9',
      modules: 12,
      lessons: 48,
      inDevelopment: false, // ✅ Доступен
      features: [
        'Работа с API OpenAI',
        'Автоматизация бизнес-процессов',
        'Интеграции с Telegram, Discord',
        'Создание AI-ассистентов',
      ],
    },
    {
      id: 2,
      title: 'Креатор 2.0',
      description: 'Генерируй контент с помощью AI: тексты, изображения, видео',
      icon: <BookOpen className="w-8 h-8" />,
      color: 'from-blue-500 to-cyan-500',
      duration: '6 недель',
      students: '2,156',
      rating: '4.8',
      modules: 10,
      lessons: 40,
      inDevelopment: true, // 🚧 В разработке
      features: [
        'ChatGPT для копирайтинга',
        'Midjourney & DALL-E',
        'Генерация видео с AI',
        'Монетизация контента',
      ],
    },
    {
      id: 3,
      title: 'Программист на Cursor',
      description: 'Разработка веб-приложений с AI-ассистентом Cursor',
      icon: <Code className="w-8 h-8" />,
      color: 'from-green-500 to-emerald-500',
      duration: '10 недель',
      students: '892',
      rating: '5.0',
      modules: 15,
      lessons: 60,
      inDevelopment: true, // 🚧 В разработке
      features: [
        'Cursor IDE с AI',
        'React, TypeScript, Node.js',
        'Supabase, PostgreSQL',
        'Деплой на production',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Заголовок */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <h1 className="text-5xl font-bold text-white">
            Выберите свой курс
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Изучайте AI-технологии и создавайте реальные проекты вместе с onAI Academy
          </p>
        </motion.div>

        {/* Карточки курсов */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`h-full bg-gray-800/50 border-gray-700 transition-all group ${course.inDevelopment ? 'opacity-75' : 'hover:border-gray-600 hover:scale-105 cursor-pointer'}`}>
                <CardHeader>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${course.color} flex items-center justify-center ${!course.inDevelopment && 'group-hover:scale-110'} transition-transform`}>
                      {course.icon}
                    </div>
                    {course.inDevelopment && (
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
                        🚧 В разработке
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-2xl text-white">{course.title}</CardTitle>
                  <CardDescription className="text-gray-400">
                    {course.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Статистика */}
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {course.duration}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {course.students}
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                      {course.rating}
                    </div>
                  </div>

                  {/* Модули и уроки */}
                  <div className="flex gap-2">
                    <Badge variant="secondary">{course.modules} модулей</Badge>
                    <Badge variant="secondary">{course.lessons} уроков</Badge>
                  </div>

                  {/* Фичи */}
                  <ul className="space-y-2">
                    {course.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* Кнопка */}
                  <Button
                    onClick={() => !course.inDevelopment && navigate(`/course/${course.id}`)}
                    disabled={course.inDevelopment}
                    className={`w-full mt-4 ${!course.inDevelopment && 'group-hover:bg-primary group-hover:text-primary-foreground'}`}
                  >
                    {course.inDevelopment ? (
                      <>
                        Скоро откроется
                        <Clock className="w-4 h-4 ml-2" />
                      </>
                    ) : (
                      <>
                        Начать обучение
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Дополнительная информация */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center space-y-4 pt-8"
        >
          <p className="text-gray-400">
            Не можете определиться? Пройдите{' '}
            <button className="text-primary hover:underline">
              тест на выбор курса
            </button>
          </p>
          <div className="flex items-center justify-center gap-8 text-sm text-gray-500">
            <div>🎯 Гарантия возврата 14 дней</div>
            <div>🎓 Сертификат после обучения</div>
            <div>💬 Поддержка 24/7</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

