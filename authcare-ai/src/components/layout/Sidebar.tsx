import { FileSearch2, FilePlus, LayoutDashboard, LogOut, Settings, Shield } from "lucide-react";
import { DEMO_USER } from "@/data/mockData";
import type { NavSection, Screen } from "@/types/auth";

const NAV_ITEMS: { id: NavSection; label: string; screen: Screen; icon: JSX.Element }[] = [
  { id: "dashboard", label: "Dashboard", screen: "dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: "new-auth", label: "New Request", screen: "new-auth", icon: <FilePlus className="w-4 h-4" /> },
  { id: "denial-analysis", label: "Analyze Denial", screen: "denial-analysis", icon: <FileSearch2 className="w-4 h-4" /> },
  { id: "settings", label: "Settings", screen: "settings", icon: <Settings className="w-4 h-4" /> },
];

interface SidebarProps {
  active: NavSection;
  onNav: (section: NavSection, screen: Screen) => void;
  onLogout: () => void;
}

export function Sidebar({ active, onNav, onLogout }: SidebarProps) {
  return (
    <aside className="no-print w-56 flex-shrink-0 bg-[#0B1F3A] flex flex-col h-full">
      <div className="px-5 py-5 border-b border-white/8">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#1A5FA8] flex items-center justify-center"><Shield className="w-4 h-4 text-white" /></div>
          <div><span className="text-white font-semibold text-base block">ClaimBot</span><span className="text-[10px] text-slate-500">Decision-support prototype</span></div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.id;
          return <button key={item.id} onClick={() => onNav(item.id, item.screen)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left cursor-pointer ${isActive ? "bg-[#1A5FA8] text-white" : "text-slate-400 hover:bg-white/8 hover:text-white"}`}>{item.icon}{item.label}</button>;
        })}
      </nav>
      <div className="px-3 py-4 border-t border-white/8">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg"><div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">{DEMO_USER.initials}</div><div className="flex-1 min-w-0"><div className="text-white text-sm font-medium truncate">{DEMO_USER.name}</div><div className="text-slate-500 text-xs truncate">{DEMO_USER.organization}</div></div></div>
        <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/8 transition-all mt-1 cursor-pointer"><LogOut className="w-4 h-4" />Sign out</button>
      </div>
    </aside>
  );
}
