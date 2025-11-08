import { Home, Calendar, Settings, Car, Wallet } from 'lucide-react';
import { NavLink } from './NavLink';

export const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
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
          to="/accounting"
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors text-muted-foreground"
          activeClassName="text-primary"
        >
          <Wallet className="w-5 h-5" />
          <span className="text-xs font-medium">Compta</span>
        </NavLink>

        <NavLink
          to="/planning"
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors text-muted-foreground"
          activeClassName="text-primary"
        >
          <Calendar className="w-5 h-5" />
          <span className="text-xs font-medium">Planning</span>
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
