import { useState, useEffect, useRef } from "react";
import { Bot, User, Send, Paperclip, X, Loader2, Sparkles, Mic, Download, Eye, FileText, Image as ImageIcon, MessageSquare } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import { supabase } from "@/lib/supabase";
// ✅ IMPORT FROM TRIPWIRE SPECIFIC LIB
import {
  sendMessageToAI,
  getChatHistory,
  startNewConversation,
  transcribeAudioToText,
  type ChatMessage,
} from "@/lib/tripwire-openai";
import { getStatusSequence } from "@/lib/ai-loading-states";

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

export const TripwireAIChatDialog = ({ open, onOpenChange }: AIChatDialogProps) => {
  const [messages, setMessages] = useState<MessageWithFiles[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingStatus, setTypingStatus] = useState("Печатает...");
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const maxDurationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRecordingRef = useRef<boolean>(false);
  const [previewImage, setPreviewImage] = useState<FileAttachment | null>(null);
  const [showMicrophoneInstructions, setShowMicrophoneInstructions] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  
  const {
    isRecording,
    startRecording,
    stopRecording,
    duration,
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
      console.log("🔄 Загружаем историю диалога (Tripwire)...");
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

  // 7 вариантов приветственных сообщений (Tripwire specific)
  const getRandomGreeting = () => {
    const greetings = [
      "Привет! 👋 Я твой AI-куратор по программе Tripwire. Готов помочь с модулями и ответить на вопросы.",
      "Здравствуй! 🎓 Рад видеть тебя! Я помогу тебе освоить основы AI и пройти все этапы обучения.",
      "Приветствую! ✨ Застрял на каком-то модуле? Я здесь, чтобы помочь тебе двигаться вперед к сертификату!",
      "Хей! 🚀 Добро пожаловать в чат Tripwire! Чем могу помочь по текущему уроку?",
      "Привет, CEO! 💡 Я твой цифровой помощник. Давай разберем сложные моменты вместе.",
      "Доброго времени! 🌟 Я здесь, чтобы твой старт в AI был максимально плавным. Есть вопросы?",
      "Привет! 🎯 Я AI-куратор. Спрашивай о чем угодно по курсу — я на связи!"
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  };

  const loadChatHistory = async () => {
    setIsLoadingHistory(true);
    try {
      // Получаем userId
      let userId = 'user-1'; // Fallback
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          userId = user.id;
        }
      } catch (authError) {
        console.warn('⚠️ Ошибка получения userId:', authError);
      }

      const history = await getChatHistory(userId);
      if (history.length > 0) {
        setMessages(history);
      } else {
        // Случайное приветственное сообщение от AI
        setMessages([
          {
            role: "assistant",
            content: getRandomGreeting(),
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
      setMessages([
        {
          role: "assistant",
          content: getRandomGreeting(),
        },
      ]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const filesToProcess = Array.from(files);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    for (const originalFile of filesToProcess) {
      if (originalFile.size > 20 * 1024 * 1024) {
        toast({
          title: "Ошибка",
          description: `Файл ${originalFile.name} слишком большой (макс. 20MB)`,
          variant: "destructive",
        });
        continue;
      }

      try {
        const arrayBuffer = await originalFile.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: originalFile.type });
        const fileCopy = new File([blob], originalFile.name, {
          type: originalFile.type,
          lastModified: originalFile.lastModified,
        });

        const reader = new FileReader();
        reader.onload = (e) => {
          const attachment: FileAttachment = {
            name: fileCopy.name,
            type: fileCopy.type,
            size: fileCopy.size,
            url: URL.createObjectURL(fileCopy),
            file: fileCopy,
            preview: e.target?.result as string,
          };
          setAttachments((prev) => [...prev, attachment]);
        };
        reader.readAsDataURL(fileCopy);
      } catch (error: any) {
        console.error('❌ Ошибка копирования файла:', error);
        toast({
          title: "Ошибка",
          description: `Не удалось обработать файл ${originalFile.name}`,
          variant: "destructive",
        });
      }
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

    const savedAttachments: FileAttachment[] = currentAttachments.map(att => {
      const file = att.file;
      let fileUrl = att.url;
      let preview = att.preview;
      
      if (file) {
        fileUrl = URL.createObjectURL(file);
        if (file.type.startsWith('image/') && !preview) {
          preview = fileUrl;
        }
      }
      
      return {
        name: att.name,
        type: att.type,
        size: att.size,
        url: fileUrl,
        file: file,
        preview: preview,
      };
    });

    const userMessage: MessageWithFiles = {
      role: "user",
      content: messageText || "📎 Прикреплён файл",
      file_ids: [],
      attachments: savedAttachments.length > 0 ? savedAttachments : undefined,
    };

    setAttachments([]);
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      let messageToSend = messageText;
      if (!messageText && currentAttachments.length > 0) {
        const hasImages = currentAttachments.some(att => att.type.startsWith('image/'));
        if (hasImages) {
          messageToSend = "";
        } else {
          messageToSend = "Проанализируй файл";
        }
      } else if (!messageText) {
        messageToSend = "Проанализируй файл";
      }
      
      setIsTyping(true);
      
      const statusSequence = getStatusSequence();
      let currentStatusIndex = 0;
      setTypingStatus(statusSequence[0]);
      
      typingIntervalRef.current = setInterval(() => {
        currentStatusIndex++;
        if (currentStatusIndex < statusSequence.length) {
          setTypingStatus(statusSequence[currentStatusIndex]);
        } else {
          setTypingStatus("Печатает ✍️");
        }
      }, 3000);

      let userId = 'user-1';
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          userId = user.id;
        }
      } catch (authError) {
        console.warn('⚠️ Ошибка получения userId:', authError);
      }
      
      const timeoutId = setTimeout(() => {
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
        }
        setIsTyping(false);
        setIsLoading(false);
        toast({
          title: "⏱️ Превышено время ожидания",
          description: "AI не смог ответить за 45 секунд. Попробуй еще раз.",
          variant: "destructive",
        });
      }, 45000);
      
      try {
        // Pass 'curator' as assistant type, or maybe 'mentor' for Tripwire?
        // Keeping 'curator' as default for now
        const response = await sendMessageToAI(
          messageToSend,
          currentAttachments,
          userId,
          'tripwire' 
        );
        
        clearTimeout(timeoutId);

        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
        }
        setIsTyping(false);

      if (response && response.trim()) {
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.role === "assistant" && lastMessage.content === response) {
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
        description: "Tripwire AI ответил",
      });
      } catch (sendError: any) {
        console.error("❌ Ошибка отправки:", sendError);
        clearTimeout(timeoutId);
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
        }
        setIsTyping(false);
        throw sendError;
      }
    } catch (error: any) {
      console.error("❌ Ошибка:", error);
      
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
      setIsTyping(false);

      const errorMessage: ChatMessage = {
        role: "assistant",
        content: `❌ Упс! Ошибка: ${error.message}`,
      };

      setMessages((prev) => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.role === "assistant" && lastMessage.content === errorMessage.content) {
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
          content: getRandomGreeting(),
        },
      ]);
      toast({
        title: "Новая беседа",
        description: "Начата новая беседа с Tripwire AI",
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

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleStartRecording = async (e?: React.MouseEvent | React.PointerEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (isRecording || isProcessingRef.current) {
      return;
    }
    
    isProcessingRef.current = true;
    
    try {
      recordingStartTimeRef.current = Date.now();
      
      await startRecording();
      
      isRecordingRef.current = true;
      
      maxDurationTimeoutRef.current = setTimeout(() => {
        if (isRecordingRef.current) {
          isRecordingRef.current = false;
          handleStopRecording(); 
        toast({
          title: "⏱️ Максимум 2 минуты",
          duration: 2000,
        });
        }
      }, MAX_RECORDING_DURATION * 1000);
      
    } catch (error: any) {
      console.error("❌ Ошибка записи:", error);
      const errorMessage = error?.message || "";
      
      if (errorMessage === "BROWSER_NOT_SUPPORTED") {
        toast({
          title: "❌ Браузер не поддерживается",
          variant: "destructive",
          duration: 3000,
        });
      } else if (errorMessage === "HTTPS_REQUIRED") {
        toast({
          title: "🔒 Нужен HTTPS",
          variant: "destructive",
          duration: 3000,
        });
        setShowMicrophoneInstructions(true);
      } else if (errorMessage === "PERMISSION_DENIED") {
        setShowMicrophoneInstructions(true);
        toast({
          title: "🎤 Разрешите доступ",
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
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 100);
    }
  };

  const handleStopRecording = async () => {
    if (!isRecording) {
      return;
    }
    
    const stopTime = Date.now();
    
    if (recordingStartTimeRef.current === 0) {
      return;
    }
    
    const recordingDuration = stopTime - recordingStartTimeRef.current;
    
    if (recordingDuration < MIN_RECORDING_DURATION) {
      isRecordingRef.current = false;
      if (maxDurationTimeoutRef.current) {
        clearTimeout(maxDurationTimeoutRef.current);
        maxDurationTimeoutRef.current = null;
      }
      
      try {
        await stopRecording();
      } catch (err) {}
      
      toast({
        title: "⚠️ Слишком короткая запись",
        variant: "destructive",
        duration: 2000,
      });
      return;
    }
    
    isRecordingRef.current = false;
    
    if (maxDurationTimeoutRef.current) {
      clearTimeout(maxDurationTimeoutRef.current);
      maxDurationTimeoutRef.current = null;
    }
    
    const audioBlob = await stopRecording();
    if (!audioBlob || audioBlob.size === 0) {
      toast({
        title: "⚠️ Ошибка записи",
        variant: "destructive",
        duration: 2000,
      });
      return;
    }

    setIsLoading(true);
    
    try {
      let userId = 'user-1'; 
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          userId = user.id;
        }
      } catch (authError) {}

      const transcription = await transcribeAudioToText(audioBlob, userId);
      
      if (!transcription || transcription.trim().length === 0) {
        throw new Error("Не удалось распознать речь");
      }

      setInput((prevInput) => {
        if (!prevInput.trim()) {
          return transcription;
        }
        return `${prevInput.trim()} ${transcription.trim()}`;
      });
      
    } catch (error: any) {
      console.error("❌ Ошибка транскрипции:", error);
      toast({
        title: "❌ Ошибка распознавания",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
      if (maxDurationTimeoutRef.current) {
        clearTimeout(maxDurationTimeoutRef.current);
        maxDurationTimeoutRef.current = null;
      }
    }
  };

  const handleMicrophoneToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isRecording) {
      await handleStopRecording();
      return;
    }
    
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
      if (attachment.type.startsWith('image/')) {
        if (attachment.url) {
          setPreviewImage(attachment);
        } else if (attachment.file) {
          const url = URL.createObjectURL(attachment.file);
          setPreviewImage({
            ...attachment,
            url: url,
          });
        }
      } else if (attachment.file) {
        const url = URL.createObjectURL(attachment.file);
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => {
          try {
            URL.revokeObjectURL(url);
          } catch (err) {}
        }, 1000);
      } else if (attachment.url && !attachment.url.startsWith('blob:')) {
        window.open(attachment.url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      toast({
        title: "❌ Ошибка",
        description: "Не удалось открыть файл",
        variant: "destructive",
      });
    }
  };

  const handleFileDownload = (attachment: FileAttachment) => {
    if (attachment.file) {
      const url = URL.createObjectURL(attachment.file);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } else if (attachment.url) {
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
      <DialogContent
        className="max-w-4xl h-[85vh] w-[92vw] sm:w-auto flex flex-col p-0 gap-0 bg-[#242526] border-gray-700"
      >
        <DialogHeader className="px-4 sm:px-6 py-4 border-b border-gray-700 bg-[#1c1e21]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-[#3a3b3c] flex items-center justify-center">
                <Bot className="w-5 h-5 text-neon" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-semibold text-white leading-tight">
                  AI-куратор
                </DialogTitle>
                <DialogDescription className="text-gray-400 text-xs leading-tight">
                  Онлайн • {isTyping ? 'Печатает...' : 'Готов помочь'}
                </DialogDescription>
              </div>
            </div>
            <button
              onClick={handleNewConversation}
              className="flex-shrink-0 h-9 px-3 rounded-full bg-gradient-to-r from-[#00d95f] to-[#00b84f] hover:from-[#00e66c] hover:to-[#00c95b] text-black text-sm font-semibold flex items-center gap-1.5 transition-all shadow-sm hover:shadow-md"
              title="Начать новый разговор"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Новый чат</span>
            </button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-4 sm:px-6 bg-[#242526] [&>[data-radix-scroll-area-scrollbar]]:bg-transparent" ref={scrollAreaRef}>
          <div className="py-4 space-y-4">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  <p className="text-sm text-gray-400">Загрузка истории...</p>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-[#3a3b3c] flex items-center justify-center">
                      <Bot className="w-4 h-4 text-gray-300" />
                    </div>
                  )}

                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                      message.role === "user"
                        ? "bg-[#00d95f] text-black font-medium"
                        : "bg-[#3a3b3c] text-white"
                    }`}
                  >
                    <div className="text-sm prose-custom break-words overflow-wrap-anywhere max-w-full">
                      {message.role === "assistant" ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ children }) => (
                              <p className="mb-2 last:mb-0 leading-relaxed text-sm break-words overflow-wrap-anywhere">{children}</p>
                            ),
                            strong: ({ children }) => (
                              <strong className="font-semibold text-white">{children}</strong>
                            ),
                            em: ({ children }) => (
                              <em className="italic text-gray-200">{children}</em>
                            ),
                            h1: ({ children }) => (
                              <h1 className="text-base font-bold mb-2 mt-3 text-white">{children}</h1>
                            ),
                            h2: ({ children }) => (
                              <h2 className="text-sm font-bold mb-2 mt-2 text-white">{children}</h2>
                            ),
                            h3: ({ children }) => (
                              <h3 className="text-sm font-semibold mb-1 mt-2 text-white">{children}</h3>
                            ),
                            ul: ({ children }) => (
                              <ul className="list-disc list-inside mb-2 space-y-1 ml-2 text-sm">{children}</ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="list-decimal list-inside mb-2 space-y-1 ml-2 text-sm">{children}</ol>
                            ),
                            li: ({ children }) => (
                              <li className="text-sm leading-relaxed">{children}</li>
                            ),
                            code: ({ inline, children, ...props }: any) => 
                              inline ? (
                                <code className="px-1.5 py-0.5 bg-black/40 rounded text-xs font-mono text-gray-200" {...props}>
                                  {children}
                                </code>
                              ) : (
                                <code className="block p-3 bg-black/40 rounded-lg text-xs font-mono overflow-x-auto my-2 break-words overflow-wrap-anywhere text-gray-200" {...props}>
                                  {children}
                                </code>
                              ),
                            pre: ({ children }) => (
                              <pre className="mb-2 overflow-x-auto">{children}</pre>
                            ),
                            blockquote: ({ children }) => (
                              <blockquote className="border-l-3 border-gray-500 pl-3 py-1 italic text-gray-300 mb-2 bg-black/20 rounded-r text-sm break-words overflow-wrap-anywhere">
                                {children}
                              </blockquote>
                            ),
                            a: ({ children, href }) => (
                              <a 
                                href={href} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-[#00d95f] underline hover:text-[#00e66c] transition-colors text-sm break-all font-medium"
                              >
                                {children}
                              </a>
                            ),
                            hr: () => (
                              <hr className="my-3 border-gray-700" />
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
                    
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-3 space-y-2 border-t border-border/30 pt-2">
                        {message.attachments.map((attachment, idx) => {
                          const isImage = attachment.type.startsWith('image/');
                          return (
                            <div
                              key={idx}
                              className="space-y-2"
                            >
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
                    <div className="h-8 w-8 rounded-full bg-[#00d95f] flex items-center justify-center">
                      <User className="w-4 h-4 text-black" />
                    </div>
                  )}
                </motion.div>
              ))}
              
              {isTyping && (
                <div className="flex gap-3 justify-start">
                  <div className="h-8 w-8 rounded-full bg-[#3a3b3c] flex items-center justify-center">
                    <Bot className="w-4 h-4 text-gray-300" />
                  </div>
                  <div className="bg-[#3a3b3c] rounded-2xl px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      <span className="animate-bounce text-gray-300" style={{ animationDelay: '0ms' }}>.</span>
                      <span className="animate-bounce text-gray-300" style={{ animationDelay: '150ms' }}>.</span>
                      <span className="animate-bounce text-gray-300" style={{ animationDelay: '300ms' }}>.</span>
                    </div>
                  </div>
                </div>
              )}
              </>
            )}
          </div>
        </ScrollArea>

        {attachments.length > 0 && (
          <div className="px-4 sm:px-6 py-3 border-t border-gray-700 bg-[#1c1e21]">
            <div className="flex flex-wrap gap-2">
              {attachments.map((attachment, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#3a3b3c] rounded-lg text-white"
                >
                  <Paperclip className="w-3 h-3 text-gray-400" />
                  <span className="text-xs">
                    {attachment.name} ({formatFileSize(attachment.size)})
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-red-500/20 rounded-full ml-1"
                    onClick={() => removeAttachment(index)}
                  >
                    <X className="w-3 h-3 text-gray-400 hover:text-white" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="px-4 sm:px-6 pb-4 pt-3 border-t border-gray-700 bg-[#1c1e21]">
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-1 mb-2"
            >
              <div className="flex items-center gap-2 text-xs text-red-400 font-medium">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span>Запись... {duration}с / {MAX_RECORDING_DURATION}с</span>
              </div>
              <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${
                    duration >= MAX_RECORDING_DURATION - 10
                      ? "bg-red-500"
                      : duration >= MAX_RECORDING_DURATION - 30
                      ? "bg-yellow-500"
                      : "bg-[#00d95f]"
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${(duration / MAX_RECORDING_DURATION) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
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
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 text-gray-400 hover:text-gray-200 hover:bg-[#3a3b3c]"
            >
              <Paperclip className="w-5 h-5" />
            </Button>
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Напишите сообщение..."
              disabled={isLoading}
              className="flex-1 min-h-[40px] max-h-[200px] resize-none overflow-y-auto bg-[#3a3b3c] border-none text-white placeholder:text-gray-400 focus:ring-1 focus:ring-[#00d95f] rounded-3xl px-4 py-2"
              rows={1}
            />
            <Button
              size="icon"
              variant="ghost"
              className={`flex-shrink-0 relative select-none ${
                isRecording 
                  ? "text-red-500 hover:bg-red-500/10" 
                  : "text-gray-400 hover:text-gray-200 hover:bg-[#3a3b3c]"
              }`}
              onClick={handleMicrophoneToggle}
              disabled={isLoading}
              title={isRecording ? "Нажмите для остановки записи" : "Нажмите для начала записи"}
            >
              <Mic className={`w-5 h-5 ${isRecording ? "animate-pulse" : ""}`} />
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
              className="shrink-0 bg-[#00d95f] text-black hover:bg-[#00e66c] rounded-full w-9 h-9 p-0 disabled:opacity-50 font-semibold shadow-sm hover:shadow-md transition-all"
              size="icon"
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

      <Dialog open={showMicrophoneInstructions} onOpenChange={setShowMicrophoneInstructions}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>🎤 Как разрешить доступ к микрофону</DialogTitle>
            <DialogDescription>
              Пошаговая инструкция для разных браузеров
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* ... Instructions ... */}
            <p>Пожалуйста, разрешите доступ к микрофону в настройках браузера.</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowMicrophoneInstructions(false)}>
              Понятно
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

