import React from "react";
import { Bell, LogOut, User, Settings } from "lucide-react";

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
  onSettingsClick = () => {}
}) {
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Left side - Page title */}
        <div className="flex items-center gap-6 flex-1">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{title}</h1>
        </div>

        {/* Right side - Notifications and user menu */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <button 
            onClick={() => setShowNotificationsModal(!showNotificationsModal)}
            className="relative p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full" />
            )}
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold overflow-hidden">
                {user?.picture ? (
                  <img src={user.picture} alt={user?.name} className="w-full h-full object-cover" />
                ) : (
                  user?.name?.charAt(0).toUpperCase() || "A"
                )}
              </div>
              <span className="hidden sm:inline text-sm font-medium text-slate-700 dark:text-slate-300">
                {user?.name || "Admin"}
              </span>
            </button>

            {/* Dropdown menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-2 z-50">
                <button 
                  onClick={() => {
                    setShowUserMenu(false);
                    onProfileClick?.();
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors"
                >
                  <User className="w-4 h-4" />
                  Profile
                </button>
                <button 
                  onClick={() => {
                    setShowUserMenu(false);
                    onSettingsClick?.();
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <div className="border-t border-slate-200 dark:border-slate-700 my-2" />
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onLogout?.();
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
