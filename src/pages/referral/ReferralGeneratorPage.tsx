// src/pages/referral/ReferralGeneratorPage.tsx
// 🚀 РЕФЕРАЛЬНАЯ СИСТЕМА - Генератор UTM-ссылок (полностью на русском)

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Copy, Check, ChevronDown, ChevronUp,
  Sparkles, Link2, Mail, Phone, User, 
  ArrowRight, Video, Zap, DollarSign, TrendingUp,
  Trophy, Crown, Medal, Flame, X, ExternalLink, MessageCircle, PlayCircle
} from 'lucide-react';
import './referral.css';

// ═══════════════════════════════════════════════════════════════
// ИНТЕРФЕЙСЫ
// ═══════════════════════════════════════════════════════════════

interface GeneratedCode {
  id: string;
  email: string;
  referral_code: string;
  utm_source: string;
  utm_link: string;
}

// ═══════════════════════════════════════════════════════════════
// КОНФИГУРАЦИЯ
// ═══════════════════════════════════════════════════════════════

const API_URL = import.meta.env.VITE_API_URL || 'https://api.onai.academy';
const SALES_PAGE_URL = 'https://onai.academy/integrator/expresscourse';

// Система выплат (фиксированные суммы в долларах)
const COMMISSION_TIERS = [
  { sales: '1-2', amount: 60, color: '#8B7355', label: 'Старт' },
  { sales: '3-4', amount: 80, color: '#C0C0C0', label: 'Прогресс' },
  { sales: '5-7', amount: 100, color: '#FFD700', label: 'Профи' },
  { sales: '8+', amount: 120, color: '#00FF94', label: 'Мастер' },
];

// Тестовые данные топ-рефереров (демо) - 80% казахские, 20% русские имена
const TOP_EARNERS = [
  { name: 'Аскар Б.', city: 'Алматы', sales: 12, earned: 1440, avatar: '🔥' },
  { name: 'Айгерим Т.', city: 'Астана', sales: 8, earned: 960, avatar: '⚡' },
  { name: 'Дарья К.', city: 'Москва', sales: 6, earned: 600, avatar: '🚀' },
  { name: 'Нурсултан М.', city: 'Шымкент', sales: 5, earned: 500, avatar: '💎' },
  { name: 'Жансая А.', city: 'Караганда', sales: 4, earned: 320, avatar: '🎯' },
];

// Общая статистика (демо)
const STATS = {
  totalReferrers: 47,
  totalSales: 89,
  totalPaid: 7840,
};

// ═══════════════════════════════════════════════════════════════
// ГЛАВНЫЙ КОМПОНЕНТ
// ═══════════════════════════════════════════════════════════════

