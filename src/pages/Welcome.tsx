import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Answer = {
  name: string;
  jobRole: string;
  city: string;
  motivation: string;
  studyHours: string;
  experience: string;
  goal: string;
  learningStyle: string;
  expectation: string;
};

const Welcome = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answer>({
    name: "",
    jobRole: "",
    city: "",
    motivation: "",
    studyHours: "",
    experience: "",
    goal: "",
    learningStyle: "",
    expectation: "",
  });
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    checkExistingSurvey();
  }, []);

  const checkExistingSurvey = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/");
      return;
    }
    setUserId(user.id);

    // Check if survey already filled
    const { data } = await supabase
      .from("user_survey")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      navigate("/profile");
    }
  };

  const handleNext = () => {
    if (step < questions.length) {
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      // Save to user_survey table
      const { error: surveyError } = await supabase
        .from("user_survey")
        .insert({
          user_id: userId,
          name: answers.name,
          job_role: answers.jobRole,
          city: answers.city,
          motivation: answers.motivation,
          study_hours: answers.studyHours,
          experience: answers.experience,
          goal: answers.goal,
          learning_style: answers.learningStyle,
          expectation: answers.expectation,
        });

      if (surveyError) throw surveyError;

      // Update user_metadata
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          name: answers.name,
          job_role: answers.jobRole,
          city: answers.city,
          onboarding_completed: true,
        },
      });

      if (metadataError) throw metadataError;

      toast.success("Добро пожаловать в onAI Academy! 🎉");
      navigate("/profile");
    } catch (error) {
      console.error("Error saving survey:", error);
      toast.error("Ошибка при сохранении данных");
    } finally {
      setLoading(false);
    }
  };

  const questions = [
    {
      title: "Добро пожаловать в onAI Academy 👋",
      subtitle: "Мы рады тебя видеть! Расскажи немного о себе, чтобы обучение было комфортным и максимально полезным для тебя.",
      type: "intro",
    },
    {
      title: "Как нам к тебе обращаться?",
      type: "input",
      field: "name",
      placeholder: "Имя или псевдоним",
    },
    {
      title: "Чем ты сейчас занимаешься?",
      subtitle: "Это поможет нам сделать обучение для тебя комфортнее.",
      type: "select",
      field: "jobRole",
      options: [
        "Маркетолог / Таргетолог",
        "Продюсер / Запускаю продукты",
        "Фрилансер / Работаю на себя",
        "Предприниматель",
        "Студент",
        "Специалист в найме",
        "Другое",
      ],
    },
    {
      title: "Из какого ты города или страны?",
      type: "input",
      field: "city",
      placeholder: "Город или страна",
    },
    {
      title: "Почему решил изучать автоматизацию и нейросети?",
      type: "select",
      field: "motivation",
      options: [
        "Хочу зарабатывать больше",
        "Хочу оптимизировать работу / экономить время",
        "Просто интересно и хочу быть в тренде",
        "Хочу создать свой продукт / бизнес",
        "Не знаю, но чувствую, что это важно",
      ],
    },
    {
      title: "Сколько времени в неделю ты готов уделять обучению?",
      type: "select",
      field: "studyHours",
      options: ["1–2 часа", "5–7 часов", "Больше 7 часов"],
    },
    {
      title: "Какой у тебя уровень владения нейросетями и автоматизацией?",
      type: "select",
      field: "experience",
      options: [
        "Только начинаю",
        "Уже пробовал GPT / Make / n8n",
        "Продвинутый (уже создаю свои автоматизации)",
      ],
    },
    {
      title: "Что тебе важно получить от этого курса?",
      type: "select",
      field: "goal",
      options: [
        "Готовые схемы и шаблоны",
        "Навык \"с нуля до работы\"",
        "Поддержку и сообщество",
        "Сертификат / карьерное развитие",
      ],
    },
    {
      title: "Как ты обычно учишься?",
      type: "select",
      field: "learningStyle",
      options: [
        "Смотрю короткие видео",
        "Читаю инструкции / гайды",
        "Экспериментирую сам",
        "Учусь у наставников",
      ],
    },
    {
      title: "Какое у тебя главное ожидание от onAI Academy?",
      type: "textarea",
      field: "expectation",
      placeholder: "Напиши свой ответ...",
    },
    {
      title: "Отлично! Мы уже лучше понимаем тебя 🔥",
      subtitle: "Добро пожаловать в личный кабинет onAI Academy.",
      type: "final",
    },
  ];

  const currentQuestion = questions[step];
  const isIntro = currentQuestion.type === "intro";
  const isFinal = currentQuestion.type === "final";
  const canProceed = isIntro || isFinal || (currentQuestion.field && answers[currentQuestion.field as keyof Answer]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-8 md:p-12"
          >
            {/* Logo */}
            {isIntro && (
              <div className="flex justify-center mb-8">
                <div className="text-4xl font-bold">
                  <span className="text-white">onAI</span>
                  <span className="text-[#B1FF32]">Academy</span>
                </div>
              </div>
            )}

            {/* Question */}
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                {currentQuestion.title}
              </h2>
              {currentQuestion.subtitle && (
                <p className="text-zinc-400 text-base md:text-lg">
                  {currentQuestion.subtitle}
                </p>
              )}
            </div>

            {/* Input Fields */}
            {currentQuestion.type === "input" && (
              <Input
                value={answers[currentQuestion.field as keyof Answer]}
                onChange={(e) =>
                  setAnswers({
                    ...answers,
                    [currentQuestion.field as string]: e.target.value,
                  })
                }
                placeholder={currentQuestion.placeholder}
                className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 text-lg py-6"
              />
            )}

            {currentQuestion.type === "textarea" && (
              <Textarea
                value={answers[currentQuestion.field as keyof Answer]}
                onChange={(e) =>
                  setAnswers({
                    ...answers,
                    [currentQuestion.field as string]: e.target.value,
                  })
                }
                placeholder={currentQuestion.placeholder}
                className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 text-lg min-h-32"
              />
            )}

            {currentQuestion.type === "select" && (
              <div className="space-y-3">
                {currentQuestion.options?.map((option) => (
                  <button
                    key={option}
                    onClick={() =>
                      setAnswers({
                        ...answers,
                        [currentQuestion.field as string]: option,
                      })
                    }
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      answers[currentQuestion.field as keyof Answer] === option
                        ? "bg-[#B1FF32]/10 border-[#B1FF32] text-white"
                        : "bg-zinc-800/30 border-zinc-700 text-zinc-300 hover:border-zinc-600"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            {/* Progress */}
            <div className="mt-8 mb-6">
              <div className="flex justify-between text-sm text-zinc-500 mb-2">
                <span>Прогресс</span>
                <span>{step} / {questions.length - 1}</span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[#B1FF32]"
                  initial={{ width: 0 }}
                  animate={{ width: `${(step / (questions.length - 1)) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Navigation */}
            <div className="flex gap-4">
              {step > 0 && !isFinal && (
                <Button
                  onClick={handlePrevious}
                  variant="outline"
                  className="flex-1 py-6 text-lg"
                >
                  Назад
                </Button>
              )}
              
              {isFinal ? (
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 py-6 text-lg bg-[#B1FF32] text-black hover:bg-[#B1FF32]/90"
                >
                  {loading ? "Сохранение..." : "Перейти в кабинет"}
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed}
                  className="flex-1 py-6 text-lg bg-[#B1FF32] text-black hover:bg-[#B1FF32]/90 disabled:opacity-50"
                >
                  {isIntro ? "Начать" : "Далее"}
                </Button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Welcome;
