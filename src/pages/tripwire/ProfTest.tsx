import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import FacebookPixel from '@/components/FacebookPixel';
import UTMTracker from '@/components/UTMTracker';
import { getPixelConfig } from '@/config/pixels';
import { trackLead } from '@/lib/facebook-pixel';
import { getAllUTMParams } from '@/lib/utm-tracker';

// Quiz Questions Data
const questions = [
  {
    q: "Сколько вам лет?",
    options: ["14–18", "19–25", "26–35", "35+"]
  },
  {
    q: "Кем вы сейчас работаете/зарабатываете?",
    options: ["Фриланс, работа на себя", "Владелец бизнеса", "Наемный сотрудник", "Ищу себя / Студент"]
  },
  {
    q: "Насколько вы освоили ChatGPT/нейросети?",
    options: ["Активно использую", "Пробовал, но не монетизировал", "Только слышал", "Считаю, что это несерьезно"]
  },
  {
    q: "Есть клиент, готовый заплатить 500$ за настройку AI-бота. Сколько времени потратите на обучение?",
    options: ["Готов потратить неделю", "2–3 дня (если есть план)", "Сначала попробую бесплатно", "Сначала прочту теорию"]
  },
  {
    q: "Вы успешно сдали работу, получили 500$, ваши действия?",
    options: ["Повторить и найти еще клиентов", "Поднять чек (от 1000$)", "Потратить на то, что хотел", "Инвестировать в обучение"]
  },
  {
    q: "Вы получили готовую схему по созданию вирусного видео на сотни тысяч просмотров, ваши действия?",
    options: ["Сразу применю и повторю", "Попробую сделать по-своему", "Уже пробовал, не работает", "Не интересна тема видео"]
  },
  {
    q: "Что для вас ценнее: 1000$ или 10 000 живых подписчиков?",
    options: ["Конечно, 1000$", "Подписчики ценнее", "Они равны друг другу", "Ни то, ни другое"]
  },
  {
    q: "У вас когда-нибудь была идея создать приложение или сервис?",
    options: ["Конечно, и сейчас есть", "Была, но не смог реализовать", "Без денег невозможно", "Вообще об этом не думал"]
  },
  {
    q: "Представьте, у вас есть робот, который разрабатывает для вас любые сервисы и приложения. Ваши действия?",
    options: ["Начну делать свое приложение", "Буду искать большие заказы", "Не бывает такого", "Отпущу робота домой"]
  },
  {
    q: "Сколько вы готовы инвестировать в знания, которые выведут вас на новый уровень?",
    options: ["Не готов вкладываться", "Порядка 10$ готов", "За реальные знания, от 100$ легко", "Если буду делать 500$, то столько и вложу"]
  }
];

const systemMessages = [
  "ANALYZING PROFILE",
  "CALCULATING POTENTIAL",
  "ASSESSING CANDIDATE",
  "SYNCHRONIZING DATA",
  "VERIFYING INPUT",
  "UPDATING METRICS",
  "PROCESSING RESPONSE"
];

