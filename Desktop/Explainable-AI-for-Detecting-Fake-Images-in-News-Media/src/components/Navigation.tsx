import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Home,
  Upload,
  History,
  Settings,
  Shield,
  LogOut,
  User,
  Wrench,
} from 'lucide-react';

interface NavigationProps {
  navigate: (page: string) => void;
  currentPage: string;
  user: { name: string; email: string } | null;
  logout: () => void;
}

export function Navigation({ navigate, currentPage, user, logout }: NavigationProps) {
  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: Home },
    { id: 'upload', label: 'New Analysis', icon: Upload },
    { id: 'history', label: 'History', icon: History },
    { id: 'journalist-tools', label: 'Tools', icon: Wrench },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'NS';

  return (
    <div className="w-64 h-screen bg-[#1F1F1F] text-white flex flex-col border-r border-[#2c2c2c]">
      <div className="p-6 border-b border-[#2c2c2c]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4BA3A4]/20 text-[#4BA3A4]">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Newsight</h1>
            <p className="text-xs text-white/70">Explainable AI Lab</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <Button
              key={item.id}
              variant="ghost"
              className={`w-full justify-start rounded-lg border border-transparent transition-colors ${
                isActive
                  ? 'bg-[#E5E5E5] text-[#1F1F1F] font-semibold'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
              onClick={() => navigate(item.id)}
            >
              <Icon className="h-4 w-4 mr-3" />
              {item.label}
            </Button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[#2c2c2c]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start p-2 h-auto hover:bg-white/10 text-white/80"
            >
              <div className="flex items-center gap-3 w-full">
                <Avatar className="h-9 w-9 border border-white/20">
                  <AvatarFallback className="bg-[#4BA3A4]/20 text-[#4BA3A4]">
                  {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium truncate">{user?.name}</p>
                  <p className="text-xs text-white/50 truncate">{user?.email}</p>
                </div>
                <div className="text-white/50">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => navigate('settings')}>
              <User className="h-4 w-4 mr-2" />
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
