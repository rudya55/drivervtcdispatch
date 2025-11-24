import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Send } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
}

export default function Chat() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { driver, session } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
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
          table: 'messages',
          filter: `course_id=eq.${courseId}`,
        },
        (payload) => {
          console.log('💬 New message received:', payload);
          setMessages((current) => [...current, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driver, courseId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    if (!courseId) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      if (error.message?.includes('relation "public.messages" does not exist')) {
        toast.error('La table des messages n\'existe pas. Veuillez exécuter le script SQL create-messages-table.sql dans Supabase.');
      } else {
        toast.error('Erreur lors du chargement des messages');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !driver || !session || !courseId) return;

    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert({
        course_id: courseId,
        driver_id: driver.id,
        sender_role: 'driver',
        sender_user_id: session.user.id,
        content: newMessage.trim(),
        read_by_driver: true,
        read_by_fleet: false,
      });

      if (error) throw error;

      setNewMessage('');
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Erreur lors de l\'envoi du message');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="Chat" />
        <div className="p-4">
          <p className="text-center text-muted-foreground">Chargement...</p>
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
          <span className="text-2xl font-light">×</span>
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
                  <p className="text-sm break-words">{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isDriver ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}
                  >
                    {format(new Date(message.created_at), 'HH:mm', { locale: fr })}
                  </p>
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
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
