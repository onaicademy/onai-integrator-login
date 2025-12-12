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
 * - Реальный прогресс-бар генерации
 */
export default function CertificateSection({ profile, certificate, onGenerateCertificate }: CertificateSectionProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0); // 0-100
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
  
  // 🎯 КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: проверяем наличие PDF URL, а не флаг certificate_issued
  const hasPdfUrl = !!pdfUrl || !!certificate?.pdf_url;
  const isIssued = hasPdfUrl && isEligibleForCertificate;
  
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
    setGenerationProgress(0);
    setGenerationStep('Инициализация...');
    
    try {
      // 🔥 SSE: Реальный прогресс с бэкенда
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.onai.academy';
      const token = localStorage.getItem('tripwire_supabase_token');

      console.log('🚀 [SSE] Starting certificate generation...');

      const response = await fetch(`${API_URL}/api/tripwire/certificates/issue-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          user_id: profile.user_id || (window as any).currentUserId, // fallback
          full_name: profile.full_name,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}: Ошибка соединения`);
      }

      // Читаем SSE поток
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        
        if (!value) continue;

        const chunkValue = decoder.decode(value);
        
        // Парсим SSE формат "data: {...}\n\n"
        const lines = chunkValue.split('\n\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.replace('data: ', '').trim();
            
            try {
              const data = JSON.parse(jsonStr);
              
              console.log('📊 [SSE] Progress:', data);
              
              // Обновляем UI
              setGenerationProgress(data.progress);
              setGenerationStep(data.message);

              // Завершено
              if (data.progress === 100 && data.data?.pdfUrl) {
                console.log('✅ [SSE] Certificate ready:', data.data.pdfUrl);
                setPdfUrl(data.data.pdfUrl);
      
                // Перезагружаем профиль чтобы обновить UI
                await onGenerateCertificate();
      
                // Показываем успех еще 1 секунду
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
              
              // Ошибка
              if (data.data?.error) {
                throw new Error(data.data.error);
              }
            } catch (e) {
              // ✅ FIX: Логируем только валидные ошибки парсинга
              if (e instanceof SyntaxError && jsonStr.length > 10) {
                console.debug('🔍 [SSE] JSON fragment skipped');
              } else if (!(e instanceof SyntaxError)) {
                console.error('❌ [SSE] Unexpected error:', e);
              }
            }
          }
        }
      }

      console.log('✅ [SSE] Stream completed');
      
      // Сброс UI
      setIsGenerating(false);
      setGenerationProgress(0);
      setGenerationStep('');

    } catch (error: any) {
      console.error('❌ [SSE] Error:', error);
      setGenerationStep(`Ошибка: ${error.message || 'Не удалось создать сертификат'}`);
      setGenerationProgress(0);
      
      // Держим ошибку 3 секунды
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  const handleDownload = () => {
    // ✅ ТОЛЬКО ПРЯМОЕ СКАЧИВАНИЕ, БЕЗ РЕДИРЕКТОВ!
    const urlToDownload = pdfUrl || certificate?.pdf_url;
    
    if (urlToDownload) {
      console.log('📥 Скачиваем сертификат:', urlToDownload);
      
      const link = document.createElement('a');
      link.href = urlToDownload;
      link.download = `Certificate-${profile.full_name || 'Student'}.pdf`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      console.error('❌ PDF URL не найден в сертификате');
      alert('Ошибка: PDF сертификата не найден. Попробуйте сгенерировать заново.');
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
                <h3 className="text-2xl font-bold text-white font-['JetBrains_Mono'] mb-2">
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
              <h2 className="text-3xl font-bold text-white font-['JetBrains_Mono'] uppercase tracking-wider">
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
            // === СОСТОЯНИЕ 3: PDF СГЕНЕРИРОВАН - МОЖНО СКАЧАТЬ ===
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
            // === СОСТОЯНИЕ 1: 100% ЗАВЕРШЕНО, НО PDF ЕЩЕ НЕТ - МОЖНО ПОЛУЧИТЬ ===
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
                      <CheckCircle className="w-5 h-5" />
                      <span>ПОЛУЧИТЬ СЕРТИФИКАТ</span>
                    </>
                  )}
                </button>

                {/* 🔥 СОСТОЯНИЕ 2: ПРОГРЕСС-БАР ГЕНЕРАЦИИ */}
                {isGenerating && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    {/* Прогресс-бар */}
                    <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#00FF94] to-[#00CC6A] rounded-full"
                        initial={{ width: '0%' }}
                        animate={{ width: `${generationProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                      {/* Глиттер эффект */}
                      <motion.div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-20"
                        animate={{
                          x: ['-100%', '400%'],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: 'linear',
                        }}
                      />
                    </div>
                    
                    {/* Текст статуса */}
                    <div className="flex items-center justify-between text-sm">
                      <p className="text-[#00FF94] font-['JetBrains_Mono'] uppercase tracking-wider">
                      {generationStep}
                    </p>
                      <p className="text-white font-['JetBrains_Mono'] font-bold">
                        {generationProgress}%
                      </p>
                    </div>
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
                  <span className="text-3xl font-bold text-white font-['JetBrains_Mono']">
                    {profile.modules_completed}
                  </span>
                  <span className="text-xl text-gray-600">/</span>
                  <span className="text-3xl font-bold text-gray-600 font-['JetBrains_Mono']">
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
