import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Send, Loader2, X, Check, CheckCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Message {
  id: string;
  sender_role: "dispatcher" | "driver";
  message: string;
  created_at: string;
  delivered_at: string | null;
  read_at: string | null;
}

interface DriverChatScreenProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  clientName?: string;
}

// Composant pour afficher les statuts de message avec popover cliquable
const MessageStatus = ({ message, userRole }: { message: Message; userRole: string }) => {
  // Seulement afficher pour ses propres messages
  if (message.sender_role !== userRole) return null;

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return null;
    return format(new Date(dateStr), "dd/MM/yyyy 'à' HH:mm", { locale: fr });
  };

  if (message.read_at) {
    // Lu - Rouge avec texte "Lu" et popover pour détails
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-1 text-destructive font-bold text-xs cursor-pointer hover:opacity-80">
            <CheckCheck className="h-4 w-4 stroke-[2.5]" />
            Lu
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3 text-xs" side="top">
          <div className="space-y-1">
            <div>📤 <strong>Distribué :</strong> {formatDateTime(message.delivered_at)}</div>
            <div>👁️ <strong>Lu :</strong> {formatDateTime(message.read_at)}</div>
          </div>
        </PopoverContent>
      </Popover>
    );
  } else if (message.delivered_at) {
    // Distribué - 2 flèches grises avec popover
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-1 text-muted-foreground cursor-pointer hover:opacity-80">
            <CheckCheck className="h-5 w-5 stroke-[2.5]" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3 text-xs" side="top">
          <div>📤 <strong>Distribué :</strong> {formatDateTime(message.delivered_at)}</div>
        </PopoverContent>
      </Popover>
    );
  } else {
    // Envoyé - 1 flèche grise (pas de popover)
    return <Check className="h-5 w-5 text-muted-foreground/50 stroke-[2.5]" />;
  }
};

export function DriverChatScreen({ open, onOpenChange, courseId, clientName }: DriverChatScreenProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const userRole = "driver";

  // Charger les messages via l'Edge Function
  const loadMessages = async () => {
    if (!courseId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('driver-chat', {
        body: { action: 'load', course_id: courseId }
      });

      if (error) throw error;

      if (data?.messages) {
        const formattedMessages: Message[] = data.messages.map((msg: Record<string, unknown>) => ({
          id: msg.id as string,
          sender_role: msg.sender_role as "dispatcher" | "driver",
          message: (msg.message || msg.content || '') as string,
          created_at: msg.created_at as string,
          delivered_at: msg.delivered_at as string | null,
          read_at: msg.read_at as string | null,
        }));
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Erreur chargement messages:', error);
      toast.error("Erreur lors du chargement des messages");
    } finally {
      setIsLoading(false);
    }
  };

  // Charger les messages à l'ouverture
  useEffect(() => {
    if (open && courseId) {
      loadMessages();
    }
  }, [open, courseId]);

  // Subscription temps réel pour INSERT et UPDATE
  useEffect(() => {
    if (!open || !courseId) return;

    const channel = supabase
      .channel(`driver-chat-${courseId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `course_id=eq.${courseId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Record<string, unknown>;
          const newMessage: Message = {
            id: newMsg.id as string,
            sender_role: newMsg.sender_role as "dispatcher" | "driver",
            message: (newMsg.message || newMsg.content || '') as string,
            created_at: newMsg.created_at as string,
            delivered_at: newMsg.delivered_at as string | null,
            read_at: newMsg.read_at as string | null,
          };

          setMessages((prev) => {
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });

          // Si c'est un message du dispatcher, marquer comme lu
          if (newMessage.sender_role === 'dispatcher') {
            await supabase.functions.invoke('driver-chat', {
              body: { action: 'mark_read', course_id: courseId }
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `course_id=eq.${courseId}`,
        },
        (payload) => {
          const updatedMsg = payload.new as Record<string, unknown>;
          setMessages((prev) => prev.map(m =>
            m.id === updatedMsg.id
              ? { ...m, delivered_at: updatedMsg.delivered_at as string | null, read_at: updatedMsg.read_at as string | null }
              : m
          ));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, courseId]);

  // Auto-scroll vers le bas
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Envoyer un message
  const handleSend = async () => {
    if (!input.trim() || isSending) return;

    const messageText = input.trim();
    setInput("");
    setIsSending(true);

    try {
      const { data, error } = await supabase.functions.invoke('driver-chat', {
        body: {
          action: 'send',
          course_id: courseId,
          message: messageText
        }
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Erreur envoi message');
      }
    } catch (error: unknown) {
      console.error("Erreur envoi message:", error);
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de l'envoi du message";
      toast.error(errorMessage);
      setInput(messageText);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] p-4">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b">
            <div>
              <h3 className="text-base font-semibold">
                💬 Chat avec le Dispatch
              </h3>
              {clientName && (
                <p className="text-xs text-muted-foreground">
                  Course : {clientName}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-10 w-10 rounded-full border-2 border-muted-foreground/30 hover:bg-destructive/10 hover:border-destructive"
            >
              <X className="h-6 w-6 text-muted-foreground" />
            </Button>
          </div>

          {/* Zone des messages */}
          <ScrollArea ref={scrollRef} className="flex-1 pr-2 py-3">
            {isLoading ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                {messages.length === 0 && (
                  <div className="text-center text-muted-foreground py-8 text-sm">
                    Aucun message. Envoyez un message au dispatch.
                  </div>
                )}
                {messages.map((message) => {
                  const isOwnMessage = message.sender_role === userRole;
                  const senderLabel = message.sender_role === 'dispatcher'
                    ? '👨‍💼 Dispatch'
                    : '🚗 Moi';

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 ${
                          isOwnMessage
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        {!isOwnMessage && (
                          <p className="text-xs font-medium opacity-80 mb-1">{senderLabel}</p>
                        )}
                        <p className="text-sm break-words">{message.message}</p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-xs opacity-70">
                            {new Date(message.created_at).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <MessageStatus message={message} userRole={userRole} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Zone de saisie */}
          <div className="flex gap-2 pt-3 border-t">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Écrivez votre message..."
              disabled={isSending}
              className="text-sm h-10"
            />
            <Button
              onClick={handleSend}
              disabled={isSending || !input.trim()}
              size="sm"
              className="h-10 px-3"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
