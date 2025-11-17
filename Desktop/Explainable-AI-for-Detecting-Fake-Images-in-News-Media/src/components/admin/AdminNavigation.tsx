import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '../ui/dropdown-menu';
import { 
  LayoutDashboard, 
  Users, 
  BarChart3, 
  Settings, 
  Shield, 
  LogOut,
  User,
  Crown,
  FolderOpen,
  FileText
} from 'lucide-react';
import type { User as UserType } from '../../App';

interface AdminNavigationProps {
  navigate: (page: string) => void;
  currentPage: string;
  user: UserType | null;
  logout: () => void;
}

export function AdminNavigation({ navigate, currentPage, user, logout }: AdminNavigationProps) {
  const navItems = [
    { id: 'admin-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'admin-users', label: 'User Management', icon: Users },
    { id: 'admin-files', label: 'File Management', icon: FolderOpen },
    { id: 'admin-logs', label: 'System Logs', icon: FileText },
    { id: 'admin-analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'admin-settings', label: 'System Settings', icon: Settings },
  ];

  return (
    <div className="w-64 h-screen bg-[#1A1A1A] text-white flex flex-col border-r border-[#2c2c2c]">
      <div className="p-6 border-b border-[#2c2c2c]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4BA3A4]/20 text-[#4BA3A4]">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Newsight</h1>
            <p className="text-xs text-white/70 flex items-center gap-1">
              <Crown className="h-3 w-3 text-[#F5C35B]" />
              Administrator
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <Button
              key={item.id}
              variant="ghost"
              className={`w-full justify-start rounded-lg ${
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

      {/* User Menu */}
      <div className="p-4 border-t border-[#2c2c2c]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start p-2 h-auto hover:bg-white/10 text-white/80">
              <div className="flex items-center gap-3 w-full">
                <Avatar className="h-8 w-8 border border-white/20">
                  <AvatarFallback className="bg-[#F5C35B]/20 text-[#F5C35B]">
                    <Crown className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium truncate">{user?.name}</p>
                  <p className="text-xs text-white/50 truncate">Administrator</p>
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
            <DropdownMenuItem onClick={() => navigate('admin-settings')}>
              <User className="h-4 w-4 mr-2" />
              Admin Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600 focus:bg-red-50">
              <LogOut className="h-4 w-4 mr-2" />
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
