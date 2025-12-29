import { useEffect, useState } from 'react';
import { tripwireSupabase } from '@/lib/supabase-tripwire'; // 🔥 Для Tripwire Auth И сертификатов
import { apiClient } from '@/utils/apiClient'; // ✅ API Client
import { Loader2 } from 'lucide-react';
import { 
  TripwireUserProfile, 
  TripwireAchievement, 
  TripwireCertificate,
  getPendingAchievement 
} from '@/lib/tripwire-utils';
import type { User } from '@supabase/supabase-js';

// Components
import ProfileHeader from './components/ProfileHeader';
import Achievements from './components/Achievements';
// ❌ УБРАНО: ModuleProgress (по запросу пользователя - "это лишнее")
import CertificateSection from './components/CertificateSection';
import AccountSettings from './components/AccountSettings';
import DigitalFireworks from './components/DigitalFireworks';
import AchievementModal from './components/achievements/AchievementModal';
import { MatrixRain } from '@/components/MatrixRain';
import { useToast } from '@/hooks/use-toast';

/**
 * 👤 TRIPWIRE PROFILE - CYBER ARCHITECTURE 3.0
 * Главная страница профиля пользователя Tripwire (Premium Redesign)
 */
export default function TripwireProfile() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<TripwireUserProfile | null>(null);
  const [achievements, setAchievements] = useState<TripwireAchievement[]>([]);
  const [certificate, setCertificate] = useState<TripwireCertificate | null>(null);

  // Achievement notification
  const [showFireworks, setShowFireworks] = useState(false);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [newAchievement, setNewAchievement] = useState<any>(null);
  
  // 🎮 EPIC ACHIEVEMENT UNLOCK QUEUE
  const [achievementQueue, setAchievementQueue] = useState<TripwireAchievement[]>([]);
  const [currentAchIndex, setCurrentAchIndex] = useState(0);

  // Загрузка данных
  useEffect(() => {
    // ✅ Получаем текущего пользователя из Tripwire Supabase
    const loadUser = async () => {
      console.log('🔍 TripwireProfile: Загружаем пользователя...');
      const { data: { user: currentUser }, error } = await tripwireSupabase.auth.getUser();
      
      if (error) {
        console.error('❌ TripwireProfile: Ошибка получения user:', error);
        setIsLoading(false);
        return;
      }

      if (currentUser && currentUser.email) {
        console.log('✅ TripwireProfile: Auth user найден:', currentUser.email);
        
        // ✅ CRITICAL FIX: Get users.id from tripwire_users table!
        const { data: tripwireUser } = await tripwireSupabase
          .from('tripwire_users')
          .select('id, user_id, email')
          .eq('email', currentUser.email)
          .single();
        
        if (tripwireUser?.user_id) {
          console.log('✅ TripwireProfile: Loaded users.id:', tripwireUser.user_id);
          // Override with the CORRECT users.id from main DB!
          setUser({
            ...currentUser,
            id: tripwireUser.user_id
          });
        } else {
          console.error('❌ TripwireProfile: tripwire_users record not found');
          setIsLoading(false);
        }
      } else {
        console.error('❌ TripwireProfile: Пользователь НЕ найден');
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadProfileData();
      checkPendingAchievement();
    }
  }, [user]);

  // 🎯 АВТОПРОВЕРКА ДОСТИЖЕНИЙ И СЕРТИФИКАТА
  useEffect(() => {
    // Проверяем при возврате на вкладку
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👀 [Profile] Вкладка стала видимой, проверяем достижения...');
        checkPendingAchievement();
        if (user) {
          loadProfileData(); // Обновляем данные профиля
        }
      }
    };

    // Интервальная проверка каждые 3 секунды
    const interval = setInterval(() => {
      checkPendingAchievement();
    }, 3000);

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  const checkPendingAchievement = () => {
    const pending = getPendingAchievement();
    if (pending) {
      console.log('🎉 [Profile] Найдено новое достижение:', pending);
      setNewAchievement(pending);
      setShowFireworks(true);
      setShowAchievementModal(true);
    }
  };

  // Оптимистичное обновление email
  const handleEmailUpdate = (newEmail: string) => {
    if (profile) {
      setProfile({
        ...profile,
        email: newEmail,
      });
    }
  };

  const loadProfileData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // 1. Получаем или создаем профиль (используем tripwireSupabase!)
      const { data: existingProfile, error: profileError } = await tripwireSupabase
        .from('tripwire_user_profile')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // 1.5. ✅ FIX: Получаем full_name из tripwire_users с лучшим fallback
      const { data: tripwireUserData, error: tripwireUserError } = await tripwireSupabase
        .from('tripwire_users')
        .select('full_name, email')
        .eq('user_id', user.id)
        .single();

      console.log('🔍 DEBUG: tripwireUserData:', tripwireUserData, 'error:', tripwireUserError, 'user.id:', user.id);
      
      // ✅ FIX: Безопасно получаем full_name
      const fullName = tripwireUserData?.full_name || 
                       user.user_metadata?.full_name || 
                       user.email?.split('@')[0] || 
                       'Студент OnAI';

      if (profileError && profileError.code === 'PGRST116') {
        // Профиль не существует - показываем дефолтный
        console.warn('⚠️ Profile not found, showing default profile');
        setProfile({
          user_id: user.id,
          modules_completed: 0,
          total_modules: 3,
          completion_percentage: 0,
          certificate_issued: false,
          certificate_url: null,
          full_name: fullName, // ✅ FIX: Используем безопасный fullName
          email: tripwireUserData?.email || user.email || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any);
      } else if (existingProfile) {
        setProfile({
          ...existingProfile,
          full_name: fullName, // ✅ FIX: Используем безопасный fullName
          email: tripwireUserData?.email || user.email || '',
        } as any);
      }

      // 2. Загружаем достижения (используем tripwireSupabase!)
      const { data: achievementsData } = await tripwireSupabase
        .from('user_achievements')  // ✅ ПРАВИЛЬНАЯ ТАБЛИЦА
        .select('*')
        .eq('user_id', user.id)
        .order('created_at');

      if (achievementsData) {
        setAchievements(achievementsData as any);
        
        // 🎮 Проверяем новые достижения для epic анимации
        const previousShownIds = JSON.parse(
          localStorage.getItem('shown_achievements_epic') || '[]'
        );
        
        const newUnlocked = (achievementsData as any[]).filter(
          (ach) => ach.is_completed && !previousShownIds.includes(ach.achievement_id)
        );
        
        if (newUnlocked.length > 0) {
          console.log('🎉 [Achievements] Новые достижения для epic анимации:', newUnlocked.map((a: any) => a.achievement_id));
          setAchievementQueue(newUnlocked);
          setCurrentAchIndex(0);
          
          // Конвертируем первое достижение для модального окна
          const firstAch = newUnlocked[0];
          setNewAchievement({
            id: firstAch.achievement_id,
            title: getAchievementTitle(firstAch.achievement_id),
            description: getAchievementDescription(firstAch.achievement_id),
            unlocked: true,
            unlockedAt: firstAch.completed_at,
            rarity: getAchievementRarity(firstAch.achievement_id),
            icon: 'trophy',
            iconify: getAchievementIcon(firstAch.achievement_id)
          });
          setShowAchievementModal(true);
        }
      }

      // 3. Сертификаты (используем Tripwire Supabase!)
      const { data: certificateData } = await tripwireSupabase
        .from('certificates')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(); // ✅ Возвращает null если сертификата нет (вместо 406)

      if (certificateData) {
        setCertificate(certificateData as any);
      }

      // 4. ✅ ПЕРЕСЧИТЫВАЕМ modules_completed из реального прогресса!
      // Считаем сколько модулей завершено по tripwire_progress
      const { data: completedModulesData } = await tripwireSupabase
        .from('tripwire_progress')
        .select('module_id, is_completed')
        .eq('tripwire_user_id', user.id)
        .eq('is_completed', true);

      // Группируем по module_id чтобы посчитать уникальные завершенные модули
      const completedModuleIds = new Set(completedModulesData?.map(p => p.module_id) || []);
      const modulesCompleted = completedModuleIds.size;
      const completionPercentage = Math.round((modulesCompleted / 3) * 100);

      console.log(`✅ Calculated: ${modulesCompleted}/3 modules completed (${completionPercentage}%)`);

      // ✅ CRITICAL FIX: Use existingProfile OR create new profile with calculated values
      const updatedProfile = existingProfile || {
        user_id: user.id,
        total_modules: 3,
        certificate_issued: false,
        certificate_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setProfile({
        ...updatedProfile,
        modules_completed: modulesCompleted,
        completion_percentage: completionPercentage,
      } as any);

    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные профиля",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 🎯 Хелперы для конвертации достижений
  const getAchievementTitle = (id: string) => {
    const titles: Record<string, string> = {
      'first_module_complete': 'ПУТЬ НАЙДЕН',
      'second_module_complete': 'AI ИНТЕГРАТОР',
      'third_module_complete': 'CREATOR'
    };
    return titles[id] || 'ДОСТИЖЕНИЕ';
  };

  const getAchievementDescription = (id: string) => {
    const descriptions: Record<string, string> = {
      'first_module_complete': 'Определено направление в AI',
      'second_module_complete': 'Создан первый GPT-бот',
      'third_module_complete': 'Освоено создание вирусных Reels'
    };
    return descriptions[id] || 'Разблокировано новое достижение';
  };

  const getAchievementRarity = (id: string): 'epic' | 'legendary' => {
    return id === 'third_module_complete' ? 'legendary' : 'epic';
  };

  const getAchievementIcon = (id: string) => {
    const icons: Record<string, string> = {
      'first_module_complete': 'fluent:target-arrow-24-filled',
      'second_module_complete': 'fluent:brain-circuit-24-filled',
      'third_module_complete': 'fluent:video-clip-24-filled'
    };
    return icons[id] || 'fluent:trophy-24-filled';
  };

  // 🎮 Обработка закрытия модального окна достижения
  const handleAchievementModalClose = () => {
    const currentAch = achievementQueue[currentAchIndex];
    if (currentAch) {
      // Сохраняем что показали это достижение
      const previousShown = JSON.parse(localStorage.getItem('shown_achievements_epic') || '[]');
      const updated = [...previousShown, currentAch.achievement_id];
      localStorage.setItem('shown_achievements_epic', JSON.stringify(updated));
    }
    
    // Переходим к следующему достижению или закрываем
    if (currentAchIndex < achievementQueue.length - 1) {
      const nextIndex = currentAchIndex + 1;
      setCurrentAchIndex(nextIndex);
      
      // Конвертируем следующее достижение
      const nextAch = achievementQueue[nextIndex];
      setNewAchievement({
        id: nextAch.achievement_id,
        title: getAchievementTitle(nextAch.achievement_id),
        description: getAchievementDescription(nextAch.achievement_id),
        unlocked: true,
        unlockedAt: nextAch.completed_at,
        rarity: getAchievementRarity(nextAch.achievement_id),
        icon: 'trophy',
        iconify: getAchievementIcon(nextAch.achievement_id)
      });
      // Модальное окно остается открытым
    } else {
      // Закрываем модальное окно
      setShowAchievementModal(false);
      setNewAchievement(null);
      setAchievementQueue([]);
      setCurrentAchIndex(0);
    }
  };

  const handleGenerateCertificate = async () => {
    if (!user || !profile) return;

    try {
      setIsLoading(true);
      
      console.log('🎓 [Certificate] Starting generation for:', profile.full_name);
      
      // ✅ PHASE 3: Use new Tripwire Certificate API via apiClient
      const result = await apiClient.post('/api/tripwire/certificates/issue', {
        user_id: user.id,
        full_name: profile.full_name
      });
      
      console.log('✅ [Certificate] API response:', result);

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate certificate');
      }

      if (result.data?.pdf_url || result.data?.certificate_url) {
        toast({
          title: "Сертификат готов!",
          description: "Сертификат успешно сгенерирован",
        });
        
        // Reload profile data to update UI
        await loadProfileData();
      } else {
         throw new Error('Certificate URL not returned');
      }

    } catch (error: any) {
      console.error('Error generating certificate:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось сгенерировать сертификат",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 🔴 DEBUG: Показываем что загружается
  console.log('🎨 TripwireProfile render:', { 
    isLoading, 
    hasUser: !!user, 
    hasProfile: !!profile,
    userEmail: user?.email 
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#030303]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-[#00FF94] mx-auto" />
          <p className="text-xl text-white">Загрузка профиля...</p>
          <p className="text-sm text-gray-500">User: {user?.email || 'загружается...'}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#030303]">
        <div className="text-center space-y-4">
          <p className="text-xl text-white">❌ Пользователь не найден</p>
          <p className="text-sm text-gray-500">Попробуйте перезайти</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#030303]">
        <div className="text-center space-y-4">
          <p className="text-xl text-white">❌ Профиль не найден</p>
          <p className="text-sm text-gray-500">User ID: {user.id}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030303] relative overflow-hidden">
      {/* 🔢 MATRIX RAIN - Падающие цифры (интенсивность +5%) */}
      <MatrixRain opacity={0.10} />

      {/* ═══════════════════════════════════════════════════════════
          CYBER GRID BACKGROUND (КАК НА /)
          ═══════════════════════════════════════════════════════ */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
      <div 
          className="absolute inset-0"
        style={{
          backgroundImage: `
              linear-gradient(#00FF8833 1px, transparent 1px),
              linear-gradient(90deg, #00FF8833 1px, transparent 1px)
          `,
            backgroundSize: '80px 80px',
        }}
      />
      </div>

      {/* ═══════════════════════════════════════════════════════════
          AMBIENT GLOW EFFECTS (КАК НА /)
          ═══════════════════════════════════════════════════════ */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-[#00FF88]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-[#00FF88]/3 rounded-full blur-[150px] pointer-events-none" />

      {/* Corner accents - REMOVED for cleaner look */}
      {/* <div className="absolute top-0 left-0 w-32 h-32 pointer-events-none">
        <div className="absolute inset-0 border-l-2 border-t-2 border-[#00FF94]/30" />
      </div>
      <div className="absolute bottom-0 right-0 w-32 h-32 pointer-events-none">
        <div className="absolute inset-0 border-r-2 border-b-2 border-[#00FF94]/30" />
      </div> */}

      {/* Fireworks */}
      {showFireworks && <DigitalFireworks onComplete={() => setShowFireworks(false)} />}
      
      {/* Achievement Modal */}
      {showAchievementModal && (
        <AchievementModal
          achievement={newAchievement}
          onClose={handleAchievementModalClose}
        />
      )}

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-12 space-y-12">
        {/* Header */}
        <ProfileHeader profile={profile} />

        {/* Achievements */}
        <Achievements achievements={achievements} />

        {/* Сертификат */}
        <CertificateSection
          profile={profile}
          certificate={certificate}
          onGenerateCertificate={handleGenerateCertificate}
        />

        {/* Настройки аккаунта */}
        <AccountSettings
          email={profile.email || ''}
          created_at={profile.created_at}
          full_name={profile.full_name}
          onEmailUpdate={handleEmailUpdate}
        />
      </div>
    </div>
  );
}
