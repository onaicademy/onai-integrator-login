import { Download, CheckCircle, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { TripwireUserProfile, TripwireCertificate } from '@/lib/tripwire-utils';
import { CertificatePreview } from './CertificatePreview';

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
  const data = {
    certificate_issued: profile.certificate_issued,
    modules_completed: profile.modules_completed,
    total_modules: profile.total_modules,
    name: profile.full_name || 'ИМЯ ФАМИЛИЯ',
    certificate_issued_at: profile.certificate_issued_at
  };

  const isIssued = data.certificate_issued;
  // Для демо - прогресс, в реальности isIssued решает
  const progress = data.total_modules > 0 ? (data.modules_completed / data.total_modules) * 100 : 0;

  const handleDownload = () => {
    // Открываем страницу сертификата и автоматически запускаем print dialog
    const certificateWindow = window.open(
      `/tripwire/certificate/${certificate?.certificate_number}`, 
      '_blank'
    );
    
    // Ждем загрузки страницы и автоматически открываем диалог печати
    if (certificateWindow) {
      certificateWindow.addEventListener('load', () => {
        setTimeout(() => {
          certificateWindow.print();
        }, 500);
      });
    }
  };

  return (
    <div className="relative">
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
            // === ISSUED STATE ===
            <div className="space-y-8">
              {/* Certificate Preview - Используем новый компонент */}
              <CertificatePreview 
                profile={profile}
                isLocked={false}
                certificateNumber={certificate?.certificate_number}
                issuedAt={certificate?.issued_at}
              />

              {/* Download Button */}
              <button 
                onClick={handleDownload}
                className="w-full h-14 bg-[#00FF94] text-black hover:bg-[#00CC6A] 
                           font-bold font-['JetBrains_Mono'] uppercase tracking-wider
                           rounded-xl transition-all duration-300 flex items-center justify-center gap-3
                           shadow-[0_0_30px_rgba(0,255,148,0.3)]"
              >
                <Download className="w-5 h-5" />
                <span>СКАЧАТЬ СЕРТИФИКАТ</span>
              </button>
            </div>
          ) : (
            // === LOCKED STATE === (Заблюренное превью с именем/фамилией)
            <div className="space-y-6">
              {/* Certificate Preview with Lock Overlay */}
              <CertificatePreview 
                profile={profile}
                isLocked={true}
              />

              {/* Progress Info */}
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
