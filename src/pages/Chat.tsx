import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Send, Check, CheckCheck, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { playNotificationWithHaptic } from '@/lib/notificationSounds';

interface Message {
  id: string;
  course_id: string;
  driver_id: string;
  sender_role: 'driver' | 'fleet' | 'admin';
  sender_user_id: string;
  content: string;
  created_at: string;
  read_by_driver: boolean;
  read_by_fleet: boolean;
  delivered_at: string | null;
}

export default function Chat() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { driver, session } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [tableExists, setTableExists] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!driver || !courseId) return;

    fetchMessages();
    
    // Setup Realtime subscription
    const channel = supabase
      .channel(`chat-course-${courseId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `course_id=eq.${courseId}`,
        },
        (payload) => {
          console.log('💬 New message received:', payload);
          const newMsg = payload.new as Message;
          setMessages((current) => {
            if (current.some(m => m.id === newMsg.id)) return current;
            return [...current, newMsg];
          });
          
          // Play sound + haptic for dispatch messages
          if (newMsg.sender_role !== 'driver') {
            const soundId = driver?.notification_sound || 'default';
            playNotificationWithHaptic(soundId, 'chat_message');
            toast.success('Nouveau message du dispatch !');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driver, courseId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark fleet/admin messages as read when chat opens
  useEffect(() => {
    if (!courseId || messages.length === 0) return;
    
    const unreadFleetMessages = messages.filter(
      m => m.sender_role !== 'driver' && !m.read_by_driver
    );
    
    if (unreadFleetMessages.length > 0) {
      markMessagesAsReadByDriver();
    }
  }, [messages, courseId]);

  // Mark driver messages as delivered when received
  useEffect(() => {
    if (!courseId || messages.length === 0) return;
    
    const undeliveredDriverMessages = messages.filter(
      m => m.sender_role === 'driver' && !m.delivered_at
    );
    
    if (undeliveredDriverMessages.length > 0) {
      markMessagesAsDelivered(undeliveredDriverMessages.map(m => m.id));
    }
  }, [messages, courseId]);

  const markMessagesAsReadByDriver = async () => {
    try {
      await supabase.functions.invoke('driver-chat', {
        body: { action: 'mark_read', course_id: courseId }
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Note: mark_delivered not supported by driver-chat, skip silently
  const markMessagesAsDelivered = async (_messageIds: string[]) => {
    // Delivery tracking handled server-side
  };

  const fetchMessages = async () => {
    if (!courseId) return;

    try {
      // Use driver-chat Edge Function
      const { data, error } = await supabase.functions.invoke('driver-chat', {
        body: { action: 'load', course_id: courseId }
      });

      if (error) throw error;

      if (data?.error) {
        console.error('Edge function error:', data.error);
        if (data.error.includes('does not exist') || data.error.includes('42P01')) {
          setTableExists(false);
          return;
        }
      }

      // Map 'message' field to 'content' for UI compatibility
      const mappedMessages = (data?.messages || []).map((m: Record<string, unknown>) => ({
        ...m,
        content: m.message || m.content || ''
      }));
      setMessages(mappedMessages);
      setTableExists(true);
    } catch (error: unknown) {
      console.error('Error fetching messages:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('does not exist') || errorMessage.includes('42P01')) {
        setTableExists(false);
        toast.error('La table messages n\'existe pas encore.');
      } else {
        // Try fallback to direct query
        try {
          const { data: directData, error: directError } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('course_id', courseId)
            .order('created_at', { ascending: true });

          if (directError) throw directError;
          setMessages(directData || []);
          setTableExists(true);
        } catch (fallbackError: unknown) {
          console.error('Fallback error:', fallbackError);
          const fbErrorMsg = fallbackError instanceof Error ? fallbackError.message : '';
          if (fbErrorMsg.includes('does not exist') || fbErrorMsg.includes('42P01')) {
            setTableExists(false);
          } else {
            toast.error('Erreur lors du chargement des messages');
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !driver || !session || !courseId) return;

    setSending(true);
    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      const { data, error } = await supabase.functions.invoke('driver-chat', {
        body: {
          action: 'send',
          course_id: courseId,
          message: messageContent
        }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.message) {
        setMessages((current) => {
          if (current.some(m => m.id === data.message.id)) return current;
          return [...current, data.message];
        });
      }

      toast.success('Message envoyé', { duration: 2000 });
    } catch (error: unknown) {
      console.error('Error sending message:', error);
      setNewMessage(messageContent);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('does not exist') || errorMessage.includes('42P01')) {
        toast.error('La table messages n\'existe pas encore.');
        setTableExists(false);
      } else {
        toast.error('Erreur lors de l\'envoi du message');
      }
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="Chat" />
        <div className="p-4 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Chargement...</span>
        </div>
      </div>
    );
  }

  if (!tableExists) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="Chat" />
        <div className="p-4">
          <Card className="p-6 text-center">
            <p className="text-destructive font-medium">Chat non disponible</p>
            <p className="text-sm text-muted-foreground mt-2">
              La fonctionnalité de chat est en cours de déploiement.
              Veuillez patienter quelques minutes et réessayer.
            </p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => navigate('/bookings')}
            >
              Retour aux courses
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header title="Chat" />
      
      {/* Header du chat */}
      <div className="border-b border-border bg-card p-4 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/bookings')}
          className="h-10 w-10"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div className="flex-1">
          <h1 className="font-semibold">Chat avec le dispatch</h1>
          <p className="text-sm text-muted-foreground">Course #{courseId?.slice(0, 8)}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/bookings')}
          className="h-10 w-10"
        >
          <X className="w-6 h-6" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Aucun message pour le moment</p>
            <p className="text-sm text-muted-foreground mt-2">
              Envoyez un message au dispatch pour commencer
            </p>
          </Card>
        ) : (
          messages.map((message) => {
            const isDriver = message.sender_role === 'driver';
            return (
              <div
                key={message.id}
                className={`flex ${isDriver ? 'justify-end' : 'justify-start'}`}
              >
                <Card
                  className={`max-w-[75%] p-3 ${
                    isDriver
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {!isDriver && (
                    <p className="text-xs font-medium mb-1 opacity-70">
                      {message.sender_role === 'fleet' ? 'Dispatch' : 'Admin'}
                    </p>
                  )}
                  <p className="text-sm break-words">{message.content}</p>
                  <div className={`flex items-center justify-end gap-1 mt-1`}>
                    <span
                      className={`text-xs ${
                        isDriver ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}
                    >
                      {format(new Date(message.created_at), 'HH:mm', { locale: fr })}
                    </span>
                    {isDriver && (
                      <span className={`flex items-center ${
                        message.read_by_fleet 
                          ? 'text-blue-400' 
                          : 'text-primary-foreground/70'
                      }`}>
                        {message.read_by_fleet ? (
                          <CheckCheck className="w-4 h-4" />
                        ) : message.delivered_at ? (
                          <CheckCheck className="w-4 h-4" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </span>
                    )}
                  </div>
                </Card>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input zone */}
      <div className="border-t border-border bg-card p-4">
        <div className="flex gap-2">
          <Textarea
            placeholder="Écrire un message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            className="flex-1 min-h-[60px] resize-none"
            disabled={sending}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            size="icon"
            className="h-[60px] w-[60px]"
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
