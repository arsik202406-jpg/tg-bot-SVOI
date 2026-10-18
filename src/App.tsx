import React, { useState } from 'react';
import { Header, AppTab } from './components/Header';
import { TelegramSimulator } from './components/TelegramSimulator';
import { CodeStudio } from './components/CodeStudio';
import { AdminLeadsDesk } from './components/AdminLeadsDesk';
import { MinivanVisualizer } from './components/MinivanVisualizer';
import { TelegramApiTester } from './components/TelegramApiTester';
import { GamesHub } from './components/GamesHub';
import { FaqSection } from './components/FaqSection';
import { SvoiMiniApp } from './components/SvoiMiniApp';
import { ChannelAdminDesk } from './components/ChannelAdminDesk';
import { TRIPS_LIST, MEETING_STOPS, PICKUP_LOGISTICS } from './data/tripsData';
import { LeadItem } from './types';
import { 
  MapPin, Bus, Sparkles, ShieldCheck, PhoneCall, 
  ExternalLink, Compass, Clock, CheckCircle2, X, HelpCircle, Gamepad2, Users, AlertCircle 
} from 'lucide-react';

export default function App() {
  const isTgWebApp = typeof window !== 'undefined' && Boolean(
    (window as any).Telegram?.WebApp?.initData ||
    window.location.search.includes('tgWebApp') ||
    window.location.search.includes('miniapp') ||
    window.location.hash.includes('tgWebAppData')
  );

  const [activeTab, setActiveTab] = useState<AppTab>(isTgWebApp ? 'miniapp' : 'simulator');
  const [showCarModal, setShowCarModal] = useState(false);

  // Initial demo leads to showcase CRM functionality right away
  const [leads, setLeads] = useState<LeadItem[]>([
    {
      id: 'lead-1',
      type: 'booking',
      bookingCode: 'SVOI-7842',
      tripTitle: 'Париж (Версаль + яхта + Ейфелева вежа)',
      duration: '1 день',
      seatType: 'Місце 2 (1-й ряд біля вікна поруч з водієм, +5€)',
      basePrice: 120,
      seatFee: 5,
      totalCost: 125,
      meetingPoint: 'За адресою: Саарбрюккен',
      userName: 'Олена К.',
      userHandle: '@elena_de_voyage',
      userId: 541829012,
      timestamp: '16.10.2026, 14:10',
      status: 'new'
    },
    {
      id: 'lead-2',
      type: 'booking',
      bookingCode: 'SVOI-5193',
      tripTitle: 'Лазурове узбережжя (3 дні: Ніцца, Монако, Канни)',
      duration: '3 дні',
      seatType: 'Місце 3 (2-й ряд біля вікна ліворуч, +5€)',
      basePrice: 440,
      seatFee: 5,
      totalCost: 445,
      meetingPoint: 'За адресою: Люксембург',
      userName: 'Михайло В.',
      userHandle: '@mike_traveler',
      userId: 781923401,
      timestamp: '16.10.2026, 12:45',
      status: 'processing'
    },
    {
      id: 'lead-3',
      type: 'feedback',
      userName: 'Ольга С.',
      userHandle: '@olga_st',
      userId: 629104819,
      text: 'Були в турі до Брюгге минулих вихідних. Враження неймовірні! Комфортний салон Opel Vivaro та турбота організаторів зробили дорогу абсолютно непомітною. Хотілося б тур до Норвегії!',
      timestamp: '15.10.2026, 19:20',
      status: 'confirmed'
    }
  ]);

  const handleNewLead = (newLead: LeadItem) => {
    setLeads((prev) => [newLead, ...prev]);
  };

  const handleUpdateLeadStatus = (id: string, status: LeadItem['status']) => {
    setLeads((prev) =>
      prev.map((lead) => (lead.id === id ? { ...lead, status } : lead))
    );
  };

  // If opened directly as a Telegram Mini App inside Telegram, render clean full-screen view
  if (isTgWebApp) {
    return (
      <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
        <main className="flex-1 w-full max-w-xl mx-auto">
          <SvoiMiniApp onNewLead={handleNewLead} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top App Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        leadsCount={leads.filter((l) => l.status === 'new').length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* SIMULATOR TAB */}
        {activeTab === 'simulator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Interactive Telegram Bot Simulation */}
            <div className="lg:col-span-7 flex flex-col items-center">
              <TelegramSimulator
                onNewLead={handleNewLead}
                onOpenCarModal={() => setShowCarModal(true)}
              />
            </div>

            {/* Right Column: Bot Specs, Itineraries & Logistics Overview */}
            <div className="lg:col-span-5 space-y-4">
              {/* Bot Quick Info Widget */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-xs">
                      TG
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Параметри запуску бота</h3>
                      <p className="text-[11px] text-slate-400">Туристичний клуб SVOI</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    aiogram 3.x Ready
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 mt-3 text-xs">
                  <div className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800/80">
                    <span className="text-slate-400 block text-[10px]">Бот:</span>
                    <a
                      href="https://t.me/Svoi_TravelEU_bot"
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-blue-400 hover:underline flex items-center gap-1"
                    >
                      @Svoi_TravelEU_bot
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>

                  <div className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800/80">
                    <span className="text-slate-400 block text-[10px]">Менеджер:</span>
                    <a
                      href="https://t.me/SVOI_travel_admin"
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      @SVOI_travel_admin
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>

                  <div className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800/80">
                    <span className="text-slate-400 block text-[10px]">Канал SVOI:</span>
                    <a
                      href="https://t.me/+Flt_2r6vi3U4ZDg6"
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-blue-300 hover:underline flex items-center gap-1"
                    >
                      t.me/Канал SVOI
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>

                  <div className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800/80">
                    <span className="text-slate-400 block text-[10px]">Група клубу:</span>
                    <a
                      href="https://t.me/+J50liyDUHPgzYTQy"
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-purple-300 hover:underline flex items-center gap-1"
                    >
                      t.me/Чат поїздок
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
                  Токен: <code className="text-slate-300 font-mono text-[10px]">8969834514:AAHl3mDZU00jnc...</code>
                </div>
              </div>

              {/* 14 Destinations Summary Widget */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-blue-400" />
                    <h3 className="text-sm font-bold text-white">Каталог 14 турів у боті</h3>
                  </div>
                  <span className="text-[10px] text-slate-400">Старт: Саарбрюккен Hbf</span>
                </div>

                <div className="mt-3 space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                  {TRIPS_LIST.map((trip) => (
                    <div
                      key={trip.id}
                      className="p-2 rounded-xl bg-slate-950/60 hover:bg-slate-950 border border-slate-800/70 flex items-center justify-between text-xs transition-colors"
                    >
                      <div className="truncate mr-2">
                        <span className="font-medium text-slate-200">{trip.shortTitle}</span>
                        <span className="text-[10px] text-slate-500 block">{trip.duration}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-300 font-bold border border-blue-500/20 shrink-0">
                        {trip.price}€
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Boarding Points Widget */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3.5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-bold text-white">Точки збору (cb_meeting)</h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    За адресою
                  </span>
                </div>

                {/* Primary Address Pickup Badge */}
                <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-800/60 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-blue-300 text-xs">
                    <span>🏡 Саарланд, Трір & Люксембург:</span>
                  </div>
                  <p className="text-slate-300 text-[11px] mt-1">
                    <b>Забираємо всіх прямо за адресою</b> і розвозимо назад також за адресою!
                  </p>
                </div>

                {/* Stops List */}
                <div className="space-y-2 text-xs">
                  <div className="text-[11px] font-semibold text-slate-400">
                    Інші землі (за наявності від 4-х осіб):
                  </div>
                  {MEETING_STOPS.slice(1).map((stop, i) => (
                    <div key={i} className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-semibold text-white block text-xs truncate">{stop.city}</span>
                        <span className="text-[10px] text-amber-300/90 block mt-0.5">{stop.condition}</span>
                      </div>
                      {stop.badge && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0 font-medium">
                          {stop.badge}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Evening notification and 1-day group logistics */}
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5 text-[11px] text-slate-400">
                  <div className="flex items-start gap-1.5 text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span><b>Час подачі:</b> надсилається в особистий чат за день увечері перед виїздом.</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-slate-300">
                    <Users className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <span><b>Чат з водієм:</b> одноденна група для комунікації (видаляється через день).</span>
                  </div>
                  <div className="pt-1 border-t border-slate-800/60 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">Уточнити підсадку:</span>
                    <a
                      href="https://t.me/SVOI_travel_admin"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-emerald-400 hover:underline font-bold"
                    >
                      @SVOI_travel_admin →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MINI APP TAB */}
        {activeTab === 'miniapp' && (
          <div className="py-2">
            <SvoiMiniApp onNewLead={handleNewLead} />
          </div>
        )}

        {/* CHANNEL & GIVEAWAYS TAB */}
        {activeTab === 'channel' && (
          <ChannelAdminDesk />
        )}

        {/* GAMES & QUIZZES TAB */}
        {activeTab === 'games' && <GamesHub />}

        {/* FAQ TAB */}
        {activeTab === 'faq' && <FaqSection />}

        {/* CODE TAB */}
        {activeTab === 'code' && <CodeStudio />}

        {/* LEADS CRM TAB */}
        {activeTab === 'leads' && (
          <AdminLeadsDesk
            leads={leads}
            onUpdateStatus={handleUpdateLeadStatus}
            onClearArchived={() => setLeads((prev) => prev.filter((l) => l.status !== 'archived'))}
          />
        )}

        {/* MINIVAN VISUALIZER TAB */}
        {activeTab === 'minivan' && <MinivanVisualizer />}

        {/* TELEGRAM API TESTER TAB */}
        {activeTab === 'api' && <TelegramApiTester />}
      </main>

      {/* Opel Vivaro Modal (When triggered from Telegram bot preview) */}
      {showCarModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-4xl w-full relative">
            <button
              onClick={() => setShowCarModal(false)}
              className="absolute -top-3 -right-3 z-10 w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center border border-slate-600 shadow-xl"
            >
              <X className="w-5 h-5" />
            </button>
            <MinivanVisualizer
              onSelectSeat={(seat, price) => {
                setShowCarModal(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 py-4 mt-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Туристичний клуб SVOI Travel • Поїздки Європою із Саарбрюккена</span>
          <div className="flex items-center gap-3">
            <a href="https://t.me/Svoi_TravelEU_bot" target="_blank" rel="noreferrer" className="hover:text-blue-400">
              @Svoi_TravelEU_bot
            </a>
            <span>•</span>
            <a href="https://t.me/SVOI_travel_admin" target="_blank" rel="noreferrer" className="hover:text-emerald-400">
              @SVOI_travel_admin
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
