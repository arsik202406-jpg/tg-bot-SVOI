import React, { useState } from 'react';
import { 
  Key, ShieldCheck, Send, CheckCircle2, AlertCircle, 
  RefreshCw, Bot, ExternalLink, Terminal, Sparkles 
} from 'lucide-react';

interface TelegramApiTesterProps {
  initialToken?: string;
}

export const TelegramApiTester: React.FC<TelegramApiTesterProps> = ({
  initialToken = '8969834514:AAHl3mDZU00jncjJ52TyGTHmcs_-l5CBjPM'
}) => {
  const [token, setToken] = useState(initialToken);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Test message states
  const [testChatId, setTestChatId] = useState('8450153980');
  const [testText, setTestText] = useState('🔔 Тестове повідомлення від бота SVOI Travel (@Svoi_TravelEU_bot)!');
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<any>(null);

  const handleVerifyToken = async () => {
    setIsVerifying(true);
    setErrorMsg(null);
    setVerifyResult(null);

    try {
      const response = await fetch('/api/telegram/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() })
      });
      const data = await response.json();
      if (data.ok) {
        setVerifyResult(data.result);
      } else {
        setErrorMsg(data.description || 'Помилка перевірки токена');
      }
    } catch (e: any) {
      setErrorMsg(`Не вдалося зв'язатися із сервером: ${e.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testChatId.trim()) return;

    setIsSending(true);
    setSendResult(null);

    try {
      const response = await fetch('/api/telegram/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token.trim(),
          chatId: testChatId.trim(),
          text: testText.trim(),
          parseMode: 'HTML'
        })
      });
      const data = await response.json();
      setSendResult(data);
    } catch (e: any) {
      setSendResult({ ok: false, error: e.message });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl text-slate-100 space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Key className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">
                Діагностика & Telegram Bot API
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Перевірка валідності Bot Token, статус у Telegram API та надсилання тестових сповіщень
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleVerifyToken}
          disabled={isVerifying}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
          {isVerifying ? 'Перевірка в Telegram...' : 'Перевірити токен'}
        </button>
      </div>

      {/* Token Field */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-300">
          Токен Telegram бота (BOT_TOKEN):
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white outline-none focus:border-blue-500"
            placeholder="8969834514:AAHl3m..."
          />
        </div>
        <p className="text-[11px] text-slate-400">
          Бот: <b className="text-blue-300">@Svoi_TravelEU_bot</b> | Керується через @BotFather
        </p>
      </div>

      {/* Live Telegram API Response Display */}
      {verifyResult && (
        <div className="p-4 bg-emerald-950/30 border border-emerald-500/40 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Токен валідний! Бот успішно відповідає у Telegram API</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-2.5 bg-slate-950/70 rounded-lg border border-slate-800 text-xs">
              <span className="text-slate-400 block text-[10px]">Ім'я бота</span>
              <span className="font-semibold text-white">{verifyResult.first_name}</span>
            </div>

            <div className="p-2.5 bg-slate-950/70 rounded-lg border border-slate-800 text-xs">
              <span className="text-slate-400 block text-[10px]">Юзернейм</span>
              <span className="font-semibold text-blue-300">@{verifyResult.username}</span>
            </div>

            <div className="p-2.5 bg-slate-950/70 rounded-lg border border-slate-800 text-xs">
              <span className="text-slate-400 block text-[10px]">ID бота в Telegram</span>
              <span className="font-mono text-slate-200">{verifyResult.id}</span>
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-950/30 border border-red-500/30 rounded-xl text-xs text-red-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Test Message Dispatcher */}
      <div className="pt-4 border-t border-slate-800 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Send className="w-4 h-4 text-indigo-400" />
            Надсилання реального тестового повідомлення через Telegram API
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Введіть ваш числовий Telegram Chat ID (можна дізнатися через бота @userinfobot), щоб отримати пряме повідомлення від бота
          </p>
        </div>

        <form onSubmit={handleSendTestMessage} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Telegram Chat ID (число):
              </label>
              <input
                type="text"
                value={testChatId}
                onChange={(e) => setTestChatId(e.target.value)}
                placeholder="Наприклад: 8450153980"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Текст тестового повідомлення (HTML):
              </label>
              <input
                type="text"
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-[11px] text-slate-500">
              ⚠️ Важливо: користувач має хоча б раз надіслати /start боту перед надсиланням
            </div>

            <button
              type="submit"
              disabled={isSending || !testChatId.trim()}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30 flex items-center gap-2 disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              {isSending ? 'Надсилання...' : 'Надіслати до Telegram'}
            </button>
          </div>
        </form>

        {sendResult && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              sendResult.ok
                ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-200'
                : 'bg-red-950/40 border border-red-500/30 text-red-200'
            }`}
          >
            {sendResult.ok ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Повідомлення успішно доставлено в Telegram! ID повідомлення: {sendResult.result?.message_id}
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>
                  Помилка надсилання: {sendResult.description || sendResult.error || 'Перевірте Chat ID'}
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
