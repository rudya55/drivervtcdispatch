import { Bell } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  title: string;
  unreadCount?: number;
}

export const Header = ({ title, unreadCount = 0 }: HeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 bg-card border-b border-border z-40">
      <div className="flex items-center justify-between h-16 px-4 max-w-lg mx-auto">
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => navigate('/notifications')}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              variant="destructive"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </div>
    </header>
  );
};
