import { Download, CheckCircle, Lock, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TripwireUserProfile, TripwireCertificate } from '@/lib/tripwire-utils';
import { CertificatePreview } from './CertificatePreview';
import { useState, useEffect } from 'react';

interface CertificateSectionProps {
  profile: TripwireUserProfile;
  certificate: TripwireCertificate | null;
  onGenerateCertificate: () => Promise<void>;
}

/**
 * 🎓 CERTIFICATE SECTION - FINAL REDESIGN 3.0
 * - Использование точного SVG из техзадания
 * - Полный перевод
 * - Точный копирайтинг
 */
export default function CertificateSection({ profile, certificate, onGenerateCertificate }: CertificateSectionProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(certificate?.pdf_url || null);
  const [showUnlockAnimation, setShowUnlockAnimation] = useState(false);

  const data = {
    certificate_issued: profile.certificate_issued,
    modules_completed: profile.modules_completed,
    total_modules: profile.total_modules,
    name: profile.full_name || 'ИМЯ ФАМИЛИЯ',
    certificate_issued_at: profile.certificate_issued_at
  };

  // ✅ Сертификат показывается ТОЛЬКО когда ВСЕ 3 модуля завершены!
  const isEligibleForCertificate = data.modules_completed >= 3;
  const isIssued = data.certificate_issued && isEligibleForCertificate;
  const progress = data.total_modules > 0 ? (data.modules_completed / data.total_modules) * 100 : 0;

  // 🎯 ОТСЛЕЖИВАЕМ РАЗБЛОКИРОВКУ СЕРТИФИКАТА
  useEffect(() => {
    const wasLocked = localStorage.getItem('certificate_was_locked') === 'true';
    
    if (isEligibleForCertificate && wasLocked) {
      console.log('🎉 [Certificate] РАЗБЛОКИРОВАН! Показываем анимацию...');
      setShowUnlockAnimation(true);
      localStorage.removeItem('certificate_was_locked');
      
      // Скрываем анимацию через 3 секунды
      setTimeout(() => {
        setShowUnlockAnimation(false);
      }, 3000);
    } else if (!isEligibleForCertificate) {
      // Сохраняем что сертификат был заблокирован
      localStorage.setItem('certificate_was_locked', 'true');
    }
  }, [isEligibleForCertificate]);

  // 🎯 ОБНОВЛЯЕМ PDF URL КОГДА CERTIFICATE ИЗМЕНЯЕТСЯ
  useEffect(() => {
    if (certificate?.pdf_url) {
      console.log('✅ [Certificate] Обновлен PDF URL:', certificate.pdf_url);
      setPdfUrl(certificate.pdf_url);
    }
  }, [certificate]);

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    setGenerationStep('Создаем ваш сертификат...');
    
    try {
      // Задержка для UI
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setGenerationStep('Подписываем ваш сертификат...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Вызываем API генерации
      await onGenerateCertificate();
      
      setGenerationStep('Готово!');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // НЕ перезагружаем - пусть onGenerateCertificate сам обновит данные
      setIsGenerating(false);
      setGenerationStep('');
    } catch (error: any) {
      console.error('❌ Error generating certificate:', error);
      setGenerationStep(`Ошибка: ${error.message || 'Не удалось создать сертификат'}`);
      
      // Держим ошибку 3 секунды
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  const handleDownload = () => {
    // Скачиваем PDF напрямую если есть ссылка
    if (certificate?.pdf_url) {
      const link = document.createElement('a');
      link.href = certificate.pdf_url;
      link.download = `Certificate-${profile.full_name || 'Student'}.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Фоллбэк - открываем страницу сертификата
      const certificateNumber = certificate?.certificate_number || `TW-${profile.full_name?.split(' ')[0] || 'USER'}-${Date.now().toString().slice(-6)}`;
      window.open(`/tripwire/certificate/${certificateNumber}`, '_blank');
    }
  };

  return (
    <div className="relative">
      {/* 🎉 АНИМАЦИЯ РАЗБЛОКИРОВКИ */}
      <AnimatePresence>
        {showUnlockAnimation && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-3xl"
          >
            <motion.div
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              className="text-center space-y-4"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 360, 0]
                }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-20 h-20 mx-auto bg-[#00FF94] rounded-full flex items-center justify-center"
              >
                <CheckCircle className="w-10 h-10 text-black" />
              </motion.div>
              <div>
                <h3 className="text-2xl font-bold text-white font-['Space_Grotesk'] mb-2">
                  СЕРТИФИКАТ РАЗБЛОКИРОВАН!
                </h3>
                <p className="text-[#9CA3AF] font-['JetBrains_Mono'] text-sm">
                  Вы завершили все модули 🎉
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Outer glow - только для issued */}
      {isIssued && (
        <div className="absolute -inset-8 bg-gradient-to-br from-[#00FF94]/10 to-transparent rounded-3xl blur-3xl" />
      )}

      <div className="relative bg-[#0A0A0A]/95 border border-white/5 rounded-3xl overflow-hidden">
        {/* Header */}
        <div className="p-8 border-b border-white/5">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-white font-['Space_Grotesk'] uppercase tracking-wider">
                СЕРТИФИКАТ
              </h2>
              <p className="text-sm text-[#9CA3AF] font-['JetBrains_Mono'] uppercase">
                {isIssued 
                  ? '/// СЕРТИФИКАТ УСПЕШНО ВЫДАН' 
                  : '/// ЗАВЕРШИТЕ ВСЕ МОДУЛИ ДЛЯ ПОЛУЧЕНИЯ'
                }
              </p>
            </div>
          </div>
        </div>

        <div className="p-8">
          {isIssued ? (
            // === СЕРТИФИКАТ ВЫДАН - МОЖНО СКАЧАТЬ ===
            <div className="space-y-8">
              <CertificatePreview 
                profile={profile}
                isLocked={false}
                certificateNumber={certificate?.certificate_number}
                issuedAt={certificate?.issued_at}
              />

              <button 
                onClick={handleDownload}
                disabled={isGenerating}
                className="w-full h-14 bg-[#00FF94] text-black hover:bg-[#00CC6A] 
                           font-bold font-['JetBrains_Mono'] uppercase tracking-wider
                           rounded-xl transition-all duration-300 flex items-center justify-center gap-3
                           shadow-[0_0_30px_rgba(0,255,148,0.3)] disabled:opacity-50"
              >
                <Download className="w-5 h-5" />
                <span>СКАЧАТЬ СЕРТИФИКАТ</span>
              </button>
            </div>
          ) : isEligibleForCertificate ? (
            // === ВСЕ МОДУЛИ ЗАВЕРШЕНЫ - МОЖНО СГЕНЕРИРОВАТЬ ===
            <div className="space-y-8">
              <CertificatePreview 
                profile={profile}
                isLocked={false}
              />

              <div className="space-y-4">
                <button 
                  onClick={handleGeneratePDF}
                  disabled={isGenerating}
                  className="w-full h-14 bg-[#00FF94] text-black hover:bg-[#00CC6A] 
                             font-bold font-['JetBrains_Mono'] uppercase tracking-wider
                             rounded-xl transition-all duration-300 flex items-center justify-center gap-3
                             shadow-[0_0_30px_rgba(0,255,148,0.3)] disabled:opacity-70"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>ГЕНЕРИРУЕМ...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      <span>СГЕНЕРИРОВАТЬ СЕРТИФИКАТ</span>
                    </>
                  )}
                </button>

                {isGenerating && generationStep && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                  >
                    <p className="text-[#00FF94] text-sm font-['JetBrains_Mono'] uppercase tracking-wider">
                      {generationStep}
                    </p>
                  </motion.div>
                )}
              </div>
            </div>
          ) : (
            // === НЕ ВСЕ МОДУЛИ ЗАВЕРШЕНЫ - ЗАБЛОКИРОВАНО ===
            <div className="space-y-6">
              <CertificatePreview 
                profile={profile}
                isLocked={true}
              />

              <div className="text-center">
                <p className="text-sm text-gray-500 font-['JetBrains_Mono'] uppercase mb-2">
                  /// ПРОГРЕСС ДО СЕРТИФИКАТА
                </p>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-3xl font-bold text-white font-['Space_Grotesk']">
                    {profile.modules_completed}
                  </span>
                  <span className="text-xl text-gray-600">/</span>
                  <span className="text-3xl font-bold text-gray-600 font-['Space_Grotesk']">
                    {profile.total_modules}
                  </span>
                  <span className="text-sm text-gray-500 ml-2 font-['Manrope']">
                    модулей завершено
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
