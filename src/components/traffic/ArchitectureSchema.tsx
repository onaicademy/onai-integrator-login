import React, { useState } from 'react';
import { Database, Server, Clock, Globe, ArrowRight, AlertTriangle, Zap, Layers, RefreshCw } from 'lucide-react';

const ArchitectureSchema = () => {
  const [activeLayer, setActiveLayer] = useState('current'); // 'current' or 'future'

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans text-slate-800">
      <div className="max-w-6xl mx-auto">

        {/* Header Controls */}
        <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Архитектура Traffic Dashboard</h2>
            <p className="text-slate-500 text-sm">От текущего состояния к "Убийце Roistat"</p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveLayer('current')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeLayer === 'current' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Текущая (Batch/Cron)
            </button>
            <button
              onClick={() => setActiveLayer('future')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeLayer === 'future' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Zap size={16} />
              Целевая (Event-Driven)
            </button>
          </div>
        </div>

        {/* Main Diagram Area */}
        <div className="relative bg-white rounded-xl shadow-lg border border-slate-200 p-8 overflow-hidden min-h-[600px]">

          {/* Background Grid */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>

          <div className="relative z-10 grid grid-cols-12 gap-6 h-full">

            {/* COLUMN 1: SOURCES */}
            <div className="col-span-2 flex flex-col gap-6 justify-center border-r border-dashed border-slate-300 pr-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 text-center">Источники</h3>

              <div className="group relative bg-blue-50 border border-blue-200 p-4 rounded-lg flex flex-col items-center gap-2 transition-all hover:shadow-md hover:border-blue-400">
                <Globe className="text-blue-600" size={32} />
                <span className="font-bold text-sm">Facebook API</span>
                <span className="text-[10px] text-slate-500 text-center">Расходы, Клики, Показы</span>
                {activeLayer === 'future' && (
                   <div className="absolute -top-2 -right-2 bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full border border-emerald-200">ETL Worker</div>
                )}
              </div>

              <div className="group relative bg-indigo-50 border border-indigo-200 p-4 rounded-lg flex flex-col items-center gap-2 transition-all hover:shadow-md hover:border-indigo-400">
                <Layers className="text-indigo-600" size={32} />
                <span className="font-bold text-sm">AmoCRM</span>
                <span className="text-[10px] text-slate-500 text-center">Лиды, Продажи, Статусы</span>
                {activeLayer === 'future' && (
                   <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm animate-pulse">Webhooks</div>
                )}
              </div>
            </div>

            {/* COLUMN 2: PROCESSING (The Core) */}
            <div className="col-span-5 flex flex-col justify-center px-4 relative">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 text-center">
                {activeLayer === 'current' ? 'Backend (Node.js) - Монолит' : 'Backend - Event Driven'}
              </h3>

              {/* ARROWS connecting Cols */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 text-slate-300">
                <ArrowRight size={24} />
              </div>

              <div className={`border-2 rounded-xl p-6 relative transition-all duration-500 ${activeLayer === 'current' ? 'border-slate-300 bg-slate-50' : 'border-emerald-200 bg-emerald-50/30'}`}>

                {/* Scheduler Block */}
                <div className="flex justify-center mb-8">
                   <div className={`flex items-center gap-3 px-4 py-2 rounded-full border ${activeLayer === 'current' ? 'bg-white border-slate-300 text-slate-600' : 'bg-red-50 border-red-200 text-red-400 line-through opacity-50'}`}>
                      <Clock size={16} />
                      <span className="text-sm font-medium">Cron (10 min)</span>
                   </div>
                   {activeLayer === 'future' && (
                     <div className="ml-4 flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 shadow-sm">
                        <RefreshCw size={16} className="animate-spin-slow" />
                        <span className="text-sm font-bold">Очереди (BullMQ / Redis)</span>
                     </div>
                   )}
                </div>

                {/* Logic Block */}
                <div className="space-y-4">
                  <div className={`p-3 rounded-lg border text-center ${activeLayer === 'current' ? 'bg-white border-slate-200' : 'bg-white border-emerald-200 shadow-sm'}`}>
                    <div className="font-bold text-sm mb-1">Агрегатор Метрик</div>
                    <div className="text-xs text-slate-500">
                      {activeLayer === 'current' ? 'Последовательный опрос (Loop)' : 'Параллельные воркеры'}
                    </div>
                    {activeLayer === 'current' && (
                      <div className="mt-2 text-[10px] bg-amber-100 text-amber-700 px-2 py-1 rounded inline-flex items-center gap-1">
                        <AlertTriangle size={10} />
                        Риск: Долгая очередь
                      </div>
                    )}
                  </div>

                  {activeLayer === 'future' && (
                     <div className="p-3 rounded-lg border border-purple-200 bg-purple-50 text-center">
                       <div className="font-bold text-sm text-purple-700 mb-1">Attribution Engine</div>
                       <div className="text-xs text-purple-600">Склейка: fbclid ↔ roistat_visit ↔ crm_lead</div>
                     </div>
                  )}
                </div>

              </div>
            </div>

            {/* COLUMN 3: STORAGE */}
            <div className="col-span-3 flex flex-col justify-center px-4 border-l border-dashed border-slate-300 relative">
               <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 text-center">Хранилище (Supabase)</h3>

               {/* ARROWS connecting Cols */}
               <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 text-slate-300">
                <ArrowRight size={24} />
              </div>

               <div className="bg-slate-800 text-slate-100 rounded-xl p-6 shadow-xl flex flex-col gap-4 items-center">
                  <Database size={40} className="text-blue-400" />

                  <div className="w-full space-y-2">
                    <div className={`p-2 rounded border border-slate-600 text-xs ${activeLayer === 'current' ? 'bg-slate-700' : 'opacity-50'}`}>
                      <span className="font-mono text-blue-300">traffic_aggregated_metrics</span>
                      <div className="text-[10px] text-slate-400">JSONB snapshots (Кэш)</div>
                    </div>

                    {activeLayer === 'future' && (
                      <>
                        <div className="p-2 rounded border border-emerald-500/50 bg-emerald-900/20 text-xs animate-in fade-in slide-in-from-bottom-2">
                          <span className="font-mono text-emerald-300">raw_events_stream</span>
                          <div className="text-[10px] text-emerald-400/70">Сырые данные (ClickHouse/PG)</div>
                        </div>
                        <div className="p-2 rounded border border-purple-500/50 bg-purple-900/20 text-xs animate-in fade-in slide-in-from-bottom-2 delay-100">
                          <span className="font-mono text-purple-300">users_journey</span>
                          <div className="text-[10px] text-purple-400/70">Путь клиента</div>
                        </div>
                      </>
                    )}
                  </div>
               </div>
            </div>

             {/* COLUMN 4: FRONTEND */}
             <div className="col-span-2 flex flex-col justify-center pl-6">
               <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 text-center">Dashboard</h3>
               <div className="bg-white border-2 border-slate-200 rounded-xl p-4 h-48 flex flex-col items-center justify-center shadow-sm relative">
                  <Server size={32} className="text-slate-400 mb-2" />
                  <span className="text-sm font-bold text-center">React Client</span>

                  {activeLayer === 'current' ? (
                     <div className="mt-3 text-[10px] text-center bg-slate-100 px-2 py-1 rounded">
                        GET /metrics <br/>(Static JSON)
                     </div>
                  ) : (
                    <div className="mt-3 text-[10px] text-center bg-emerald-50 text-emerald-700 px-2 py-1 rounded border border-emerald-100">
                        Real-time Stats<br/>+ Drill Down
                     </div>
                  )}
               </div>
            </div>

          </div>
        </div>

        {/* Legend / Analysis Text */}
        <div className="mt-8 grid grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <span className="w-2 h-8 bg-blue-500 rounded-full"></span>
                    Как работает сейчас (MVP)
                </h4>
                <ul className="space-y-3 text-sm text-slate-600">
                    <li className="flex gap-2">
                        <span className="font-bold text-slate-800">1. Polling:</span>
                        Сервер сам "ходит" в Facebook и CRM раз в 10 минут. Это как почтальон, который приходит только по расписанию.
                    </li>
                    <li className="flex gap-2">
                        <span className="font-bold text-slate-800">2. Агрегация:</span>
                        Склеивает данные "на лету" и кладет готовый "отчет" в базу. Оригинальные сырые данные часто теряются.
                    </li>
                    <li className="flex gap-2">
                        <span className="font-bold text-slate-800">3. Узкое место:</span>
                        Если у вас будет 50 клиентов по 20 кампаний, цикл опроса займет больше 10 минут. Система начнет "захлебываться".
                    </li>
                </ul>
            </div>

            <div className="bg-white p-6 rounded-xl border border-emerald-200 shadow-sm">
                 <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <span className="w-2 h-8 bg-emerald-500 rounded-full"></span>
                    Оптимизация (Roistat Style)
                </h4>
                <ul className="space-y-3 text-sm text-slate-600">
                    <li className="flex gap-2">
                        <Zap size={16} className="text-emerald-500 shrink-0" />
                        <span><b className="text-emerald-700">Webhooks (AmoCRM):</b> Не опрашивайте CRM. Пусть CRM сама "стучится" к вам при создании сделки. Это мгновенно.</span>
                    </li>
                    <li className="flex gap-2">
                        <RefreshCw size={16} className="text-emerald-500 shrink-0" />
                        <span><b className="text-emerald-700">Очереди (Queues):</b> Используйте Redis. Создайте задачу "Обновить кампанию X". Если API Фейсбука занят, задача просто подождет в очереди, а не "уронит" сервер.</span>
                    </li>
                     <li className="flex gap-2">
                        <Layers size={16} className="text-emerald-500 shrink-0" />
                        <span><b className="text-emerald-700">Сырые данные:</b> Храните каждый клик и каждую сделку отдельно, а отчеты стройте SQL-запросами. Это позволит делать "Drill Down" (проваливаться в детали).</span>
                    </li>
                </ul>
            </div>
        </div>

      </div>
    </div>
  );
};

export default ArchitectureSchema;