export default function ProfTest() {
  const { slug } = useParams<{ slug?: string }>();
  const pixelConfig = slug ? getPixelConfig(slug) : null;
  
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [systemStatus, setSystemStatus] = useState(0);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const visualCanvasRef = useRef<HTMLCanvasElement>(null);

  // Preloader
  useEffect(() => {
    const timer = setTimeout(() => setLoadProgress(100), 500);
    const hideTimer = setTimeout(() => setIsLoading(false), 1000);
    return () => {
      clearTimeout(timer);
      clearTimeout(hideTimer);
    };
  }, []);

  // System Status Loop
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemStatus((prev) => (prev + 1) % systemMessages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Background Canvas Animation (⚡ OPTIMIZED)
  useEffect(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;

    // 🚀 OPTIMIZATION: Disable on mobile devices
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      canvas.style.display = 'none';
      return;
    }

    // 🚀 OPTIMIZATION: Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      canvas.style.display = 'none';
      return;
    }

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    let particles: any[] = [];
    let animationId: number;

    class Particle {
      x: number; y: number; vx: number; vy: number; size: number;
      
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = (Math.random() - 0.5) * 0.3;
        this.size = Math.random() * 2 + 1;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = '#00FF94';
        ctx.fill();
      }
    }

    function initParticles() {
      particles = [];
      // 🚀 OPTIMIZATION: Reduce particle count (was 40, now 25 max)
      const count = Math.min(Math.floor(width * height / 40000), 25);
      for (let i = 0; i < count; i++) {
        particles.push(new Particle());
      }
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);
      
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
        
        // 🚀 OPTIMIZATION: Skip some connections for performance
        for (let j = i + 1; j < Math.min(i + 4, particles.length); j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 100) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(0, 255, 148, ${1 - distance / 100})`;
            ctx.lineWidth = 0.2;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      
      animationId = requestAnimationFrame(animate);
    }

    // 🚀 OPTIMIZATION: Debounce resize handler
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        initParticles();
      }, 250);
    };

    window.addEventListener('resize', handleResize);
    initParticles();
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      clearTimeout(resizeTimeout);
    };
  }, []);

  // Visual Canvas Animation (Neural Geometry) (⚡ OPTIMIZED)
  useEffect(() => {
    if (showResults) return;

    const canvas = visualCanvasRef.current;
    if (!canvas) return;

    // 🚀 OPTIMIZATION: Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      canvas.style.display = 'none';
      return;
    }

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const container = canvas.parentElement;
    if (!container) return;

    let width = canvas.width = container.offsetWidth;
    let height = canvas.height = container.offsetHeight;
    let nodes: any[] = [];
    let rotation = 0;
    let animationId: number;

    class Node {
      x: number; y: number; z: number;
      baseX: number; baseY: number; angle: number; speed: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.z = (Math.random() - 0.5) * 200;
        this.baseX = this.x;
        this.baseY = this.y;
        this.angle = Math.random() * Math.PI * 2;
        this.speed = 0.005 + Math.random() * 0.01;
      }

      update() {
        this.angle += this.speed;
        this.y += Math.sin(this.angle) * 0.2;
      }
    }

    function initNodes() {
      nodes = [];
      // 🚀 OPTIMIZATION: Reduce node count (was 40, now 25)
      for (let i = 0; i < 25; i++) {
        nodes.push(new Node());
      }
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;
      
      rotation += 0.002;

      const projectedNodes = nodes.map(node => {
        node.update();
        
        let x = node.x - cx;
        let z = node.z;
        
        let rx = x * Math.cos(rotation) - z * Math.sin(rotation);
        let rz = z * Math.cos(rotation) + x * Math.sin(rotation);
        
        const scale = 300 / (300 + rz);
        const px = rx * scale + cx;
        const py = node.y * scale;
        
        return { x: px, y: py, scale };
      });

      // Draw connections
      ctx.strokeStyle = '#00FF94';
      for (let i = 0; i < projectedNodes.length; i++) {
        for (let j = i + 1; j < projectedNodes.length; j++) {
          const a = projectedNodes[i];
          const b = projectedNodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 100) {
            ctx.beginPath();
            ctx.globalAlpha = (1 - dist / 100) * 0.4 * a.scale;
            ctx.lineWidth = 0.5 * a.scale;
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      ctx.globalAlpha = 1;
      projectedNodes.forEach(node => {
        const radius = Math.max(0.1, 1.5 * node.scale); // Prevent negative radius
        ctx.beginPath();
        ctx.fillStyle = '#00FF94';
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    }

    // 🚀 OPTIMIZATION: Debounce resize handler
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        width = canvas.width = container.offsetWidth;
        height = canvas.height = container.offsetHeight;
        initNodes();
      }, 250);
    };

    window.addEventListener('resize', handleResize);
    initNodes();
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      clearTimeout(resizeTimeout);
    };
  }, [showResults]);

  // Phone Input Masking
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    let output = '';

    if (value.length > 0) {
      const firstChar = value[0];
      if (firstChar === '7' || firstChar === '8' || firstChar === '9') {
        output = '+7';
        if (value.length > 1) output += ' (' + value.substring(1, 4);
        if (value.length > 4) output += ') ' + value.substring(4, 7);
        if (value.length > 7) output += '-' + value.substring(7, 9);
        if (value.length > 9) output += '-' + value.substring(9, 11);
      } else {
        output = '+' + value.substring(0, 15);
      }
    } else {
      output = '+';
    }

    setFormData(prev => ({ ...prev, phone: output }));
  };

  const handleSelectOption = (index: number) => {
    setSelectedOption(index);
  };

  const handleNext = () => {
    if (selectedOption === null) return;

    setAnswers([...answers, selectedOption]);
    
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedOption(null);
    } else {
      setShowResults(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ✅ УСИЛЕННАЯ ВАЛИДАЦИЯ: Все поля обязательны
    if (!formData.name?.trim() || !formData.email?.trim() || !formData.phone?.trim()) {
      setSubmitError('❌ Все поля обязательны для заполнения');
      return;
    }

    // ✅ Проверка имени (минимум 2 символа)
    if (formData.name.trim().length < 2) {
      setSubmitError('❌ Имя должно содержать минимум 2 символа');
      return;
    }

    // ✅ Проверка email формата
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setSubmitError('❌ Введите корректный Email адрес');
      return;
    }

    // ✅ Проверка телефона (минимум 11 цифр для +7)
    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (phoneDigits.length < 11) {
      setSubmitError('❌ Введите корректный номер телефона');
      return;
    }

    // ❌ УБРАНО: Проверка повторного прохождения теста
    // Теперь пользователи могут проходить тест сколько угодно раз

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // 1. Get API base URL
      const apiBaseUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000' : 'https://api.onai.academy');
      
      // 2. Get UTM params
      const utmParams = getAllUTMParams();

      // 3. Формируем полные ответы с вопросами
      const proftestAnswers = answers.map((answerIndex, questionIndex) => ({
        questionNumber: questionIndex + 1,
        question: questions[questionIndex].q,
        answer: questions[questionIndex].options[answerIndex]
      }));

      // 4. Determine source based on campaign
      const campaignSlug = pixelConfig?.slug || 'unknown';
      let sourceLabel: string;
      
      // Special mapping for specific campaigns
      if (campaignSlug === 'traf4') {
        sourceLabel = 'TF4';
      } else {
        sourceLabel = `proftest_${campaignSlug}`;
      }
      
      // 5. Submit to landing API (save to Supabase + AmoCRM + Conversion API on backend)
      const response = await fetch(`${apiBaseUrl}/api/landing/proftest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          source: sourceLabel,
          answers, // Старый формат для совместимости
          proftestAnswers, // Новый формат с полными текстами
          campaignSlug: pixelConfig?.slug,
          utmParams,
          metadata: {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            pixelId: pixelConfig?.pixelId,
            campaignName: pixelConfig?.name,
          }
        })
      });

      if (response.ok) {
        // ✅ ТОЛЬКО ПОСЛЕ УСПЕШНОЙ ОТПРАВКИ: Track Lead event (browser-side)
        trackLead({
          content_name: 'Lead Form Submission',
          content_category: 'proftest',
          value: 1,
        });
        
        // ❌ УБРАНО: Сохранение в localStorage (разрешаем повторные прохождения)
        // localStorage.setItem(`proftest_completed_${formData.email}`, 'true');
        
        // Показываем модалку успеха с анимацией
        setShowSuccessModal(true);
      } else {
        const errorData = await response.json();
        
        // ❌ УБРАНО: Проверка на повторное прохождение (разрешаем повторные тесты)
        // Просто показываем ошибку если есть
        setSubmitError(errorData.error || 'Произошла ошибка при отправке данных');
      }
    } catch (error) {
      console.error('Error submitting test:', error);
      setSubmitError('Произошла ошибка. Пожалуйста, попробуйте снова.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const letters = ['A', 'B', 'C', 'D'];

  // Success Modal - Thank You Page
  if (showSuccessModal) {
    return (
      <div className="bg-[#030303] text-white min-h-screen flex items-center justify-center relative overflow-hidden">
        <canvas ref={bgCanvasRef} className="fixed inset-0 w-full h-full opacity-20" />
        
        <div className="relative z-10 text-center px-4 max-w-2xl mx-auto">
          {/* AI Processing Sphere Animation */}
          <div className="mb-8 flex justify-center">
            <div className="relative w-32 h-32">
              {/* Outer glow */}
              <div className="absolute inset-0 rounded-full bg-[#00FF94] opacity-20 blur-xl animate-pulse"></div>
              
              {/* Middle ring */}
              <div className="absolute inset-2 rounded-full border-2 border-[#00FF94] opacity-40 animate-spin" style={{ animationDuration: '3s' }}></div>
              
              {/* Inner sphere */}
              <div className="absolute inset-4 rounded-full bg-gradient-to-br from-[#00FF94] to-[#00CC77] animate-pulse"></div>
              
              {/* Core */}
              <div className="absolute inset-8 rounded-full bg-white animate-ping" style={{ animationDuration: '2s' }}></div>
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold mb-6">
            ДАННЫЕ ПРИНЯТЫ
          </h1>
          
          <div className="text-[#00FF94] text-lg sm:text-xl mb-8 font-mono">
            AI ОБРАБАТЫВАЕТ ВАШУ ЗАЯВКУ...
          </div>

          <p className="text-white text-xl sm:text-2xl font-bold mb-8">
            📱 Ожидайте ответа по SMS
          </p>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
            <p className="text-gray-400 text-sm sm:text-base">
              Наша команда свяжется с вами в ближайшее время для обсуждения следующих шагов.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If no pixel config and slug is provided, show error
  if (slug && !pixelConfig) {
    return (
      <div className="bg-[#030303] text-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-display font-bold mb-4">404</h1>
          <p className="text-gray-400">Campaign not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#030303] text-white min-h-screen flex flex-col relative overflow-x-hidden selection:bg-[#00FF94] selection:text-black">
      
      {/* UTM Tracker */}
      <UTMTracker />
      
      {/* Facebook Pixel */}
      {pixelConfig && <FacebookPixel pixelConfig={pixelConfig} />}
      
      {/* Custom Styles */}
      <style>{`
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #000; }
        ::-webkit-scrollbar-thumb { background: #00FF94; border-radius: 0; }

        .glass-panel {
          background: rgba(15, 15, 15, 0.7);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        }

        .text-glow {
          text-shadow: 0 0 20px rgba(0, 255, 148, 0.4);
        }

        .option-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .option-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; width: 4px; height: 100%;
          background: #00FF94;
          transform: scaleY(0);
          transition: transform 0.3s ease;
        }

        .option-card:hover, .option-card.selected {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(0, 255, 148, 0.5);
          transform: translateX(5px);
        }

        .option-card:hover::before, .option-card.selected::before {
          transform: scaleY(1);
        }

        .option-card.selected {
          background: rgba(0, 255, 148, 0.1);
          border-color: #00FF94;
          box-shadow: 0 0 20px rgba(0, 255, 148, 0.1);
        }

        .cyber-grid {
          position: fixed;
          top: 0; left: 0; width: 200%; height: 200%;
          background-image: linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          background-size: 50px 50px;
          transform: perspective(500px) rotateX(60deg) translateY(-100px) translateZ(-200px);
          animation: grid-move 20s linear infinite;
          z-index: -10;
          pointer-events: none;
        }

        @keyframes grid-move {
          0% { transform: perspective(500px) rotateX(60deg) translateY(0) translateZ(-200px); }
          100% { transform: perspective(500px) rotateX(60deg) translateY(50px) translateZ(-200px); }
        }

        @keyframes dots {
          0%, 20% { content: ''; }
          40% { content: '.'; }
          60% { content: '..'; }
          80%, 100% { content: '...'; }
        }

        .loading-dots::after {
          content: '';
          animation: dots 1.5s steps(4, end) infinite;
          display: inline-block;
          width: 12px;
        }
      `}</style>

      {/* Preloader */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-[9999] flex items-center justify-center px-4"
          >
            <div className="text-center">
              <div className="font-display font-bold text-2xl sm:text-3xl md:text-4xl mb-3 sm:mb-4 tracking-tighter uppercase">
                AI <span className="text-[#00FF94]">TEST</span>
              </div>
              <div className="w-[150px] sm:w-[200px] h-0.5 bg-[#222] overflow-hidden relative mx-auto">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${loadProgress}%` }}
                  className="h-full bg-[#00FF94] shadow-[0_0_10px_#00FF94]"
                />
              </div>
              <div className="font-mono text-[9px] sm:text-[10px] text-gray-500 mt-1.5 sm:mt-2">CALIBRATING...</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background */}
      <canvas ref={bgCanvasRef} className="fixed top-0 left-0 w-full h-full -z-[8] pointer-events-none opacity-60" />
      <div className="cyber-grid" />
      <div className="fixed top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-[#030303]/90 to-[#030303] -z-[5] pointer-events-none" />

      {/* Header Progress */}
      {!showResults && (
        <header className="fixed top-0 w-full z-40 bg-black/50 backdrop-blur-md border-b border-white/5 pt-3 sm:pt-4 pb-2">
          <div className="max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-3xl mx-auto px-3 sm:px-4 md:px-6">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-[#00FF94] rounded-full animate-pulse" />
                <span className="font-display font-bold text-[10px] sm:text-xs tracking-wider sm:tracking-widest">INTEGRATOR-TEST</span>
              </div>
              <div className="font-mono text-[9px] sm:text-[10px] text-[#00FF94]">
                {String(currentQuestion + 1).padStart(2, '0')}/{questions.length}
              </div>
            </div>
            <div className="h-0.5 sm:h-1 w-full bg-white/10 rounded-full overflow-hidden">
              <motion.div
                animate={{ width: `${progress}%` }}
                className="h-full bg-[#00FF94] shadow-[0_0_10px_#00FF94]"
              />
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="flex-grow flex flex-col justify-start items-center px-3 sm:px-4 md:px-6 pt-14 sm:pt-16 md:pt-20 pb-8 sm:pb-12 md:pb-16 w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-3xl mx-auto relative z-10">
        
        {!showResults ? (
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full glass-panel rounded-2xl overflow-hidden"
          >
            {/* Visual Header */}
            <div className="relative w-full h-[15vh] sm:h-[18vh] md:h-[20vh] lg:h-[22vh] bg-black border-b border-white/5 overflow-hidden">
              <canvas ref={visualCanvasRef} className="w-full h-full block" />
              
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] to-transparent pointer-events-none" />
              
              {/* System Status */}
              <div className="absolute bottom-1.5 sm:bottom-2 left-2 sm:left-4 z-10">
                <div className="text-[7px] sm:text-[8px] font-mono text-[#00FF94] bg-black/60 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded border border-[#00FF94]/20 backdrop-blur-sm flex items-center gap-1 sm:gap-2 uppercase">
                  <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-[#00FF94] rounded-full animate-pulse" />
                  <span className="loading-dots whitespace-nowrap">{systemMessages[systemStatus]}</span>
                </div>
              </div>

              {/* Question Number */}
              <div className="absolute top-1.5 sm:top-2 right-2 sm:right-4 z-10">
                <div className="text-[32px] sm:text-[40px] md:text-[48px] font-display font-bold text-white/5 leading-none select-none">
                  0{currentQuestion + 1}
                </div>
              </div>
            </div>

            {/* Question Content */}
            <div className="p-4 sm:p-5 md:p-6 lg:p-8">
              <h2 className="font-display font-bold text-base sm:text-lg md:text-xl lg:text-2xl leading-tight mb-3 sm:mb-4 md:mb-5 text-white min-h-[2.5rem] sm:min-h-[3rem] md:min-h-[3.5rem]">
                {questions[currentQuestion].q}
              </h2>

              {/* Options */}
              <div className="space-y-2 sm:space-y-3">
                {questions[currentQuestion].options.map((option, index) => (
                  <div
                    key={index}
                    onClick={() => handleSelectOption(index)}
                    className={`option-card border border-white/10 rounded-lg sm:rounded-xl p-3 sm:p-4 cursor-pointer bg-white/5 flex items-center gap-2 sm:gap-3 ${
                      selectedOption === index ? 'selected' : ''
                    }`}
                  >
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-black/50 border flex items-center justify-center flex-shrink-0 font-mono text-[10px] sm:text-xs transition-colors ${
                      selectedOption === index ? 'text-[#00FF94] border-[#00FF94]' : 'text-gray-400 border-white/10'
                    }`}>
                      {letters[index]}
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-gray-200 leading-snug">{option}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 border-t border-white/5 bg-black/20 flex justify-end">
              <button
                onClick={handleNext}
                disabled={selectedOption === null}
                className={`bg-[#00FF94] text-black font-display font-bold text-xs sm:text-sm py-2.5 sm:py-3 px-6 sm:px-8 md:px-10 skew-x-[-10deg] transition-all duration-300 ${
                  selectedOption === null
                    ? 'opacity-50 cursor-not-allowed'
                    : 'shadow-[0_0_30px_rgba(0,255,148,0.8)] brightness-110'
                }`}
              >
                <span className="inline-block skew-x-[10deg] whitespace-nowrap">
                  {currentQuestion === questions.length - 1 ? 'ЗАВЕРШИТЬ' : 'ДАЛЕЕ'}
                </span>
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full glass-panel rounded-xl sm:rounded-2xl p-5 sm:p-6 md:p-8 lg:p-10 text-center relative overflow-hidden"
          >
            {/* Background glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 sm:w-64 sm:h-64 bg-[#00FF94]/20 rounded-full blur-[60px] sm:blur-[80px] pointer-events-none" />
            
            <div className="relative z-10">
              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-[#00FF94]/10 rounded-full border border-[#00FF94]/50 flex items-center justify-center mx-auto mb-4 sm:mb-5 md:mb-6 animate-pulse">
                <Check className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-[#00FF94]" strokeWidth={2.5} />
              </div>

              <h2 className="font-display font-bold text-xl sm:text-2xl md:text-3xl mb-1.5 sm:mb-2">ТЕСТ ПРИНЯТ</h2>
              <p className="text-gray-400 text-xs sm:text-sm mb-4 sm:mb-5 md:mb-6">Результаты будут высланы по SMS.</p>
              {/* Removed AI text per user request */}

              <div className="bg-white/5 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-5 md:mb-6 border border-white/10 text-left">
                <p className="text-[10px] sm:text-xs text-gray-400 font-mono mb-1.5 sm:mb-2">SYSTEM MESSAGE:</p>
                <p className="text-xs sm:text-sm leading-relaxed">
                  Ваши ответы обрабатываются системой. Чтобы завершить тестирование и получить результат, укажите ваши данные ниже.
                </p>
              </div>

              {/* Lead Form */}
              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                <input
                  type="text"
                  placeholder="Ваше Имя"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-black/50 border border-white/20 rounded-lg py-2.5 sm:py-3 px-3 sm:px-4 text-white focus:outline-none focus:border-[#00FF94] transition-colors font-mono text-xs sm:text-sm"
                  required
                />
                <input
                  type="email"
                  placeholder="Ваш Email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-black/50 border border-white/20 rounded-lg py-2.5 sm:py-3 px-3 sm:px-4 text-white focus:outline-none focus:border-[#00FF94] transition-colors font-mono text-xs sm:text-sm"
                  required
                />
                <input
                  type="tel"
                  placeholder="+7 (___) ___-__-__"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  onFocus={(e) => { if (!e.target.value) setFormData(prev => ({ ...prev, phone: '+' })); }}
                  onBlur={(e) => { if (e.target.value === '+') setFormData(prev => ({ ...prev, phone: '' })); }}
                  className="w-full bg-black/50 border border-white/20 rounded-lg py-2.5 sm:py-3 px-3 sm:px-4 text-white focus:outline-none focus:border-[#00FF94] transition-colors font-mono text-xs sm:text-sm"
                  required
                />
                
                {/* Error Message */}
                {submitError && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 sm:p-4">
                    <p className="text-red-400 text-xs sm:text-sm">{submitError}</p>
                  </div>
                )}
                
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full bg-[#00FF94] text-black font-display font-bold text-sm sm:text-base md:text-lg py-3 sm:py-3.5 md:py-4 rounded-lg transition-colors shadow-[0_0_20px_rgba(0,255,148,0.3)] uppercase ${
                    isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white'
                  }`}
                >
                  {isSubmitting ? 'ОТПРАВКА...' : 'ПОЛУЧИТЬ РЕЗУЛЬТАТЫ'}
                </button>
              </form>
              
              <p className="text-[9px] sm:text-[10px] text-gray-600 mt-3 sm:mt-4 leading-tight">
                Нажимая кнопку, вы соглашаетесь с политикой конфиденциальности.
              </p>
            </div>
          </motion.div>
        )}

      </main>
    </div>
  );
}

