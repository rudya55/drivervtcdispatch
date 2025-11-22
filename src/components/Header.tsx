import { Bell, Sun, Moon } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';

interface HeaderProps {
  title: string;
  unreadCount?: number;
}

export const Header = ({ title, unreadCount = 0 }: HeaderProps) => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-card border-b border-border z-40">
      <div className="flex items-center justify-between h-16 px-4 max-w-lg mx-auto">
        <h1 className="text-xl font-bold text-foreground flex-1 text-center pl-12">{title}</h1>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 touch-manipulation"
            onClick={toggleTheme}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-foreground" />
            ) : (
              <Moon className="w-5 h-5 text-foreground" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="relative h-12 w-12 touch-manipulation"
            onClick={() => navigate('/notifications')}
          >
            <Bell className="w-5 h-5 text-foreground" />
            {unreadCount > 0 && (
              <Badge
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs font-semibold pointer-events-none"
                variant="destructive"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
};
