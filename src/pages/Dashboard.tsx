import React from 'react';
import { ClipboardList, Users, Tractor, UsersRound, BarChart2, Settings } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm hover:-translate-y-0.5 transition-transform">
          <h2 className="text-2xl font-semibold text-blue-600 m-0">14</h2>
          <p className="text-xs text-slate-500 mt-1">Engineers Onsite</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm hover:-translate-y-0.5 transition-transform">
          <h2 className="text-2xl font-semibold text-blue-600 m-0">6</h2>
          <p className="text-xs text-slate-500 mt-1">Workshop Engineers</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm hover:-translate-y-0.5 transition-transform">
          <h2 className="text-2xl font-semibold text-blue-600 m-0">22</h2>
          <p className="text-xs text-slate-500 mt-1">Active Calls</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[
          { icon: ClipboardList, label: 'Deputation' },
          { icon: Users, label: 'Engineers' },
          { icon: Tractor, label: 'Machines' },
          { icon: UsersRound, label: 'Customers' },
          { icon: BarChart2, label: 'Reports' },
          { icon: Settings, label: 'Settings' },
        ].map((action, i) => (
          <div key={i} className="bg-white p-5 rounded-xl text-center cursor-pointer shadow-sm hover:bg-blue-50 hover:-translate-y-0.5 transition-all">
            <action.icon size={20} className="text-blue-600 mx-auto mb-2" />
            <p className="text-sm m-0 text-slate-700">{action.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
