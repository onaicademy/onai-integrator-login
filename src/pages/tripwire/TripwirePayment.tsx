import { useEffect, useRef, useState } from 'react';

export default function TripwirePayment() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [countdown, setCountdown] = useState('--:--:--');

  // Countdown timer
  useEffect(() => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    
    function getNextTargetTime() {
      const now = new Date();
      const target = new Date(now);
      target.setDate(now.getDate() + (now.getHours() >= 17 ? 1 : 0));
      target.setHours(17, 0, 0, 0);
      if (target.getTime() <= now.getTime()) {
        target.setDate(target.getDate() + 1);
      }
      return target.getTime();
    }

    let targetTime = getNextTargetTime();

    function updateCountdown() {
      const now = new Date().getTime();
      let distance = targetTime - now;
      if (distance < 0) {
        targetTime = getNextTargetTime();
        distance = targetTime - now;
      }

      const hours = Math.floor(distance / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      setCountdown(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    let particles: Particle[] = [];
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement;
    const paymentMethod = submitter?.getAttribute('data-method');

    const name = (document.getElementById('name') as HTMLInputElement).value;
    const phone = (document.getElementById('phone') as HTMLInputElement).value;

    if (paymentMethod === 'kaspi') {
      console.log("Simulating redirect to KASPI Payment Gateway...");
      // TODO: Redirect to Kaspi payment
      alert('Перенаправление на KASPI...');
      return;
    }

    if (paymentMethod === 'card') {
      console.log("Simulating redirect to Card Payment System...");
      // TODO: Redirect to card payment
      alert('Перенаправление на оплату картой...');
      return;
    }

    if (paymentMethod === 'manager') {
      console.log(`Заявка менеджеру. Имя: ${name}, Телефон: ${phone}`);
      // TODO: Send to backend
      alert('Заказ принят! Ожидайте звонка от менеджера.');
      return;
    }
  };

  const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    let formattedValue = '';
    const mask = '+X (XXX) XXX-XX-XX';
    let maskIndex = 0;

    for (let i = 0; i < value.length && maskIndex < mask.length; i++) {
      if (i === 0 && value[i] !== undefined) {
        formattedValue += '+';
        maskIndex++;
      }
      while (maskIndex < mask.length && mask[maskIndex] !== 'X') {
        formattedValue += mask[maskIndex];
        maskIndex++;
      }
      if (maskIndex < mask.length) {
        formattedValue += value[i];
        maskIndex++;
      }
    }

    e.target.value = formattedValue;
  };

  return (
    <div className="min-h-screen bg-[#030303] text-white font-[Manrope] flex items-center justify-center overflow-x-hidden">
      <style>{`
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
        .bg-gradient-depth {
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          background-image: linear-gradient(to bottom, transparent, #030303 80%);
          z-index: -5;
          pointer-events: none;
        }
        .text-glow {
          text-shadow: 0 0 10px rgba(0, 255, 148, 0.4);
        }
      `}</style>

      {/* Background */}
      <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none opacity-60" />
      <div className="cyber-grid" />
      <div className="bg-gradient-depth" />

      {/* Main Content */}
      <main className="w-full max-w-md mx-auto p-3 sm:p-4 md:p-5 lg:p-6">
        <div className="bg-[#0A0A0A] border border-white/10 rounded shadow-lg shadow-[#00FF94]/10 p-4 sm:p-5 md:p-6 lg:p-8 relative z-10">
          {/* Header */}
          <div className="text-center mb-4 sm:mb-5 md:mb-6">
            <p className="font-mono text-[7px] sm:text-[8px] md:text-[9px] lg:text-[10px] text-gray-400 uppercase tracking-widest flex items-center justify-center gap-1 mb-1 flex-wrap sm:flex-nowrap">
              <span className="whitespace-nowrap">3-й поток самого кассового обучения</span>
              <span className="font-mono text-[#00FF94] animate-pulse text-[10px] sm:text-xs md:text-sm flex-shrink-0">$</span>
            </p>
            <h1 className="font-[SpaceGrotesk] text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-bold text-white mb-2 whitespace-nowrap">
              ОФОРМЛЕНИЕ ЗАКАЗА
            </h1>
            
            {/* Price Info */}
            <div className="space-y-2 sm:space-y-3">
              <div className="flex justify-between items-center bg-[#0A0A0A] p-2 sm:p-3 rounded-lg border border-white/5 font-mono text-[10px] sm:text-xs md:text-sm">
                <div className="text-gray-400 uppercase text-[7px] sm:text-[8px] md:text-[9px] lg:text-[10px]">Сумма</div>
                <div className="font-bold text-white text-xs sm:text-sm md:text-base lg:text-lg">
                  10$ <span className="text-gray-500 text-[10px] sm:text-xs md:text-sm">(5к₸)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <form id="checkout-form" className="space-y-3 sm:space-y-4" onSubmit={handleSubmit}>
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-[8px] sm:text-[9px] md:text-[10px] font-mono text-gray-400 uppercase mb-1.5 sm:mb-2">
                ИМЯ и ФАМИЛИЯ *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                placeholder="Ваше полное имя"
                className="w-full bg-[#161920] border border-[#333] text-white p-2.5 sm:p-3 md:p-3.5 text-xs sm:text-sm md:text-base rounded focus:outline-none focus:border-[#00FF94] focus:shadow-[0_0_10px_rgba(0,255,148,0.3)] focus:bg-[#0A0A0A] transition-all"
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-[8px] sm:text-[9px] md:text-[10px] font-mono text-gray-400 uppercase mb-1.5 sm:mb-2">
                НОМЕР ТЕЛЕФОНА *
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                required
                placeholder="+X (XXX) XXX-XX-XX"
                onInput={handlePhoneInput}
                className="w-full bg-[#161920] border border-[#333] text-white p-2.5 sm:p-3 md:p-3.5 text-xs sm:text-sm md:text-base rounded focus:outline-none focus:border-[#00FF94] focus:shadow-[0_0_10px_rgba(0,255,148,0.3)] focus:bg-[#0A0A0A] transition-all"
              />
            </div>

            {/* Payment Buttons */}
            <div className="flex flex-col gap-2 sm:gap-2.5 mb-4 sm:mb-6">
              {/* Kaspi */}
              <button
                type="submit"
                data-method="kaspi"
                className="w-full font-mono font-bold uppercase p-2.5 sm:p-3 md:p-3.5 text-[8px] sm:text-[9px] md:text-[10px] bg-[#E4002B] text-white shadow-[0_0_10px_rgba(228,0,43,0.5)] hover:scale-[1.01] hover:skew-x-[-1deg] hover:shadow-[0_0_15px_rgba(228,0,43,0.7)] transition-all cursor-pointer border-none skew-x-[-2deg] hover:skew-x-0"
              >
                <span className="flex items-center justify-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                    <line x1="12" y1="18" x2="12" y2="18"/>
                  </svg>
                  KASPI АВТООПЛАТА
                </span>
              </button>

              {/* Card */}
              <button
                type="submit"
                data-method="card"
                className="w-full font-mono font-bold uppercase p-2.5 sm:p-3 md:p-3.5 text-[8px] sm:text-[9px] md:text-[10px] bg-white text-black border border-[#333] hover:scale-[1.01] hover:skew-x-[-1deg] hover:shadow-[0_0_8px_rgba(255,255,255,0.4)] hover:bg-[#F0F0F0] transition-all cursor-pointer skew-x-[-2deg] hover:skew-x-0"
              >
                <span className="flex items-center justify-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                    <line x1="1" y1="10" x2="23" y2="10"/>
                  </svg>
                  БАНКОВСКАЯ КАРТА
                </span>
              </button>

              {/* Manager */}
              <button
                type="submit"
                data-method="manager"
                className="w-full font-mono font-bold uppercase p-2.5 sm:p-3 md:p-3.5 text-[8px] sm:text-[9px] md:text-[10px] bg-[#00FF94] text-black shadow-[0_0_15px_rgba(0,255,148,0.4)] hover:scale-[1.01] hover:skew-x-[-1deg] hover:shadow-[0_0_20px_rgba(0,255,148,0.6)] transition-all cursor-pointer border-none skew-x-[-2deg] hover:skew-x-0"
              >
                <span className="flex items-center justify-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  ОСТАЛИСЬ ВОПРОСЫ
                </span>
              </button>
            </div>

            {/* Timer */}
            <div className="mt-2 sm:mt-3 p-2 sm:p-2.5 md:p-3 rounded-xl border border-[#00FF94]/20 bg-[#0A0A0A]/80 flex flex-col sm:flex-row justify-between items-center gap-1.5 sm:gap-0">
              <span className="font-mono text-[8px] sm:text-[9px] md:text-[10px] lg:text-xs text-gray-400 uppercase tracking-widest flex-shrink-0 text-center sm:text-left sm:mr-2 md:mr-3">
                ДО СТАРТА ПОТОКА:
              </span>
              <span className="font-mono font-bold text-[#00FF94] text-xs sm:text-sm md:text-base lg:text-lg text-glow whitespace-nowrap">
                {countdown}
              </span>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

