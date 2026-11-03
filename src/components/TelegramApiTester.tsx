import React, { useState, useEffect } from 'react';
import { 
  Key, ShieldCheck, Send, CheckCircle2, AlertCircle, 
  RefreshCw, Lock, Eye, EyeOff, ShieldAlert
} from 'lucide-react';

interface TelegramApiTesterProps {
  initialToken?: string;
}

export const TelegramApiTester: React.FC<TelegramApiTesterProps> = () => {
  const [serverStatus, setServerStatus] = useState<{
    hasToken: boolean;
    maskedToken: string;
    source?: string;
    tokenValid?: boolean;
    botInfo?: any;
    webhookInfo?: any;
    errorDescription?: string | null;
  } | null>(null);

  const [newTokenInput, setNewTokenInput] = useState('');
  const [showNewToken, setShowNewToken] = useState(false);
  const [isSavingToken, setIsSavingToken] = useState(false);
  const [saveBanner, setSaveBanner] = useState<{ ok: boolean; msg: string } | null>(null);

  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Test message states (restricted to Admin Chat ID)
  const [testChatId, setTestChatId] = useState('8450153980');
  const [testText, setTestText] = useState('🔔 Перевірка захищеного з’єднання бота SVOI Travel (@Svoi_TravelEU_bot)!');
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<any>(null);

  const fetchServerStatus = async () => {
    try {
      const res = await fetch('/api/telegram/status');
      const data = await res.json();
      if (data?.ok) {
        setServerStatus(data);
        if (data.botInfo) {
          setVerifyResult(data.botInfo);
          setErrorMsg(null);
        } else if (data.errorDescription) {
          setErrorMsg(data.errorDescription);
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchServerStatus();
  }, []);

  const handleSaveNewToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenInput.trim()) return;
    setIsSavingToken(true);
    setSaveBanner(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/telegram/set-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: newTokenInput.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setNewTokenInput('');
        setVerifyResult(data.result);
        setSaveBanner({
          ok: true,
          msg: data.message || '✅ Новий токен успішно збережено в захищеному серверному сховищі! Чужі вебхуки скинуто, бот перезапущено.',
        });
        await fetchServerStatus();
      } else {
        setSaveBanner({
          ok: false,
          msg: data.description || 'Помилка збереження токена. Перевірте ключ у @BotFather.',
        });
      }
    } catch (e: any) {
      setSaveBanner({
        ok: false,
        msg: `Помилка з’єднання із сервером: ${e.message}`,
      });
    } finally {
      setIsSavingToken(false);
    }
  };

  const handleVerifyToken = async () => {
    setIsVerifying(true);
    setErrorMsg(null);
    setVerifyResult(null);

    try {
      const response = await fetch('/api/telegram/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: '****' }),
      });
      const data = await response.json();
      if (data.ok) {
        setVerifyResult(data.result);
        await fetchServerStatus();
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
          token: '****',
          chatId: testChatId.trim(),
          text: testText.trim(),
          parseMode: 'HTML',
        }),
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
        <div className="flex items-center gap-2.5">
          <span className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">
              Захищене сховище Bot Token & Telegram API
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Токен більше НІДЕ не зберігається у вихідному коді чи GitHub — лише у зашифрованому серверному сховищі
            </p>
          </div>
        </div>

        <button
          onClick={handleVerifyToken}
          disabled={isVerifying}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
          {isVerifying ? 'Перевірка в Telegram...' : 'Перевірити статус бота'}
        </button>
      </div>

      {/* Security Notice */}
      <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-100 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1 leading-relaxed">
          <p className="font-bold text-amber-300">
            Чому старий токен потрібно перевипустити через /revoke у @BotFather?
          </p>
          <p className="text-slate-300">
            Раніше старий ключ був у публічному репозиторії GitHub, звідки боти-сканери автоматично скопіювали його собі в базу. Навіть якщо приховати старий ключ зірочками на сайті, у зловмисників залишається сама комбінація символів старого ключа, поки ви не зробите <b>/revoke</b> у <b>@BotFather</b>. Після <b>/revoke</b> старий ключ миттєво стає недійсним (401 Unauthorized) для всіх чужих скриптів!
          </p>
        </div>
      </div>

      {/* Current Masked Status + Safe New Token Vault Form */}
      <div className="p-4 sm:p-5 bg-slate-950/90 border border-slate-800 rounded-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
          <div className="text-xs">
            <span className="text-slate-400 block">Поточний серверний ключ (прихований):</span>
            <span className="font-mono font-semibold text-emerald-300">
              {serverStatus?.maskedToken || 'Перевірка...'}
            </span>
          </div>
          <span
            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
              serverStatus?.tokenValid
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
            }`}
          >
            {serverStatus?.tokenValid ? '✅ Підключено та захищено' : '⚠️ Очікує новий токен із @BotFather'}
          </span>
        </div>

        <form onSubmit={handleSaveNewToken} className="space-y-3">
          <label className="text-xs font-bold text-white flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            Вставте НОВИЙ токен із @BotFather (після команди /revoke):
          </label>
          <p className="text-[11px] text-slate-400">
            Ключ передається напряму в закрите серверне сховище (<code>.bot_secret.json</code> у <code>.gitignore</code>), <b>не потрапляє в код і не відправляється в GitHub</b>. При збереженні сервер автоматично видаляє будь-які чужі вебхуки та перезапускає бота.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <input
                type={showNewToken ? 'text' : 'password'}
                value={newTokenInput}
                onChange={(e) => setNewTokenInput(e.target.value)}
                placeholder="Вставте новий ключ сюди (наприклад: 8969834514:AAH...)"
                autoComplete="off"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-3.5 pr-10 py-2.5 text-xs font-mono text-white outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowNewToken((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showNewToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={isSavingToken || !newTokenInput.trim()}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 disabled:opacity-40 shrink-0"
            >
              <Key className="w-3.5 h-3.5" />
              {isSavingToken ? 'Збереження та перезапуск...' : '🔒 Зберегти новий токен і перезапустити бота'}
            </button>
          </div>
        </form>

        {saveBanner && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              saveBanner.ok
                ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/40 border border-rose-500/40 text-rose-200'
            }`}
          >
            {saveBanner.ok ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{saveBanner.msg}</span>
          </div>
        )}
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
              <span className="text-slate-400 block text-[10px]">Ім&apos;я бота</span>
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

      {/* Test Message Dispatcher (Restricted to Admin Chat ID) */}
      <div className="pt-4 border-t border-slate-800 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Send className="w-4 h-4 text-indigo-400" />
            Надсилання тестового повідомлення адміністратору
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Для захисту від сторонніх запитів тестові повідомлення дозволені лише на верифікований Telegram ID адміністратора
          </p>
        </div>

        <form onSubmit={handleSendTestMessage} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Telegram Chat ID адміна:
              </label>
              <input
                type="text"
                value={testChatId}
                onChange={(e) => setTestChatId(e.target.value)}
                placeholder="8450153980"
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
              🔒 Захищено: відправка стороннім користувачам заблокована на рівні сервера
            </div>

            <button
              type="submit"
              disabled={isSending || !testChatId.trim()}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30 flex items-center gap-2 disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              {isSending ? 'Надсилання...' : 'Надіслати тест адміну'}
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

