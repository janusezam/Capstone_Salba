import React from "react";
import {
  LayoutDashboard,
  Map,
  FileText,
  Users,
  Settings,
  AlertCircle,
  Truck,
  Bell,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  activeTab,
  setActiveTab,
  unreadCount = 0,
  user,
  handleLogout,
}) {
  const menuSections = [
    {
      title: "MENU",
      items: [
        {
          id: "dashboard",
          label: "Dashboard",
          icon: LayoutDashboard,
          badge: null
        },
        {
          id: "map",
          label: "Map View",
          icon: Map,
          badge: "Live"
        },
      ]
    },
    {
      title: "MONITORING",
      items: [
        {
          id: "rescuers",
          label: "Rescuers",
          icon: Users,
          badge: null
        },
        {
          id: "ongoing",
          label: "Ongoing Rescues",
          icon: Truck,
          badge: null
        },
        {
          id: "alerts",
          label: "Alerts",
          icon: AlertCircle,
          badge: null
        },
        {
          id: "notifications",
          label: "Notifications",
          icon: Bell,
          badge: unreadCount > 0 ? `${unreadCount}` : null
        },
        {
          id: "reports",
          label: "Reports Log",
          icon: FileText,
          badge: null
        },
      ]
    },
    {
      title: "SYSTEM",
      items: [
        {
          id: "settings",
          label: "Settings",
          icon: Settings,
          badge: null
        },
      ]
    }
  ];

  return (
    <aside
      className={`${
        sidebarOpen ? "w-64 sm:w-72" : "w-20"
      } bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col z-30 select-none shadow-sm`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 p-0.5 flex-shrink-0 shadow-sm flex items-center justify-center">
            <img
              src="/salbalogo.png"
              alt="SALBA Logo"
              className="w-full h-full rounded-[10px] object-cover bg-white"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
              <h1 className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                SALBA <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 font-bold">ADMIN</span>
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                CDRRMO Rescue Operations
              </p>
            </div>
          )}
        </div>

        {/* Toggle Collapse Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto custom-scrollbar">
        {menuSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {sidebarOpen ? (
              <h3 className="px-3 text-[11px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase mb-2">
                {section.title}
              </h3>
            ) : (
              <div className="h-2" />
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center ${
                      sidebarOpen ? "justify-between px-3.5 py-2.5" : "justify-center px-0 py-2.5"
                    } rounded-xl text-sm font-semibold transition-all duration-150 group relative ${
                      isActive
                        ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${isActive ? "scale-105" : "group-hover:scale-105 text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white"}`} />
                      {sidebarOpen && <span>{item.label}</span>}
                    </div>

                    {sidebarOpen && item.badge && (
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isActive 
                          ? "bg-white/20 text-white" 
                          : "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
                      }`}>
                        {item.badge}
                      </span>
                    )}

                    {!sidebarOpen && (
                      <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-white text-xs font-semibold rounded-md shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                        {item.label}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Profile Summary Card */}
      {sidebarOpen && (
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/80">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-xs flex-shrink-0">
                {user?.name?.charAt(0).toUpperCase() || "A"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{user?.name || "Admin User"}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email || "admin@salba.gov"}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

export default Sidebar;

