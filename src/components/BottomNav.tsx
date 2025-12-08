import { Home, Calendar, Settings, Car, Wallet, MessageCircle } from 'lucide-react';
import { NavLink } from './NavLink';
import { useUnreadChatMessages } from '@/hooks/useUnreadChatMessages';

export const BottomNav = () => {
  const { unreadCount } = useUnreadChatMessages();

  return (
    <nav 
      className="fixed bottom-0 w-full max-w-lg left-1/2 -translate-x-1/2 bg-card border-t border-border z-50"
      style={{ paddingBottom: 'var(--safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        <NavLink
          to="/"
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors"
          activeClassName="text-primary"
          pendingClassName="text-muted-foreground"
        >
          <Home className="w-5 h-5" />
          <span className="text-xs font-medium">Accueil</span>
        </NavLink>

        <NavLink
          to="/bookings"
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors text-muted-foreground"
          activeClassName="text-primary"
        >
          <Car className="w-5 h-5" />
          <span className="text-xs font-medium">Courses</span>
        </NavLink>

        <NavLink
          to="/chats"
          className="relative flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors text-muted-foreground"
          activeClassName="text-primary"
        >
          <div className="relative">
            <MessageCircle className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <span className="text-xs font-medium">Chat</span>
        </NavLink>

        <NavLink
          to="/accounting"
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors text-muted-foreground"
          activeClassName="text-primary"
        >
          <Wallet className="w-5 h-5" />
          <span className="text-xs font-medium">Compta</span>
        </NavLink>

        <NavLink
          to="/settings"
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors text-muted-foreground"
          activeClassName="text-primary"
        >
          <Settings className="w-5 h-5" />
          <span className="text-xs font-medium">Plus</span>
        </NavLink>
      </div>
    </nav>
  );
};
