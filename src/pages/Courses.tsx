import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Sparkles, Code, ArrowRight, Clock, Users, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMemo } from 'react';

export default function Courses() {
  const navigate = useNavigate();

  const courses = [
    {
      id: 1,
      title: 'Интегратор 2.0',
      description: 'Создавай автоматизации и интеграции с AI для бизнеса',
      icon: <Sparkles className="w-10 h-10" />,
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
      icon: <BookOpen className="w-10 h-10" />,
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
      icon: <Code className="w-10 h-10" />,
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

  // Генерируем звёзды ОДИН РАЗ при монтировании компонента (как в Login)
  const stars = useMemo(() => {
    return [...Array(50)].map((_, i) => {
      const startX = Math.random() * 100;
      const startY = Math.random() * 100;
      const moveX = (Math.random() - 0.5) * 30;
      const moveY = (Math.random() - 0.5) * 30;
      const duration = Math.random() * 5 + 3;
      const delay = Math.random() * 2;
      
      return { startX, startY, moveX, moveY, duration, delay };
    });
  }, []);

  return (
    <div className="relative min-h-screen bg-black overflow-hidden p-6">
      {/* СЕРЫЙ БЛИК КАЖДЫЕ 5 СЕК (как в Login) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute w-[1000px] h-[1000px] rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(155,155,155,0.35) 0%, rgba(122,122,122,0.25) 20%, rgba(88,88,88,0.16) 40%, rgba(66,66,66,0.08) 60%, transparent 80%)',
          }}
          animate={{
            x: ['-50%', '110%'],
            y: ['-50%', '110%'],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            repeatDelay: 5,
            ease: "easeInOut",
            times: [0, 0.2, 0.8, 1],
          }}
        />
      </div>

      {/* Летающие звезды (как в Login) */}
      <div className="absolute inset-0 pointer-events-none">
        {stars.map((star, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              top: `${star.startY}%`,
              left: `${star.startX}%`,
            }}
            animate={{
              x: [0, star.moveX, 0],
              y: [0, star.moveY, 0],
              opacity: [0.2, 1, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: star.duration,
              repeat: Infinity,
              delay: star.delay,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      <div className="max-w-7xl mx-auto space-y-12 relative z-10">
        {/* Заголовок */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <h1 className="text-5xl sm:text-6xl font-bold text-white">
            Выберите свой курс
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto" style={{ fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif' }}>
            Изучайте AI-технологии и создавайте реальные проекты вместе с{' '}
            <span className="text-[#00ff00] font-semibold">onAI Academy</span>
          </p>
        </motion.div>

        {/* Карточки курсов */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
            >
              <Card 
                className={`h-full bg-[#1a1a24] border-gray-800 transition-all duration-300 ${
                  course.inDevelopment 
                    ? 'opacity-70' 
                    : 'hover:border-[#00ff00]/50 hover:shadow-lg hover:shadow-[#00ff00]/10 cursor-pointer hover:scale-[1.02]'
                }`}
                onClick={() => !course.inDevelopment && navigate(`/course/${course.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-4">
                    {/* Иконка */}
                    <motion.div
                      whileHover={!course.inDevelopment ? { scale: 1.1, rotate: 5 } : {}}
                      className={`w-16 h-16 rounded-xl bg-gradient-to-br from-[#00ff00]/20 to-[#00cc00]/10 flex items-center justify-center border border-[#00ff00]/30 ${
                        !course.inDevelopment && 'group-hover:border-[#00ff00]'
                      }`}
                    >
                      <div className="text-[#00ff00]">{course.icon}</div>
                    </motion.div>
                    
                    {course.inDevelopment && (
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
                        🚧 В разработке
                      </Badge>
                    )}
                  </div>
                  
                  <CardTitle className="text-2xl text-white mb-2">{course.title}</CardTitle>
                  <CardDescription className="text-gray-400">
                    {course.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Статистика */}
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-[#00ff00]" />
                      {course.duration}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-[#00ff00]" />
                      {course.students}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Star className="w-4 h-4 fill-[#00ff00] text-[#00ff00]" />
                      {course.rating}
                    </div>
                  </div>

                  {/* Модули и уроки */}
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="bg-gray-800 text-gray-300">
                      {course.modules} модулей
                    </Badge>
                    <Badge variant="secondary" className="bg-gray-800 text-gray-300">
                      {course.lessons} уроков
                    </Badge>
                  </div>

                  {/* Фичи */}
                  <ul className="space-y-2">
                    {course.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#00ff00] mt-1.5 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* Кнопка */}
                  <Button
                    disabled={course.inDevelopment}
                    className={`w-full mt-4 ${
                      course.inDevelopment
                        ? 'bg-gray-700 text-gray-400'
                        : 'bg-[#00ff00] hover:bg-[#00cc00] text-black font-semibold shadow-lg shadow-[#00ff00]/20 hover:scale-[1.02]'
                    } transition-all duration-300`}
                  >
                    {course.inDevelopment ? (
                      <>
                        Скоро откроется
                        <Clock className="w-4 h-4 ml-2" />
                      </>
                    ) : (
                      <>
                        Начать обучение
                        <ArrowRight className="w-4 h-4 ml-2" />
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
          className="text-center space-y-6 pt-8"
        >
          <p className="text-gray-400">
            Не можете определиться?{' '}
            <button className="text-[#00ff00] hover:underline font-semibold transition-colors">
              Пройдите тест на выбор курса
            </button>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <span>🎯</span> Гарантия возврата 14 дней
            </div>
            <div className="flex items-center gap-2">
              <span>🎓</span> Сертификат после обучения
            </div>
            <div className="flex items-center gap-2">
              <span>💬</span> Поддержка 24/7
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
