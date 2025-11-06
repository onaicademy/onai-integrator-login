import { useState, useEffect, useRef } from "react";
import { Bot, User, Send, Paperclip, X, Loader2, Sparkles, Mic, Download, Eye, FileText, Image as ImageIcon } from "lucide-react";
import { motion } from "framer-motion";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import {
  sendMessageToAI,
  getChatHistory,
  startNewConversation,
  transcribeAudioToText,
  type ChatMessage,
} from "@/lib/openai-assistant";

interface FileAttachment {
  name: string;
  type: string;
  size: number;
  url: string;
  file?: File;
  preview?: string;
}

interface AIChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Расширенный интерфейс сообщения с файлами
interface MessageWithFiles extends ChatMessage {
  attachments?: FileAttachment[];
}

// Максимальная длительность записи: 2 минуты (120 секунд)
const MAX_RECORDING_DURATION = 120; // секунд
// Минимальная длительность записи: 500ms (0.5 секунды)
const MIN_RECORDING_DURATION = 500; // миллисекунды

export const AIChatDialog = ({ open, onOpenChange }: AIChatDialogProps) => {
  const [messages, setMessages] = useState<MessageWithFiles[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const maxDurationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRecordingRef = useRef<boolean>(false);
  const [previewImage, setPreviewImage] = useState<FileAttachment | null>(null);
  const [showMicrophoneInstructions, setShowMicrophoneInstructions] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const {
    isRecording,
    startRecording,
    stopRecording,
    duration,
    error: recordingError,
  } = useVoiceRecording();

  // Защита от случайного завершения записи
  const recordingStartTimeRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);
  
  // Синхронизируем ref с состоянием записи для использования в таймере
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Загружаем историю при открытии диалога
  useEffect(() => {
    if (open) {
      console.log("🔄 Загружаем историю диалога...");
      loadChatHistory();
    }
  }, [open]);

  // Очищаем blob URLs только при закрытии диалога (не при каждом изменении messages)
  useEffect(() => {
    if (!open && previewImage) {
      setPreviewImage(null);
    }
  }, [open, previewImage]);

  // Автопрокрутка к последнему сообщению
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        '[data-radix-scroll-area-viewport]'
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const loadChatHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const history = await getChatHistory();
      if (history.length > 0) {
        setMessages(history);
      } else {
        // Приветственное сообщение от AI
        setMessages([
          {
            role: "assistant",
            content:
              "Привет! 👋 Я твой персональный AI-куратор onAI Academy. Готов помочь с обучением, ответить на вопросы и дать персональные рекомендации. Чем могу помочь?",
          },
        ]);
      }
    } catch (error) {
      console.error("Ошибка загрузки истории:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить историю чата",
        variant: "destructive",
      });
      // Показываем приветственное сообщение даже при ошибке
      setMessages([
        {
          role: "assistant",
          content:
            "Привет! 👋 Я твой персональный AI-куратор onAI Academy. Готов помочь с обучением, ответить на вопросы и дать персональные рекомендации. Чем могу помочь?",
        },
      ]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      // Проверка размера файла (макс 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Ошибка",
          description: `Файл ${file.name} слишком большой (макс. 10MB)`,
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const attachment: FileAttachment = {
          name: file.name,
          type: file.type,
          size: file.size,
          url: URL.createObjectURL(file),
          file: file,
          preview: e.target?.result as string,
        };
        setAttachments((prev) => [...prev, attachment]);
      };
      reader.readAsDataURL(file);
    });

    // Очищаем input для возможности повторного выбора того же файла
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      const newAttachments = [...prev];
      URL.revokeObjectURL(newAttachments[index].url);
      newAttachments.splice(index, 1);
      return newAttachments;
    });
  };

  const sendMessage = async () => {
    if (!input.trim() && attachments.length === 0) return;
    if (isLoading) return;

    const messageText = input.trim();
    const currentAttachments = [...attachments];

    // Сохраняем копии файлов для отображения (создаём новые blob URLs)
    const savedAttachments: FileAttachment[] = currentAttachments.map(att => {
      // Сохраняем файл и создаём новый blob URL
      const file = att.file;
      let fileUrl = att.url;
      let preview = att.preview;
      
      // Если есть файл, создаём новый URL и preview
      if (file) {
        fileUrl = URL.createObjectURL(file);
        // Для изображений создаём preview
        if (file.type.startsWith('image/') && !preview) {
          preview = fileUrl;
        }
      }
      
      return {
        name: att.name,
        type: att.type,
        size: att.size,
        url: fileUrl,
        file: file, // Сохраняем файл для скачивания
        preview: preview,
      };
    });

    const userMessage: MessageWithFiles = {
      role: "user",
      content: messageText || "📎 Прикреплён файл",
      file_ids: [],
      attachments: savedAttachments.length > 0 ? savedAttachments : undefined,
    };

    // Очищаем вложения из input (но сохраняем в сообщении)
    // НЕ очищаем URL старых attachments, так как они нужны для отображения
    setAttachments([]);

    // Добавляем сообщение пользователя в UI
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Формируем текст сообщения
      // Если есть только изображения без текста, отправляем пустую строку (будет заменено на дефолтный запрос)
      let messageToSend = messageText;
      if (!messageText && currentAttachments.length > 0) {
        const hasImages = currentAttachments.some(att => att.type.startsWith('image/'));
        if (hasImages) {
          // Для изображений отправляем пустую строку - в openai-assistant.ts будет добавлен дефолтный запрос
          messageToSend = "";
        } else {
          messageToSend = "Проанализируй файл";
        }
      } else if (!messageText) {
        messageToSend = "Проанализируй файл";
      }
      
      // Показываем индикатор "печатает..."
      setIsTyping(true);

      // Отправляем сообщение в AI (с файлами если есть)
      const response = await sendMessageToAI(
        messageToSend,
        currentAttachments
      );

      // Скрываем индикатор "печатает..."
      setIsTyping(false);

      // Добавляем ответ AI (проверяем, что ответ не пустой и не дублируется)
      if (response && response.trim()) {
        setMessages((prev) => {
          // Проверяем, что последнее сообщение не такое же (защита от дублирования)
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.role === "assistant" && lastMessage.content === response) {
            console.log("⚠️ Предотвращено дублирование ответа");
            return prev;
          }
          return [
            ...prev,
            {
              role: "assistant",
              content: response,
            },
          ];
        });
      }

      toast({
        title: "✅ Ответ получен",
        description: "AI-куратор ответил на твой вопрос",
      });
    } catch (error: any) {
      console.error("❌ Ошибка:", error);
      
      // Скрываем индикатор "печатает..." при ошибке
      setIsTyping(false);

      const errorMessage: ChatMessage = {
        role: "assistant",
        content: `❌ Упс! Ошибка: ${error.message}`,
      };

      setMessages((prev) => {
        // Проверяем, что последнее сообщение не такое же (защита от дублирования)
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.role === "assistant" && lastMessage.content === errorMessage.content) {
          console.log("⚠️ Предотвращено дублирование ошибки");
          return prev;
        }
        return [...prev, errorMessage];
      });

      toast({
        title: "❌ Ошибка",
        description: "Не удалось получить ответ от AI.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleNewConversation = async () => {
    try {
      await startNewConversation();
      setMessages([
        {
          role: "assistant",
          content:
            "Привет! 👋 Я твой персональный AI-куратор onAI Academy. Готов помочь с обучением, ответить на вопросы и дать персональные рекомендации. Чем могу помочь?",
        },
      ]);
      toast({
        title: "Новая беседа",
        description: "Начата новая беседа с AI-куратором",
      });
    } catch (error) {
      console.error("Ошибка начала новой беседы:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось начать новую беседу",
        variant: "destructive",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Автоматическое изменение высоты textarea
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  // Функция для СТАРТА записи (toggle-паттерн)
  const handleStartRecording = async (e?: React.MouseEvent | React.PointerEvent) => {
    // Предотвращаем всплытие события
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log("🎤 [TOGGLE] Начало записи");
    
    // Защита от повторного запуска
    if (isRecording || isProcessingRef.current) {
      console.log("⚠️ [TOGGLE] Запись уже идёт или обрабатывается, игнорируем");
      return;
    }
    
    isProcessingRef.current = true;
    
    try {
      // Устанавливаем время начала ДО начала записи
      recordingStartTimeRef.current = Date.now();
      console.log("⏱️ [TOGGLE] Время начала установлено:", new Date(recordingStartTimeRef.current).toISOString());
      
      // Для iOS Safari важно запрашивать разрешение в контексте пользовательского взаимодействия
      await startRecording();
      
      // Обновляем ref для проверки в таймере
      isRecordingRef.current = true;
      
      // Устанавливаем автоматическую остановку через максимальное время
      maxDurationTimeoutRef.current = setTimeout(() => {
        // Проверяем через ref, так как состояние может быть устаревшим в замыкании
        if (isRecordingRef.current) {
          console.log("⏱️ [TOGGLE] Достигнуто максимальное время записи (2 минуты), останавливаем...");
          isRecordingRef.current = false;
          handleStopRecording(); // Автоматическая остановка по таймеру
        // Минималистичный toast
        toast({
          title: "⏱️ Максимум 2 минуты",
          duration: 2000,
        });
        }
      }, MAX_RECORDING_DURATION * 1000);
      
      // Убираем toast при старте записи - индикатор и так виден
      // toast({
      //   title: "🎤 Запись начата",
      //   description: `Говорите... Нажмите кнопку снова для остановки (максимум ${MAX_RECORDING_DURATION} секунд)`,
      //   duration: 3000,
      // });
    } catch (error: any) {
      console.error("❌ === ОШИБКА В handleStartRecording ===");
      console.error("❌ Ошибка:", error);
      console.error("❌ Тип ошибки:", typeof error);
      console.error("❌ Сообщение ошибки:", error?.message);
      console.error("❌ Имя ошибки:", error?.name);
      console.error("❌ Стек ошибки:", error?.stack);
      
      const errorMessage = error?.message || "";
      
      if (errorMessage === "BROWSER_NOT_SUPPORTED") {
        console.error("❌ Показываем ошибку: Браузер не поддерживается");
        toast({
          title: "❌ Браузер не поддерживается",
          variant: "destructive",
          duration: 3000,
        });
      } else if (errorMessage === "HTTPS_REQUIRED") {
        console.error("❌ Показываем ошибку: Требуется HTTPS или localhost");
        toast({
          title: "🔒 Нужен HTTPS",
          variant: "destructive",
          duration: 3000,
        });
        // Также показываем инструкцию
        setShowMicrophoneInstructions(true);
      } else if (errorMessage === "PERMISSION_DENIED") {
        console.log("✅ Показываем инструкцию по разрешению микрофона");
        // Показываем инструкцию по разрешению микрофона
        setShowMicrophoneInstructions(true);
        toast({
          title: "🎤 Разрешите доступ",
          variant: "destructive",
          duration: 3000,
        });
      } else if (errorMessage === "DEVICE_NOT_FOUND") {
        toast({
          title: "❌ Микрофон не найден",
          variant: "destructive",
          duration: 3000,
        });
      } else if (errorMessage === "DEVICE_IN_USE") {
        toast({
          title: "❌ Микрофон занят",
          variant: "destructive",
          duration: 3000,
        });
      } else {
        toast({
          title: "❌ Ошибка доступа",
          variant: "destructive",
          duration: 3000,
        });
      }
    } finally {
      // Сбрасываем флаг через небольшую задержку, чтобы предотвратить двойное срабатывание
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 100);
    }
  };

  // Функция для ОСТАНОВКИ записи (toggle-паттерн)
  const handleStopRecording = async () => {
    console.log("🛑 [TOGGLE] Остановка записи");
    
    // ВАЖНО: Проверяем, что запись действительно активна
    if (!isRecording) {
      console.warn("⚠️ [TOGGLE] Запись не активна, игнорируем остановку");
      return;
    }
    
    const stopTime = Date.now();
    
    // Проверяем, что recordingStartTimeRef был установлен
    if (recordingStartTimeRef.current === 0) {
      console.error("❌ [TOGGLE] recordingStartTimeRef не был установлен!");
      // Не продолжаем, если время начала не установлено
      return;
    }
    
    const recordingDuration = stopTime - recordingStartTimeRef.current;
    
    console.log("🛑 [TOGGLE] ===== ОСТАНОВКА ЗАПИСИ =====");
    console.log("🛑 [TOGGLE] Время начала:", new Date(recordingStartTimeRef.current).toISOString());
    console.log("🛑 [TOGGLE] Время остановки:", new Date(stopTime).toISOString());
    console.log("🛑 [TOGGLE] Длительность:", recordingDuration, "ms (", (recordingDuration / 1000).toFixed(3), "сек)");
    
    // Проверяем минимальную длительность
    if (recordingDuration < MIN_RECORDING_DURATION) {
      console.warn("⚠️ [TOGGLE] Запись слишком короткая:", recordingDuration, "ms <", MIN_RECORDING_DURATION, "ms");
      console.warn("⚠️ [TOGGLE] Пропускаем обработку, запись будет игнорирована");
      
      // Обновляем ref и очищаем таймеры
      isRecordingRef.current = false;
      if (maxDurationTimeoutRef.current) {
        clearTimeout(maxDurationTimeoutRef.current);
        maxDurationTimeoutRef.current = null;
      }
      
      // Останавливаем запись без обработки
      try {
        await stopRecording();
      } catch (err) {
        console.error("Ошибка при остановке короткой записи:", err);
      }
      
      toast({
        title: "⚠️ Слишком короткая запись",
        variant: "destructive",
        duration: 2000,
      });
      return;
    }
    
    // Обновляем ref
    isRecordingRef.current = false;
    
    // Очищаем таймер автоматической остановки
    if (maxDurationTimeoutRef.current) {
      clearTimeout(maxDurationTimeoutRef.current);
      maxDurationTimeoutRef.current = null;
      console.log("🛑 [TOGGLE] Таймер максимальной длительности очищен");
    }
    
    console.log("✅ [TOGGLE] Запись прошла проверку минимальной длительности, продолжаем обработку");
    
    const audioBlob = await stopRecording();
    if (!audioBlob) {
      // Запись была слишком короткой или произошла ошибка
      console.warn("⚠️ [ДИАГНОСТИКА] Нет данных для транскрипции");
      console.warn("⚠️ [ДИАГНОСТИКА] Длительность была:", recordingDuration, "ms");
      console.warn("⚠️ [ДИАГНОСТИКА] audioBlob =", audioBlob);
      
      toast({
        title: "⚠️ Ошибка записи",
        variant: "destructive",
        duration: 2000,
      });
      return;
    }

    // Проверяем размер файла (должен быть больше 0)
    if (audioBlob.size === 0) {
      console.warn("⚠️ [ДИАГНОСТИКА] Файл пустой, размер:", audioBlob.size, "байт");
      toast({
        title: "⚠️ Пустая запись",
        variant: "destructive",
        duration: 2000,
      });
      return;
    }
    
    console.log("✅ [ДИАГНОСТИКА] Аудио записано успешно, размер:", audioBlob.size, "байт");

    setIsLoading(true);
    
    try {
      // Убираем toast при транскрипции - индикатор загрузки и так есть
      // toast({
      //   title: "🎙️ Транскрибируем...",
      //   description: "Преобразуем речь в текст",
      // });

      const transcription = await transcribeAudioToText(audioBlob);
      
      if (!transcription || transcription.trim().length === 0) {
        throw new Error("Не удалось распознать речь");
      }

      // Добавляем транскрипцию к существующему тексту (не заменяем)
      setInput((prevInput) => {
        // Если поле пустое - просто устанавливаем новый текст
        if (!prevInput.trim()) {
          return transcription;
        }
        // Если поле не пустое - добавляем с пробелом
        return `${prevInput.trim()} ${transcription.trim()}`;
      });
      
      // Убираем toast при успехе - текст уже в поле
      // toast({
      //   title: "✅ Готово!",
      //   description: "Голос распознан, можешь отправить",
      // });
    } catch (error: any) {
      console.error("❌ Ошибка транскрипции:", error);
      toast({
        title: "❌ Ошибка распознавания",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
      // Очищаем таймер если он был установлен
      if (maxDurationTimeoutRef.current) {
        clearTimeout(maxDurationTimeoutRef.current);
        maxDurationTimeoutRef.current = null;
      }
    }
  };

  // Toggle-паттерн: клик = старт/стоп записи (лучше для веб-версии)
  const handleMicrophoneToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log("🎤 [TOGGLE] Клик по микрофону, текущее состояние:", isRecording);
    
    // Если запись идет - останавливаем
    if (isRecording) {
      console.log("🛑 [TOGGLE] Останавливаем запись...");
      await handleStopRecording();
      return;
    }
    
    // Если запись не идет - начинаем
    console.log("▶️ [TOGGLE] Начинаем запись...");
    await handleStartRecording(e as any);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleFileOpen = (attachment: FileAttachment, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    try {
      // Для изображений показываем в модальном окне (не открываем blob URL в новой вкладке)
      if (attachment.type.startsWith('image/')) {
        if (attachment.url) {
          setPreviewImage(attachment);
        } else if (attachment.file) {
          // Если нет URL, но есть файл, создаём временный URL для превью
          const url = URL.createObjectURL(attachment.file);
          setPreviewImage({
            ...attachment,
            url: url,
          });
        }
      } else if (attachment.file) {
        // Для других файлов (PDF и т.д.) создаём временный URL и открываем
        const url = URL.createObjectURL(attachment.file);
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // Очищаем URL через некоторое время
        setTimeout(() => {
          try {
            URL.revokeObjectURL(url);
          } catch (err) {
            // Игнорируем ошибки при очистке
          }
        }, 1000);
      } else if (attachment.url && !attachment.url.startsWith('blob:')) {
        // Для обычных URL (не blob) открываем в новой вкладке
        window.open(attachment.url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error("Ошибка при открытии файла:", error);
      toast({
        title: "❌ Ошибка",
        description: "Не удалось открыть файл",
        variant: "destructive",
      });
    }
  };

  const handleFileDownload = (attachment: FileAttachment) => {
    if (attachment.file) {
      // Используем файл напрямую для скачивания
      const url = URL.createObjectURL(attachment.file);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Очищаем URL после скачивания
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } else if (attachment.url) {
      // Fallback: используем URL если файл недоступен
      const a = document.createElement('a');
      a.href = attachment.url;
      a.download = attachment.name;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <ImageIcon className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl h-[70vh] w-[95vw] sm:w-auto flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-neon/20 rounded-full blur-lg" />
                <motion.div 
                  className="relative p-2 bg-gradient-to-br from-neon/20 to-[hsl(var(--cyber-blue))]/20 border border-neon/40 rounded-full overflow-hidden"
                  animate={{
                    rotateY: [0, 360],
                  }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {/* Сфера для вращения */}
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: "radial-gradient(circle at 30% 30%, rgba(177,255,50,0.2), transparent 50%)",
                    }}
                    animate={{
                      rotateX: [0, 360],
                      rotateZ: [0, 360],
                    }}
                    transition={{
                      duration: 8,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                  <Bot className="w-5 h-5 text-neon relative z-10" />
                </motion.div>
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">
                  AI-куратор
                </DialogTitle>
                <DialogDescription>
                  Персональный помощник по обучению
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNewConversation}
              className="text-xs"
            >
              <Sparkles className="w-4 h-4 mr-1" />
              Новый
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 [&>[data-radix-scroll-area-scrollbar]]:bg-transparent" ref={scrollAreaRef}>
          <div className="py-4 space-y-4">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-neon" />
              </div>
            ) : (
              <>
                {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <motion.div
                      animate={isTyping && index === messages.length - 1 ? {
                        scale: [1, 1.1, 1],
                      } : {}}
                      transition={{
                        duration: 1,
                        repeat: isTyping && index === messages.length - 1 ? Infinity : 0,
                        ease: "easeInOut",
                      }}
                    >
                      <Avatar className="h-8 w-8 border border-neon/30">
                        <AvatarFallback className="bg-neon/10 relative overflow-hidden">
                          {/* Анимация "печатает" - пульсирующие точки на последнем сообщении бота */}
                          {isTyping && index === messages.length - 1 && message.role === "assistant" && (
                            <motion.div
                              className="absolute inset-0 flex items-center justify-center gap-0.5"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                            >
                              {[0, 1, 2].map((i) => (
                                <motion.div
                                  key={i}
                                  className="w-1 h-1 bg-neon rounded-full"
                                  animate={{
                                    y: [0, -4, 0],
                                    opacity: [0.3, 1, 0.3],
                                  }}
                                  transition={{
                                    duration: 0.6,
                                    repeat: Infinity,
                                    delay: i * 0.2,
                                    ease: "easeInOut",
                                  }}
                                />
                              ))}
                            </motion.div>
                          )}
                          <Bot className={`w-4 h-4 text-neon relative z-10 ${isTyping && index === messages.length - 1 && message.role === "assistant" ? 'opacity-50' : ''}`} />
                        </AvatarFallback>
                      </Avatar>
                    </motion.div>
                  )}

                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === "user"
                        ? "bg-neon/20 text-foreground border border-neon/30"
                        : "bg-secondary text-foreground border border-border"
                    }`}
                  >
                    {/* Message content with Markdown support */}
                    <div className="text-sm prose-custom break-words overflow-wrap-anywhere max-w-full">
                      {message.role === "assistant" ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            // Параграфы
                            p: ({ children }) => (
                              <p className="mb-2 last:mb-0 leading-relaxed text-sm break-words overflow-wrap-anywhere">{children}</p>
                            ),
                            
                            // Жирный текст (**текст**)
                            strong: ({ children }) => (
                              <strong className="font-bold text-neon">{children}</strong>
                            ),
                            
                            // Курсив (*текст*)
                            em: ({ children }) => (
                              <em className="italic text-foreground/90">{children}</em>
                            ),
                            
                            // Заголовки
                            h1: ({ children }) => (
                              <h1 className="text-base font-bold mb-2 mt-3 text-foreground">{children}</h1>
                            ),
                            h2: ({ children }) => (
                              <h2 className="text-sm font-bold mb-2 mt-2 text-foreground">{children}</h2>
                            ),
                            h3: ({ children }) => (
                              <h3 className="text-sm font-semibold mb-1 mt-2 text-foreground">{children}</h3>
                            ),
                            
                            // Списки
                            ul: ({ children }) => (
                              <ul className="list-disc list-inside mb-2 space-y-1 ml-2 text-sm">{children}</ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="list-decimal list-inside mb-2 space-y-1 ml-2 text-sm">{children}</ol>
                            ),
                            li: ({ children }) => (
                              <li className="text-sm leading-relaxed">{children}</li>
                            ),
                            
                            // Код (инлайн `код` и блоки)
                            code: ({ inline, children, ...props }: any) => 
                              inline ? (
                                <code className="px-1.5 py-0.5 bg-secondary/80 rounded text-xs font-mono text-neon border border-neon/20" {...props}>
                                  {children}
                                </code>
                              ) : (
                                <code className="block p-3 bg-secondary/80 rounded-lg text-xs font-mono overflow-x-auto my-2 border border-border/40 break-words overflow-wrap-anywhere" {...props}>
                                  {children}
                                </code>
                              ),
                            
                            // Pre (для code blocks)
                            pre: ({ children }) => (
                              <pre className="mb-2 overflow-x-auto">{children}</pre>
                            ),
                            
                            // Цитаты (> текст)
                            blockquote: ({ children }) => (
                              <blockquote className="border-l-4 border-neon/60 pl-3 py-1 italic text-muted-foreground mb-2 bg-secondary/30 rounded-r text-sm break-words overflow-wrap-anywhere">
                                {children}
                              </blockquote>
                            ),
                            
                            // Ссылки
                            a: ({ children, href }) => (
                              <a 
                                href={href} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-neon underline hover:text-neon/80 transition-colors text-sm break-all"
                              >
                                {children}
                              </a>
                            ),
                            
                            // Горизонтальная линия
                            hr: () => (
                              <hr className="my-3 border-border/40" />
                            ),
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      ) : (
                        <div className="whitespace-pre-wrap break-words text-sm overflow-wrap-anywhere word-break-break-word">
                          {message.content}
                        </div>
                      )}
                    </div>
                    
                    {/* Отображение файлов в сообщении */}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-3 space-y-2 border-t border-border/30 pt-2">
                        {message.attachments.map((attachment, idx) => {
                          const isImage = attachment.type.startsWith('image/');
                          return (
                            <div
                              key={idx}
                              className="space-y-2"
                            >
                              {/* Превью изображения */}
                              {isImage && attachment.url && (
                                <div className="relative group/image">
                                  <img
                                    src={attachment.url}
                                    alt={attachment.name}
                                    className="w-full max-w-xs rounded-lg border border-border/30 cursor-pointer hover:border-neon/50 transition-colors"
                                    onClick={(e) => handleFileOpen(attachment, e)}
                                  />
                                  <div className="absolute top-2 right-2 opacity-0 group-hover/image:opacity-100 transition-opacity flex gap-1">
                                    <Button
                                      variant="secondary"
                                      size="icon"
                                      className="h-7 w-7 bg-background/80 hover:bg-background"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleFileOpen(attachment);
                                      }}
                                      title="Открыть"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      variant="secondary"
                                      size="icon"
                                      className="h-7 w-7 bg-background/80 hover:bg-background"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleFileDownload(attachment);
                                      }}
                                      title="Скачать"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                              
                              {/* Информация о файле */}
                              <div className="flex items-center gap-2 p-2 bg-background/50 rounded-lg border border-border/30 hover:border-neon/30 transition-colors group">
                                <div className="flex-shrink-0 text-neon">
                                  {getFileIcon(attachment.type)}
                                </div>
                                <div className="flex-1 min-w-0 overflow-hidden">
                                  <p className="text-xs font-medium text-foreground truncate break-all">
                                    {attachment.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {formatFileSize(attachment.size)}
                                  </p>
                                </div>
                                {!isImage && (
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => handleFileOpen(attachment)}
                                      title="Открыть"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => handleFileDownload(attachment)}
                                      title="Скачать"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {message.role === "user" && (
                    <Avatar className="h-8 w-8 border border-neon/30">
                      <AvatarFallback className="bg-neon/10">
                        <User className="w-4 h-4 text-neon" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              
              {/* Индикатор "печатает..." с анимацией */}
              {isTyping && (
                <div className="flex gap-3 justify-start">
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <Avatar className="h-8 w-8 border border-neon/30">
                      <AvatarFallback className="bg-neon/10 relative overflow-hidden">
                        {/* Анимация "печатает" - пульсирующие точки */}
                        <motion.div
                          className="absolute inset-0 flex items-center justify-center gap-0.5"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          {[0, 1, 2].map((i) => (
                            <motion.div
                              key={i}
                              className="w-1 h-1 bg-neon rounded-full"
                              animate={{
                                y: [0, -4, 0],
                                opacity: [0.3, 1, 0.3],
                              }}
                              transition={{
                                duration: 0.6,
                                repeat: Infinity,
                                delay: i * 0.2,
                                ease: "easeInOut",
                              }}
                            />
                          ))}
                        </motion.div>
                        <Bot className="w-4 h-4 text-neon relative z-10 opacity-50" />
                      </AvatarFallback>
                    </Avatar>
                  </motion.div>
                  <div className="bg-secondary rounded-lg px-4 py-3 border border-border">
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">Печатает</span>
                      <div className="flex gap-1">
                        <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                        <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                        <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              </>
            )}
          </div>
        </ScrollArea>

        {/* Вложения */}
        {attachments.length > 0 && (
          <div className="px-6 py-2 border-t border-b">
            <div className="flex flex-wrap gap-2">
              {attachments.map((attachment, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="flex items-center gap-1 pr-1"
                >
                  <Paperclip className="w-3 h-3" />
                  <span className="text-xs">
                    {attachment.name} ({formatFileSize(attachment.size)})
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-destructive/20"
                    onClick={() => removeAttachment(index)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Input область */}
        <div className="px-6 pb-6 pt-4 border-t">
          {/* Индикатор записи */}
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-1 mb-2"
            >
              <div className="flex items-center gap-2 text-xs text-red-500">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span>Запись... {duration}с / {MAX_RECORDING_DURATION}с</span>
              </div>
              {/* Прогресс-бар максимального времени */}
              <div className="w-full h-1 bg-background/50 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${
                    duration >= MAX_RECORDING_DURATION - 10
                      ? "bg-red-500"
                      : duration >= MAX_RECORDING_DURATION - 30
                      ? "bg-yellow-500"
                      : "bg-neon"
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${(duration / MAX_RECORDING_DURATION) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              {/* Предупреждение когда остается мало времени */}
              {duration >= MAX_RECORDING_DURATION - 10 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-xs text-red-400 flex items-center gap-1"
                >
                  <span>⚠️ Осталось {MAX_RECORDING_DURATION - duration}с до автоматической остановки</span>
                </motion.div>
              )}
            </motion.div>
          )}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.txt,.md,.jpg,.jpeg,.png,.gif"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Напишите сообщение..."
              disabled={isLoading}
              className="flex-1 min-h-[40px] max-h-[200px] resize-none overflow-y-auto"
              rows={1}
            />
            {/* Кнопка микрофона - TOGGLE (клик = старт/стоп) */}
            <Button
              size="icon"
              variant={isRecording ? "destructive" : "outline"}
              className="flex-shrink-0 relative select-none"
              onClick={handleMicrophoneToggle}
              disabled={isLoading}
              title={isRecording ? "Нажмите для остановки записи" : "Нажмите для начала записи"}
            >
              <Mic className={`w-4 h-4 ${isRecording ? "animate-pulse" : ""}`} />
              {isRecording && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
            </Button>
            <Button
              onClick={sendMessage}
              disabled={isLoading || (input.trim() === "" && attachments.length === 0)}
              className="shrink-0 bg-neon text-background hover:bg-neon/90"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Модальное окно с инструкцией по микрофону */}
      <Dialog open={showMicrophoneInstructions} onOpenChange={setShowMicrophoneInstructions}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>🎤 Как разрешить доступ к микрофону</DialogTitle>
            <DialogDescription>
              Пошаговая инструкция для разных браузеров
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Chrome / Яндекс Браузер / Edge:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Нажми на иконку <strong>информации (i)</strong> или <strong>замка 🔒</strong> слева от адреса</li>
                <li>Найди "Микрофон" в списке разрешений</li>
                <li>Выбери "Разрешить" или "Спрашивать"</li>
                <li>Обнови страницу (F5) и нажми на микрофон снова</li>
              </ol>
              <p className="text-xs text-muted-foreground mt-2">
                💡 Если иконки нет - нажми на адресную строку и посмотри слева от адреса
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Safari (Mac/iPhone):</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Нажми на иконку <strong>"aA"</strong> или <strong>замка 🔒</strong> слева от адреса</li>
                <li>Выбери "Настройки для этого сайта"</li>
                <li>Найди "Микрофон" и выбери "Разрешить"</li>
                <li>Обнови страницу и нажми на микрофон снова</li>
              </ol>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Firefox:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Нажми на иконку <strong>замка 🔒</strong> или <strong>информации (i)</strong> слева от адреса</li>
                <li>Нажми "Больше информации" или "Настройки сайта"</li>
                <li>Перейди на вкладку "Разрешения"</li>
                <li>Найди "Доступ к микрофону" и выбери "Разрешить"</li>
                <li>Обнови страницу и нажми на микрофон снова</li>
              </ol>
            </div>
            <div className="pt-2 border-t bg-muted/30 p-3 rounded-lg">
              <p className="text-xs font-semibold text-foreground mb-2">
                ⚠️ Важно:
              </p>
              <p className="text-xs text-muted-foreground mb-2">
                Если системное уведомление браузера не появилось при нажатии на микрофон, значит доступ уже заблокирован. 
                Следуй инструкции выше, чтобы разрешить доступ вручную.
              </p>
              {window.location.protocol === "http:" && 
               window.location.hostname !== "localhost" && 
               window.location.hostname !== "127.0.0.1" && (
                <div className="mt-2 p-2 bg-yellow-500/20 border border-yellow-500/50 rounded">
                  <p className="text-xs font-semibold text-yellow-400 mb-1">
                    🔒 Проблема с IP-адресом:
                  </p>
                  <p className="text-xs text-yellow-300">
                    Браузер блокирует доступ к микрофону на HTTP с IP-адресом ({window.location.hostname}). 
                    <strong> Решение:</strong> Используйте <code className="bg-black/30 px-1 rounded">localhost:8080</code> вместо IP-адреса, 
                    или настройте HTTPS на сервере.
                  </p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowMicrophoneInstructions(false)}>
              Понятно
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Модальное окно для просмотра изображений */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0">
          {previewImage && (
            <>
              <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-lg font-semibold">
                    {previewImage.name}
                  </DialogTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleFileDownload(previewImage)}
                      title="Скачать"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </DialogHeader>
              <div className="p-6 flex items-center justify-center bg-background overflow-auto max-h-[calc(90vh-120px)]">
                <img
                  src={previewImage.url}
                  alt={previewImage.name}
                  className="max-w-full max-h-full object-contain rounded-lg"
                  onError={(e) => {
                    console.error("Ошибка загрузки изображения в превью:", previewImage.name);
                    toast({
                      title: "❌ Ошибка",
                      description: "Не удалось загрузить изображение",
                      variant: "destructive",
                    });
                    setPreviewImage(null);
                  }}
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

