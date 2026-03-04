import React, { useState } from 'react';
import { Home, ClipboardList, Users, Tractor, UsersRound, BarChart2, Settings, Menu, Bell } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  setActivePage: (page: string) => void;
}

export default function Layout({ children, activePage, setActivePage }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'deputation', label: 'Deputation', icon: ClipboardList },
    { id: 'engineers', label: 'Engineers', icon: Users },
    { id: 'machines', label: 'Machines', icon: Tractor },
    { id: 'customers', label: 'Customers', icon: UsersRound },
    { id: 'reports', label: 'Reports', icon: BarChart2 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-800 font-sans">
      {/* Sidebar */}
      <div className={`bg-slate-900 text-white flex-shrink-0 transition-all duration-300 ${sidebarOpen ? 'w-[230px] px-4 py-5' : 'w-[70px] px-2 py-5'}`}>
        <div className={`font-semibold mb-6 ${sidebarOpen ? 'text-base' : 'hidden'}`}>
          Service System
        </div>
        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition-colors ${
                  isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                } ${!sidebarOpen && 'justify-center'}`}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon size={18} className={isActive ? 'text-white' : ''} />
                <span className={sidebarOpen ? 'block' : 'hidden'}>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="bg-white px-5 py-3.5 m-6 mb-0 rounded-xl shadow-sm flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 hover:bg-slate-100 rounded-md">
              <Menu size={20} className="text-slate-600" />
            </button>
            <h1 className="text-base font-semibold m-0 capitalize">
              {activePage.replace('-', ' ')}
            </h1>
          </div>
          <button className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <Bell size={20} />
          </button>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
