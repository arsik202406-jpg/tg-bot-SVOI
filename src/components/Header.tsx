import React from 'react';
import { 
  Bot, Code2, Users, Bus, Key, Send, ExternalLink, 
  Sparkles, HelpCircle, Gamepad2, Gift, Compass 
} from 'lucide-react';

export type AppTab = 'simulator' | 'miniapp' | 'channel' | 'games' | 'faq' | 'code' | 'leads' | 'minivan' | 'api';

interface HeaderProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  leadsCount: number;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange, leadsCount }) => {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-amber-500 flex items-center justify-center text-white font-black text-sm tracking-tighter shadow-lg shadow-cyan-500/20">
              SVOI
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  SVOI Travel
                </h1>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  aiogram 3.x
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Telegram Bot, Mini App & Розіграші
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="hidden xl:flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => onTabChange('simulator')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'simulator'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              Симулятор бота
            </button>

            <button
              onClick={() => onTabChange('miniapp')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'miniapp'
                  ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md shadow-cyan-600/30 border border-cyan-400/50'
                  : 'text-cyan-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
              <span>🚀 SVOI Mini App</span>
            </button>

            <button
              onClick={() => onTabChange('channel')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'channel'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-600/30 border border-purple-400/50'
                  : 'text-purple-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Gift className="w-3.5 h-3.5 text-purple-300" />
              <span>🎁 Канал & Розіграші (/channel)</span>
            </button>

            <button
              onClick={() => onTabChange('minivan')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'minivan'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bus className="w-3.5 h-3.5" />
              Салон Vivaro
            </button>

            <button
              onClick={() => onTabChange('games')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'games'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5 text-purple-300" />
              Ігри & Квізи
            </button>

            <button
              onClick={() => onTabChange('leads')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'leads'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Заявки</span>
              {leadsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-slate-950 font-black">
                  {leadsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onTabChange('code')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'code'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              Код Python
            </button>

            <button
              onClick={() => onTabChange('api')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'api'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              API
            </button>
          </nav>

          {/* Quick Telegram External Links */}
          <div className="flex items-center gap-2">
            <a
              href="https://t.me/Svoi_TravelEU_bot"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Send className="w-3 h-3 text-cyan-400" />
              <span className="hidden sm:inline">@Svoi_TravelEU_bot</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="flex xl:hidden overflow-x-auto py-2 border-t border-slate-800 gap-2 text-xs scrollbar-none items-center">
          <button
            onClick={() => onTabChange('simulator')}
            className={`px-3 py-1.5 rounded-xl shrink-0 font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'simulator' 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40 ring-1 ring-blue-400' 
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-blue-300" />
            <span>📱 Симулятор бота</span>
          </button>
          <button
            onClick={() => onTabChange('miniapp')}
            className={`px-3 py-1.5 rounded-xl shrink-0 font-black transition-all flex items-center gap-1.5 ${
              activeTab === 'miniapp' 
                ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md shadow-cyan-600/40 border border-cyan-400' 
                : 'bg-cyan-950/40 text-cyan-300 hover:text-white border border-cyan-500/30'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>🚀 SVOI Mini App</span>
          </button>
          <button
            onClick={() => onTabChange('channel')}
            className={`px-3 py-1.5 rounded-xl shrink-0 font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'channel' 
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm border border-purple-400' 
                : 'bg-purple-950/30 text-purple-300 hover:text-white border border-purple-500/20'
            }`}
          >
            <Gift className="w-3.5 h-3.5 text-purple-400" />
            <span>🎁 Канал & Розіграші</span>
          </button>
          <button
            onClick={() => onTabChange('minivan')}
            className={`px-2.5 py-1 rounded-lg shrink-0 ${activeTab === 'minivan' ? 'bg-amber-600 text-white' : 'text-slate-400'}`}
          >
            🚐 Салон Vivaro
          </button>
          <button
            onClick={() => onTabChange('games')}
            className={`px-2.5 py-1 rounded-lg shrink-0 ${activeTab === 'games' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}
          >
            🎮 Ігри
          </button>
          <button
            onClick={() => onTabChange('leads')}
            className={`px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1 ${activeTab === 'leads' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
          >
            Заявки ({leadsCount})
          </button>
          <button
            onClick={() => onTabChange('code')}
            className={`px-2.5 py-1 rounded-lg shrink-0 ${activeTab === 'code' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
          >
            Код Python
          </button>
          <button
            onClick={() => onTabChange('faq')}
            className={`px-2.5 py-1 rounded-lg shrink-0 ${activeTab === 'faq' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
          >
            FAQ
          </button>
          <button
            onClick={() => onTabChange('api')}
            className={`px-2.5 py-1 rounded-lg shrink-0 ${activeTab === 'api' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
          >
            API
          </button>
        </div>
      </div>
    </header>
  );
};