export default function ReferralGeneratorPage() {
  const [formData, setFormData] = useState({ email: '', phone: '', name: '' });
  const [generated, setGenerated] = useState<GeneratedCode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [howItWorksExpanded, setHowItWorksExpanded] = useState(true);
  const [showInstructionsPopup, setShowInstructionsPopup] = useState(false);

  // Обработка отправки формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/referral/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          phone_number: formData.phone,
          full_name: formData.name || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Не удалось сгенерировать UTM код');
      }

      // Создаем ссылку на страницу продаж с UTM-меткой
      const utmLink = `${SALES_PAGE_URL}?utm_source=${data.referrer.utm_source}`;
      
      setGenerated({
        ...data.referrer,
        utm_link: utmLink,
      });
      
      // Показываем popup с инструкциями
      setShowInstructionsPopup(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Копирование в буфер обмена
  const handleCopy = async () => {
    if (!generated) return;
    await navigator.clipboard.writeText(generated.utm_link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="referral-page">
      {/* Фоновые эффекты */}
      <div className="referral-bg-effects">
        <div className="glow-orb glow-1" />
        <div className="glow-orb glow-2" />
        <div className="grid-pattern" />
      </div>

      {/* Заголовок */}
      <header className="referral-header">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="micro-text">/// РЕФЕРАЛЬНАЯ ПРОГРАММА V.4.0</div>
          <h1 className="main-title">
            ЗАРАБАТЫВАЙ С
            <span className="gradient-text"> ONAI ACADEMY</span>
          </h1>
          <p className="subtitle">
            Создавай вирусные ролики, которые ведут на нашу страницу продаж, и получай до <strong>$120</strong> за каждую продажу!
          </p>
        </motion.div>
      </header>



      {/* СИСТЕМА ВЫПЛАТ */}
      <motion.div
        className="glass-card commission-hero full-width"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="card-header">
          <div className="micro-text">/// СИСТЕМА ВЫПЛАТ</div>
          <h2>💰 Сколько ты заработаешь?</h2>
          <p>Чем больше продаж в месяц — тем выше выплата <strong>за каждую</strong> продажу!</p>
        </div>

        <div className="commission-table">
          <div className="table-header">
            <div className="col">Продаж в месяц</div>
            <div className="col">Выплата за продажу</div>
            <div className="col">Пример дохода</div>
          </div>
          {COMMISSION_TIERS.map((tier, index) => (
            <motion.div
              key={tier.sales}
              className="table-row"
              style={{ '--tier-color': tier.color } as React.CSSProperties}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.2 + index * 0.1 }}
            >
              <div className="col sales-col">
                <span className="badge" style={{ background: tier.color }}>{tier.label}</span>
                <span className="sales-range">{tier.sales} продаж</span>
              </div>
              <div className="col amount-col">
                <DollarSign size={20} />
                <span className="amount">${tier.amount}</span>
                <span className="per-sale">за продажу</span>
              </div>
              <div className="col example-col">
                <TrendingUp size={16} />
                <span>
                  {tier.sales === '1-2' && `2 × $${tier.amount} = $${2 * tier.amount}`}
                  {tier.sales === '3-4' && `4 × $${tier.amount} = $${4 * tier.amount}`}
                  {tier.sales === '5-7' && `7 × $${tier.amount} = $${7 * tier.amount}`}
                  {tier.sales === '8+' && `10 × $${tier.amount} = $${10 * tier.amount}`}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="commission-note">
          <Zap size={20} />
          <p>
            <strong>Важно:</strong> Уровень считается по количеству продаж за текущий месяц. 
            Сделал 5 продаж — получаешь <strong>$100 за каждую</strong> из них!
          </p>
        </div>
      </motion.div>

      {/* Основная сетка контента */}
      <div className="referral-grid">
        {/* Левая часть: Форма */}
        <motion.div
          className="glass-card form-card"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="card-header">
            <div className="micro-text">/// РЕГИСТРАЦИЯ</div>
            <h2>Получи свою ссылку</h2>
          </div>

          <form onSubmit={handleSubmit} className="referral-form">
            <div className="form-group">
              <label htmlFor="email">
                <Mail size={16} />
                Электронная почта
              </label>
              <input
                id="email"
                type="email"
                placeholder="твой@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">
                <Phone size={16} />
                Номер телефона
              </label>
              <input
                id="phone"
                type="tel"
                placeholder="+7 (777) 123-45-67"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="name">
                <User size={16} />
                Твоё имя (необязательно)
              </label>
              <input
                id="name"
                type="text"
                placeholder="Иван Петров"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="form-input"
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  className="error-message"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  ❌ {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? (
                <span className="loading-spinner" />
              ) : (
                <>
                  <Sparkles size={18} />
                  ПОЛУЧИТЬ ССЫЛКУ
                </>
              )}
            </button>

            <p className="form-note">
              💡 Мы отправим подтверждение на твой email
            </p>
          </form>
        </motion.div>

        {/* Правая часть: Результат */}
        <motion.div
          className="glass-card result-card"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {generated ? (
            <div className="generated-content">
              <div className="card-header">
                <div className="micro-text">/// ТВОЯ ССЫЛКА ГОТОВА</div>
                <h2>Отлично! 🎉</h2>
              </div>

              <div className="code-block">
                <div className="code-label">Твой реферальный код</div>
                <div className="code-value">{generated.referral_code}</div>
              </div>

              <div className="code-block">
                <div className="code-label">UTM-метка</div>
                <div className="code-value">{generated.utm_source}</div>
              </div>

              <div className="utm-link-box">
                <div className="code-label">🔗 Твоя ссылка для продвижения</div>
                <div className="link-display">
                  <Link2 size={16} className="link-icon" />
                  <code>{generated.utm_link}</code>
                </div>
                <button onClick={handleCopy} className="copy-btn">
                  {copied ? (
                    <>
                      <Check size={18} />
                      СКОПИРОВАНО!
                    </>
                  ) : (
                    <>
                      <Copy size={18} />
                      КОПИРОВАТЬ ССЫЛКУ
                    </>
                  )}
                </button>
                
                <button 
                  onClick={() => setShowInstructionsPopup(true)} 
                  className="copy-btn" 
                  style={{ marginTop: '10px', background: 'rgba(99,102,241,0.2)', borderColor: '#6366F1' }}
                >
                  <PlayCircle size={18} />
                  ПОЛНАЯ ИНСТРУКЦИЯ
                </button>
              </div>

              <div className="next-steps">
                <h4>📌 Что делать дальше:</h4>
                <ul>
                  <li>
                    <ArrowRight size={14} />
                    Скопируй ссылку (кнопка выше)
                  </li>
                  <li>
                    <ArrowRight size={14} />
                    Создай вирусный ролик для TikTok, Reels, YouTube Shorts
                  </li>
                  <li>
                    <ArrowRight size={14} />
                    Добавь свою ссылку в описание или призыв к действию
                  </li>
                  <li>
                    <ArrowRight size={14} />
                    Когда кто-то купит — мы свяжемся с тобой
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="placeholder-content">
              <div className="placeholder-icon">
                <Video size={48} />
              </div>
              <h3>Твоя ссылка появится здесь</h3>
              <p>Заполни форму слева и получи уникальную ссылку для продвижения</p>
              
              {/* Мини-таблица комиссий */}
              <div className="mini-commission-table">
                <div className="mini-header">💸 Система выплат</div>
                {COMMISSION_TIERS.map((tier) => (
                  <div key={tier.sales} className="mini-row">
                    <span className="mini-sales">{tier.sales}</span>
                    <span className="mini-arrow">→</span>
                    <span className="mini-amount" style={{ color: tier.color }}>${tier.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Как это работает */}
        <motion.div
          className="glass-card how-it-works-card full-width"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <div 
            className="card-header clickable"
            onClick={() => setHowItWorksExpanded(!howItWorksExpanded)}
          >
            <div className="micro-text">/// КАК ЭТО РАБОТАЕТ</div>
            <div className="header-row">
              <h2>4 простых шага к заработку</h2>
              {howItWorksExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
            </div>
          </div>

          <AnimatePresence>
            {howItWorksExpanded && (
              <motion.div
                className="steps-grid"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="step-card">
                  <div className="step-number">1</div>
                  <h3>Получи ссылку</h3>
                  <p>Введи email и телефон, получи уникальную UTM-ссылку на Экспресс-курс</p>
                </div>
                <div className="step-card">
                  <div className="step-number">2</div>
                  <h3>Создай контент</h3>
                  <p>Сними вирусный ролик для TikTok, Reels или YouTube Shorts</p>
                </div>
                <div className="step-card">
                  <div className="step-number">3</div>
                  <h3>Продвигай</h3>
                  <p>Добавь свою ссылку в описание — каждый переход отслеживается</p>
                </div>
                <div className="step-card">
                  <div className="step-number">4</div>
                  <h3>Получай выплаты</h3>
                  <p>За каждую продажу ты получаешь от $60 до $120 в зависимости от объёма</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Призыв к действию */}
        <motion.div
          className="glass-card cta-card full-width"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <div className="cta-content">
            <Video size={32} className="cta-icon" />
            <div className="cta-text">
              <h3>Готов начать?</h3>
              <p>
                Создавай вирусные ролики, которые ведут на нашу страницу продаж — 
                <a href={SALES_PAGE_URL} target="_blank" rel="noopener noreferrer" className="sales-link">
                  Экспресс-курс по ИИ
                </a>
              </p>
            </div>
          </div>
        </motion.div>

        {/* СТАТИСТИКА И ЛИДЕРБОРД */}
        <motion.div
          className="glass-card stats-leaderboard full-width"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <div className="stats-leaderboard-grid">
            {/* Левая часть: Общая статистика */}
            <div className="stats-section">
              <div className="card-header">
                <div className="micro-text">/// СТАТИСТИКА ПРОГРАММЫ</div>
                <h2>📊 Наши результаты</h2>
              </div>
              <div className="stats-cards">
                <div className="stat-card">
                  <div className="stat-icon"><Flame size={24} /></div>
                  <div className="stat-value">{STATS.totalReferrers}</div>
                  <div className="stat-label">Активных рефереров</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon"><TrendingUp size={24} /></div>
                  <div className="stat-value">{STATS.totalSales}</div>
                  <div className="stat-label">Продаж за месяц</div>
                </div>
                <div className="stat-card highlight">
                  <div className="stat-icon"><DollarSign size={24} /></div>
                  <div className="stat-value">${STATS.totalPaid.toLocaleString()}</div>
                  <div className="stat-label">Выплачено за месяц</div>
                </div>
              </div>
            </div>

            {/* Правая часть: Топ рефереров */}
            <div className="leaderboard-section">
              <div className="card-header">
                <div className="micro-text">/// ТОП РЕФЕРЕРОВ ДЕКАБРЯ</div>
                <h2>🏆 Лидеры заработка</h2>
              </div>
              <div className="leaderboard-list">
                {TOP_EARNERS.map((earner, index) => (
                  <motion.div
                    key={earner.name}
                    className={`leaderboard-item ${index === 0 ? 'first' : ''} ${index === 1 ? 'second' : ''} ${index === 2 ? 'third' : ''}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 + index * 0.1 }}
                  >
                    <div className="rank">
                      {index === 0 && <Crown size={18} className="crown" />}
                      {index === 1 && <Medal size={18} className="silver-medal" />}
                      {index === 2 && <Trophy size={18} className="bronze-medal" />}
                      {index > 2 && <span className="rank-number">{index + 1}</span>}
                    </div>
                    <div className="avatar">{earner.avatar}</div>
                    <div className="info">
                      <div className="name">{earner.name}</div>
                      <div className="city">{earner.city}</div>
                    </div>
                    <div className="stats">
                      <div className="sales">{earner.sales} продаж</div>
                      <div className="earned">${earner.earned}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="leaderboard-note">
                💡 Присоединяйся и попади в топ!
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Подвал */}
      <footer className="referral-footer">
        <p>onAI Academy © 2025 | Реферальная программа v4.0</p>
      </footer>

      {/* POPUP С ИНСТРУКЦИЯМИ */}
      <AnimatePresence>
        {showInstructionsPopup && generated && (
          <motion.div
            className="instructions-popup-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowInstructionsPopup(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(8px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              overflow: 'auto',
            }}
          >
            <motion.div
              className="instructions-popup-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'linear-gradient(135deg, rgba(15,15,15,0.98) 0%, rgba(10,10,10,0.98) 100%)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '24px',
                padding: '40px',
                maxWidth: '800px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'auto',
                position: 'relative',
              }}
            >
              {/* Close button */}
              <button
                onClick={() => setShowInstructionsPopup(false)}
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#fff',
                }}
              >
                <X size={24} />
              </button>

              {/* Header */}
              <div style={{ marginBottom: '30px' }}>
                <div className="micro-text">/// ПОЛНАЯ ИНСТРУКЦИЯ</div>
                <h2 style={{ fontSize: '28px', margin: '10px 0', color: '#fff' }}>
                  🚀 Как использовать твою UTM-ссылку
                </h2>
              </div>

              {/* UTM Link Box */}
              <div style={{
                background: 'rgba(0,255,148,0.1)',
                border: '2px solid #00FF94',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '30px',
              }}>
                <p style={{ color: '#9CA3AF', fontSize: '14px', margin: '0 0 10px 0' }}>🔗 Твоя ссылка:</p>
                <code style={{
                  display: 'block',
                  background: '#0A0A0A',
                  padding: '15px',
                  borderRadius: '10px',
                  color: '#00FF94',
                  fontSize: '14px',
                  wordBreak: 'break-all',
                }}>
                  {generated.utm_link}
                </code>
                <button
                  onClick={handleCopy}
                  style={{
                    marginTop: '15px',
                    background: '#00FF94',
                    color: '#000',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                  {copied ? 'Скопировано!' : 'Копировать ссылку'}
                </button>
              </div>

              {/* Instructions Grid */}
              <div style={{ display: 'grid', gap: '20px' }}>
                
                {/* Method 1: Reels + Bot */}
                <div style={{
                  background: 'rgba(255,255,255,0.03)',
                  borderLeft: '4px solid #6366F1',
                  borderRadius: '0 16px 16px 0',
                  padding: '25px',
                }}>
                  <h3 style={{ color: '#00FF94', margin: '0 0 15px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <MessageCircle size={20} />
                    Способ 1: Reels/TikTok + Автоответ бота
                  </h3>
                  <ol style={{ color: '#9CA3AF', margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
                    <li>Сними вирусный ролик про ИИ или заработок</li>
                    <li>Добавь призыв: <strong style={{ color: '#fff' }}>"Напиши ИИ в комментариях"</strong></li>
                    <li>Настрой бота (ManyChat, Sendpulse) отправлять твою ссылку в Direct</li>
                    <li>Каждая покупка будет отслежена по твоей UTM-метке</li>
                  </ol>
                  <a 
                    href="https://sendpulse.com/features/chatbot"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginTop: '15px',
                      color: '#6366F1',
                      textDecoration: 'none',
                      fontWeight: 600,
                    }}
                  >
                    <ExternalLink size={16} />
                    Настроить Sendpulse бота
                  </a>
                </div>

                {/* Method 2: Bio Link */}
                <div style={{
                  background: 'rgba(255,255,255,0.03)',
                  borderLeft: '4px solid #00FF94',
                  borderRadius: '0 16px 16px 0',
                  padding: '25px',
                }}>
                  <h3 style={{ color: '#00FF94', margin: '0 0 15px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Link2 size={20} />
                    Способ 2: Ссылка в Bio
                  </h3>
                  <ul style={{ color: '#9CA3AF', margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
                    <li>Добавь ссылку в описание профиля Instagram/TikTok</li>
                    <li>Используй Linktree или Taplink для "Link in Bio"</li>
                    <li>В роликах говори: <strong style={{ color: '#fff' }}>"Ссылка в шапке профиля"</strong></li>
                  </ul>
                </div>

                {/* Method 3: YouTube Shorts */}
                <div style={{
                  background: 'rgba(255,255,255,0.03)',
                  borderLeft: '4px solid #FF0000',
                  borderRadius: '0 16px 16px 0',
                  padding: '25px',
                }}>
                  <h3 style={{ color: '#FF0000', margin: '0 0 15px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Video size={20} />
                    Способ 3: YouTube Shorts
                  </h3>
                  <ul style={{ color: '#9CA3AF', margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
                    <li>Добавь ссылку в описание видео</li>
                    <li>Закрепи комментарий со ссылкой</li>
                    <li>Добавь в конечную заставку (End Screen)</li>
                  </ul>
                </div>

                {/* Method 4: Telegram */}
                <div style={{
                  background: 'rgba(255,255,255,0.03)',
                  borderLeft: '4px solid #0088CC',
                  borderRadius: '0 16px 16px 0',
                  padding: '25px',
                }}>
                  <h3 style={{ color: '#0088CC', margin: '0 0 15px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <MessageCircle size={20} />
                    Способ 4: Telegram-канал
                  </h3>
                  <ul style={{ color: '#9CA3AF', margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
                    <li>Делись ссылкой в постах и сторис</li>
                    <li>Закрепи сообщение со ссылкой</li>
                    <li>Добавь в описание канала</li>
                  </ul>
                </div>
              </div>

              {/* Video Tutorial Link */}
              <div style={{
                background: 'rgba(99,102,241,0.1)',
                border: '1px solid #6366F1',
                borderRadius: '16px',
                padding: '20px',
                marginTop: '30px',
                textAlign: 'center',
              }}>
                <PlayCircle size={32} style={{ color: '#6366F1', marginBottom: '10px' }} />
                <h4 style={{ color: '#fff', margin: '0 0 10px 0' }}>🎬 Видео-обучение</h4>
                <p style={{ color: '#9CA3AF', margin: '0 0 15px 0', fontSize: '14px' }}>
                  Подробный гайд по настройке автоответа и продвижению
                </p>
                <a
                  href="https://www.youtube.com/watch?v=TUTORIAL_ID"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: '#6366F1',
                    color: '#fff',
                    padding: '12px 24px',
                    borderRadius: '10px',
                    textDecoration: 'none',
                    fontWeight: 600,
                  }}
                >
                  <ExternalLink size={18} />
                  Смотреть видео (скоро)
                </a>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setShowInstructionsPopup(false)}
                style={{
                  width: '100%',
                  marginTop: '30px',
                  background: '#00FF94',
                  color: '#000',
                  border: 'none',
                  padding: '16px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '16px',
                  cursor: 'pointer',
                }}
              >
                ПОНЯТНО, ЗАКРЫТЬ ✔
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
