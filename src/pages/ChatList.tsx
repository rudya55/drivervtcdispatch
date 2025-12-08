import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BottomNav } from '@/components/BottomNav';
import { supabase, Course } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ChatConversation {
  course_id: string;
  course: Course;
  unread_count: number;
  last_message?: {
    content: string;
    created_at: string;
    sender_role: string;
  };
}

const ChatList = () => {
  const navigate = useNavigate();
  const { driver } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!driver?.id) return;

    const fetchConversations = async () => {
      try {
        // Récupérer toutes les courses avec des messages pour ce chauffeur
        const { data: messages, error: messagesError } = await supabase
          .from('chat_messages')
          .select('course_id, content, created_at, sender_role, read_by_driver')
          .eq('driver_id', driver.id)
          .order('created_at', { ascending: false });

        if (messagesError) {
          console.error('Error fetching messages:', messagesError);
          return;
        }

        if (!messages || messages.length === 0) {
          setConversations([]);
          setLoading(false);
          return;
        }

        // Grouper les messages par course
        const courseIds = [...new Set(messages.map(m => m.course_id))];
        
        // Récupérer les détails des courses
        const { data: courses, error: coursesError } = await supabase
          .from('courses')
          .select('*')
          .in('id', courseIds);

        if (coursesError) {
          console.error('Error fetching courses:', coursesError);
          return;
        }

        // Construire les conversations
        const conversationList: ChatConversation[] = courseIds.map(courseId => {
          const courseMessages = messages.filter(m => m.course_id === courseId);
          const course = courses?.find(c => c.id === courseId);
          const unreadCount = courseMessages.filter(
            m => m.sender_role !== 'driver' && !m.read_by_driver
          ).length;
          const lastMessage = courseMessages[0];

          return {
            course_id: courseId,
            course: course as Course,
            unread_count: unreadCount,
            last_message: lastMessage ? {
              content: lastMessage.content,
              created_at: lastMessage.created_at,
              sender_role: lastMessage.sender_role,
            } : undefined,
          };
        });

        // Trier par dernier message
        conversationList.sort((a, b) => {
          const dateA = a.last_message?.created_at || '';
          const dateB = b.last_message?.created_at || '';
          return dateB.localeCompare(dateA);
        });

        setConversations(conversationList);
      } catch (error) {
        console.error('Error in fetchConversations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();

    // Écouter les changements en temps réel
    const channel = supabase
      .channel('chat-list-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `driver_id=eq.${driver.id}`,
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driver?.id]);

  const formatLastMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffHours < 24) {
      return format(date, 'HH:mm', { locale: fr });
    } else if (diffHours < 48) {
      return 'Hier';
    } else {
      return format(date, 'dd/MM', { locale: fr });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Conversations</h1>
          </div>
        </div>
      </div>

      {/* Liste des conversations */}
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Aucune conversation</p>
            <p className="text-sm text-muted-foreground mt-1">
              Les messages avec le dispatch apparaîtront ici
            </p>
          </div>
        ) : (
          conversations.map((conv) => (
            <Card
              key={conv.course_id}
              className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => navigate(`/chat/${conv.course_id}`)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Client et date */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium truncate">
                      {conv.course?.client_name || 'Client'}
                    </span>
                    {conv.unread_count > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="h-5 min-w-[20px] flex items-center justify-center text-xs px-1.5"
                      >
                        {conv.unread_count}
                      </Badge>
                    )}
                  </div>

                  {/* Destination */}
                  {conv.course?.destination_location && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{conv.course.destination_location}</span>
                    </div>
                  )}

                  {/* Dernier message */}
                  {conv.last_message && (
                    <p className={`text-sm truncate ${
                      conv.unread_count > 0 ? 'font-medium text-foreground' : 'text-muted-foreground'
                    }`}>
                      {conv.last_message.sender_role === 'driver' ? 'Vous: ' : ''}
                      {conv.last_message.content}
                    </p>
                  )}
                </div>

                {/* Heure du dernier message */}
                {conv.last_message && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                    <Clock className="h-3 w-3" />
                    {formatLastMessageTime(conv.last_message.created_at)}
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default ChatList;
