import React, { useState } from 'react';
import {
  LayoutDashboard,
  BarChart3,
  Users,
  Activity,
  Download,
  Wifi,
  WifiOff,
  UserPlus,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { ActiveTab } from '../types';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useSettings } from '../hooks/useSettings';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenCheckIn: () => void;
  checkingCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onOpenCheckIn,
  checkingCount = 0,
}) => {
  const isOnline = useOnlineStatus();
  const { isInstallable, isInstalled, install, isIOS } = usePWAInstall();
  const { clinicName, doctorName } = useSettings();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Navigation items
  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      badge: checkingCount > 0 ? checkingCount : undefined,
    },
    {
      id: 'patients',
      label: 'Patients',
      icon: <Users className="w-5 h-5" />,
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  return (
    <>
      {/* TABLET / DESKTOP SIDEBAR (visible on md: and up) */}
      <aside className={`hidden md:flex flex-col shrink-0 bg-white border-r border-neutral-200 min-h-screen sticky top-0 h-screen z-30 justify-between transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden relative">
          
          {/* Toggle Button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute right-0 top-6 translate-x-1/2 bg-white border border-neutral-200 rounded-full p-1 hover:bg-neutral-50 z-50 shadow-sm"
          >
            {isSidebarOpen ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>

          {/* Clinic Brand Header */}
          <div className={`border-b border-neutral-200 ${isSidebarOpen ? 'p-6' : 'p-4 flex flex-col items-center'}`}>
            <div className={`flex items-center ${isSidebarOpen ? 'gap-3' : 'justify-center'}`}>
              <div className="w-9 h-9 rounded bg-black text-white flex items-center justify-center font-bold text-lg shrink-0">
                <Activity className="w-5 h-5 stroke-[2.5]" />
              </div>
              {isSidebarOpen && (
                <div className="min-w-0">
                  <h1 className="font-bold text-base text-black tracking-tight leading-none truncate">
                    {clinicName}
                  </h1>
                  {doctorName && (
                    <p className="text-sm text-neutral-500 mt-1 truncate">
                      Dr. {doctorName}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Offline Status Indicator */}
            {isSidebarOpen && (
              <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-medium text-neutral-600">
                  {isOnline ? (
                    <span className="inline-flex items-center gap-1.5 text-neutral-800">
                      <span className="w-2 h-2 rounded-full bg-black"></span>
                      Online
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-black font-semibold">
                      <span className="w-2 h-2 rounded-full bg-neutral-400"></span>
                      Offline Mode
                    </span>
                  )}
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 border border-neutral-300 rounded text-neutral-700 font-mono">
                  Dexie.js
                </span>
              </div>
            )}
          </div>

          {/* Quick Check-In Action Button */}
          <div className={`border-b border-neutral-200 ${isSidebarOpen ? 'p-4' : 'p-3 flex justify-center'}`}>
            <button
              onClick={onOpenCheckIn}
              title="Check In Patient"
              className={`flex items-center justify-center gap-2 bg-black text-white font-bold rounded hover:bg-neutral-800 active:scale-[0.99] transition ${isSidebarOpen ? 'w-full px-3 py-2.5 text-xs' : 'w-10 h-10 p-0 text-center shrink-0'}`}
            >
              <UserPlus className="w-4 h-4" />
              {isSidebarOpen && <span>Check In Patient</span>}
            </button>
          </div>

          {/* Main Navigation Items (Strictly 3 items) */}
          <nav className={`space-y-1 flex-1 ${isSidebarOpen ? 'p-4' : 'p-2 mt-2 space-y-3'}`}>
            {isSidebarOpen && (
              <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Navigation
              </p>
            )}
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  title={item.label}
                  className={`w-full flex items-center ${isSidebarOpen ? 'justify-between px-3.5 py-2.5' : 'justify-center py-3'} rounded text-sm font-medium transition-colors ${isActive
                    ? 'bg-black text-white font-semibold'
                    : 'text-neutral-700 hover:bg-neutral-100 hover:text-black'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    {isSidebarOpen && <span>{item.label}</span>}
                  </div>
                  {item.badge !== undefined && (
                    isSidebarOpen ? (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${isActive
                          ? 'bg-white text-black font-bold'
                          : 'bg-neutral-200 text-black font-semibold'
                          }`}
                      >
                        {item.badge}
                      </span>
                    ) : (
                      <span className="absolute right-3 top-3 w-2 h-2 bg-red-500 rounded-full" />
                    )
                  )}
                </button>
              );
            })}
          </nav>

          {/* PWA Install Button & Tablet Footer */}
          {isSidebarOpen && (
            <div className="p-4 border-t border-neutral-200 space-y-2">
              {!isInstalled && (isInstallable || isIOS) && (
                <button
                  onClick={install}
                  className="w-full flex items-center justify-center gap-2 border border-neutral-400 bg-neutral-50 hover:border-black text-black px-3 py-2 rounded text-xs font-medium transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  {isIOS ? 'Install PWA (Safari)' : 'Install App on Device'}
                </button>
              )}
              <div className="text-[11px] text-neutral-400 text-center font-mono">
                100% Offline • IndexedDB
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* MOBILE TOP HEADER (visible on mobile only) */}
      <header className="md:hidden sticky top-0 z-40 bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded bg-black text-white flex items-center justify-center font-bold shrink-0">
            <Activity className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div className="min-w-0 pr-2">
            <h1 className="font-bold text-sm text-black leading-tight truncate">{clinicName}</h1>
            <p className="text-[10px] text-neutral-500 font-medium truncate">
              {doctorName ? `Dr. ${doctorName}` : 'Offline Patient System'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Check-In Button */}
          <button
            onClick={onOpenCheckIn}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded border border-black bg-black text-white text-xs font-bold active:scale-95 transition"
            title="Check In Patient"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Check In</span>
          </button>

          {/* Connection state badge */}
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold border ${isOnline
              ? 'bg-neutral-100 text-black border-neutral-300'
              : 'bg-black text-white border-black'
              }`}
          >
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      </header>

      {/* MOBILE BOTTOM NAVIGATION BAR (Strictly 3 items) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-neutral-200 px-2 py-1.5 flex items-center justify-around safe-area-bottom">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded transition-colors relative ${isActive ? 'text-black font-bold' : 'text-neutral-500 hover:text-black font-medium'
                }`}
            >
              <div className="relative">
                {item.icon}
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 bg-black text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight font-medium">
                {item.label}
              </span>
              {isActive && (
                <span className="w-4 h-0.5 bg-black rounded-full mt-0.5" />
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
};
