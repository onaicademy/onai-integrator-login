import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send, Search, Mic, Smile, Paperclip, MoreVertical, 
  X, StopCircle, Play, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import {
  getMyChats,
  getChatMessages,
  sendTextMessage,
  uploadVoiceMessage,
  markMessagesAsRead,
  subscribeToMessages,
  getAllStudents,
  getOrCreateChat,
  type Chat as ChatType,
  type Message as MessageType,
} from "@/lib/messages-api";

interface Student {
  id: string;
  name: string;
  avatar?: string;
  online: boolean;
}

interface Chat {
  id: string;
  studentId: string;
  name: string;
  avatar?: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  timestamp: string;
  isMine: boolean;
  type: "text" | "voice" | "file";
  fileName?: string;
  duration?: number;
  attachmentUrl?: string;
}

// Mock emoji
const emojis = ["😊", "😂", "❤️", "👍", "🎉", "🔥", "👏", "🙏", "💯", "✨", "🚀", "💪"];

export default function Messages() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  // Список всех студентов (для начала нового чата)
  const [students, setStudents] = useState<Student[]>([]);

  // Активные чаты (из Supabase)
  const [chats, setChats] = useState<Chat[]>([]);

  // Выбранный чат
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  
  // Сообщения выбранного чата (из Supabase)
  const [messages, setMessages] = useState<Message[]>([]);

  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showStudentsList, setShowStudentsList] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recordingInterval = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadUser();
  }, []);

  // Загружаем чаты когда есть пользователь
  useEffect(() => {
    if (currentUser) {
      loadChats();
      loadStudents();
    }
  }, [currentUser]);

  // Загружаем сообщения когда выбран чат
  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat);
      // Подписываемся на новые сообщения
      const unsubscribe = subscribeToMessages(selectedChat, (newMsg) => {
        setMessages((prev) => [...prev, transformMessage(newMsg, currentUser?.id)]);
        scrollToBottom();
      });
      return unsubscribe;
    }
  }, [selectedChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChats = async () => {
    if (!currentUser) return;
    try {
      const chatsData = await getMyChats(currentUser.id);
      setChats(transformChats(chatsData, currentUser.id));
    } catch (error) {
      console.error('Error loading chats:', error);
      toast({
        title: "❌ Ошибка",
        description: "Не удалось загрузить чаты",
        variant: "destructive",
      });
    }
  };

  const loadStudents = async () => {
    if (!currentUser) return;
    try {
      const studentsData = await getAllStudents(currentUser.id);
      setStudents(studentsData.map((s: any) => ({
        id: s.id,
        name: s.full_name || s.email,
        avatar: s.avatar_url,
        online: false, // TODO: реализовать статус online
      })));
    } catch (error) {
      console.error('Error loading students:', error);
    }
  };

  const loadMessages = async (chatId: string) => {
    if (!currentUser) return;
    setLoadingMessages(true);
    try {
      const messagesData = await getChatMessages(chatId);
      setMessages(messagesData.map(msg => transformMessage(msg, currentUser.id)));
      // Отмечаем сообщения как прочитанные
      await markMessagesAsRead(chatId, currentUser.id);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: "❌ Ошибка",
        description: "Не удалось загрузить сообщения",
        variant: "destructive",
      });
    } finally {
      setLoadingMessages(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Трансформация данных из Supabase в UI формат
  const transformChats = (chatsData: ChatType[], userId: string): Chat[] => {
    return chatsData.map((chat: any) => {
      const otherUser = chat.other_user;
      const isUser1 = chat.user1_id === userId;
      const unreadCount = isUser1 ? chat.unread_count_user1 : chat.unread_count_user2;
      
      return {
        id: chat.id,
        studentId: otherUser?.id || '',
        name: otherUser?.name || otherUser?.email || 'Неизвестный',
        avatar: otherUser?.avatar,
        lastMessage: chat.last_message_text || '',
        time: chat.last_message_at 
          ? new Date(chat.last_message_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
          : '',
        unread: unreadCount,
        online: false, // TODO: реализовать статус online
      };
    });
  };

  const transformMessage = (msg: MessageType, userId?: string): Message => {
    const isMine = msg.sender_id === userId;
    return {
      id: msg.id,
      content: msg.content,
      senderId: msg.sender_id,
      timestamp: new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      isMine,
      type: msg.message_type as 'text' | 'voice' | 'file',
      fileName: msg.attachment_name || undefined,
      duration: msg.attachment_type === 'audio/webm' && msg.content.includes('сек') 
        ? parseInt(msg.content.match(/\d+/)?.[0] || '0')
        : undefined,
      attachmentUrl: msg.attachment_url || undefined,
    };
  };

  // Фильтрация
  const filteredChats = chats.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !currentUser) return;

    const messageText = newMessage.trim();
    setNewMessage("");
    setShowEmojiPicker(false);

    try {
      const msg = await sendTextMessage(selectedChat, currentUser.id, messageText);
      if (msg) {
        setMessages((prev) => [...prev, transformMessage(msg, currentUser.id)]);
        // Обновляем чат в списке
        await loadChats();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "❌ Ошибка",
        description: "Не удалось отправить сообщение",
        variant: "destructive",
      });
    }
  };

  const handleEmojiClick = (emoji: string) => {
    setNewMessage(newMessage + emoji);
  };

  const handleStartRecording = async () => {
    if (!selectedChat || !currentUser) {
      toast({
        title: "❌ Ошибка",
        description: "Сначала выберите чат",
        variant: "destructive",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleSendVoiceMessage(audioBlob);
        
        // Останавливаем микрофон
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      
      // Таймер длительности
      setRecordingTime(0);
      recordingInterval.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
      
      toast({
        title: "🎤 Запись голосового",
        description: "Нажмите стоп для завершения",
        className: "top-4",
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "❌ Ошибка",
        description: "Не удалось получить доступ к микрофону",
        variant: "destructive",
        className: "top-4",
      });
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingInterval.current);
    }
  };

  const handleSendVoiceMessage = async (audioBlob: Blob) => {
    if (!selectedChat || !currentUser) return;
    
    try {
      const msg = await uploadVoiceMessage(
        selectedChat,
        currentUser.id,
        audioBlob,
        recordingTime
      );
      
      if (msg) {
        setMessages((prev) => [...prev, transformMessage(msg, currentUser.id)]);
        setRecordingTime(0);
        // Обновляем чат в списке
        await loadChats();
        
        toast({
          title: "✅ Голосовое отправлено",
          description: `Длительность: ${recordingTime} сек`,
          className: "top-4",
        });
      }
    } catch (error) {
      console.error('Error sending voice message:', error);
      toast({
        title: "❌ Ошибка отправки",
        description: "Не удалось отправить голосовое сообщение",
        variant: "destructive",
        className: "top-4",
      });
    }
  };

  const handlePlayVoice = (messageId: string, audioUrl?: string) => {
    if (!audioUrl) {
      toast({
        title: "❌ Ошибка",
        description: "Аудио файл не найден",
        variant: "destructive",
      });
      return;
    }

    if (playingMessageId === messageId) {
      // Останавливаем текущее
      audioRef.current?.pause();
      setPlayingMessageId(null);
    } else {
      // Останавливаем предыдущее
      audioRef.current?.pause();
      
      // Играем новое
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.play().catch((error) => {
        console.error('Error playing audio:', error);
        toast({
          title: "❌ Ошибка",
          description: "Не удалось воспроизвести аудио",
          variant: "destructive",
        });
      });
      
      setPlayingMessageId(messageId);
      
      audio.onended = () => {
        setPlayingMessageId(null);
      };
      
      audio.onerror = () => {
        setPlayingMessageId(null);
        toast({
          title: "❌ Ошибка",
          description: "Не удалось загрузить аудио",
          variant: "destructive",
        });
      };
    }
  };

  const handleStartNewChat = async (student: Student) => {
    if (!currentUser) return;

    // Проверяем есть ли уже чат
    const existingChat = chats.find((c) => c.studentId === student.id);
    if (existingChat) {
      setSelectedChat(existingChat.id);
      setShowStudentsList(false);
      return;
    }

    try {
      // Создаём новый чат в Supabase
      const newChat = await getOrCreateChat(currentUser.id, student.id);
      
      if (newChat) {
        // Перезагружаем список чатов
        await loadChats();
        setSelectedChat(newChat.id);
        setMessages([]);
        setShowStudentsList(false);

        toast({
          title: "✅ Новый чат создан",
          description: `Чат с ${student.name}`,
        });
      }
    } catch (error) {
      console.error('Error creating chat:', error);
      toast({
        title: "❌ Ошибка",
        description: "Не удалось создать чат",
        variant: "destructive",
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const selectedChatData = chats.find((c) => c.id === selectedChat);

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0">
      {/* ===== ЛЕВАЯ ПАНЕЛЬ: СПИСОК ЧАТОВ ===== */}
      <aside className="w-80 border-r flex flex-col bg-background">
        {/* Заголовок */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-foreground">
              💬 Сообщения
            </h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowStudentsList(!showStudentsList)}
            >
              {showStudentsList ? "Чаты" : "Новый чат"}
            </Button>
          </div>
          
          {/* Поиск */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={showStudentsList ? "Найти студента..." : "Поиск чатов..."}
              className="pl-10"
            />
          </div>
        </div>

        {/* Список чатов или студентов */}
        <ScrollArea className="flex-1">
          {showStudentsList ? (
            // Список всех студентов
            <div className="p-2">
              {filteredStudents.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Студенты не найдены
                </p>
              ) : (
                filteredStudents.map((student) => (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-3 rounded-lg hover:bg-secondary/50 cursor-pointer transition mb-1"
                    onClick={() => handleStartNewChat(student)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar>
                          {student.avatar ? (
                            <AvatarImage src={student.avatar} />
                          ) : null}
                          <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
                        </Avatar>
                        {student.online && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {student.online ? "В сети" : "Не в сети"}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          ) : (
            // Список активных чатов
            <div className="p-2">
              {filteredChats.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Чаты не найдены
                </p>
              ) : (
                filteredChats.map((chat) => (
                  <motion.div
                    key={chat.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`
                      p-3 rounded-lg cursor-pointer transition mb-1
                      ${selectedChat === chat.id 
                        ? "bg-neon/10 border border-neon/30" 
                        : "hover:bg-secondary/50"}
                    `}
                    onClick={() => setSelectedChat(chat.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar>
                          {chat.avatar ? (
                            <AvatarImage src={chat.avatar} />
                          ) : null}
                          <AvatarFallback>{getInitials(chat.name)}</AvatarFallback>
                        </Avatar>
                        {chat.online && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold truncate">{chat.name}</p>
                          {chat.unread > 0 && (
                            <Badge variant="destructive" className="ml-2">
                              {chat.unread}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground truncate flex-1">
                            {chat.lastMessage || "Нет сообщений"}
                          </p>
                          <p className="text-xs text-muted-foreground ml-2">
                            {chat.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}
        </ScrollArea>
      </aside>

      {/* ===== ПРАВАЯ ПАНЕЛЬ: АКТИВНЫЙ ЧАТ ===== */}
      <main className="flex-1 flex flex-col bg-background">
        {selectedChatData ? (
          <>
            {/* Заголовок чата */}
            <header className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar>
                    {selectedChatData.avatar ? (
                      <AvatarImage src={selectedChatData.avatar} />
                    ) : null}
                    <AvatarFallback>
                      {getInitials(selectedChatData.name)}
                    </AvatarFallback>
                  </Avatar>
                  {selectedChatData.online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold">{selectedChatData.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedChatData.online ? "В сети" : "Не в сети"}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </header>

            {/* Сообщения */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-neon" />
                    <span className="ml-2 text-muted-foreground">Загрузка сообщений...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <p>Нет сообщений. Напишите первое сообщение! 👋</p>
                  </div>
                ) : null}
                
                <AnimatePresence>
                  {!loadingMessages && messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.isMine ? "justify-end" : "justify-start"}`}
                    >
                      <Card
                        className={`
                          max-w-md p-3
                          ${msg.isMine 
                            ? "bg-neon/10 border-neon/30" 
                            : "bg-secondary"}
                        `}
                      >
                        {msg.type === "voice" ? (
                          <div className="flex items-center gap-2">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handlePlayVoice(msg.id, msg.attachmentUrl)}
                            >
                              {playingMessageId === msg.id ? (
                                <StopCircle className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </Button>
                            <div className="flex-1">
                              <div className="h-1 bg-background rounded-full" />
                              <p className="text-xs text-muted-foreground mt-1">
                                {msg.duration} сек
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm">{msg.content}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {msg.timestamp}
                        </p>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Ввод сообщения */}
            <footer className="p-4 border-t">
              {/* Emoji picker */}
              <AnimatePresence>
                {showEmojiPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="mb-3 p-3 bg-secondary rounded-lg"
                  >
                    <div className="flex flex-wrap gap-2">
                      {emojis.map((emoji, i) => (
                        <Button
                          key={i}
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEmojiClick(emoji)}
                          className="text-lg"
                        >
                          {emoji}
                        </Button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Поле ввода */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                  <Smile className="w-5 h-5" />
                </Button>

                <Button size="sm" variant="ghost">
                  <Paperclip className="w-5 h-5" />
                </Button>

                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Напишите сообщение..."
                  className="flex-1"
                  disabled={isRecording}
                />

                {isRecording ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleStopRecording}
                  >
                    <StopCircle className="w-5 h-5 mr-2" />
                    {recordingTime}s
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleStartRecording}
                    >
                      <Mic className="w-5 h-5" />
                    </Button>

                    <Button
                      size="sm"
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <p className="text-lg">Выберите чат для начала общения</p>
              <p className="text-sm mt-2">
                или нажмите "Новый чат" чтобы написать студенту
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
