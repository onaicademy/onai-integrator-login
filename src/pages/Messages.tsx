import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send, Search, Mic, Smile, Paperclip, MoreVertical, 
  X, StopCircle, Play 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

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
}

// Mock emoji
const emojis = ["😊", "😂", "❤️", "👍", "🎉", "🔥", "👏", "🙏", "💯", "✨", "🚀", "💪"];

export default function Messages() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Список всех студентов (для начала нового чата)
  const [students, setStudents] = useState<Student[]>([
    { id: "1", name: "Иван Иванов", online: true },
    { id: "2", name: "Мария Петрова", online: false },
    { id: "3", name: "Петр Сидоров", online: true },
    { id: "4", name: "Анна Смирнова", online: false },
    { id: "5", name: "Дмитрий Козлов", online: true },
  ]);

  // Активные чаты
  const [chats, setChats] = useState<Chat[]>([
    {
      id: "1",
      studentId: "1",
      name: "Иван Иванов",
      lastMessage: "Привет! Как дела?",
      time: "10:30",
      unread: 2,
      online: true,
    },
    {
      id: "2",
      studentId: "2",
      name: "Мария Петрова",
      lastMessage: "Спасибо за помощь!",
      time: "09:15",
      unread: 0,
      online: false,
    },
  ]);

  const [selectedChat, setSelectedChat] = useState<string | null>("1");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Привет! Как дела?",
      senderId: "1",
      timestamp: "10:30",
      isMine: false,
      type: "text",
    },
    {
      id: "2",
      content: "Отлично, спасибо!",
      senderId: "me",
      timestamp: "10:31",
      isMine: true,
      type: "text",
    },
  ]);

  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showStudentsList, setShowStudentsList] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recordingInterval = useRef<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Фильтрация
  const filteredChats = chats.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const message: Message = {
      id: Date.now().toString(),
      content: newMessage,
      senderId: "me",
      timestamp: new Date().toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      isMine: true,
      type: "text",
    };

    setMessages([...messages, message]);
    setNewMessage("");
    setShowEmojiPicker(false);
  };

  const handleEmojiClick = (emoji: string) => {
    setNewMessage(newMessage + emoji);
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
    recordingInterval.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);

    toast({
      title: "🎤 Запись голосового",
      description: "Нажмите стоп для завершения",
    });
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    clearInterval(recordingInterval.current);

    const message: Message = {
      id: Date.now().toString(),
      content: `Голосовое сообщение (${recordingTime} сек)`,
      senderId: "me",
      timestamp: new Date().toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      isMine: true,
      type: "voice",
      duration: recordingTime,
    };

    setMessages([...messages, message]);
    setRecordingTime(0);

    toast({
      title: "✅ Голосовое отправлено",
      description: `Длительность: ${recordingTime} сек`,
    });
  };

  const handleStartNewChat = (student: Student) => {
    // Проверяем есть ли уже чат
    const existingChat = chats.find((c) => c.studentId === student.id);
    if (existingChat) {
      setSelectedChat(existingChat.id);
      setShowStudentsList(false);
      return;
    }

    // Создаём новый чат
    const newChat: Chat = {
      id: Date.now().toString(),
      studentId: student.id,
      name: student.name,
      avatar: student.avatar,
      lastMessage: "",
      time: "Сейчас",
      unread: 0,
      online: student.online,
    };

    setChats([newChat, ...chats]);
    setSelectedChat(newChat.id);
    setMessages([]);
    setShowStudentsList(false);

    toast({
      title: "✅ Новый чат создан",
      description: `Чат с ${student.name}`,
    });
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
                <AnimatePresence>
                  {messages.map((msg) => (
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
                            <Button size="sm" variant="ghost">
                              <Play className="w-4 h-4" />
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
