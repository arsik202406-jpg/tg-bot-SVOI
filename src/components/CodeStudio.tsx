import React, { useState } from 'react';
import JSZip from 'jszip';
import { 
  FileCode2, Copy, Check, Download, Terminal, FolderTree, 
  Settings, Play, Layers, Server, ShieldAlert, AlertTriangle, 
  ExternalLink, CheckCircle2, Laptop, ShieldCheck, Sparkles 
} from 'lucide-react';
import { BOT_CODE_FILES } from '../data/codeFiles';
import { PythonCodeFile } from '../types';

export const CodeStudio: React.FC = () => {
  const [activeFile, setActiveFile] = useState<PythonCodeFile>(BOT_CODE_FILES[0]);
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'editor' | 'testing' | 'deploy'>('testing');

  const handleCopy = () => {
    navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    try {
      setIsZipping(true);
      const zip = new JSZip();

      // Add all project files into zip archive
      BOT_CODE_FILES.forEach((file) => {
        zip.file(file.path, file.content);
      });

      // Also generate run.sh helper script
      const runSh = `#!/usr/bin/env bash
set -e
echo "🚀 Запуск SVOI Travel Telegram Bot..."
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
python bot.py
`;
      zip.file('run.sh', runSh);

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'svoi_travel_telegram_bot_aiogram3.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error generating zip:', e);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Top Banner & Action Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              aiogram 3.x Production Code
            </span>
            <h2 className="text-xl font-bold text-white tracking-wide">
              Архітектура та вихідний код бота
            </h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Модульна структура: FSM машини станів, роутери, кастомні інлайн-клавіатури та обробка помилок
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setActiveSubTab('editor')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeSubTab === 'editor'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <FileCode2 className="w-4 h-4" />
            Редактор файлів
          </button>

          <button
            onClick={() => setActiveSubTab('testing')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeSubTab === 'testing'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Play className="w-4 h-4 text-emerald-300" />
            Як протестувати в Telegram
          </button>

          <button
            onClick={() => setActiveSubTab('deploy')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeSubTab === 'deploy'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Server className="w-4 h-4" />
            Інструкція деплою
          </button>

          <button
            onClick={handleDownloadZip}
            disabled={isZipping}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white transition-all shadow-lg shadow-amber-600/30 flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isZipping ? 'Пакування архіву...' : 'Завантажити проєкт (.zip)'}
          </button>
        </div>
      </div>

      {activeSubTab === 'editor' ? (
        /* File Explorer + Code Viewer */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* File Tree Sidebar */}
          <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl flex flex-col">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 pb-3 border-b border-slate-800">
              <FolderTree className="w-4 h-4 text-blue-400" />
              <span>Файли проєкту (11)</span>
            </div>

            <div className="mt-3 space-y-1 overflow-y-auto max-h-[600px] pr-1">
              {BOT_CODE_FILES.map((file) => {
                const isActive = activeFile.path === file.path;
                return (
                  <button
                    key={file.path}
                    onClick={() => setActiveFile(file)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-between group ${
                      isActive
                        ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <FileCode2
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'
                        }`}
                      />
                      <span className="font-mono truncate">{file.name}</span>
                    </div>

                    <span className="text-[10px] text-slate-500 uppercase px-1.5 py-0.5 rounded bg-slate-800/80 group-hover:bg-slate-700">
                      {file.language}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick File Meta */}
            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 px-2 leading-relaxed">
              <span className="font-semibold text-slate-300">{activeFile.name}:</span>{' '}
              {activeFile.description}
            </div>
          </div>

          {/* Code Viewer Panel */}
          <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            {/* Code Header Bar */}
            <div className="bg-slate-900/90 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="ml-2 font-mono text-xs text-slate-300 font-semibold">
                  {activeFile.path}
                </span>
              </div>

              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all flex items-center gap-1.5"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Скопійовано!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Скопіювати код</span>
                  </>
                )}
              </button>
            </div>

            {/* Code Editor Body */}
            <div className="p-4 overflow-x-auto max-h-[600px] font-mono text-xs leading-relaxed text-slate-200 bg-[#0d1117]">
              <pre className="select-text whitespace-pre">
                {activeFile.content.split('\n').map((line, idx) => (
                  <div key={idx} className="table-row hover:bg-slate-800/40">
                    <span className="table-cell select-none pr-4 text-right text-slate-600 text-[11px] w-10">
                      {idx + 1}
                    </span>
                    <span className="table-cell whitespace-pre">{line}</span>
                  </div>
                ))}
              </pre>
            </div>
          </div>
        </div>
      ) : activeSubTab === 'testing' ? (
        /* Real Telegram Testing Guide */
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Play className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  Покрокова інструкція: Тестування в реальному Telegram
                </h3>
                <p className="text-xs text-slate-400">
                  Як за 2 хвилини запустити бота на комп'ютері чи сервері та перевірити всі оновлені функції
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="https://t.me/Svoi_TravelEU_bot"
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all flex items-center gap-1.5 shadow-md shadow-blue-600/30"
              >
                Відкрити @Svoi_TravelEU_bot
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Webhook Notice Card */}
          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 text-xs text-amber-200 flex flex-col md:flex-row items-start gap-3.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1.5 leading-relaxed">
              <div className="font-bold text-amber-300 flex items-center gap-2">
                <span>⚠️ Важлива інформація про вебхук Chatplace на @Svoi_TravelEU_bot</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 font-mono">
                  api.chatplace.io
                </span>
              </div>
              <p className="text-slate-300">
                У Telegram API до бота <b className="text-white">@Svoi_TravelEU_bot</b> раніше міг бути прив'язаний вебхук сервісу <b className="text-white">Chatplace</b>. 
                У Telegram діє суворе правило: або бот працює через Webhook (як Chatplace), або через Long Polling (наш Python aiogram скрипт). При запуску <code>bot.py</code> автоматично виконує <code>drop_pending_updates=True</code> та скидає старий вебхук!
              </p>
              <div className="pt-1 text-slate-300 flex flex-col sm:flex-row sm:items-center gap-3">
                <span className="font-semibold text-white">Два варіанти тестування:</span>
                <span className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-emerald-300 font-medium">
                  1. Безпечний: створити тестового бота у @BotFather
                </span>
                <span className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-blue-300 font-medium">
                  2. Прямий: запустити на поточному токені (скрипт сам скине старий вебхук)
                </span>
              </div>
            </div>
          </div>

          {/* 4 Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Step 1 */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <h4 className="text-sm font-bold text-white">Завантажте та розпакуйте архів</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Натисніть кнопку <b className="text-amber-400">«Завантажити проєкт (.zip)»</b> вище в меню. Розпакуйте архів у будь-яку зручну папку на вашому комп'ютері (наприклад, <code>svoi_bot</code>).
              </p>
              <div className="text-[11px] text-slate-500 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                Усередині вже містяться всі необхідні файли: <code>bot.py</code>, роутери, дані турів, логістика збору та <code>run.sh</code>.
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                  2
                </span>
                <h4 className="text-sm font-bold text-white">Налаштуйте файл .env</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Відкрийте файл <code>.env</code> у блокноті чи редакторі коду та перевірте параметри:
              </p>
              <div className="bg-black/70 p-2.5 rounded-lg font-mono text-[11px] text-emerald-300 space-y-1">
                <p>BOT_TOKEN=8969834514:AAHl3mDZU00jncjJ52TyGTHmcs_-l5CBjPM</p>
                <p>ADMIN_ID=8450153980 <span className="text-slate-500"># ваш Telegram ID</span></p>
                <p>MANAGER_USERNAME=SVOI_travel_admin</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                  3
                </span>
                <h4 className="text-sm font-bold text-white">Встановіть бібліотеки та запустіть</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Відкрийте термінал (або командний рядок / PowerShell) у цій папці та виконайте:
              </p>
              <div className="bg-black/70 p-2.5 rounded-lg font-mono text-[11px] text-blue-300 space-y-1">
                <p className="text-slate-500"># macOS / Linux / Render:</p>
                <p>python3 -m venv venv && source venv/bin/activate</p>
                <p>pip install -r requirements.txt</p>
                <p>python bot.py</p>
                <p className="text-slate-500 pt-1"># Windows PowerShell:</p>
                <p className="text-slate-300">python -m venv venv; .\venv\Scripts\activate</p>
                <p className="text-slate-300">pip install -r requirements.txt</p>
                <p className="text-slate-300">python bot.py</p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                  4
                </span>
                <h4 className="text-sm font-bold text-white">Перевірте бота в Telegram</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Коли в терміналі з'явиться напис:
                <br />
                <code className="text-emerald-400">✅ Успішне підключення: SVOI Travel (@Svoi_TravelEU_bot)</code>
                <br />
                відкрийте Telegram і надішліть команду <b>/start</b>!
              </p>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] text-slate-400">Бот очікує на запити і миттєво відповідає українською мовою.</span>
              </div>
            </div>
          </div>

          {/* Verification Checklist */}
          <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3.5">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Чек-лист перевірки оновленого функціоналу в боті:</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="font-semibold text-blue-300">💺 1. Інтерактивний вибір місць</div>
                <p className="text-slate-400 text-[11px]">
                  Перевірте плашки рядів: 1-й ряд (2 місця поруч з водієм), 2-й ряд (3 місця), 3-й ряд (3 місця). Оберіть місце і переконайтеся, що формується пряме посилання на менеджера.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="font-semibold text-emerald-300">📍 2. Точки збору та трансфер</div>
                <p className="text-slate-400 text-[11px]">
                  Кнопка «📍 Точки збору»: адресний збір (Саарланд, Трір, Люксембург), умови для інших земель (4+ осіб, не 1 день), час подачі ввечері напередодні та 1-денна група.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="font-semibold text-amber-300">💳 3. Умови оплати та багаж</div>
                <p className="text-slate-400 text-[11px]">
                  Перевірте умови: <b>0% передоплати на одноденні тури</b> (передоплата лише для готелів), мед. страхування для осіб без посвідки на проживання в Європі, багаж 10 кг + ручна поклажа.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="font-semibold text-purple-300">🎮 4. Ігри, вікторини та автопарк</div>
                <p className="text-slate-400 text-[11px]">
                  Кнопка «🚐 Автопарк»: Opel Vivaro комфортне авто з усіма зручностями. Вікторини з актуальними фотографіями європейських міст.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Deployment & Production Guide */
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Інструкція з розгортання на Render / VPS / сервері</h3>
              <p className="text-xs text-slate-400">
                Запуск на Render (Python 3 Background Worker), Ubuntu / Debian через Systemd або Docker Compose
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Option A: Render.com */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-blue-300">
                <Terminal className="w-4 h-4" />
                Спосіб 1: Render.com (Background Worker)
              </div>
              <p className="text-xs text-slate-400">
                Швидкий та зручний запуск із GitHub з автоматичним рестартом 24/7.
              </p>

              <div className="bg-black/60 p-3 rounded-lg font-mono text-xs text-emerald-300 space-y-2 overflow-x-auto">
                <p># Налаштування сервісу на Render:</p>
                <p className="text-slate-300">Type: Background Worker</p>
                <p className="text-slate-300">Runtime: Python 3</p>
                <p className="text-slate-300">Build Command: pip install -r requirements.txt</p>
                <p className="text-slate-300">Start Command: python bot.py</p>
                <p className="mt-2 text-slate-400"># Environment Variables (Змінні оточення):</p>
                <p className="text-slate-300">BOT_TOKEN = 8969834514:AAHl3mDZU00jncjJ52TyGTHmcs_-l5CBjPM</p>
                <p className="text-slate-300">ADMIN_ID = 8450153980</p>
                <p className="text-slate-300">MANAGER_USERNAME = SVOI_travel_admin</p>
              </div>
            </div>

            {/* Option B: Docker / VPS */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-indigo-300">
                <Layers className="w-4 h-4" />
                Спосіб 2: Запуск у Docker Compose на VPS
              </div>
              <p className="text-xs text-slate-400">
                Ізольований контейнер із готовим оточенням і перезапуском при збоях.
              </p>

              <div className="bg-black/60 p-3 rounded-lg font-mono text-xs text-indigo-300 space-y-2 overflow-x-auto">
                <p># 1. Збирання та фоновий запуск контейнера</p>
                <p className="text-slate-300">docker compose up -d --build</p>
                <p className="mt-2 text-slate-400"># 2. Перегляд логів у реальному часі</p>
                <p className="text-slate-300">docker compose logs -f</p>
                <p className="mt-2 text-slate-400"># 3. Зупинка</p>
                <p className="text-slate-300">docker compose down</p>
              </div>
            </div>
          </div>

          {/* Safety & Best Practices */}
          <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-xl text-xs text-amber-200 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Важливі рекомендації для продакшену:</p>
              <ul className="list-disc list-inside mt-1 space-y-1 text-slate-300">
                <li>
                  Не забудьте вказати ваш числовий <code>ADMIN_ID</code> (8450153980) у змінних оточення чи файлі <code>.env</code>, щоб отримувати всі бронювання та відгуки клієнтів.
                </li>
                <li>
                  У коді реалізовано <code>await callback.answer()</code>, що захищає бота від нескінченного обертання значка завантаження в клієнті Telegram.
                </li>
                <li>
                  При перемиканні між меню використовується <code>edit_text</code>, завдяки чому діалог не засмічується повторними повідомленнями.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
