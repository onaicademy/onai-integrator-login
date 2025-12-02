import { useState, useRef, useCallback, useEffect } from "react";

export interface VoiceRecordingResult {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  duration: number;
  error: string | null;
}

export const useVoiceRecording = (): VoiceRecordingResult => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSoundTimeRef = useRef<number>(0);
  const isRecordingRef = useRef<boolean>(false);
  const stopRecordingRef = useRef<(() => Promise<Blob | null>) | null>(null);
  
  // Порог тишины: 3 секунды
  const SILENCE_THRESHOLD = 3000; // миллисекунды
  // Порог уровня звука (0-255, где 0 = тишина, 255 = максимальная громкость)
  const SOUND_LEVEL_THRESHOLD = 30; // Минимальный уровень для считания звука
  // Период ожидания перед началом детекции тишины (чтобы дать пользователю время начать говорить)
  const SILENCE_DETECTION_DELAY = 1000; // 1 секунда

  // Проверка разрешений микрофона (для iOS Safari)
  const checkMicrophonePermission = useCallback(async (): Promise<boolean> => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return false;
      }

      // Проверяем разрешения через Permissions API (если доступен)
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          console.log("🎤 Статус разрешения микрофона:", permissionStatus.state);
          
          if (permissionStatus.state === 'denied') {
            return false;
          }
        } catch (err) {
          // Permissions API может не поддерживаться, игнорируем
          console.log("⚠️ Permissions API не поддерживается");
        }
      }

      return true;
    } catch (err) {
      console.error("Ошибка проверки разрешений:", err);
      return false;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      
      // КРИТИЧЕСКИ ВАЖНО: Полностью очищаем все ресурсы от предыдущей записи
      console.log("🧹 Очистка ресурсов перед началом новой записи...");
      
      // Останавливаем все таймеры
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (silenceTimerRef.current) {
        clearInterval(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      
      // Останавливаем MediaRecorder, если он активен
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch (err) {
          console.warn("⚠️ Ошибка при остановке старого MediaRecorder:", err);
        }
        mediaRecorderRef.current = null;
      }
      
      // Останавливаем и освобождаем stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
        });
        streamRef.current = null;
      }
      
      // Закрываем AudioContext
      if (audioContextRef.current) {
        try {
          await audioContextRef.current.close();
        } catch (err) {
          console.warn("⚠️ Ошибка при закрытии старого AudioContext:", err);
        }
        audioContextRef.current = null;
        analyserRef.current = null;
      }
      
      // Очищаем все чанки
      chunksRef.current = [];
      
      // Сбрасываем все ref'ы
      setIsRecording(false);
      isRecordingRef.current = false;
      setDuration(0);
      lastSoundTimeRef.current = 0;
      startTimeRef.current = 0;
      
      // Небольшая задержка для полной очистки ресурсов
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Детальное логирование для диагностики
      console.log("🎤 === НАЧАЛО ЗАПРОСА МИКРОФОНА ===");
      console.log("📊 navigator.mediaDevices:", navigator.mediaDevices);
      console.log("📊 navigator.mediaDevices?.getUserMedia:", navigator.mediaDevices?.getUserMedia);
      console.log("📊 User Agent:", navigator.userAgent);
      console.log("📊 Протокол:", window.location.protocol);
      console.log("📊 Hostname:", window.location.hostname);
      
      // КРИТИЧЕСКИ ВАЖНО: Запрос разрешения должен происходить СРАЗУ, без проверок
      // Браузер сам покажет системное уведомление, если нужно
      console.log("🎤 Запрашиваем разрешение на микрофон (браузер покажет системное уведомление)...");
      
      let stream: MediaStream;
      
      // ВАЖНО: Всегда пытаемся использовать navigator.mediaDevices.getUserMedia
      // Даже если он undefined - браузер может его инициализировать при вызове
      // НЕ проверяем заранее - это может блокировать запрос разрешения
      
      try {
        // КРИТИЧЕСКИ ВАЖНО: Пробуем ВСЕ возможные API по очереди
        // Браузер сам покажет системное уведомление при первом успешном вызове
        
        // 1. Пробуем современный API (предпочтительно)
        if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function") {
          console.log("✅ Пробуем navigator.mediaDevices.getUserMedia (браузер покажет уведомление)");
          try {
            stream = await navigator.mediaDevices.getUserMedia({ 
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                sampleRate: 16000,
                channelCount: 1,
                autoGainControl: true,
              } 
            });
            console.log("✅ Stream получен через navigator.mediaDevices.getUserMedia");
          } catch (modernError: any) {
            console.warn("⚠️ Ошибка современного API, пробуем старые:", modernError);
            // Пробрасываем ошибку дальше для обработки
            throw modernError;
          }
        } 
        // 2. Пробуем старые API как fallback
        else if ((navigator as any).webkitGetUserMedia) {
          console.log("✅ Пробуем navigator.webkitGetUserMedia (браузер покажет уведомление)");
          stream = await new Promise<MediaStream>((resolve, reject) => {
            (navigator as any).webkitGetUserMedia({ audio: true }, resolve, reject);
          });
          console.log("✅ Stream получен через webkitGetUserMedia");
        } else if ((navigator as any).mozGetUserMedia) {
          console.log("✅ Пробуем navigator.mozGetUserMedia (браузер покажет уведомление)");
          stream = await new Promise<MediaStream>((resolve, reject) => {
            (navigator as any).mozGetUserMedia({ audio: true }, resolve, reject);
          });
          console.log("✅ Stream получен через mozGetUserMedia");
        } else if ((navigator as any).getUserMedia) {
          console.log("✅ Пробуем navigator.getUserMedia (браузер покажет уведомление)");
          stream = await new Promise<MediaStream>((resolve, reject) => {
            (navigator as any).getUserMedia({ audio: true }, resolve, reject);
          });
          console.log("✅ Stream получен через getUserMedia");
        } else {
          // Только если действительно нет поддержки
          console.error("❌ НЕТ ПОДДЕРЖКИ getUserMedia ВООБЩЕ");
          console.error("❌ navigator.mediaDevices:", navigator.mediaDevices);
          console.error("❌ navigator.getUserMedia:", (navigator as any).getUserMedia);
          console.error("❌ navigator.webkitGetUserMedia:", (navigator as any).webkitGetUserMedia);
          console.error("❌ navigator.mozGetUserMedia:", (navigator as any).mozGetUserMedia);
          
          // КРИТИЧЕСКИ ВАЖНО: На HTTP (не localhost) браузеры блокируют navigator.mediaDevices
          // Это политика безопасности - getUserMedia доступен только на:
          // 1. localhost/127.0.0.1 (даже на HTTP)
          // 2. HTTPS соединения
          if (window.location.protocol === "http:" && 
              window.location.hostname !== "localhost" && 
              window.location.hostname !== "127.0.0.1") {
            console.error("❌ HTTP протокол + IP-адрес - браузер блокирует доступ к микрофону");
            console.error("❌ Решение: используйте localhost вместо IP или настройте HTTPS");
            throw new Error("HTTPS_REQUIRED");
          }
          
          // Только если действительно нет поддержки (старый браузер)
          throw new Error("BROWSER_NOT_SUPPORTED");
        }
      } catch (err: any) {
        console.error("❌ === ОШИБКА ДОСТУПА К МИКРОФОНУ ===");
        console.error("❌ Ошибка:", err);
        console.error("❌ Имя ошибки:", err.name);
        console.error("❌ Сообщение ошибки:", err.message);
        console.error("❌ Код ошибки:", err.code);
        
        // Если это уже наша кастомная ошибка - пробрасываем дальше
        if (err.message === "BROWSER_NOT_SUPPORTED" || 
            err.message === "PERMISSION_DENIED" || 
            err.message === "DEVICE_NOT_FOUND" || 
            err.message === "DEVICE_IN_USE" ||
            err.message === "HTTPS_REQUIRED") {
          throw err;
        }
        
        // Более понятные сообщения об ошибках
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          // Это означает, что пользователь отклонил запрос или доступ заблокирован
          throw new Error("PERMISSION_DENIED");
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          throw new Error("DEVICE_NOT_FOUND");
        } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
          throw new Error("DEVICE_IN_USE");
        } else if (err.name === "NotSupportedError" || err.name === "TypeError") {
          // Если это ошибка типа "getUserMedia is not a function" или подобная
          // Проверяем, может быть это из-за HTTP протокола
          if (window.location.protocol === "http:" && 
              window.location.hostname !== "localhost" && 
              window.location.hostname !== "127.0.0.1") {
            console.warn("⚠️ Возможно, требуется HTTPS для доступа к микрофону");
            // Но не блокируем - пробуем как ошибку разрешения
            throw new Error("PERMISSION_DENIED");
          }
          throw new Error("PERMISSION_DENIED");
        } else {
          // Для всех остальных ошибок - пробуем как ошибку разрешения
          // Это более вероятно, чем "браузер не поддерживается"
          throw new Error("PERMISSION_DENIED");
        }
      }

      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
        mimeType = "audio/ogg;codecs=opus";
      }

      // Сохраняем stream для последующего освобождения
      streamRef.current = stream;

      // Создаем AudioContext для анализа уровня звука
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;
      
      source.connect(analyser);
      
      // Инициализируем время начала записи
      const recordingStartTime = Date.now();
      startTimeRef.current = recordingStartTime;
      
      // ВАЖНО: Устанавливаем lastSoundTime в момент начала записи + задержка детекции
      // Это даст пользователю время начать говорить перед началом детекции тишины
      lastSoundTimeRef.current = recordingStartTime + SILENCE_DETECTION_DELAY;

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          console.log("📦 Получены данные записи:", event.data.size, "байт");
          chunksRef.current.push(event.data);
        }
      };

      // Запускаем запись БЕЗ timeslice - данные будут приходить только при остановке
      // Это гарантирует, что мы получим все данные при остановке
      mediaRecorder.start();
      setIsRecording(true);
      isRecordingRef.current = true;
      
      console.log("🎤 MediaRecorder запущен, состояние:", mediaRecorder.state);

      // Таймер для обновления длительности
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 100);
      
      // Таймер для проверки уровня звука и автоматической остановки при тишине
      // Создаем dataArray один раз, но используем его каждый раз заново (он перезаписывается)
      let checkCount = 0;
      const checkSilence = () => {
        checkCount++;
        
        // Детальная диагностика состояния
        if (!analyserRef.current) {
          console.warn("⚠️ [ДИАГНОСТИКА] analyserRef.current отсутствует, проверка:", checkCount);
          return;
        }
        
        if (!isRecordingRef.current) {
          console.warn("⚠️ [ДИАГНОСТИКА] isRecordingRef.current = false, проверка:", checkCount);
          return;
        }
        
        const currentTime = Date.now();
        const elapsedTime = currentTime - startTimeRef.current;
        
        // Не проверяем тишину в первые SILENCE_DETECTION_DELAY секунд (grace period)
        // Это дает пользователю время начать говорить
        if (elapsedTime < SILENCE_DETECTION_DELAY) {
          // В период ожидания обновляем lastSoundTime, чтобы не было ложных срабатываний
          lastSoundTimeRef.current = currentTime;
          // Логируем только каждые 10 проверок (каждую секунду)
          if (checkCount % 10 === 0) {
            console.log("⏳ [ДИАГНОСТИКА] Grace period, время записи:", (elapsedTime / 1000).toFixed(1), "с");
          }
          return;
        }
        
        try {
          // Создаем новый массив каждый раз для получения актуальных данных
          const frequencyData = new Uint8Array(analyserRef.current.frequencyBinCount);
          
          // Получаем данные о частотах
          analyserRef.current.getByteFrequencyData(frequencyData);
          
          // Вычисляем средний уровень звука
          let sum = 0;
          for (let i = 0; i < frequencyData.length; i++) {
            sum += frequencyData[i];
          }
          const averageLevel = sum / frequencyData.length;
          
          // Логируем детальную информацию каждые 20 проверок (каждые 2 секунды) или при обнаружении звука
          const shouldLog = checkCount % 20 === 0 || averageLevel > SOUND_LEVEL_THRESHOLD;
          
          if (shouldLog) {
            console.log("📊 [ДИАГНОСТИКА] Время:", (elapsedTime / 1000).toFixed(1), "с | Уровень звука:", averageLevel.toFixed(1), "| Порог:", SOUND_LEVEL_THRESHOLD);
          }
          
          // Если уровень звука выше порога - обновляем время последнего звука
          if (averageLevel > SOUND_LEVEL_THRESHOLD) {
            const previousLastSound = lastSoundTimeRef.current;
            lastSoundTimeRef.current = currentTime;
            const timeSinceLastSound = currentTime - previousLastSound;
            
            console.log("🔊 [ДИАГНОСТИКА] Обнаружен звук! Уровень:", averageLevel.toFixed(1), "| Время с последнего звука:", (timeSinceLastSound / 1000).toFixed(1), "с");
          } else {
            // Проверяем, сколько времени прошло с последнего звука
            const silenceDuration = currentTime - lastSoundTimeRef.current;
            const silenceSeconds = silenceDuration / 1000;
            
            // Логируем приближение к порогу
            if (silenceSeconds >= SILENCE_THRESHOLD / 1000 - 0.5 && silenceSeconds < SILENCE_THRESHOLD / 1000) {
              console.warn("⚠️ [ДИАГНОСТИКА] Приближение к порогу тишины! Тишина:", silenceSeconds.toFixed(1), "с | Порог:", SILENCE_THRESHOLD / 1000, "с");
            }
            
            if (silenceDuration >= SILENCE_THRESHOLD) {
              console.error("🛑 [ДИАГНОСТИКА] ===== АВТОМАТИЧЕСКАЯ ОСТАНОВКА =====");
              console.error("🛑 [ДИАГНОСТИКА] Причина: Тишина", silenceSeconds.toFixed(2), "секунд (порог:", SILENCE_THRESHOLD / 1000, "с)");
              console.error("🛑 [ДИАГНОСТИКА] Общее время записи:", (elapsedTime / 1000).toFixed(2), "секунд");
              console.error("🛑 [ДИАГНОСТИКА] Последний звук был:", ((currentTime - lastSoundTimeRef.current) / 1000).toFixed(2), "секунд назад");
              console.error("🛑 [ДИАГНОСТИКА] Текущий уровень звука:", averageLevel.toFixed(1));
              console.error("🛑 [ДИАГНОСТИКА] Состояние MediaRecorder:", mediaRecorderRef.current?.state);
              console.error("🛑 [ДИАГНОСТИКА] ========================================");
              
              // Останавливаем таймер тишины, чтобы избежать повторных вызовов
              if (silenceTimerRef.current) {
                clearInterval(silenceTimerRef.current);
                silenceTimerRef.current = null;
              }
              // Останавливаем запись при длительной тишине
              if (stopRecordingRef.current) {
                stopRecordingRef.current().catch(err => {
                  console.error("❌ [ДИАГНОСТИКА] Ошибка при автоматической остановке:", err);
                });
              }
            }
          }
        } catch (err) {
          console.error("❌ [ДИАГНОСТИКА] Ошибка в checkSilence:", err);
        }
      };
      
      silenceTimerRef.current = setInterval(checkSilence, 100); // Проверяем каждые 100ms

      console.log("🎤 Запись начата с детектором тишины (порог:", SILENCE_THRESHOLD / 1000, "сек, задержка детекции:", SILENCE_DETECTION_DELAY / 1000, "сек)");
    } catch (err: any) {
      console.error("❌ Ошибка микрофона:", err);
      setError(err.message);
      throw err;
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        console.log("⚠️ MediaRecorder не инициализирован");
        resolve(null);
        return;
      }

      const state = mediaRecorderRef.current.state;
      if (state === "inactive") {
        console.log("⚠️ Запись уже остановлена");
        resolve(null);
        return;
      }

      // Проверяем минимальную длительность записи (300ms - очень короткий порог)
      // Уменьшено до 300ms, чтобы не блокировать нормальные записи
      const recordingDuration = Date.now() - startTimeRef.current;
      console.log("⏹️ Останавливаем запись, длительность:", recordingDuration, "ms");
      
      // ВАЖНО: Убрали блокировку коротких записей - пусть все записи обрабатываются
      // Проверка минимальной длительности теперь только информационная
      if (recordingDuration < 200) {
        console.warn("⚠️ [ДИАГНОСТИКА] Запись очень короткая:", recordingDuration, "ms");
        console.warn("⚠️ [ДИАГНОСТИКА] Но продолжаем обработку - может быть это нормально");
        // НЕ блокируем - продолжаем обычную обработку
      }

      // ВАЖНО: Устанавливаем обработчик onstop ПЕРЕД вызовом stop()
      mediaRecorderRef.current.onstop = () => {
        console.log("🛑 MediaRecorder остановлен, собираем данные...");
        console.log("📦 Количество чанков:", chunksRef.current.length);
        
        // Создаём blob из всех собранных чанков
        const blob = new Blob(chunksRef.current, { 
          type: mediaRecorderRef.current!.mimeType 
        });
        
        console.log("📦 Итоговый размер blob:", blob.size, "байт");
        console.log("⏱️ Длительность записи:", recordingDuration, "ms");
        
        // Останавливаем все треки stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => {
            track.stop();
            track.enabled = false;
          });
          streamRef.current = null;
        }
        
        // Закрываем AudioContext
        if (audioContextRef.current) {
          audioContextRef.current.close().catch(err => {
            console.error("Ошибка при закрытии AudioContext:", err);
          });
          audioContextRef.current = null;
          analyserRef.current = null;
        }
        
        // Останавливаем таймеры
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        
        if (silenceTimerRef.current) {
          clearInterval(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        
        setIsRecording(false);
        isRecordingRef.current = false;
        setDuration(0);
        lastSoundTimeRef.current = 0;
        
        // Очищаем чанки после создания blob
        chunksRef.current = [];
        
        if (blob.size === 0) {
          console.error("❌ Blob пустой, нет данных записи");
          resolve(null);
        } else {
          console.log("✅ Запись успешно завершена, размер:", blob.size, "байт");
          resolve(blob);
        }
      };

      // ВАЖНО: Запрашиваем последние данные перед остановкой
      // Это гарантирует, что мы получим все данные, даже если запись была короткой
      try {
        if (state === "recording") {
          // Запрашиваем данные перед остановкой
          mediaRecorderRef.current.requestData();
          // Небольшая задержка, чтобы данные успели прийти
          setTimeout(() => {
            mediaRecorderRef.current?.stop();
          }, 100);
        } else if (state === "paused") {
          // Если запись на паузе, возобновляем и останавливаем
          mediaRecorderRef.current.resume();
          mediaRecorderRef.current.requestData();
          setTimeout(() => {
            mediaRecorderRef.current?.stop();
          }, 100);
        } else {
          console.log("⚠️ Неожиданное состояние записи:", state);
          resolve(null);
        }
      } catch (err) {
        console.error("❌ Ошибка при остановке записи:", err);
        resolve(null);
      }
    });
  }, []);

  // Обновляем ref для функции остановки при каждом изменении
  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  }, [stopRecording]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    duration,
    error,
  };
};

