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
import ProgressOverview from './components/ProgressOverview';
import Achievements from './components/Achievements';
import ModuleProgress from './components/ModuleProgress';
import CertificateSection from './components/CertificateSection';
import AccountSettings from './components/AccountSettings';
import DigitalFireworks from './components/DigitalFireworks';
import AchievementModal from './components/AchievementModal';
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
  const [moduleProgress, setModuleProgress] = useState<any[]>([]);
  const [detailedProgress, setDetailedProgress] = useState<any[]>([]);

  // Achievement notification
  const [showFireworks, setShowFireworks] = useState(false);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [newAchievement, setNewAchievement] = useState<any>(null);

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

      // 1.5. Получаем full_name из tripwire_users
      const { data: tripwireUserData } = await tripwireSupabase
        .from('tripwire_users')
        .select('full_name, email')
        .eq('user_id', user.id)
        .single();

      console.log('🔍 DEBUG: tripwireUserData:', tripwireUserData);

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
          full_name: tripwireUserData?.full_name || 'Имя Фамилия',
          email: tripwireUserData?.email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any);
      } else if (existingProfile) {
        setProfile({
          ...existingProfile,
          full_name: tripwireUserData?.full_name || 'Имя Фамилия',
          email: tripwireUserData?.email,
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
      }

      // 3. Сертификаты (используем Tripwire Supabase!)
      const { data: certificateData } = await tripwireSupabase
        .from('certificates')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (certificateData) {
        setCertificate(certificateData as any);
      }

      // 4. Загружаем прогресс по модулям
      await loadModuleProgress();

      // 5. ✅ ПЕРЕСЧИТЫВАЕМ modules_completed из реального прогресса!
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

  const loadModuleProgress = async () => {
    if (!user) return;

    try {
      // Для авторизованных пользователей используем user.id как tripwire_user_id
      const tripwireUserId = user.id;

      // Загружаем прогресс по урокам (используем tripwireSupabase!)
      const { data: progressData, error: progressError } = await tripwireSupabase
        .from('tripwire_progress')
        .select('*')
        .eq('tripwire_user_id', tripwireUserId);

      if (progressError) {
        console.error('❌ Error loading tripwire_progress:', progressError);
        return;
      }

      console.log(`✅ Loaded ${progressData?.length || 0} progress records`);

      if (progressData && progressData.length > 0) {
        // Группируем по модулям (используем module_id напрямую из progress)
        const moduleMap = new Map();

        progressData.forEach((item: any) => {
          const moduleId = item.module_id;
          if (!moduleMap.has(moduleId)) {
            moduleMap.set(moduleId, {
              module_number: moduleId,
              is_started: false,
              is_completed: false,
              lessons_completed: 0,
              total_lessons: 0,
              lessons: [],
            });
          }

          const module = moduleMap.get(moduleId);
          module.total_lessons++;
          if (item.is_completed) {
            module.lessons_completed++;
            module.is_completed = module.lessons_completed === module.total_lessons;
          }
          if (item.video_progress_percent > 0) {
            module.is_started = true;
          }

          module.lessons.push({
            id: item.lesson_id,
            title: `Lesson ${item.lesson_id}`,
            is_completed: item.is_completed,
            video_progress_percent: item.video_progress_percent,
            watch_time_seconds: item.watch_time_seconds,
            completed_at: item.completed_at,
          });
        });

        const progressArray = Array.from(moduleMap.values());
        setModuleProgress(progressArray);
        setDetailedProgress(progressArray);
      }
    } catch (error) {
      console.error('Error loading module progress:', error);
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
      {/* Cyber Grid Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
        {[20, 40, 60, 80].map((top) => (
          <div 
            key={top}
            className="absolute left-0 right-0 h-px"
            style={{ 
              top: `${top}%`,
              background: 'linear-gradient(90deg, transparent, rgba(0, 255, 148, 0.2), transparent)' 
            }} 
          />
        ))}
      </div>

      {/* Radial gradient */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0, 255, 148, 0.05) 0%, transparent 60%)' }} 
      />

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
          open={showAchievementModal}
          onClose={() => setShowAchievementModal(false)}
        />
      )}

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-12 space-y-12">
        {/* Header */}
        <ProfileHeader profile={profile} />

        {/* Прогресс по модулям (Overview) */}
        <ProgressOverview 
          modulesCompleted={profile.modules_completed}
          moduleProgress={moduleProgress}
        />

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
