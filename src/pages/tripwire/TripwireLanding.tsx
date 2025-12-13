import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckoutForm } from '@/components/landing/CheckoutForm';
import { Logo } from '@/components/Logo';
import FacebookPixel from '@/components/FacebookPixel';
import { getPixelConfig } from '@/config/pixels';

export default function TripwireLanding() {
  const { campaignSlug = 'kenesary' } = useParams<{ campaignSlug?: string }>(); // Default to kenesary for /integrator/expresscourse
  const pixelConfig = getPixelConfig(campaignSlug);
  
  const [countdown, setCountdown] = useState('--:--:--');
  const [slotsCount, setSlotsCount] = useState(71);
  const [slotsStatus, setSlotsStatus] = useState('UPDATING...');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLDivElement>(null);

  // Countdown Timer Logic
  useEffect(() => {
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
  }, []);

  // Slots Simulation Logic
  useEffect(() => {
    let currentSlots = 71;
    const maxSlots = 99;
    const totalDuration = 5 * 60 * 1000;
    const steps = maxSlots - currentSlots;
    const baseInterval = totalDuration / steps;

    const updateSlots = () => {
      if (currentSlots < maxSlots) {
        currentSlots++;
        setSlotsCount(currentSlots);
        
        setSlotsStatus("NEW PURCHASE DETECTED...");
        setTimeout(() => {
          setSlotsStatus("UPDATING...");
        }, 2000);

        const randomVariation = (Math.random() - 0.5) * 10000;
        const nextInterval = Math.max(2000, baseInterval + randomVariation);

        if (currentSlots < maxSlots) {
          setTimeout(updateSlots, nextInterval);
        } else {
          setSlotsStatus("REGISTRATION CLOSING SOON");
        }
      }
    };

    const timeout = setTimeout(updateSlots, 5000);
    return () => clearTimeout(timeout);
  }, []);

  // Canvas Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
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
      const particleCount = Math.min(Math.floor(width * height / 15000), 100);
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
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initParticles();
    };

    window.addEventListener('resize', handleResize);
    initParticles();
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="bg-[#030303] text-white overflow-x-hidden selection:bg-[#00FF94] selection:text-black">
      {/* Custom Styles */}
      <style>{`
        * { box-sizing: border-box; }
        body { overflow-x: hidden; }
        html, body { max-width: 100vw; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #000; }
        ::-webkit-scrollbar-thumb { background: #00FF94; border-radius: 0; }
        
        .glass-panel {
          background: rgba(15, 15, 15, 0.6);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        }
        
        .glass-panel::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(0, 255, 148, 0.5), transparent);
          opacity: 0.5;
        }
        
        .text-glow {
          text-shadow: 0 0 20px rgba(0, 255, 148, 0.4);
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
        
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

        /* RESPONSIVE BREAKPOINTS */
        @media (min-width: 768px) {
          ::-webkit-scrollbar { width: 8px; }
        }

        /* Ensure all iframes and media stay within bounds */
        iframe, img, video {
          max-width: 100%;
          height: auto;
        }
      `}</style>

      {/* Background Elements */}
      <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full -z-[8] pointer-events-none opacity-60" />
      <div className="cyber-grid" />
      <div className="fixed top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-[#030303]/80 to-[#030303] -z-[5] pointer-events-none" />

      {/* Navigation - RESPONSIVE */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/50 backdrop-blur-md">
        <div className="max-w-md md:max-w-3xl lg:max-w-5xl xl:max-w-7xl 2xl:max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 h-12 sm:h-14 md:h-16 lg:h-18 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.8,
              ease: "easeOut",
              delay: 0.2
            }}
            className="flex items-center"
          >
            <Logo
              variant="full"
              className="h-6 sm:h-8 md:h-9 lg:h-10 xl:h-11 w-auto text-white transition-colors hover:text-[#00FF94]"
            />
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="font-mono text-[9px] sm:text-[10px] md:text-xs lg:text-sm text-gray-400"
          >
            В.3.0 ИНТЕГРАТОР
          </motion.div>
        </div>
      </nav>

      <main className="w-full max-w-md md:max-w-3xl lg:max-w-5xl xl:max-w-7xl 2xl:max-w-[1920px] mx-auto pt-16 sm:pt-18 md:pt-20 lg:pt-24 pb-32 md:pb-40 lg:pb-48 px-4 sm:px-6 lg:px-8 xl:px-12 relative overflow-hidden">
        {/* HERO SECTION - RESPONSIVE */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="relative mb-12 sm:mb-16 md:mb-20 lg:mb-32 xl:mb-40"
        >
          <div className="absolute -top-10 -right-10 w-40 h-40 md:w-60 md:h-60 lg:w-80 lg:h-80 xl:w-[500px] xl:h-[500px] bg-[#00FF94]/20 rounded-full blur-[80px] md:blur-[120px] lg:blur-[150px]" />

          <div className="border-2 border-white/10 p-1.5 inline-block mb-5 sm:mb-7 md:mb-9 rounded-full">
            <div className="bg-white/5 px-4 sm:px-5 md:px-7 lg:px-9 py-2 sm:py-2.5 md:py-3.5 rounded-full border border-white/5 backdrop-blur-md">
              <p className="font-mono text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl text-gray-300 uppercase tracking-widest flex items-center gap-2 whitespace-nowrap">
                3-й поток самого кассового обучения
                <svg className="w-6 h-4 sm:w-7 sm:h-5 md:w-9 md:h-6 lg:w-11 lg:h-7 text-[#00FF94] animate-pulse" viewBox="0 0 32 20" fill="none">
                  <rect x="3" y="3" width="26" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <circle cx="16" cy="10" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M16 5.5V14.5 M18 8H15.5C14.7 8 14 8.5 14 9.25C14 10 14.7 10.5 15.5 10.5H16.5C17.3 10.5 18 11 18 11.75C18 12.5 17.3 13 16.5 13H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </p>
            </div>
          </div>

          <h1 className="font-display font-bold text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl 2xl:text-[10rem] leading-[1.1] mb-5 sm:mb-7 md:mb-9 lg:mb-14 tracking-tight">
            ИНТЕГРАТОРЫ<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-400 to-gray-600" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.3)' }}>2000$/МЕС</span><br />
            <span className="text-[#00FF94] text-glow">НА CHATGPT</span>
          </h1>

          {/* Цена и Таймер - RESPONSIVE */}
          <div className="mb-6 sm:mb-8 md:mb-12 lg:mb-16">
            <div className="flex items-center justify-between p-5 sm:p-6 md:p-8 lg:p-10 xl:p-12 rounded-xl md:rounded-2xl lg:rounded-3xl border-2 border-white/10 bg-[#0A0A0A]/50">
              <div>
                <div className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl text-gray-400 font-mono uppercase mb-2 md:mb-3">Стоимость входа</div>
                <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-display font-bold text-white">
                  10$ <span className="text-gray-500 text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-normal">(5к тенге)</span>
                </div>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 xl:w-24 xl:h-24 rounded-full border-2 border-[#00FF94]/30 flex items-center justify-center text-[#00FF94]">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 xl:w-12 xl:h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>

            <div className="mt-3 sm:mt-4 md:mt-6 lg:mt-8 p-4 sm:p-5 md:p-6 lg:p-8 xl:p-10 rounded-xl md:rounded-2xl border-2 md:border-4 border-[#00FF94]/30 bg-[#0A0A0A]/80 flex justify-between items-center gap-3 sm:gap-4 md:gap-6">
              <span className="font-mono text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl text-gray-400 uppercase tracking-widest flex-shrink-0">ДО СТАРТА ПОТОКА:</span>
              <span className="font-display text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-bold text-[#00FF94] text-glow text-right">{countdown}</span>
            </div>
          </div>

          {/* Video - RESPONSIVE */}
          <div ref={videoRef} className="relative w-full max-w-full aspect-video bg-[#0A0A0A] rounded-none md:rounded-lg lg:rounded-xl border border-white/10 mb-6 sm:mb-8 md:mb-12 lg:mb-16 overflow-hidden group shadow-[0_0_30px_rgba(0,255,148,0.1)] md:shadow-[0_0_50px_rgba(0,255,148,0.15)] lg:shadow-[0_0_70px_rgba(0,255,148,0.2)]">
            <iframe
              className="w-full h-full"
              src="https://www.youtube.com/embed/SMKu3K9BcK4?autoplay=0&mute=0&controls=1&rel=0&modestbranding=1"
              title="Promo Video"
              frameBorder="0"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
            <div className="absolute inset-0 pointer-events-none z-20 border border-white/5" />
            <div className="absolute bottom-2 sm:bottom-4 md:bottom-6 left-2 sm:left-4 md:left-6 right-2 sm:right-4 md:right-6 flex justify-between text-[8px] sm:text-[10px] md:text-xs lg:text-sm font-mono text-[#00FF94] pointer-events-none z-20 opacity-80 mix-blend-screen">
              <span className="animate-pulse">ЗАП ● 00:00:00</span>
              <span>ИСТОЧНИК: ONAI.CAM_1</span>
            </div>
          </div>

          <button 
            onClick={() => setIsFormOpen(true)}
            className="w-full bg-[#00FF94] text-black font-display font-bold text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl py-6 sm:py-7 md:py-8 lg:py-10 xl:py-12 px-6 sm:px-8 md:px-10 lg:px-12 xl:px-14 skew-x-[-10deg] hover:skew-x-0 transition-transform duration-300 shadow-[0_0_30px_rgba(0,255,148,0.3)] hover:shadow-[0_0_50px_rgba(0,255,148,0.6)] md:shadow-[0_0_40px_rgba(0,255,148,0.4)] md:hover:shadow-[0_0_70px_rgba(0,255,148,0.7)] group relative overflow-hidden"
          >
            <span className="absolute top-0 left-0 w-full h-full bg-white/30 -translate-x-full group-hover:skew-x-[20deg] group-hover:translate-x-full transition-transform duration-700" />
            <span className="inline-block skew-x-[10deg] group-hover:skew-x-0 transition-transform">ЗАНЯТЬ МЕСТО</span>
          </button>
        </motion.section>

        {/* PROGRAM SECTION - RESPONSIVE */}
        <section className="mb-8 sm:mb-12 md:mb-16 lg:mb-24 xl:mb-32">
          <div className="mb-6 sm:mb-8 md:mb-12 lg:mb-16 border-b border-white/10 pb-3 sm:pb-4 md:pb-6 lg:pb-8">
            <h2 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl mb-4 sm:mb-5 md:mb-6">
              3 ВЗРЫВНЫХ <span className="text-gray-500 text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl">МОДУЛЯ</span>
            </h2>
            <div className="font-mono text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl text-[#00FF94]">
              С ДОМАШНИМИ ЗАДАНИЯМИ
            </div>
          </div>

          <div className="space-y-4 sm:space-y-6 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-6 lg:gap-8 xl:gap-10 md:items-stretch">
            {/* Day 1 - RESPONSIVE */}
            <div className="glass-panel p-2 rounded-2xl md:rounded-3xl group transition-all duration-500 hover:-translate-y-2 md:hover:-translate-y-3 lg:hover:-translate-y-4 h-full flex flex-col">
              <div className="bg-[#0A0A0A]/50 rounded-xl md:rounded-2xl p-6 sm:p-8 md:p-10 lg:p-12 xl:p-14 relative overflow-hidden flex-1 flex flex-col">
                <div className="absolute top-0 right-0 p-2 sm:p-4 md:p-6 lg:p-8 font-display font-bold text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl text-white/5 group-hover:text-[#00FF94]/10 transition-colors">01</div>
                <div className="relative z-10">
                  <h3 className="font-bold text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl mb-3 md:mb-4 lg:mb-5 text-white">Вводный модуль</h3>
                  <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl text-gray-400 leading-relaxed">Определим какое направление в ИИ твое.</p>
                  
                  <div className="mt-3 sm:mt-4 md:mt-6 lg:mt-8 h-6 sm:h-8 md:h-10 lg:h-12 w-full rounded-lg border border-dashed border-white/20 flex items-center justify-center bg-black/40">
                    <div className="font-mono text-[8px] sm:text-[10px] md:text-xs lg:text-sm xl:text-base text-[#00FF94] animate-pulse">АНАЛИЗ ПРОФИЛЯ ПОЛЬЗОВАТЕЛЯ...</div>
                  </div>
                  
                  <div className="mt-3 sm:mt-4 md:mt-6 lg:mt-8 relative w-full aspect-video bg-black/40 rounded-lg border border-white/10 overflow-hidden shadow-lg group-hover:border-[#00FF94]/30 transition-colors">
                    <img 
                      src="https://xikaiavwqinamgolmtcy.supabase.co/storage/v1/object/public/gif%20public/Module%203.gif" 
                      alt="Intro Module Preview" 
                      className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                    />
                    <div className="absolute inset-0 pointer-events-none border border-white/5 rounded-lg z-20" />
                    <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 md:bottom-3 md:right-3 z-20">
                      <span className="text-[6px] sm:text-[8px] md:text-[10px] lg:text-xs font-mono text-[#00FF94] bg-black/80 px-1 sm:px-2 py-0.5 sm:py-1 rounded backdrop-blur-sm">ПРЕВЬЮ 16:9</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Day 2 - RESPONSIVE */}
            <div className="glass-panel p-2 rounded-2xl md:rounded-3xl group transition-all duration-500 hover:-translate-y-2 md:hover:-translate-y-3 lg:hover:-translate-y-4 h-full flex flex-col">
              <div className="bg-[#0A0A0A]/50 rounded-xl md:rounded-2xl p-6 sm:p-8 md:p-10 lg:p-12 xl:p-14 relative overflow-hidden flex-1 flex flex-col">
                <div className="absolute top-0 right-0 p-2 sm:p-4 md:p-6 lg:p-8 font-display font-bold text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl text-white/5 group-hover:text-[#00FF94]/10 transition-colors">02</div>
                <div className="relative z-10">
                  <h3 className="font-bold text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl mb-2 md:mb-3 text-white">Практика: создание GPT-бота</h3>
                  <div className="inline-block border border-[#00FF94] text-[#00FF94] px-3 md:px-4 py-1 md:py-1.5 text-xs sm:text-sm md:text-base lg:text-lg font-mono mb-3 sm:mb-4 md:mb-5">стоимостью от 500$</div>
                  <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl text-gray-400 mb-4 sm:mb-5 md:mb-7">Instagram, WhatsApp интеграции.</p>
                  
                  <div className="flex gap-2 md:gap-3 lg:gap-4 mb-3 sm:mb-4 md:mb-6">
                    <div className="flex-1 bg-[#1a1a1a] rounded-lg p-2 md:p-3 lg:p-4 border border-white/5 flex items-center gap-2 md:gap-3">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 rounded-full bg-green-500 flex-shrink-0" />
                      <div className="w-full space-y-1 md:space-y-1.5 lg:space-y-2">
                        <div className="h-1 sm:h-1.5 md:h-2 w-8 sm:w-10 md:w-12 lg:w-16 bg-white/20 rounded-full" />
                        <div className="h-1 sm:h-1.5 md:h-2 w-16 sm:w-20 md:w-24 lg:w-32 bg-[#00FF94]/20 rounded-full" />
                      </div>
                    </div>
                    <div className="flex-1 bg-[#1a1a1a] rounded-lg p-2 md:p-3 lg:p-4 border border-white/5 flex items-center gap-2 md:gap-3">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 rounded-full bg-gradient-to-tr from-purple-500 to-orange-500 flex-shrink-0" />
                      <div className="w-full space-y-1 md:space-y-1.5 lg:space-y-2">
                        <div className="h-1 sm:h-1.5 md:h-2 w-8 sm:w-10 md:w-12 lg:w-16 bg-white/20 rounded-full" />
                        <div className="h-1 sm:h-1.5 md:h-2 w-16 sm:w-20 md:w-24 lg:w-32 bg-white/10 rounded-full" />
                      </div>
                    </div>
                  </div>

                  <div className="relative w-full aspect-video bg-black/40 rounded-lg border border-white/10 overflow-hidden shadow-lg group-hover:border-[#00FF94]/30 transition-colors">
                    <img 
                      src="https://xikaiavwqinamgolmtcy.supabase.co/storage/v1/object/public/gif%20public/2%20module.gif" 
                      alt="GPT Bot Preview" 
                      className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500"
                    />
                    <div className="absolute inset-0 pointer-events-none border border-white/5 rounded-lg z-20" />
                    <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 md:bottom-3 md:right-3 z-20">
                      <span className="text-[6px] sm:text-[8px] md:text-[10px] lg:text-xs font-mono text-[#00FF94] bg-black/80 px-1 sm:px-2 py-0.5 sm:py-1 rounded backdrop-blur-sm">ПРЕВЬЮ 16:9</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Day 3 - RESPONSIVE */}
            <div className="glass-panel p-2 rounded-2xl md:rounded-3xl group transition-all duration-500 hover:-translate-y-2 md:hover:-translate-y-3 lg:hover:-translate-y-4 h-full flex flex-col">
              <div className="bg-[#0A0A0A]/50 rounded-xl md:rounded-2xl p-6 sm:p-8 md:p-10 lg:p-12 xl:p-14 relative overflow-hidden flex-1 flex flex-col">
                <div className="absolute top-0 right-0 p-2 sm:p-4 md:p-6 lg:p-8 font-display font-bold text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl text-white/5 group-hover:text-[#00FF94]/10 transition-colors">03</div>
                <div className="relative z-10">
                  <h3 className="font-bold text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl mb-3 md:mb-4 lg:mb-5 text-white">Практика: создание вирусных Reels</h3>
                  <p className="font-display font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl text-transparent bg-clip-text bg-gradient-to-r from-[#00FF94] to-white mb-3 md:mb-4 flex items-center gap-2 md:gap-3 whitespace-nowrap">
                    100 000
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 text-[#00FF94]">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </p>
                  <p className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-400 uppercase tracking-widest mb-4 sm:mb-5 md:mb-7">создание сценария, видео, монтаж</p>
                  
                  <div className="relative w-full aspect-video bg-black/40 rounded-lg border border-white/10 overflow-hidden shadow-lg group-hover:border-[#00FF94]/30 transition-colors">
                    <img 
                      src="https://xikaiavwqinamgolmtcy.supabase.co/storage/v1/object/public/gif%20public/1%20module.gif" 
                      alt="Viral Reels Preview" 
                      className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500"
                    />
                    <div className="absolute inset-0 pointer-events-none border border-white/5 rounded-lg z-20" />
                    <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 md:bottom-3 md:right-3 z-20">
                      <span className="text-[6px] sm:text-[8px] md:text-[10px] lg:text-xs font-mono text-[#00FF94] bg-black/80 px-1 sm:px-2 py-0.5 sm:py-1 rounded backdrop-blur-sm">ПРЕВЬЮ 16:9</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* LIVE EVENT - RESPONSIVE */}
        <section className="mb-16 sm:mb-20 md:mb-24 lg:mb-32 xl:mb-40 relative">
          <div className="absolute -left-10 md:-left-20 lg:-left-32 top-12 sm:top-16 md:top-20 lg:top-32 font-display font-bold text-6xl sm:text-8xl md:text-9xl lg:text-[12rem] xl:text-[15rem] text-white/[0.02] -rotate-90 pointer-events-none whitespace-nowrap">ПРЯМОЙ ЭФИР</div>

          <div className="border-2 md:border-4 border-white/10 p-1 relative">
            <div className="absolute -top-1 -left-1 w-4 h-4 md:w-6 md:h-6 lg:w-8 lg:h-8 border-t-2 md:border-t-4 border-l-2 md:border-l-4 border-[#00FF94]" />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 md:w-6 md:h-6 lg:w-8 lg:h-8 border-b-2 md:border-b-4 border-r-2 md:border-r-4 border-[#00FF94]" />

            <div className="bg-[#0A0A0A] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />

              <div className="relative p-4 sm:p-6 md:p-8 lg:p-12 xl:p-16 pt-6 sm:pt-8 md:pt-12 lg:pt-16">
                <div className="inline-flex items-center gap-2 md:gap-3 bg-red-600 text-white px-2 sm:px-3 md:px-4 lg:px-5 py-1 md:py-1.5 lg:py-2 font-bold text-[10px] sm:text-xs md:text-sm lg:text-base uppercase tracking-wider mb-4 sm:mb-6 md:mb-8 lg:mb-10 animate-pulse">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 md:w-3 md:h-3 bg-white rounded-full" /> В ЭФИРЕ
                </div>

                <h3 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl uppercase leading-tight mb-3 md:mb-4 lg:mb-5">Финал: прямой эфир<br />с основателями</h3>

                <div className="bg-white/5 border-l-2 md:border-l-4 border-[#00FF94] p-3 sm:p-4 md:p-6 lg:p-8 mb-6 sm:mb-8 md:mb-10 lg:mb-12 backdrop-blur-sm">
                  <p className="font-bold text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl leading-tight mb-2 md:mb-3">Как создать платформу стоимостью <span className="text-[#00FF94]" style={{ whiteSpace: 'nowrap' }}>10 000$</span></p>
                  <p className="text-[10px] sm:text-xs md:text-sm lg:text-base text-gray-500 font-mono">БЕЗ НАВЫКОВ ПРОГРАММИРОВАНИЯ</p>
                </div>

                <div className="flex items-center gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8 md:mb-10 lg:mb-12">
                  <div className="flex -space-x-3 sm:-space-x-4">
                    <div 
                      className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-full border-2 md:border-4 border-black grayscale hover:grayscale-0 transition-all bg-cover bg-center" 
                      style={{ backgroundImage: 'url(https://xikaiavwqinamgolmtcy.supabase.co/storage/v1/object/public/photo/571208939_18539870887011244_6995202681130936645_n%201.png)' }}
                    />
                    <div 
                      className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-full border-2 md:border-4 border-black grayscale hover:grayscale-0 transition-all bg-cover bg-center" 
                      style={{ backgroundImage: 'url(https://xikaiavwqinamgolmtcy.supabase.co/storage/v1/object/public/photo/532424689_17922110877102671_5546030545350934052_n%201.png)' }}
                    />
                  </div>
                  <div className="font-mono text-[10px] sm:text-xs md:text-sm lg:text-base text-[#00FF94] animate-pulse">/// ОЖИДАНИЕ НАЧАЛА</div>
                </div>

                <button 
                  onClick={() => setIsFormOpen(true)}
                  className="w-full border md:border-2 border-white text-white py-3 sm:py-4 md:py-5 lg:py-6 xl:py-8 font-bold hover:bg-white hover:text-black transition-colors uppercase tracking-widest text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl"
                >
                  Занять место
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* LIMITED SLOTS - RESPONSIVE */}
        <section className="mb-16 sm:mb-20 md:mb-24 lg:mb-32 xl:mb-40">
          <div className="flex justify-between items-baseline mb-2 md:mb-3 lg:mb-4">
            <h2 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl uppercase">Всего 100 мест</h2>
            <span className="font-mono text-[#00FF94] text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-bold">{slotsCount.toString().padStart(3, '0')}/100</span>
          </div>
          
          <div className="h-6 sm:h-8 md:h-10 lg:h-12 xl:h-16 w-full bg-[#111] border md:border-2 border-white/10 p-0.5 sm:p-1 md:p-1.5 skew-x-[-10deg]">
            <div 
              className="h-full bg-[#00FF94] relative overflow-hidden group transition-all duration-700 ease-out"
              style={{ width: `${slotsCount}%` }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(0,0,0,0.2)_25%,rgba(0,0,0,0.2)_50%,transparent_50%,transparent_75%,rgba(0,0,0,0.2)_75%,rgba(0,0,0,0.2)_100%)] bg-[length:10px_10px] md:bg-[length:15px_15px] lg:bg-[length:20px_20px]" />
              <div className="absolute right-0 top-0 bottom-0 w-1 sm:w-2 md:w-3 bg-white/50 animate-pulse" />
            </div>
          </div>
          <div className="flex justify-end items-center mt-2 md:mt-3 lg:mt-4">
            <p className={`text-[8px] sm:text-[10px] md:text-xs lg:text-sm font-mono animate-pulse ${slotsStatus.includes('CLOSING') ? 'text-red-500' : 'text-[#00FF94]'}`}>{slotsStatus}</p>
          </div>
        </section>

        {/* TRUST INFO - RESPONSIVE */}
        <section className="mb-16 sm:mb-20 md:mb-24 lg:mb-32 xl:mb-40">
          <h2 className="font-mono text-[10px] sm:text-xs md:text-sm lg:text-base text-gray-500 mb-4 sm:mb-6 md:mb-8 uppercase tracking-[0.2em] border-b border-white/5 pb-2 md:pb-3 lg:pb-4">Доступ к базе данных: onAI</h2>
          
          <div className="grid grid-cols-2 gap-px bg-white/10 border md:border-2 border-white/10">
            <div className="bg-black p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12 group hover:bg-white/5 transition-colors">
              <div className="font-display font-bold text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl text-white mb-1 sm:mb-2 md:mb-3 group-hover:text-[#00FF94] transition-colors">1000+</div>
              <div className="text-[8px] sm:text-[10px] md:text-xs lg:text-sm text-gray-400 font-mono uppercase">учеников по СНГ</div>
            </div>
            <div className="bg-black p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12 group hover:bg-white/5 transition-colors">
              <div className="font-display font-bold text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl text-white mb-1 sm:mb-2 md:mb-3 group-hover:text-[#00FF94] transition-colors">100+</div>
              <div className="text-[8px] sm:text-[10px] md:text-xs lg:text-sm text-gray-400 font-mono uppercase">успешных кейсов</div>
            </div>
            <div className="bg-black p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12 group hover:bg-white/5 transition-colors">
              <div className="font-display font-bold text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl text-white mb-1 sm:mb-2 md:mb-3 group-hover:text-[#00FF94] transition-colors">20+</div>
              <div className="text-[8px] sm:text-[10px] md:text-xs lg:text-sm text-gray-400 font-mono uppercase">человек в команде</div>
            </div>
            <div className="bg-black p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12 group hover:bg-white/5 transition-colors">
              <div className="font-display font-bold text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl text-[#00FF94] mb-1 sm:mb-2 md:mb-3">2024</div>
              <div className="text-[8px] sm:text-[10px] md:text-xs lg:text-sm text-gray-400 font-mono uppercase">год основания академии</div>
            </div>
          </div>
        </section>

        {/* CASES SCROLL - RESPONSIVE */}
        <section className="mb-20 sm:mb-24 md:mb-32 lg:mb-40 xl:mb-48">
          <h2 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl uppercase mb-7 sm:mb-9 md:mb-14 lg:mb-18">Часть наших<br />кейсов</h2>
          
          <div className="overflow-x-auto pb-6 sm:pb-8 md:pb-12 -mx-4 px-4 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8 scrollbar-hide flex gap-3 sm:gap-4 md:gap-6 lg:gap-8">
            {[
              { name: 'Жамбыл', role: 'Художник', income: '+3900$', text: '"За 2 месяца продал 6 GPT ботов со средним чеком 650$"', imageUrl: 'https://static.tildacdn.com/tild6236-6139-4030-a135-613562666461/noroot.png' },
              { name: 'Алишер', role: 'Безработный', income: '+4800$', text: '"Выиграл тендер на создание бота, продал еще двум частным компаниям"', imageUrl: 'https://static.tildacdn.com/tild3935-3564-4835-a234-616363376638/_1.png' },
              { name: 'Раимжан', role: 'Студент', income: '+9600$', text: '"6 месяцев активно продавал ботов параллельно с учебой"', imageUrl: 'https://static.tildacdn.com/tild3161-6266-4936-b237-643266626631/_5.png' },
              { name: 'Жанара', role: 'Таргетолог', income: '+700$', text: '"Нашла клиента среди текущих проектов"', imageUrl: 'https://static.tildacdn.com/tild6331-3033-4434-b439-346335643038/_2.png' },
              { name: 'Еркежан', role: 'Мама в декрете', income: '+900$', text: '"Нашла клиента среди рассылок"', imageUrl: 'https://static.tildacdn.com/tild3738-3439-4232-b635-326466653434/image_2025-05-28_17-.png' },
              { name: 'Никита', role: 'Наемный сотрудник', income: '+800$', text: '"Нашел клиента среди рассылок"', imageUrl: 'https://static.tildacdn.com/tild6565-6431-4830-b830-326362383162/_10.png' },
              { name: 'Артур', role: 'Таргетолог', income: '+350$', text: '"Нашел клиента в таргете, ежемесячно получает с него +250$ за обслуживание"', imageUrl: 'https://static.tildacdn.com/tild6637-3435-4936-a337-663766346536/_3.png' },
              { name: 'Александр', role: 'Наемный сотрудник', income: '+800$', text: '"Нашел клиента среди рассылок"', imageUrl: 'https://static.tildacdn.com/tild3837-3638-4362-a639-343534336233/image.png' },
              { name: 'Нургуль', role: 'Госслужащая', income: '+650$', text: '"Нашла клиента в таргете"', imageUrl: 'https://static.tildacdn.com/tild3966-3062-4233-b366-643136356266/noroot.png' },
              { name: 'Одиссей', role: 'Фрилансер', income: '+1900$', text: '"Нашел клиента среди текущих проектов, купил со второй продажи новый MacBook"', imageUrl: 'https://static.tildacdn.com/tild3431-3032-4965-b034-343537373530/_6.png' },
            ].map((case_item, idx) => (
              <div key={idx} className="min-w-[85vw] sm:min-w-[70vw] md:min-w-[45vw] lg:min-w-[30vw] xl:min-w-[25vw] 2xl:min-w-[20vw] bg-[#0A0A0A] border md:border-2 border-white/10 p-4 sm:p-6 md:p-8 lg:p-10 relative">
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 md:top-6 md:right-6 text-[#00FF94] font-mono text-[10px] sm:text-xs md:text-sm lg:text-base">{case_item.income}</div>
                <div className="flex items-center gap-3 sm:gap-4 md:gap-5 mb-3 sm:mb-4 md:mb-6">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-16 lg:h-16 bg-gray-800 rounded-full flex-shrink-0" />
                  <div>
                    <div className="font-bold text-sm sm:text-base md:text-lg lg:text-xl">{case_item.name}</div>
                    <div className="text-[10px] sm:text-xs md:text-sm text-gray-500 uppercase">{case_item.role}</div>
                  </div>
                </div>
                <div className="w-full aspect-square bg-black/50 rounded md:rounded-lg border border-white/5 mb-3 sm:mb-4 md:mb-6 relative overflow-hidden">
                  {case_item.imageUrl ? (
                    <img 
                      src={case_item.imageUrl}
                      alt={`Отзыв ${case_item.name}`}
                      className="w-full h-full object-cover object-center"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-gray-700 font-mono text-[10px] sm:text-xs md:text-sm">[ПРОВЕРЕННЫЕ ДАННЫЕ]</span>
                    </div>
                  )}
                </div>
                <p className="font-mono text-[10px] sm:text-xs md:text-sm lg:text-base text-gray-400 leading-relaxed border-l-2 md:border-l-4 border-[#00FF94] pl-2 sm:pl-3 md:pl-4">
                  {case_item.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* FOOTER LINKS - RESPONSIVE */}
        <section className="mb-8 sm:mb-10 md:mb-16 text-center">
          <div className="font-mono text-[10px] sm:text-xs md:text-sm lg:text-base space-x-4 sm:space-x-6 md:space-x-8">
            <a href="#" className="text-gray-600 hover:text-[#00FF94] transition-colors uppercase">Публичная оферта</a>
            <a href="#" className="text-gray-600 hover:text-[#00FF94] transition-colors uppercase">Политика конфиденциальности</a>
          </div>
        </section>
      </main>

      {/* FOOTER CTA (STICKY) - RESPONSIVE */}
      <div className="fixed bottom-0 left-0 w-full z-40 bg-black/90 backdrop-blur-lg border-t-2 md:border-t-4 border-white/10 p-5 sm:p-6 md:p-8 lg:p-10 xl:p-12 pb-6 sm:pb-8 md:pb-10 lg:pb-12">
        <div className="max-w-md md:max-w-3xl lg:max-w-5xl xl:max-w-7xl 2xl:max-w-[1920px] mx-auto flex gap-4 sm:gap-5 md:gap-8 lg:gap-10 items-center">
          <div className="flex-shrink-0">
            <div className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl text-gray-400 uppercase font-mono whitespace-nowrap">Стоимость</div>
            <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-bold text-white whitespace-nowrap">10$</div>
          </div>
          <button 
            onClick={() => setIsFormOpen(true)}
            className="flex-1 bg-[#00FF94] text-black font-display font-bold uppercase py-5 sm:py-6 md:py-7 lg:py-8 xl:py-10 hover:bg-white transition-colors shadow-[0_0_20px_rgba(0,255,148,0.4)] md:shadow-[0_0_30px_rgba(0,255,148,0.5)] text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl tracking-widest"
          >
            ЗАНЯТЬ МЕСТО
          </button>
        </div>
        <div className="max-w-md md:max-w-3xl lg:max-w-5xl xl:max-w-7xl 2xl:max-w-[1920px] mx-auto mt-2 sm:mt-3 md:mt-4 px-1">
          <div className="flex flex-col md:flex-row items-center justify-between gap-2 md:gap-3">
            <p className="text-[6px] sm:text-[7px] md:text-[8px] lg:text-[9px] text-gray-700 font-mono uppercase text-center md:text-left opacity-40">
              onAI Academy © {new Date().getFullYear()}. Все права защищены
            </p>
            <div className="flex items-center gap-1 md:gap-1.5">
              <span className="text-[6px] sm:text-[7px] md:text-[8px] lg:text-[9px] text-gray-800 font-['JetBrains_Mono'] uppercase tracking-wider opacity-30">
                Версия:
              </span>
              <span className="font-['JetBrains_Mono'] text-[6px] sm:text-[8px] md:text-[9px] lg:text-[10px] font-bold text-[#00FF88] bg-[#00FF88]/5 px-1 md:px-1.5 py-0.5 rounded border border-[#00FF88]/10 opacity-50">
                v1.10.00
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Facebook Pixel */}
      {pixelConfig && <FacebookPixel pixelConfig={pixelConfig} />}

      {/* Checkout Form Modal */}
      <CheckoutForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        source="twland"
        campaignSlug={campaignSlug}
      />
    </div>
  );
}
