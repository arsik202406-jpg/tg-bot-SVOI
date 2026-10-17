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
              Архитектура & Исходный код бота
            </h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Модульная структура: FSM машины состояний, роутеры, кастомные инлайн-клавиатуры и обработка ошибок
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
            Редактор файлов
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
            Как протестировать в Telegram
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
            Инструкция деплоя
          </button>

          <button
            onClick={handleDownloadZip}
            disabled={isZipping}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white transition-all shadow-lg shadow-amber-600/30 flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isZipping ? 'Упаковка архива...' : 'Скачать проект (.zip)'}
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
              <span>Файлы проекта (11)</span>
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
                    <span className="text-emerald-400">Скопировано!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Скопировать код</span>
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
                  Пошаговая инструкция: Тестирование в реальном Telegram
                </h3>
                <p className="text-xs text-slate-400">
                  Как за 2 минуты запустить бота на компьютере или сервере и проверить все обновленные функции
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
                Открыть @Svoi_TravelEU_bot
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Webhook Notice Card */}
          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 text-xs text-amber-200 flex flex-col md:flex-row items-start gap-3.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1.5 leading-relaxed">
              <div className="font-bold text-amber-300 flex items-center gap-2">
                <span>⚠️ Важная информация о вебхуке Chatplace на @Svoi_TravelEU_bot</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 font-mono">
                  api.chatplace.io
                </span>
              </div>
              <p className="text-slate-300">
                В Telegram API к боту <b className="text-white">@Svoi_TravelEU_bot</b> в данный момент привязан webhook сервиса <b className="text-white">Chatplace</b>. 
                В Telegram действует строгое правило: либо бот работает через Webhook (как Chatplace), либо через Long Polling (наш Python aiogram скрипт).
              </p>
              <div className="pt-1 text-slate-300 flex flex-col sm:flex-row sm:items-center gap-3">
                <span className="font-semibold text-white">Два варианта тестирования:</span>
                <span className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-emerald-300 font-medium">
                  1. Безопасный: создать тестового бота в @BotFather
                </span>
                <span className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-blue-300 font-medium">
                  2. Прямой: запустить на текущем токене (скрипт сам сбросит старый вебхук)
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
                <h4 className="text-sm font-bold text-white">Скачайте и распакуйте архив</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Нажмите кнопку <b className="text-amber-400">«Скачать проект (.zip)»</b> выше в меню. Распакуйте архив в любую удобную папку на вашем компьютере (например, <code>svoi_bot</code>).
              </p>
              <div className="text-[11px] text-slate-500 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                Внутри уже лежат все необходимые файлы: <code>bot.py</code>, роутеры, данные туров, логистика сбора и <code>run.sh</code>.
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                  2
                </span>
                <h4 className="text-sm font-bold text-white">Настройте файл .env</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Откройте файл <code>.env</code> в блокноте или редакторе кода и проверьте параметры:
              </p>
              <div className="bg-black/70 p-2.5 rounded-lg font-mono text-[11px] text-emerald-300 space-y-1">
                <p>BOT_TOKEN=8969834514:AAGjza7gfBInTsGhnR4jVWvHQR0Hcx2Mnd4</p>
                <p>ADMIN_ID=ВАШ_ТЕЛЕГРАМ_ID <span className="text-slate-500"># узнать в @userinfobot</span></p>
                <p>MANAGER_USERNAME=SVOI_travel_admin</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                  3
                </span>
                <h4 className="text-sm font-bold text-white">Установите библиотеки & запустите</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Откройте терминал (или командную строку / PowerShell) в этой папке и выполните:
              </p>
              <div className="bg-black/70 p-2.5 rounded-lg font-mono text-[11px] text-blue-300 space-y-1">
                <p className="text-slate-500"># macOS / Linux:</p>
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
                <h4 className="text-sm font-bold text-white">Проверьте бота в Telegram</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Когда в терминале появится надпись:
                <br />
                <code className="text-emerald-400">✅ Успешное подключение: SVOI (@Svoi_TravelEU_bot)</code>
                <br />
                откройте Telegram и отправьте команду <b>/start</b>!
              </p>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] text-slate-400">Бот ожидает запросы и реагирует без задержек.</span>
              </div>
            </div>
          </div>

          {/* Verification Checklist */}
          <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3.5">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Чек-лист проверки обновленного функционала в боте:</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="font-semibold text-blue-300">💺 1. Интерактивный выбор мест</div>
                <p className="text-slate-400 text-[11px]">
                  Проверьте плашки рядов: 1-й ряд (2 места рядом с водителем), 2-й ряд (3 места), 3-й ряд (3 места). Выберите место и убедитесь, что формируется ссылка на менеджера.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="font-semibold text-emerald-300">📍 2. Точки сбора и трансфер</div>
                <p className="text-slate-400 text-[11px]">
                  Кнопка «📍 Точки сбора»: адресный сбор (Саарланд, Трир, Люксембург), условия для других земель (4+ чел, не 1 день), время подачи вечером накануне и 1-дневная группа.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="font-semibold text-amber-300">💳 3. Условия оплаты и багаж</div>
                <p className="text-slate-400 text-[11px]">
                  Проверьте условия: <b>0% предоплаты на однодневные туры</b> (предоплата только для отелей), мед. страховка для лиц без ВНЖ в Европе, багаж 10 кг + ручная кладь.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="font-semibold text-purple-300">🎮 4. Игры, викторины и автопарк</div>
                <p className="text-slate-400 text-[11px]">
                  Кнопка «🚐 Автопарк»: Opel Vivaro комфортное авто со всеми удобствами (без приставки VIP). Викторины с актуальными фото европейских городов.
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
              <h3 className="text-lg font-bold text-white">Инструкция по развертыванию на VPS / сервере</h3>
              <p className="text-xs text-slate-400">
                Запуск на Ubuntu / Debian с автоматическим перезапуском через Systemd или Docker Compose
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Option A: Systemd */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-blue-300">
                <Terminal className="w-4 h-4" />
                Способ 1: Автозапуск через Systemd (24/7)
              </div>
              <p className="text-xs text-slate-400">
                Надежный способ для VPS (Hetzner, Timeweb, Selectel, DigitalOcean).
              </p>

              <div className="bg-black/60 p-3 rounded-lg font-mono text-xs text-emerald-300 space-y-2 overflow-x-auto">
                <p># 1. Подготовка и установка зависимостей</p>
                <p className="text-slate-300">mkdir -p /opt/svoi_bot && cd /opt/svoi_bot</p>
                <p className="text-slate-300">python3 -m venv venv</p>
                <p className="text-slate-300">source venv/bin/activate</p>
                <p className="text-slate-300">pip install -r requirements.txt</p>
                <p className="mt-2 text-slate-400"># 2. Создание службы /etc/systemd/system/svoi_bot.service</p>
                <p className="text-slate-300">sudo systemctl enable --now svoi_bot</p>
                <p className="text-slate-300">sudo systemctl status svoi_bot</p>
              </div>
            </div>

            {/* Option B: Docker */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-indigo-300">
                <Layers className="w-4 h-4" />
                Способ 2: Запуск в Docker Compose
              </div>
              <p className="text-xs text-slate-400">
                Изолированный контейнер с готовым окружением и перезапуском при сбоях.
              </p>

              <div className="bg-black/60 p-3 rounded-lg font-mono text-xs text-indigo-300 space-y-2 overflow-x-auto">
                <p># 1. Сборка и фоновый запуск контейнера</p>
                <p className="text-slate-300">docker compose up -d --build</p>
                <p className="mt-2 text-slate-400"># 2. Просмотр логов в реальном времени</p>
                <p className="text-slate-300">docker compose logs -f</p>
                <p className="mt-2 text-slate-400"># 3. Остановка</p>
                <p className="text-slate-300">docker compose down</p>
              </div>
            </div>
          </div>

          {/* Safety & Best Practices */}
          <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-xl text-xs text-amber-200 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Важные рекомендации для продакшена:</p>
              <ul className="list-disc list-inside mt-1 space-y-1 text-slate-300">
                <li>
                  Не забудьте указать ваш числовой <code>ADMIN_ID</code> в файле <code>.env</code>, чтобы получать все брони и отзывы клиентов.
                </li>
                <li>
                  В коде уже реализован <code>await callback.answer()</code>, что защищает бота от бесконечного вращения значка загрузки в клиенте Telegram.
                </li>
                <li>
                  При переходе между меню используется <code>edit_text</code>, благодаря чему диалог не засоряется повторными сообщениями.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
