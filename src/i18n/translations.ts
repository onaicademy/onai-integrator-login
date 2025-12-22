// Translations for Traffic Dashboard
// RU (Русский) and KZ (Казахский)

export const translations = {
  ru: {
    // Header
    'header.title': 'Командная Панель Трафика',
    'header.subtitle': 'Facebook Ads + AmoCRM',
    'header.refresh': 'Обновить',
    'header.refreshing': 'Обновление...',
    'header.allTeams': 'Все команды',
    'header.loading': 'Загрузка аналитики...',
    
    // Buttons
    'btn.allTeams': 'Все команды',
    'btn.myResults': 'Мои результаты',
    'btn.aiRecommendations': 'AI Рекомендации',
    'btn.analyzing': 'Анализ...',
    'btn.generating': 'Генерация...',
    'btn.updateRecommendations': 'Обновить рекомендации',
    
    // Metrics
    'metrics.revenue': 'Доход',
    'metrics.spend': 'Затраты',
    'metrics.roas': 'ROAS',
    'metrics.cpa': 'CPA',
    'metrics.sales': 'Продажи',
    'metrics.clicks': 'Клики',
    'metrics.impressions': 'Показы',
    'metrics.ctr': 'CTR',
    'metrics.perSale': 'За продажу',
    'metrics.reach': 'Охват',
    
    // Descriptions
    'desc.revenue': 'Общая сумма выручки от продаж через AmoCRM',
    'desc.spend': 'Сумма потраченная на рекламу в Facebook Ads',
    'desc.roas': 'Возврат инвестиций в рекламу',
    'desc.cpa': 'Средняя стоимость привлечения одного клиента',
    'desc.sales': 'Количество успешно закрытых сделок',
    'desc.clicks': 'Количество кликов по рекламным объявлениям',
    'desc.impressions': 'Сколько раз ваша реклама была показана',
    'desc.ctr': 'Процент пользователей, которые кликнули по объявлению',
    
    // Status
    'status.excellent': 'Отлично',
    'status.profitable': 'Прибыльно',
    'status.needsWork': 'Требует работы',
    'status.unprofitable': 'Убыточно',
    
    // Ranks
    'rank.legendary': 'ЛЕГЕНДАРНО',
    'rank.epic': 'ЭПИЧНО',
    'rank.good': 'ХОРОШО',
    'rank.needsImprovement': 'ТРЕБУЕТ ДОРАБОТОК',
    
    // Tables
    'table.teamResults': 'Результаты Команд',
    'table.team': 'Команда',
    
    // Top sections
    'top.salesTitle': 'ТОП UTM по продажам',
    'top.salesSubtitle': 'Данные из AmoCRM',
    'top.ctrTitle': 'ТОП кампаний по CTR',
    'top.ctrSubtitle': 'Кликабельность рекламы',
    'top.videoTitle': 'ТОП по видео-вовлечённости',
    'top.videoSubtitle': 'Просмотры и досмотры',
    'top.videoCreativesTitle': 'ТОП ВИДЕО ПО ВОВЛЕЧЕННОСТИ',
    'top.videoCreativesSubtitle': 'Лучшие креативы по просмотрам и досмотрам',
    
    // Footer
    'footer.updateFrequency': 'Обновление каждые 60 секунд',
    'footer.lastUpdate': 'Последнее обновление:',
    'footer.dataSource': 'Facebook Ads API + AmoCRM + Groq AI',
    
    // AI Modal
    'ai.modalTitle': 'AI Рекомендации',
    'ai.modalSubtitle': 'Анализ на основе текущих метрик',
    'ai.poweredBy': 'Groq AI • Llama 3.3 70B',
    
    // Login
    'login.title': 'Командная Панель Трафика',
    'login.subtitle': 'Вход в систему',
    'login.email': 'Email',
    'login.password': 'Пароль',
    'login.button': 'Войти',
    'login.loggingIn': 'Вход...',
    'login.welcome': 'Добро пожаловать',
    
    // Sidebar
    'sidebar.dashboard': 'Dashboard',
    'sidebar.history': 'История',
    'sidebar.settings': 'Настройки',
    'sidebar.users': 'Пользователи',
    'sidebar.logout': 'Выйти',
    'sidebar.admin': 'Администратор',
    'sidebar.targetologist': 'Таргетолог',
    'sidebar.security': 'Безопасность',
    'sidebar.utmSources': 'Источники продаж',
    'sidebar.analytics': 'Аналитика',
    'sidebar.management': 'Управление',
    'sidebar.teamConstructor': 'Конструктор команд',
    
    // Periods
    'period.7d': '7д',
    'period.14d': '14д',
    'period.30d': '30д',
    
    // Currency
    'currency.usd': 'USD',
    'currency.kzt': 'KZT',
    
    // Common
    'common.sales': 'продаж',
    'common.views': 'просмотров',
    'common.completion': 'досмотр',
    'common.avgTime': 'Ср. время',
    'common.goal': 'Цель',
    'common.inProgress': 'В работе',
    'common.availableForYourTeam': 'Доступно только для вашей команды',
    
    // Detailed Analytics
    'detailedAnalytics.title': 'Детальная аналитика РК',
    'detailedAnalytics.subtitle': 'Кампании → Группы объявлений → Объявления',
    'detailedAnalytics.searchPlaceholder': 'Поиск по названию...',
    'detailedAnalytics.noData': 'Нет данных по кампаниям',
    'detailedAnalytics.last7days': 'Последние 7 дней',
    'detailedAnalytics.last14days': 'Последние 14 дней',
    'detailedAnalytics.last30days': 'Последние 30 дней',
    'detailedAnalytics.last90days': 'Последние 90 дней',
    'detailedAnalytics.allStatuses': 'Все статусы',
    'detailedAnalytics.active': 'Активные',
    'detailedAnalytics.paused': 'Остановленные',
    'detailedAnalytics.archived': 'Архивные',
    'detailedAnalytics.dashboard': 'Dashboard',
    
    // Onboarding
    'onboarding.step1.title': 'Добро пожаловать в Traffic Dashboard!',
    'onboarding.step1.desc': 'Система для отслеживания эффективности вашей рекламы в реальном времени. Пройдите краткий тур, чтобы начать работу.',
    'onboarding.step2.title': 'Почему UTM метки критичны?',
    'onboarding.step2.desc': 'UTM метки - это ваш уникальный идентификатор в системе. Они позволяют точно отслеживать какие продажи пришли именно от ваших кампаний.',
    'onboarding.step3.title': 'Настройте UTM метки',
    'onboarding.step3.desc': 'Перейдите в Настройки и укажите вашу персональную UTM метку для каждого источника трафика: Facebook, YouTube, Google Ads, TikTok. Используйте одну метку на один источник!',
    'onboarding.step4.title': 'Подключите рекламные кабинеты',
    'onboarding.step4.desc': 'В настройках выберите рекламные кабинеты Facebook, которые вы хотите отслеживать. Система автоматически загрузит все доступные кампании.',
    'onboarding.step5.title': 'Выберите кампании для отслеживания',
    'onboarding.step5.desc': 'Отметьте галочками те кампании, результаты которых вы хотите видеть в дашборде. Можно выбрать сразу несколько кампаний из разных кабинетов.',
    'onboarding.step6.title': 'ВАЖНО: Правило одной UTM метки',
    'onboarding.step6.desc': 'Для каждого источника трафика используйте только ОДНУ уникальную UTM source метку. Пример: "fb_kenesary" для Facebook, "yt_kenesary" для YouTube.',
    'onboarding.step7.title': 'Синхронизируйте UTM метки в рекламных кампаниях',
    'onboarding.step7.desc': 'После настройки здесь, обязательно измените UTM source в настройках ваших рекламных кампаний на тот же самый источник, который вы указали в системе.',
    'onboarding.step8.title': 'Используйте AI рекомендации',
    'onboarding.step8.desc': 'На главной странице вашего кабинета есть AI ассистент, который анализирует ваши результаты и дает советы по оптимизации кампаний в реальном времени.',
    'onboarding.step9.title': 'Ваша панель аналитики',
    'onboarding.step9.desc': 'Отслеживайте результаты в вашем личном кабинете. Система показывает продажи, конверсии и эффективность в разрезе каждой кампании.',
    'onboarding.skip': 'Пропустить',
    'onboarding.next': 'Далее',
    'onboarding.back': 'Назад',
    'onboarding.complete': 'Начать работу',
    'onboarding.stepOf': 'Шаг',
    
    // Settings
    'settings.searchAccounts': 'Поиск по кабинетам...',
    'settings.searchCampaigns': 'Поиск по кампаниям...',
    'settings.clickLoadAccounts': 'Нажмите "Загрузить доступные" для подключения кабинетов',
  },
  
  kz: {
    // Header
    'header.title': 'Трафик Командасының Панелі',
    'header.subtitle': 'Facebook Ads + AmoCRM',
    'header.refresh': 'Жаңарту',
    'header.refreshing': 'Жаңартылуда...',
    'header.allTeams': 'Барлық командалар',
    'header.loading': 'Аналитика жүктелуде...',
    
    // Buttons
    'btn.allTeams': 'Барлық командалар',
    'btn.myResults': 'Менің нәтижелерім',
    'btn.aiRecommendations': 'AI Ұсыныстар',
    'btn.analyzing': 'Талдау...',
    'btn.generating': 'Генерация...',
    'btn.updateRecommendations': 'Ұсыныстарды жаңарту',
    
    // Metrics
    'metrics.revenue': 'Табыс',
    'metrics.spend': 'Шығындар',
    'metrics.roas': 'ROAS',
    'metrics.cpa': 'CPA',
    'metrics.sales': 'Сатулар',
    'metrics.clicks': 'Басулар',
    'metrics.impressions': 'Көрсетілімдер',
    'metrics.ctr': 'CTR',
    'metrics.perSale': 'Сату үшін',
    'metrics.reach': 'Қамту',
    
    // Descriptions
    'desc.revenue': 'AmoCRM арқылы сатудан түскен жалпы табыс',
    'desc.spend': 'Facebook Ads жарнамасына жұмсалған сома',
    'desc.roas': 'Жарнамаға инвестицияның қайтарымы',
    'desc.cpa': 'Бір клиентті тартудың орташа құны',
    'desc.sales': 'Сәтті жабылған мәмілелердің саны',
    'desc.clicks': 'Жарнама хабарламаларына басу саны',
    'desc.impressions': 'Жарнамаңыз неше рет көрсетілді',
    'desc.ctr': 'Хабарламаны көргеннен кейін басқан пайдаланушылар пайызы',
    
    // Status
    'status.excellent': 'Тамаша',
    'status.profitable': 'Пайдалы',
    'status.needsWork': 'Жұмыс қажет',
    'status.unprofitable': 'Зиянды',
    
    // Ranks
    'rank.legendary': 'АҢЫЗҒА АЙНАЛҒАН',
    'rank.epic': 'ЭПИКАЛЫҚ',
    'rank.good': 'ЖАҚСЫ',
    'rank.needsImprovement': 'ЖАҚСАРТУ ҚАЖЕТ',
    
    // Tables
    'table.teamResults': 'Командалардың нәтижелері',
    'table.team': 'Команда',
    
    // Top sections
    'top.salesTitle': 'Сату бойынша ТОП UTM',
    'top.salesSubtitle': 'AmoCRM деректері',
    'top.ctrTitle': 'CTR бойынша ТОП науқандар',
    'top.ctrSubtitle': 'Жарнаманың басылымдылығы',
    'top.videoTitle': 'Бейне тартымдылығы бойынша ТОП',
    'top.videoSubtitle': 'Қарау және аяқтау',
    'top.videoCreativesTitle': 'ТАРТЫМДЫЛЫҚ БОЙЫНША ТОП БЕЙНЕЛЕР',
    'top.videoCreativesSubtitle': 'Қарау және аяқтау бойынша үздік креативтер',
    
    // Footer
    'footer.updateFrequency': 'Әр 60 секунд сайын жаңарту',
    'footer.lastUpdate': 'Соңғы жаңарту:',
    'footer.dataSource': 'Facebook Ads API + AmoCRM + Groq AI',
    
    // AI Modal
    'ai.modalTitle': 'AI Ұсыныстар',
    'ai.modalSubtitle': 'Ағымдағы көрсеткіштер негізінде талдау',
    'ai.poweredBy': 'Groq AI • Llama 3.3 70B',
    
    // Login
    'login.title': 'Трафик Командасының Панелі',
    'login.subtitle': 'Жүйеге кіру',
    'login.email': 'Email',
    'login.password': 'Құпия сөз',
    'login.button': 'Кіру',
    'login.loggingIn': 'Кіру...',
    'login.welcome': 'Қош келдіңіз',
    
    // Sidebar
    'sidebar.dashboard': 'Dashboard',
    'sidebar.history': 'Тарих',
    'sidebar.settings': 'Баптаулар',
    'sidebar.users': 'Пайдаланушылар',
    'sidebar.logout': 'Шығу',
    'sidebar.admin': 'Әкімші',
    'sidebar.targetologist': 'Таргетолог',
    'sidebar.security': 'Қауіпсіздік',
    'sidebar.utmSources': 'Сату көздері',
    'sidebar.analytics': 'Аналитика',
    'sidebar.management': 'Басқару',
    'sidebar.teamConstructor': 'Командалар конструкторы',
    
    // Periods
    'period.7d': '7к',
    'period.14d': '14к',
    'period.30d': '30к',
    
    // Currency
    'currency.usd': 'USD',
    'currency.kzt': 'KZT',
    
    // Common
    'common.sales': 'сату',
    'common.views': 'қарау',
    'common.completion': 'аяқтау',
    'common.avgTime': 'Орт. уақыт',
    'common.goal': 'Мақсат',
    'common.inProgress': 'Жұмыста',
    'common.availableForYourTeam': 'Тек сіздің команданыз үшін қолжетімді',
    
    // Detailed Analytics
    'detailedAnalytics.title': 'РК бойынша толық аналитика',
    'detailedAnalytics.subtitle': 'Науқандар → Жарнама топтары → Жарнамалар',
    'detailedAnalytics.searchPlaceholder': 'Атауы бойынша іздеу...',
    'detailedAnalytics.noData': 'Науқандар бойынша деректер жоқ',
    'detailedAnalytics.last7days': 'Соңғы 7 күн',
    'detailedAnalytics.last14days': 'Соңғы 14 күн',
    'detailedAnalytics.last30days': 'Соңғы 30 күн',
    'detailedAnalytics.last90days': 'Соңғы 90 күн',
    'detailedAnalytics.allStatuses': 'Барлық мәртебелер',
    'detailedAnalytics.active': 'Белсенді',
    'detailedAnalytics.paused': 'Тоқтатылған',
    'detailedAnalytics.archived': 'Мұрағатталған',
    'detailedAnalytics.dashboard': 'Dashboard',
    
    // Onboarding
    'onboarding.step1.title': 'Traffic Dashboard-қа қош келдіңіз!',
    'onboarding.step1.desc': 'Жарнаманың тиімділігін нақты уақытта бақылау жүйесі. Жұмысты бастау үшін қысқаша турды өтіңіз.',
    'onboarding.step2.title': 'UTM белгілері неліктен маңызды?',
    'onboarding.step2.desc': 'UTM белгілері - бұл жүйедегі сіздің бірегей идентификаторыңыз. Олар қандай сатулар сіздің науқандарыңыздан келгенін дәл бақылауға мүмкіндік береді.',
    'onboarding.step3.title': 'UTM белгілерін баптаңыз',
    'onboarding.step3.desc': 'Баптауларға өтіп, әр трафик көзі үшін жеке UTM белгісін көрсетіңіз: Facebook, YouTube, Google Ads, TikTok. Бір көзге бір белгі қолданыңыз!',
    'onboarding.step4.title': 'Жарнама кабинеттерін қосыңыз',
    'onboarding.step4.desc': 'Баптауларда бақылағыңыз келетін Facebook жарнама кабинеттерін таңдаңыз. Жүйе барлық қолжетімді науқандарды автоматты түрде жүктейді.',
    'onboarding.step5.title': 'Бақылау үшін науқандарды таңдаңыз',
    'onboarding.step5.desc': 'Нәтижелерін дашбордта көргіңіз келетін науқандарды белгілеңіз. Әр түрлі кабинеттерден бірнеше науқандарды бірден таңдауға болады.',
    'onboarding.step6.title': 'МАҢЫЗДЫ: Бір UTM белгісінің ережесі',
    'onboarding.step6.desc': 'Әр трафик көзі үшін тек БІРДЕЙ бірегей UTM source белгісін қолданыңыз. Мысалы: "fb_kenesary" Facebook үшін, "yt_kenesary" YouTube үшін.',
    'onboarding.step7.title': 'UTM белгілерін жарнама науқандарында синхрондаңыз',
    'onboarding.step7.desc': 'Мұнда баптағаннан кейін, жарнама науқандарыңыздың баптауларында UTM source-ті жүйеде көрсеткенмен бірдей көзге міндетті түрде өзгертіңіз.',
    'onboarding.step8.title': 'AI ұсыныстарды қолданыңыз',
    'onboarding.step8.desc': 'Кабинетіңіздің басты бетінде нәтижелерді талдап, науқандарды оңтайландыру бойынша нақты уақытта кеңестер беретін AI ассистенті бар.',
    'onboarding.step9.title': 'Сіздің аналитика панеліңіз',
    'onboarding.step9.desc': 'Жеке кабинетіңізде нәтижелерді бақылаңыз. Жүйе әр науқан бойынша сатулар, конверсиялар және тиімділікті көрсетеді.',
    'onboarding.skip': 'Өткізу',
    'onboarding.next': 'Әрі қарай',
    'onboarding.back': 'Артқа',
    'onboarding.complete': 'Жұмысты бастау',
    'onboarding.stepOf': 'Қадам',
    
    // Settings
    'settings.searchAccounts': 'Кабинеттер бойынша іздеу...',
    'settings.searchCampaigns': 'Науқандар бойынша іздеу...',
    'settings.clickLoadAccounts': 'Кабинеттерді қосу үшін "Қолжетімдерді жүктеу" түймесін басыңыз',
  }
};

export type Language = 'ru' | 'kz';
export type TranslationKey = keyof typeof translations.ru;

export function getTranslation(lang: Language, key: TranslationKey): string {
  return translations[lang][key] || translations.ru[key] || key;
}
