import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send } from "lucide-react";

export default function MessagesPage() {
  const [chats, setChats] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadMockChats();
    }
  }, [currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  // Mock чаты (позже подключить к Supabase)
  const loadMockChats = () => {
    const mockChats = [
      {
        id: "1",
        user1_id: currentUser?.id,
        user2_id: "other-user-1",
        user2: {
          email: "andrey@example.com",
          raw_user_meta_data: { full_name: "Андрей Иванов" },
        },
        last_message_text: "Привет! Как дела?",
        unread_count_user1: 2,
        updated_at: new Date().toISOString(),
      },
      {
        id: "2",
        user1_id: currentUser?.id,
        user2_id: "other-user-2",
        user2: {
          email: "maria@example.com",
          raw_user_meta_data: { full_name: "Мария Петрова" },
        },
        last_message_text: "Спасибо за помощь!",
        unread_count_user1: 0,
        updated_at: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
    setChats(mockChats);
  };

  const loadMockMessages = (chatId: string) => {
    const mockMessages = [
      {
        id: "1",
        sender_id: "other-user",
        content: "Привет! Как дела?",
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: "2",
        sender_id: currentUser?.id,
        content: "Привет! Всё отлично, спасибо!",
        created_at: new Date(Date.now() - 1800000).toISOString(),
      },
    ];
    setMessages(mockMessages);
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !activeChat || !currentUser) return;

    // Mock отправка
    const newMessage = {
      id: Date.now().toString(),
      sender_id: currentUser.id,
      content: inputText,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputText("");
  };

  const getChatName = (chat: any) => {
    if (!currentUser) return "";
    const otherUser = chat.user2;
    return otherUser?.raw_user_meta_data?.full_name || otherUser?.email || "Пользователь";
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getUnreadCount = (chat: any) => {
    return chat.unread_count_user1 || 0;
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Список чатов */}
      <aside className="w-80 border-r flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold">Сообщения</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chats.map((chat) => {
            const unreadCount = getUnreadCount(chat);
            const isActive = activeChat?.id === chat.id;
            return (
              <div
                key={chat.id}
                className={`
                  p-4 border-b cursor-pointer hover:bg-secondary/50 transition
                  ${isActive ? "bg-secondary" : ""}
                `}
                onClick={() => {
                  setActiveChat(chat);
                  loadMockMessages(chat.id);
                }}
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{getInitials(getChatName(chat))}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold truncate">{getChatName(chat)}</p>
                      {unreadCount > 0 && (
                        <Badge variant="destructive" className="ml-2">
                          {unreadCount}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {chat.last_message_text || "Нет сообщений"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Активный чат */}
      <main className="flex-1 flex flex-col">
        {activeChat ? (
          <>
            {/* Заголовок */}
            <header className="p-4 border-b">
              <h3 className="font-semibold">{getChatName(activeChat)}</h3>
            </header>

            {/* Сообщения */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => {
                const isOwn = msg.sender_id === currentUser?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                  >
                    <Card
                      className={`
                        max-w-md p-3
                        ${isOwn ? "bg-neon/10 border-neon/30" : "bg-secondary"}
                      `}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </p>
                    </Card>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Ввод */}
            <footer className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Напишите сообщение..."
                />
                <Button onClick={sendMessage}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Выберите чат
          </div>
        )}
      </main>
    </div>
  );
}

