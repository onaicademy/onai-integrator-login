import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, MessageCircle, Smartphone } from 'lucide-react';
import { trackLead } from '@/lib/facebook-pixel';
import { getAllUTMParams } from '@/lib/utm-tracker';
import { getApiBaseUrl } from '@/lib/runtime-config';

interface CheckoutFormProps {
  isOpen: boolean;
  onClose: () => void;
  source?: string;
  campaignSlug?: string;
}

export function CheckoutForm({ isOpen, onClose, source = 'expresscourse', campaignSlug }: CheckoutFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState('--:--:--');
  const [isSuccess, setIsSuccess] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(8); // Changed from 3 to 8 seconds
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({ name: '', phone: '' });
      setIsSubmitting(false);
      setShowThankYou(false);
      setRedirectCountdown(8); // Reset to 8 seconds
    }
  }, [isOpen]);

  // Countdown Timer Logic
  useEffect(() => {
    if (!isOpen) return;

    function getNextTargetTime() {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + (now.getHours() >= 17 ? 1 : 0));
      tomorrow.setHours(17, 0, 0, 0);
      
      if (tomorrow.getTime() <= now.getTime()) {
        tomorrow.setDate(tomorrow.getDate() + 1);
      }
      return tomorrow.getTime();
    }

    let targetTime = getNextTargetTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      let distance = targetTime - now;

      if (distance < 0) {
        targetTime = getNextTargetTime();
        distance = targetTime - now;
      }

      const hours = Math.floor(distance / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setCountdown(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Canvas Animation
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;
    let particles: any[] = [];
    let animationId: number;

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
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
      const particleCount = Math.min(Math.floor(width * height / 20000), 50);
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();

        for (let j = i; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(0, 255, 148, ${1 - distance / 150})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      animationId = requestAnimationFrame(animate);
    }

    const handleResize = () => {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
      initParticles();
    };

    window.addEventListener('resize', handleResize);
    initParticles();
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, [isOpen]);

  // Phone Input Masking
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    let formattedValue = '';
    
    if (value.length > 0) {
      formattedValue = '+';
      if (value.length > 0) formattedValue += value.substring(0, 1);
      if (value.length > 1) formattedValue += ' (' + value.substring(1, 4);
      if (value.length > 4) formattedValue += ') ' + value.substring(4, 7);
      if (value.length > 7) formattedValue += '-' + value.substring(7, 9);
      if (value.length > 9) formattedValue += '-' + value.substring(9, 11);
    }
    
    setFormData(prev => ({ ...prev, phone: formattedValue }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.name === 'phone') {
      handlePhoneChange(e);
    } else {
      setFormData(prev => ({
        ...prev,
        [e.target.name]: e.target.value
      }));
    }
  };

  // ✅ Блокируем отправку формы по Enter (без выбора способа оплаты)
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // ❌ НЕ ДЕЛАЕМ НИЧЕГО! Форма может отправляться ТОЛЬКО через кнопки способа оплаты
    alert('⚠️ Пожалуйста, выберите способ оплаты');
    return false;
  };

  const handleSubmit = async (e: React.FormEvent, paymentMethod: string) => {
    e.preventDefault();
    
    // ✅ ВАЛИДАЦИЯ: Только имя и телефон обязательны
    if (!formData.name.trim()) {
      alert('❌ Пожалуйста, укажите ваше имя');
      return;
    }
    
    if (!formData.phone.trim()) {
      alert('❌ Пожалуйста, укажите ваш номер телефона');
      return;
    }
    
    // Validate phone has at least 11 digits
    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (phoneDigits.length < 11) {
      alert('❌ Пожалуйста, введите полный номер телефона');
      return;
    }

    setIsSubmitting(true);

    try {
      const apiBaseUrl = getApiBaseUrl() || (import.meta.env.DEV ? 'http://localhost:3000' : 'https://api.onai.academy');
      
      // ✅ Захватываем UTM параметры
      const utmParams = getAllUTMParams();
      
      const response = await fetch(`${apiBaseUrl}/api/landing/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          source,
          paymentMethod,
          campaignSlug, // Pass campaign slug for Conversion API tracking
          utmParams, // ✅ Передаем UTM параметры
          metadata: {
            userAgent: navigator.userAgent,
            language: navigator.language,
            timestamp: new Date().toISOString(),
            utmParams, // ✅ Дублируем в metadata для совместимости
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка отправки');
      }

      console.log('✅ Lead submitted:', data);
      
      // ✅ Track Lead event (browser-side) AFTER successful submission
      trackLead({
        content_name: 'Checkout Form Submission',
        content_category: 'landing',
        value: 10,
        currency: 'USD',
      });
      
      // Show thank you message
      setShowThankYou(true);
      
      // Get redirect URL based on payment method
      const redirectUrls = {
        kaspi: 'https://pay.kaspi.kz/pay/ub82mpkc',
        card: 'https://proeducation.kz/o62eBw/',
        manager: 'https://wa.me/77066523203'
      };
      
      const redirectUrl = redirectUrls[paymentMethod as keyof typeof redirectUrls];
      
      // Start countdown and redirect
      let countdownValue = 8; // Changed from 3 to 8 seconds
      const countdownInterval = setInterval(() => {
        countdownValue -= 1;
        setRedirectCountdown(countdownValue);
        
        if (countdownValue === 0) {
          clearInterval(countdownInterval);
          window.location.href = redirectUrl;
        }
      }, 1000);

    } catch (error: any) {
      console.error('❌ Error submitting lead:', error);
      alert('Произошла ошибка. Попробуйте еще раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4 overflow-y-auto"
          >
            <div className="relative w-full max-w-md bg-[#0A0A0A] border border-white/10 rounded-lg shadow-[0_0_50px_rgba(0,255,148,0.2)] overflow-hidden my-auto">
              
              {/* Canvas Background */}
              <canvas 
                ref={canvasRef} 
                className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-60 z-0" 
              />

              {/* Cyber Grid Background */}
              <div 
                className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20 z-0"
                style={{
                  backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
                  backgroundSize: '50px 50px'
                }}
              />

              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-20 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Thank You State with Redirect Countdown */}
              {showThankYou && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-0 bg-[#0A0A0A] flex flex-col items-center justify-center z-30 p-8"
                >
                  <div className="font-display text-3xl font-bold text-[#00FF94] mb-4 text-center">
                    СПАСИБО ЗА ЗАЯВКУ!
                  </div>
                  <p className="text-white text-base text-center mb-6 max-w-md leading-relaxed">
                    Сейчас вы перенаправитесь на страницу оплаты. После оплаты с вами автоматически свяжется наш менеджер, подтвердит вашу оплату и выдаст доступ к экспресс обучению.
                  </p>
                  <p className="text-gray-400 text-sm text-center mb-4">
                    Перенаправление через <span className="font-display text-[#00FF94] text-2xl font-bold">{redirectCountdown}</span> секунд
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#00FF94] rounded-full animate-pulse" />
                    <span className="text-gray-400 text-sm font-mono">Перенаправление...</span>
                  </div>
                </motion.div>
              )}

              {/* Form Content */}
              <div className="relative z-10 p-6 md:p-10">
                
                {/* Header */}
                <div className="text-center mb-6">
                  <p className="font-mono text-[11px] text-gray-400 uppercase tracking-widest flex items-center justify-center gap-1 mb-1 whitespace-nowrap">
                    3-й поток самого кассового обучения
                    <span className="font-display text-[#00FF94] animate-pulse text-sm flex-shrink-0">$</span>
                  </p>
                  
                  <h1 className="font-display text-2xl font-bold text-white mb-2">
                    ОФОРМЛЕНИЕ ЗАКАЗА
                  </h1>

                  {/* Price Info */}
                  <div className="flex justify-between items-center bg-[#0A0A0A]/50 p-3 rounded-lg border border-white/5 font-mono text-sm">
                    <div className="text-gray-400 uppercase text-[10px]">Сумма</div>
                    <div className="font-bold text-white text-lg">10$ <span className="text-gray-500">(5к₸)</span></div>
                  </div>
                </div>

                {/* Form */}
                <form className="space-y-5" onSubmit={handleFormSubmit}>
                  
                  {/* Name Input */}
                  <div>
                    <label htmlFor="name" className="block text-xs font-mono text-gray-400 uppercase mb-2">
                      ИМЯ и ФАМИЛИЯ *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="Ваше полное имя"
                      disabled={isSubmitting}
                      className="w-full bg-[#161920] border border-[#333] text-white px-4 py-3.5 text-base rounded transition-all focus:outline-none focus:border-[#00FF94] focus:shadow-[0_0_10px_rgba(0,255,148,0.3)] disabled:opacity-50"
                    />
                  </div>

                  {/* Phone Input */}
                  <div>
                    <label htmlFor="phone" className="block text-xs font-mono text-gray-400 uppercase mb-2">
                      НОМЕР ТЕЛЕФОНА *
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      placeholder="+X (XXX) XXX-XX-XX"
                      disabled={isSubmitting}
                      className="w-full bg-[#161920] border border-[#333] text-white px-4 py-3.5 text-base rounded transition-all focus:outline-none focus:border-[#00FF94] focus:shadow-[0_0_10px_rgba(0,255,148,0.3)] disabled:opacity-50"
                    />
                  </div>

                  {/* Payment Buttons */}
                  <div className="flex flex-col gap-3 mb-8">
                    
                    {/* Kaspi Button */}
                    <button
                      type="button"
                      onClick={(e) => handleSubmit(e, 'kaspi')}
                      disabled={isSubmitting}
                      className="w-full bg-[#E4002B] text-white font-display font-extrabold uppercase py-3.5 px-2 text-[10px] transition-transform hover:scale-[1.01] hover:skew-x-0 skew-x-[-2deg] shadow-[0_0_15px_rgba(228,0,43,0.5)] hover:shadow-[0_0_20px_rgba(228,0,43,0.7)] disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                    >
                      <span className="absolute top-0 left-0 w-full h-full bg-white/30 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                      <span className="relative flex items-center justify-center gap-1">
                        <Smartphone className="w-4 h-4" strokeWidth={2.5} />
                        KASPI АВТООПЛАТА
                      </span>
                    </button>

                    {/* Card Button */}
                    <button
                      type="button"
                      onClick={(e) => handleSubmit(e, 'card')}
                      disabled={isSubmitting}
                      className="w-full bg-white text-black font-display font-extrabold uppercase py-3.5 px-2 text-[10px] transition-transform hover:scale-[1.01] hover:skew-x-0 skew-x-[-2deg] border border-[#333] hover:bg-[#F0F0F0] hover:shadow-[0_0_8px_rgba(255,255,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                    >
                      <span className="absolute top-0 left-0 w-full h-full bg-black/10 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                      <span className="relative flex items-center justify-center gap-1">
                        <CreditCard className="w-4 h-4" strokeWidth={2.5} />
                        БАНКОВСКАЯ КАРТА
                      </span>
                    </button>

                    {/* Manager Button */}
                    <button
                      type="button"
                      onClick={(e) => handleSubmit(e, 'manager')}
                      disabled={isSubmitting}
                      className="w-full bg-[#00FF94] text-black font-display font-extrabold uppercase py-3.5 px-2 text-[10px] transition-transform hover:scale-[1.01] hover:skew-x-0 skew-x-[-2deg] shadow-[0_0_15px_rgba(0,255,148,0.4)] hover:shadow-[0_0_20px_rgba(0,255,148,0.6)] disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                    >
                      <span className="absolute top-0 left-0 w-full h-full bg-white/30 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                      <span className="relative flex items-center justify-center gap-1">
                        <MessageCircle className="w-4 h-4" strokeWidth={2.5} />
                        ЧЕРЕЗ МЕНЕДЖЕРА
                      </span>
                    </button>
                  </div>

                  {/* Countdown Timer */}
                  <div className="mt-4 p-3 rounded-xl border border-[#00FF94]/20 bg-[#0A0A0A]/80 flex justify-between items-center">
                    <span className="font-mono text-xs text-gray-400 uppercase tracking-widest flex-shrink-0 mr-3">
                      ДО СТАРТА ПОТОКА:
                    </span>
                    <span className="font-display font-bold text-[#00FF94] text-lg whitespace-nowrap" style={{ textShadow: '0 0 10px rgba(0, 255, 148, 0.4)' }}>
                      {countdown}
                    </span>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

