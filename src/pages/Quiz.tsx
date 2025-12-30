import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, CheckCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { getApiBaseUrl } from '@/lib/runtime-config';

// Тестовые вопросы (потом заменишь на свои)
const QUIZ_QUESTIONS = [
  {
    id: 1,
    question: 'Как давно вы интересуетесь искусственным интеллектом?',
    options: [
      'Только начинаю изучать',
      'Изучаю 1-3 месяца',
      'Изучаю больше 3 месяцев',
      'Работаю с AI инструментами'
    ]
  },
  {
    id: 2,
    question: 'Какая цель вашего обучения?',
    options: [
      'Увеличить доход',
      'Сменить профессию',
      'Автоматизировать работу',
      'Развитие личного бренда'
    ]
  },
  {
    id: 3,
    question: 'Какой формат обучения вам ближе?',
    options: [
      'Видео уроки',
      'Практические задания',
      'Живые вебинары',
      'Индивидуальное сопровождение'
    ]
  },
  {
    id: 4,
    question: 'Сколько времени готовы уделять обучению?',
    options: [
      '1-2 часа в день',
      '3-4 часа в день',
      '5+ часов в день',
      'По выходным'
    ]
  },
  {
    id: 5,
    question: 'Какой результат хотите получить через 3 месяца?',
    options: [
      'Запустить свой AI проект',
      'Найти работу с AI',
      'Увеличить доход от текущего дела',
      'Стать экспертом в AI'
    ]
  }
];

type QuizStage = 'quiz' | 'thank_you';

export default function Quiz() {
  const [stage, setStage] = useState<QuizStage>('quiz');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Форма для заявки
  const [quizForm, setQuizForm] = useState({
    name: '',
    email: '',
    phone: ''
  });

  // Выбор ответа
  const handleAnswerSelect = (answer: string) => {
    setAnswers(prev => ({ ...prev, [currentQuestion]: answer }));
    
    // Автоматически переходим к следующему вопросу через 300ms
    setTimeout(() => {
      if (currentQuestion < QUIZ_QUESTIONS.length - 1) {
        setCurrentQuestion(prev => prev + 1);
      }
    }, 300);
  };

  // Завершение квиза → отправка заявки в AmoCRM
  const handleQuizComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!quizForm.name || !quizForm.email || !quizForm.phone) {
      toast.error('Заполните все поля');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/landing/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: quizForm.name,
          email: quizForm.email,
          phone: quizForm.phone,
          source: 'tripwire_quiz',
          metadata: {
            quizAnswers: answers,
            stage: 'quiz_completed'
          }
        })
      });

      if (!response.ok) {
        throw new Error('Ошибка отправки');
      }

      const data = await response.json();
      console.log('✅ Заявка создана в AmoCRM:', data);

      toast.success('Спасибо! Ваша заявка принята');
      
      // Показываем страницу "Спасибо"
      setStage('thank_you');

    } catch (error) {
      console.error('❌ Ошибка отправки квиза:', error);
      toast.error('Не удалось отправить заявку. Попробуйте еще раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030303] text-white font-display">
      <div className="container mx-auto px-4 py-12">
        
        {/* ЭТАП 1: КВИЗ */}
        {stage === 'quiz' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto"
          >
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-6xl font-bold mb-4">
                <span className="text-[#00FF94]">on</span>AI Academy
              </h1>
              <p className="text-gray-400 text-lg">
                Пройдите тест и узнайте ваш путь в мире AI
              </p>
            </div>

            {/* Прогресс */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">
                  Вопрос {currentQuestion + 1} из {QUIZ_QUESTIONS.length}
                </span>
                <span className="text-sm text-[#00FF94]">
                  {Math.round(((currentQuestion + 1) / QUIZ_QUESTIONS.length) * 100)}%
                </span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[#00FF94]"
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentQuestion + 1) / QUIZ_QUESTIONS.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Вопрос */}
            <AnimatePresence mode="wait">
              {currentQuestion < QUIZ_QUESTIONS.length ? (
                <motion.div
                  key={currentQuestion}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-8"
                >
                  <h2 className="text-2xl md:text-3xl font-bold mb-8">
                    {QUIZ_QUESTIONS[currentQuestion].question}
                  </h2>

                  <div className="space-y-4">
                    {QUIZ_QUESTIONS[currentQuestion].options.map((option, idx) => (
                      <motion.button
                        key={idx}
                        onClick={() => handleAnswerSelect(option)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`w-full p-6 text-left rounded-xl border-2 transition-all ${
                          answers[currentQuestion] === option
                            ? 'border-[#00FF94] bg-[#00FF94]/10'
                            : 'border-white/10 hover:border-[#00FF94]/50 bg-[#0A0A0A]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-lg">{option}</span>
                          {answers[currentQuestion] === option && (
                            <CheckCircle className="text-[#00FF94]" size={24} />
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                // Форма для получения контактов
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-8"
                >
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#00FF94]/20 mb-4">
                      <Sparkles className="text-[#00FF94]" size={32} />
                    </div>
                    <h2 className="text-3xl font-bold mb-4">Отлично!</h2>
                    <p className="text-gray-400">
                      Оставьте контакты и получите персональные рекомендации
                    </p>
                  </div>

                  <form onSubmit={handleQuizComplete} className="space-y-4">
                    <Input
                      placeholder="Ваше имя"
                      value={quizForm.name}
                      onChange={(e) => setQuizForm(prev => ({ ...prev, name: e.target.value }))}
                      className="h-14 bg-[#1a1a24] border-gray-700 text-white"
                      required
                    />
                    <Input
                      type="email"
                      placeholder="Email"
                      value={quizForm.email}
                      onChange={(e) => setQuizForm(prev => ({ ...prev, email: e.target.value }))}
                      className="h-14 bg-[#1a1a24] border-gray-700 text-white"
                      required
                    />
                    <Input
                      type="tel"
                      placeholder="Телефон"
                      value={quizForm.phone}
                      onChange={(e) => setQuizForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="h-14 bg-[#1a1a24] border-gray-700 text-white"
                      required
                    />
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-14 bg-[#00FF94] hover:bg-[#00cc88] text-black font-bold text-lg"
                    >
                      {isSubmitting ? 'Отправка...' : 'Получить рекомендации'}
                      <ChevronRight className="ml-2" />
                    </Button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ЭТАП 2: СПАСИБО */}
        {stage === 'thank_you' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto"
          >
            <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-12 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 10 }}
                className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-[#00FF94]/20 mb-6"
              >
                <CheckCircle className="text-[#00FF94]" size={48} />
              </motion.div>
              
              <h2 className="text-4xl font-bold mb-4">
                Спасибо за заявку!
              </h2>
              
              <p className="text-gray-400 text-lg mb-6">
                Мы получили ваши ответы. Наш эксперт свяжется с вами в ближайшее время,<br />
                если вы пройдете тестирование.
              </p>

              <div className="inline-block bg-[#00FF94]/10 border border-[#00FF94]/30 rounded-lg px-6 py-3">
                <p className="text-[#00FF94] font-semibold">
                  ⏱️ Ожидайте звонка в течение 24 часов
                </p>
              </div>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}

