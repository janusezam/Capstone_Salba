import React from "react";
import { Bell, LogOut, User, Settings, Sun, Moon, Search, Command, ChevronDown } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export function Header({ 
  title, 
  user, 
  onLogout, 
  notifications = [],
  showNotificationsModal = false,
  setShowNotificationsModal = () => {},
  markNotificationRead = () => {},
  clearAllNotifications = () => {},
  unreadCount = 0,
  onProfileClick = () => {},
  onSettingsClick = () => {},
  onViewAllNotifications = () => {},
  searchQuery = "",
  setSearchQuery = () => {},
}) {
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-40 shadow-xs backdrop-blur-md bg-white/90 dark:bg-slate-900/90">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 gap-4">
        
        {/* Left - Title & Search Input */}
        <div className="flex items-center gap-4 flex-1 max-w-xl">
          <div className="relative w-full max-w-md hidden md:block">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search alerts, rescuers, reports or commands..."
              className="w-full pl-10 pr-12 py-2 text-xs sm:text-sm bg-slate-100/70 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder-slate-400 rounded-xl border border-slate-200/60 dark:border-slate-700/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] font-semibold text-slate-400 shadow-xs">
              <Command className="w-2.5 h-2.5" />
              <span>K</span>
            </div>
          </div>
          
          <div className="md:hidden">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white truncate">{title}</h1>
          </div>
        </div>

        {/* Right side - Notifications, Theme Toggle, and User menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle Theme"
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center justify-center border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-slate-600" />
            )}
          </button>

          {/* Notifications Button */}
          <div className="relative">
            <button 
              onClick={() => {
                setShowNotificationsModal(false);
                onViewAllNotifications?.();
              }}
              className="relative p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              title="Go to Notifications Center"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                </span>
              )}
            </button>
          </div>

          <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

          {/* User Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2.5 p-1.5 pl-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-sm overflow-hidden">
                {user?.picture ? (
                  <img src={user.picture} alt={user?.name} className="w-full h-full object-cover" />
                ) : (
                  user?.name?.charAt(0).toUpperCase() || "A"
                )}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                  {user?.name || "Admin"}
                </span>
                <span className="text-[10px] font-medium text-slate-400 leading-tight">
                  {user?.role || "Administrator"}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{user?.name || "Admin User"}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user?.email || "admin@salba.gov"}</p>
                </div>
                <div className="py-1">
                  <button 
                    onClick={() => {
                      setShowUserMenu(false);
                      onProfileClick?.();
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    User Profile
                  </button>
                  <button 
                    onClick={() => {
                      setShowUserMenu(false);
                      onSettingsClick?.();
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    Account Settings
                  </button>
                </div>
                <div className="border-t border-slate-100 dark:border-slate-800 pt-1" />
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onLogout?.();
                  }}
                  className="w-full px-4 py-2 text-left text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2.5 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

