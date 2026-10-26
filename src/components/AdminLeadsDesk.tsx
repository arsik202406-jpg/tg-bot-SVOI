import React, { useState } from 'react';
import { 
  Inbox, MessageSquare, CheckCircle, Clock, Archive, 
  ExternalLink, Search, Filter, Download, User, MapPin, 
  Armchair, Calendar, Trash2 
} from 'lucide-react';
import { LeadItem } from '../types';

interface AdminLeadsDeskProps {
  leads: LeadItem[];
  onUpdateStatus: (id: string, status: LeadItem['status']) => void;
  onClearArchived?: () => void;
}

export const AdminLeadsDesk: React.FC<AdminLeadsDeskProps> = ({
  leads,
  onUpdateStatus,
  onClearArchived
}) => {
  const [filterType, setFilterType] = useState<'all' | 'booking' | 'waitlist' | 'feedback'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [waitlistToast, setWaitlistToast] = useState<string | null>(null);

  const handleBroadcastWaitlist = async () => {
    try {
      const res = await fetch('/api/leads/notify-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId: 'all' }),
      });
      const data = await res.json();
      if (data.ok) {
        setWaitlistToast(`📣 Сповіщено в Telegram: ${data.sent} з ${data.total} у листі очікування!`);
      } else {
        setWaitlistToast('⚠️ Помилка розсилки по листу очікування');
      }
    } catch {
      setWaitlistToast('⚠️ Не вдалося виконати розсилку');
    }
    setTimeout(() => setWaitlistToast(null), 4000);
  };

  const filteredLeads = leads.filter((lead) => {
    if (filterType !== 'all' && lead.type !== filterType) return false;
    if (filterStatus !== 'all' && lead.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = lead.userName.toLowerCase().includes(q);
      const matchHandle = lead.userHandle.toLowerCase().includes(q);
      const matchTrip = lead.tripTitle?.toLowerCase().includes(q) || false;
      const matchText = lead.text?.toLowerCase().includes(q) || false;
      return matchName || matchHandle || matchTrip || matchText;
    }
    return true;
  });

  const getStatusBadge = (status: LeadItem['status']) => {
    switch (status) {
      case 'new':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            ⏳ Очікує підтвердження
          </span>
        );
      case 'processing':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
            🔄 В обробці
          </span>
        );
      case 'confirmed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            ✅ Підтверджена (Місце списано)
          </span>
        );
      case 'archived':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400">
            🗄 В архіві
          </span>
        );
    }
  };

  const handleExportCSV = () => {
    window.location.href = '/api/leads/export.csv';
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl text-slate-100 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Inbox className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">Панель заявок & CRM</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Вхідні заявки на бронювання турів, лист очікування та відгуки клієнтів з Telegram-бота
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleBroadcastWaitlist}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-all flex items-center gap-1.5"
            title="Розіслати сповіщення в Telegram всім, хто записався в лист очікування"
          >
            <span>📣 Розсилка по Листу очікування</span>
          </button>

          {onClearArchived && (
            <button
              onClick={onClearArchived}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 transition-all flex items-center gap-1.5"
              title="Очистити архівовані заявки"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Очистити архів</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition-all flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            📥 Вивантажити базу (CSV)
          </button>
        </div>
      </div>

      {waitlistToast && (
        <div className="px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs font-semibold">
          {waitlistToast}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-6 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Пошук за туристом, туром, телефоном, кодом броні..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
          />
        </div>

        <div className="md:col-span-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-blue-500"
          >
            <option value="all">Усі типи звернень</option>
            <option value="booking">💺 Бронювання місць</option>
            <option value="waitlist">📋 Лист очікування</option>
            <option value="feedback">✍️ Відгуки / Побажання</option>
          </select>
        </div>

        <div className="md:col-span-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-blue-500"
          >
            <option value="all">Усі статуси</option>
            <option value="new">Нові</option>
            <option value="processing">В обробці</option>
            <option value="confirmed">Підтверджені</option>
            <option value="archived">В архіві</option>
          </select>
        </div>
      </div>

      {/* Leads List */}
      <div className="space-y-3">
        {filteredLeads.length === 0 ? (
          <div className="text-center py-12 bg-slate-950/60 rounded-xl border border-dashed border-slate-800">
            <Inbox className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400">За обраними фільтрами записів не знайдено</p>
            <p className="text-xs text-slate-500 mt-1">
              Протестуйте бронь або надсилання відгуку в симуляторі Telegram ліворуч
            </p>
          </div>
        ) : (
          filteredLeads.map((lead) => (
            <div
              key={lead.id}
              className="bg-slate-950/80 hover:bg-slate-950 border border-slate-800/90 rounded-xl p-4 transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`p-2 rounded-lg text-xs font-bold ${
                      lead.type === 'booking'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {lead.type === 'booking' ? '💺 Бронь' : '✍️ Відгук'}
                  </span>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white">{lead.userName}</span>
                      <a
                        href={`https://t.me/${lead.userHandle.replace('@', '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                      >
                        {lead.userHandle}
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </a>
                    </div>
                    <span className="text-[11px] text-slate-500">ID: {lead.userId}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    {lead.timestamp}
                  </span>
                  {getStatusBadge(lead.status)}
                </div>
              </div>

              {/* Booking Specifics */}
              {lead.type === 'booking' && (
                <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 text-xs space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
                        #{lead.bookingCode || 'SVOI-AUTO'}
                      </span>
                      <span className="text-slate-400">Автоматично підтверджено</span>
                    </div>
                    {lead.totalCost && (
                      <span className="text-sm font-black text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-lg border border-emerald-500/30">
                        Разом: {lead.totalCost}€
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Напрямок:</span>
                      <span className="font-semibold text-white">{lead.tripTitle}</span>
                      {lead.duration && <span className="text-slate-500 text-[10px] ml-1">({lead.duration})</span>}
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">Обране місце:</span>
                      <span className="text-amber-300 font-medium">{lead.seatType}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">Пункт збору:</span>
                      <span className="text-slate-300">{lead.meetingPoint || 'Саарбрюккен Hbf'}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">Деталізація тарифу:</span>
                      <span className="text-slate-300">
                        {lead.basePrice ? `Тур: ${lead.basePrice}€` : ''} 
                        {lead.seatFee ? ` • Місце: +${lead.seatFee}€` : ''}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Feedback Specifics */}
              {lead.type === 'feedback' && (
                <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 text-xs text-slate-200 italic">
                  "{lead.text}"
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400">Статус:</span>
                  <select
                    value={lead.status}
                    onChange={(e) => onUpdateStatus(lead.id, e.target.value as any)}
                    className="bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-slate-200 outline-none focus:border-blue-500"
                  >
                    <option value="new">Нова</option>
                    <option value="processing">В обробці</option>
                    <option value="confirmed">Підтверджена</option>
                    <option value="archived">В архів</option>
                  </select>
                </div>

                <a
                  href={`https://t.me/${lead.userHandle.replace('@', '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition-all font-medium flex items-center gap-1"
                >
                  <span>Написати клієнту</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
