import React from 'react';
import { 
  Bot, Code2, Users, Bus, Key, Send, ExternalLink, 
  Sparkles, HelpCircle, Gamepad2 
} from 'lucide-react';

export type AppTab = 'simulator' | 'games' | 'faq' | 'code' | 'leads' | 'minivan' | 'api';

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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-amber-500 flex items-center justify-center text-white font-black text-sm tracking-tighter shadow-lg shadow-blue-500/20">
              SVOI
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  SVOI Travel
                </h1>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  aiogram 3.x
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Telegram Bot & European Tours
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
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
              onClick={() => onTabChange('games')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'games'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5 text-amber-300" />
              Игры & Квизы
            </button>

            <button
              onClick={() => onTabChange('faq')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'faq'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Частые вопросы
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
              onClick={() => onTabChange('minivan')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'minivan'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bus className="w-3.5 h-3.5" />
              Схема авто (5€)
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
              className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <Send className="w-3 h-3 text-blue-400" />
              <span className="hidden sm:inline">@Svoi_TravelEU_bot</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="flex lg:hidden overflow-x-auto py-2 border-t border-slate-800 gap-1 text-xs">
          <button
            onClick={() => onTabChange('simulator')}
            className={`px-2.5 py-1 rounded-lg shrink-0 ${activeTab === 'simulator' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
          >
            Симулятор
          </button>
          <button
            onClick={() => onTabChange('games')}
            className={`px-2.5 py-1 rounded-lg shrink-0 ${activeTab === 'games' ? 'bg-amber-600 text-white' : 'text-slate-400'}`}
          >
            🎮 Игры & Квизы
          </button>
          <button
            onClick={() => onTabChange('faq')}
            className={`px-2.5 py-1 rounded-lg shrink-0 ${activeTab === 'faq' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
          >
            ❓ FAQ
          </button>
          <button
            onClick={() => onTabChange('code')}
            className={`px-2.5 py-1 rounded-lg shrink-0 ${activeTab === 'code' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
          >
            Код Python
          </button>
          <button
            onClick={() => onTabChange('leads')}
            className={`px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1 ${activeTab === 'leads' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
          >
            Заявки ({leadsCount})
          </button>
          <button
            onClick={() => onTabChange('minivan')}
            className={`px-2.5 py-1 rounded-lg shrink-0 ${activeTab === 'minivan' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
          >
            Места (5€)
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
