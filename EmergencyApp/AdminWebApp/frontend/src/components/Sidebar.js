import React from "react";
import {
  LayoutDashboard,
  Map,
  FileText,
  Users,
  Settings,
  LogOut,
  AlertCircle,
  Truck,
} from "lucide-react";

function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  activeTab,
  setActiveTab,
  showTeamsPanel,
  setShowTeamsPanel,
  teams,
  handleCompleteMission,
  setSelectedTeam,
  setShowTeamModal,
  getTeamBgColor,
  getTeamStatusColor,
  showNotifications,
  setShowNotifications,
  notifications,
  unreadCount,
  markNotificationRead,
  clearAllNotifications,
  showTeamHistory,
  setShowTeamHistory,
  resolvedReports,
  declinedReports,
  exportMissionLogPDF,
  getSenderFullName,
  user,
  setShowProfileModal,
  handleLogout,
}) {
  return (
    <div
      className={`${
        sidebarOpen ? "w-72" : "w-20"
      } bg-gradient-to-b from-slate-900 to-slate-950 text-white transition-all duration-300 flex flex-col`}
    >
      {/* Logo/Brand */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <img
            src="/salbalogo.png"
            alt="SALBA Logo"
            className="w-20 h-20 rounded-xl object-contain"
          />
          {sidebarOpen && (
            <div>
              <h1 className="font-bold text-xl leading-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                SALBA
              </h1>
              <p className="text-xs text-slate-400 leading-tight">
                Malaybalay City CDRRMO
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
            activeTab === "dashboard"
              ? "bg-blue-600 text-white shadow-lg"
              : "hover:bg-slate-800 text-slate-300"
          }`}
        >
          <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
          {sidebarOpen && <span className="font-medium">Dashboard</span>}
        </button>

        <button
          onClick={() => setActiveTab("map")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
            activeTab === "map"
              ? "bg-blue-600 text-white shadow-lg"
              : "hover:bg-slate-800 text-slate-300"
          }`}
        >
          <Map className="w-5 h-5 flex-shrink-0" />
          {sidebarOpen && <span className="font-medium">Map View</span>}
        </button>

        <button
          onClick={() => setActiveTab("rescuers")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
            activeTab === "rescuers"
              ? "bg-blue-600 text-white shadow-lg"
              : "hover:bg-slate-800 text-slate-300"
          }`}
        >
          <Users className="w-5 h-5 flex-shrink-0" />
          {sidebarOpen && <span className="font-medium">Rescuers</span>}
        </button>

        <button
          onClick={() => setActiveTab("ongoing")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
            activeTab === "ongoing"
              ? "bg-blue-600 text-white shadow-lg"
              : "hover:bg-slate-800 text-slate-300"
          }`}
        >
          <Truck className="w-5 h-5 flex-shrink-0" />
          {sidebarOpen && <span className="font-medium">Ongoing Rescues</span>}
        </button>

        <button
          onClick={() => setActiveTab("alerts")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
            activeTab === "alerts"
              ? "bg-blue-600 text-white shadow-lg"
              : "hover:bg-slate-800 text-slate-300"
          }`}
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {sidebarOpen && <span className="font-medium">Alerts</span>}
        </button>

        <button
          onClick={() => setActiveTab("reports")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
            activeTab === "reports"
              ? "bg-blue-600 text-white shadow-lg"
              : "hover:bg-slate-800 text-slate-300"
          }`}
        >
          <FileText className="w-5 h-5 flex-shrink-0" />
          {sidebarOpen && <span className="font-medium">Reports</span>}
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
            activeTab === "settings"
              ? "bg-blue-600 text-white shadow-lg"
              : "hover:bg-slate-800 text-slate-300"
          }`}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {sidebarOpen && <span className="font-medium">Settings</span>}
        </button>
      </nav>


    </div>
  );
}

export default Sidebar;
