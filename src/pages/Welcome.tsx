import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/utils/apiClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

interface Answer {
  name?: string
  job_role?: string
  city?: string
  motivation?: string
  study_hours?: string
  experience?: string
  goal?: string
  learning_style?: string
  expectation?: string
}

const Welcome = () => {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Answer>({})
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()

  // Проверяем статус онбординга при загрузке
  useEffect(() => {
    if (!user) {
      console.log('❌ Welcome: пользователь не авторизован, редирект на /login')
      navigate('/login')
      return
    }

    // Проверяем, не завершён ли уже онбординг
    const checkStatus = async () => {
      try {
        const status = await api.get(`/api/onboarding/status?userId=${user.id}`)
        if (status.completed) {
          console.log('✅ Онбординг уже завершён, редирект на /profile')
          navigate('/profile')
        }
      } catch (error) {
        console.warn('⚠️ Не удалось проверить статус онбординга, продолжаем')
      }
    }

    checkStatus()
  }, [user, navigate])

  const handleNext = () => {
    setStep(prev => prev + 1)
  }

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "❌ Ошибка",
        description: "Пользователь не авторизован",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      console.log('💾 Сохраняем ответы онбординга...', answers)

      // Сохраняем через Backend API
      await api.post('/api/onboarding/complete', {
        userId: user.id,
        responses: answers,
      })

      toast({
        title: "✅ Анкета сохранена",
        description: "Добро пожаловать в onAI Academy!",
      })

      console.log('✅ Онбординг завершён, редирект на /profile')
      navigate('/profile')
    } catch (error: any) {
      console.error('❌ Ошибка сохранения анкеты:', error)
      toast({
        title: "❌ Ошибка",
        description: error.message || "Не удалось сохранить данные",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const questions = [
    {
      id: 'intro',
      title: 'Добро пожаловать\nв onAI Academy 👋',
      subtitle: 'Мы рады тебя видеть!\nРасскажи немного о себе, чтобы обучение было комфортным и максимально полезным для тебя.',
      type: 'intro',
    },
    {
      id: 'name',
      title: 'Как нам к тебе обращаться?',
      subtitle: '',
      type: 'input',
      placeholder: 'Имя или псевдоним',
      field: 'name',
    },
    {
      id: 'job_role',
      title: 'Чем ты сейчас занимаешься?',
      subtitle: 'Это поможет нам сделать обучение для тебя комфортнее.',
      type: 'select',
      field: 'job_role',
      options: [
        'Маркетолог / Таргетолог',
        'Продюсер / Запускаю продукты',
        'Фрилансер / Работаю на себя',
        'Предприниматель',
        'Студент',
        'Специалист в найме',
        'Другое',
      ],
    },
    {
      id: 'city',
      title: 'Из какого ты города или страны?',
      subtitle: '',
      type: 'input',
      placeholder: 'Город, страна',
      field: 'city',
    },
    {
      id: 'motivation',
      title: 'Почему решил изучать автоматизацию и нейросети?',
      subtitle: '',
      type: 'select',
      field: 'motivation',
      options: [
        'Хочу зарабатывать больше',
        'Хочу оптимизировать работу / экономить время',
        'Просто интересно',
        'Хочу создать свой продукт / бизнес',
        'Не знаю, но чувствую, что это важно',
      ],
    },
    {
      id: 'study_hours',
      title: 'Сколько времени в неделю готов уделять обучению?',
      subtitle: '',
      type: 'select',
      field: 'study_hours',
      options: ['1–2 часа', '5–7 часов', 'Больше 7 часов'],
    },
    {
      id: 'experience',
      title: 'Какой у тебя уровень владения нейросетями и автоматизацией?',
      subtitle: '',
      type: 'select',
      field: 'experience',
      options: [
        'Только начинаю',
        'Уже пробовал GPT / Make / n8n',
        'Продвинутый',
      ],
    },
    {
      id: 'goal',
      title: 'Что тебе важно получить от курса?',
      subtitle: '',
      type: 'select',
      field: 'goal',
      options: [
        'Готовые схемы и шаблоны',
        'Навык "с нуля до работы"',
        'Поддержку и сообщество',
        'Сертификат / карьерное развитие',
      ],
    },
    {
      id: 'learning_style',
      title: 'Как ты обычно учишься?',
      subtitle: '',
      type: 'select',
      field: 'learning_style',
      options: [
        'Смотрю короткие видео',
        'Читаю инструкции / гайды',
        'Экспериментирую сам',
        'Учусь у наставников',
      ],
    },
    {
      id: 'expectation',
      title: 'Какое у тебя главное ожидание от onAI Academy?',
      subtitle: '',
      type: 'textarea',
      placeholder: 'Напиши свой ответ...',
      field: 'expectation',
    },
    {
      id: 'final',
      title: 'Отлично! Мы уже лучше понимаем тебя 🔥',
      subtitle: 'Добро пожаловать в личный кабинет onAI Academy.',
      type: 'final',
    },
  ]

  const currentQuestion = questions[step]
  const canProceed =
    currentQuestion.type === 'intro' ||
    currentQuestion.type === 'final' ||
    (currentQuestion.field && answers[currentQuestion.field as keyof Answer])

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-4">
      {/* Ambient Background Effect */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-2xl mx-auto">
        {/* Progress Bar */}
        {step > 0 && step < questions.length - 1 && (
          <div className="mb-8">
            <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-neon to-accent"
                initial={{ width: 0 }}
                animate={{
                  width: `${((step - 1) / (questions.length - 2)) * 100}%`,
                }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-muted-foreground text-sm mt-2 text-center">
              Вопрос {step} из {questions.length - 2}
            </p>
          </div>
        )}

        {/* Question Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            <div className="text-center space-y-4">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-foreground whitespace-pre-line">
                {currentQuestion.title}
              </h1>
              {currentQuestion.subtitle && (
                <p className="text-lg text-muted-foreground whitespace-pre-line max-w-xl mx-auto">
                  {currentQuestion.subtitle}
                </p>
              )}
            </div>

            {/* Input Fields */}
            <div className="space-y-4 max-w-md mx-auto">
              {currentQuestion.type === 'input' && (
                <Input
                  value={answers[currentQuestion.field as keyof Answer] || ''}
                  onChange={(e) =>
                    setAnswers({
                      ...answers,
                      [currentQuestion.field!]: e.target.value,
                    })
                  }
                  placeholder={currentQuestion.placeholder}
                  className="w-full h-14 text-lg bg-card border-border focus:border-neon"
                />
              )}

              {currentQuestion.type === 'textarea' && (
                <Textarea
                  value={answers[currentQuestion.field as keyof Answer] || ''}
                  onChange={(e) =>
                    setAnswers({
                      ...answers,
                      [currentQuestion.field!]: e.target.value,
                    })
                  }
                  placeholder={currentQuestion.placeholder}
                  className="w-full min-h-32 text-lg bg-card border-border focus:border-neon resize-none"
                />
              )}

              {currentQuestion.type === 'select' && (
                <div className="grid gap-3">
                  {currentQuestion.options?.map((option) => (
                    <button
                      key={option}
                      onClick={() =>
                        setAnswers({
                          ...answers,
                          [currentQuestion.field!]: option,
                        })
                      }
                      className={`
                        p-4 rounded-lg border-2 transition-all text-left font-medium
                        ${
                          answers[currentQuestion.field as keyof Answer] ===
                          option
                            ? 'border-neon bg-neon/10 text-foreground shadow-[0_0_20px_rgba(177,255,50,0.3)]'
                            : 'border-border bg-card hover:border-neon/50 hover:bg-neon/5 text-foreground'
                        }
                      `}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center pt-8">
              {currentQuestion.type === 'intro' && (
                <Button
                  onClick={handleNext}
                  size="lg"
                  className="px-12 h-14 text-lg font-semibold bg-neon text-neon-foreground hover:bg-neon/90 shadow-[0_0_30px_rgba(177,255,50,0.4)] hover:shadow-[0_0_40px_rgba(177,255,50,0.6)] transition-all"
                >
                  Начать
                </Button>
              )}

              {currentQuestion.type === 'final' && (
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  size="lg"
                  className="px-12 h-14 text-lg font-semibold bg-neon text-neon-foreground hover:bg-neon/90 shadow-[0_0_30px_rgba(177,255,50,0.4)] hover:shadow-[0_0_40px_rgba(177,255,50,0.6)] transition-all"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-neon-foreground/30 border-t-neon-foreground rounded-full animate-spin" />
                      Сохранение...
                    </div>
                  ) : (
                    'Перейти в кабинет'
                  )}
                </Button>
              )}

              {currentQuestion.type !== 'intro' &&
                currentQuestion.type !== 'final' && (
                  <Button
                    onClick={
                      step === questions.length - 2 ? handleNext : handleNext
                    }
                    disabled={!canProceed || loading}
                    size="lg"
                    className="px-12 h-14 text-lg font-semibold bg-neon text-neon-foreground hover:bg-neon/90 shadow-[0_0_30px_rgba(177,255,50,0.4)] hover:shadow-[0_0_40px_rgba(177,255,50,0.6)] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    Далее
                  </Button>
                )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

export default Welcome
