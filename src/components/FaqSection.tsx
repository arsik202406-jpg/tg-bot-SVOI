import React, { useState } from 'react';
import { 
  HelpCircle, ChevronDown, ChevronUp, ExternalLink, Compass, Clock, 
  CreditCard, Armchair, Sparkles, ShieldCheck, Luggage, Flame, MapPin 
} from 'lucide-react';

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqItems = [
    {
      icon: MapPin,
      question: 'Точки збору пасажирів: звідки забираєте та куди привозите?',
      answer: (
        <div className="space-y-3 text-xs leading-relaxed text-slate-300">
          <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-800/60">
            <p className="font-semibold text-blue-300 flex items-center gap-1.5">
              <span>🏡 Збір за адресою (Door-to-Door):</span>
            </p>
            <p className="text-slate-200 mt-1">
              <b>Забираємо всіх прямо за адресою</b> по землі <b>Саарланд (Saarland)</b>, у <b>Трірі (Trier)</b> та <b>Люксембурзі (Luxembourg)</b>! Після завершення подорожі розвозимо також назад за вказаною адресою.
            </p>
          </div>

          <div>
            <p className="font-semibold text-white mb-1.5">
              🛣 Збір в інших землях та можливість підсадки:
            </p>
            <p className="text-slate-300">
              Можемо забрати й в інших землях — це залежить від маршруту (по дорозі чи ні), або якщо тур не одноденний. 
              <span className="text-amber-400 font-semibold block mt-0.5">
                👉 За наявності від 4-х осіб можемо забрати з інших земель!
              </span>
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-300 mt-2 pl-1">
              <li><b>Хомбург (Homburg Saar)</b> — уточнюйте</li>
              <li><b>Кайзерслаутерн (Kaiserslautern)</b> — можливий якщо більше 4х осіб і не одноденний тур</li>
              <li><b>Мангейм / Людвігсхафен (Mannheim)</b> — можливий якщо більше 4х осіб і не одноденний тур</li>
              <li><b>Франкфурт-на-Майні (Frankfurt am Main)</b> — можливий якщо більше 4х осіб і не одноденний тур</li>
              <li><b>Карлсруе (Karlsruhe)</b> — для південних напрямків по дорозі</li>
              <li><b>Страсбург (Strasbourg)</b> — по Франції та Швейцарії</li>
              <li><b>Бельгія</b> — при поїздках до Нормандії, Голландії та Парижа</li>
            </ul>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-[11px]">
            <p className="text-slate-300">
              ⏰ <b>Точний час:</b> Точний час, о котрій за вами заїдуть, надсилається <b>в особистий чат за день увечері перед виїздом</b>.
            </p>
            <p className="text-slate-300">
              👥 <b>Зв'язок з водієм:</b> Основні питання водієві та щодо поїздки ви зможете поставити у новоствореній <b>одноденній групі для комунікації</b>. Через день група автоматично видаляється.
            </p>
            <p className="pt-1 text-amber-300">
              💬 <i>Писати менеджеру для уточнення — можливість підсадки уточнюйте: </i>
              <a href="https://t.me/SVOI_travel_admin" target="_blank" rel="noreferrer" className="underline font-bold text-blue-400">@SVOI_travel_admin</a>
            </p>
          </div>
        </div>
      )
    },
    {
      icon: CreditCard,
      question: 'Коли та як відбувається оплата поїздки?',
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-slate-300">
          <p className="font-semibold text-emerald-400">
            🔥 Ми працюємо БЕЗ ПЕРЕДОПЛАТИ на всі одноденні поїздки!
          </p>

          <p>
            Бронювання туру відбувається швидко та без фінансових ризиків для вас:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-slate-300">
            <li><b>Одноденні тури:</b> Ви бронюєте місце через бота або менеджера. Жодних авансів переказувати не потрібно — повна оплата відбувається при посадці в мінівен!</li>
            <li><b>Багатоденні поїздки (2–3 дні):</b> Передоплата потрібна <b>ТІЛЬКИ для багатоденних турів</b> (наприклад, Лазурове узбережжя або Мон-Сен-Мішель) виключно для бронювання номерів у готелях.</li>
            <li><b>Способи оплати:</b> Готівкою при посадці (в євро), банківським переказом SEPA / IBAN (Німеччина та будь-які банки ЄС), або PayPal.</li>
            <li><b>Скасування без втрат:</b> При попередженні більш ніж за 72 години бронь скасовується або переноситься на будь-яку зручну вам дату.</li>
          </ul>
        </div>
      )
    },
    {
      icon: Clock,
      question: 'Скільки часу ми проводимо на кожній локації? Комбіновані тури',
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-slate-300">
          <p>
            Ми вибудовуємо маршрути так, щоб у вас було достатньо часу на прогулянки, фотосесії та затишні обіди:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-slate-300">
            <li><b>Одноденні тури в одне місто (Париж, Амстердам, Брюгге):</b> від <b>5 до 8 годин чистого вільного часу</b> в місті! Без поспіху та метушні.</li>
            <li><b>Комбіновані маршрути:</b> продуманий таймінг:
              <div className="pl-4 pt-1 space-y-1 text-slate-300">
                <div>• <b>Етрета + Париж:</b> наприклад, <b>5 годин</b> на алебастрових скелях Етрета та океанському узбережжі + <b>2–3 години</b> у вечірньому сяючому Парижі!</div>
                <div>• <b>Швейцарія комбо:</b> <b>3 години</b> Лаутербруннен (долина 72 водоспадів), <b>2 години</b> льодовикова ущелина Ааре, <b>2 години</b> старовинний Берн!</div>
              </div>
            </li>
            <li><b>Тури на вихідні (2–3 дні):</b> спокійна програма з розміреними прогулянками та комфортним нічним відпочинком у готелі.</li>
          </ul>
        </div>
      )
    },
    {
      icon: Sparkles,
      question: 'Як обрати тур? Розмірені тури vs. в активному темпі',
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-slate-300">
          <p>
            У клубі SVOI є формати під різний стиль відпочинку — обирайте до душі:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
              <div className="font-bold text-emerald-400 flex items-center gap-1.5 text-xs">
                <span>🌿 Розмірені тури (релакс та прогулянки)</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Для тих, хто хоче неквапливо гуляти старовинними вуличками, пити каву на терасах, куштувати місцеву кухню та насолоджуватися атмосферою:
              </p>
              <ul className="list-disc list-inside text-[11px] text-slate-400 space-y-0.5">
                <li><b>Брюгге (110€)</b> — канали, лебеді, шоколад</li>
                <li><b>Ельзас + Страсбург (80€)</b> — пряникові фахверкові будинки</li>
                <li><b>Замок Нойшванштайн (120€)</b> — прогулянка до озера та замку</li>
                <li><b>Лазурове узбережжя (3 дні, 440€)</b> — Ніцца, Монако, море</li>
              </ul>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
              <div className="font-bold text-amber-400 flex items-center gap-1.5 text-xs">
                <span>⚡️ Тури в темпі (активно, «галопом по Європах»)</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Для тих, хто прагне максимуму вражень та драйву за один вихідний:
              </p>
              <ul className="list-disc list-inside text-[11px] text-slate-400 space-y-0.5">
                <li><b>Ліхтенштейн (3 країни за 1 день, 120€)</b> — Австрія + Ліхтенштейн + Швейцарія</li>
                <li><b>Етрета + Париж (140€)</b> — 5 год скелі Нормандії + 2–3 год Париж</li>
                <li><b>Швейцарія комбо (120€)</b> — водоспади, ущелина Ааре та Берн</li>
                <li><b>Париж або Амстердам (120€)</b> — насичений день із круїзом</li>
              </ul>
            </div>
          </div>
          <p className="pt-1 text-[11px] text-slate-400">
            Сумніваєтеся? Напишіть менеджеру <a href="https://t.me/SVOI_travel_admin" target="_blank" rel="noreferrer" className="text-blue-400 font-bold hover:underline">@SVOI_travel_admin</a> — допоможемо підібрати ідеальний формат!
          </p>
        </div>
      )
    },
    {
      icon: Armchair,
      question: 'Як розташовані та регулюються сидіння? Схема місць',
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-slate-300">
          <p>
            У нашому мінівені <b>Opel Vivaro (всього 8 пасажирських місць)</b> салон спланований для комфорту на довгих дистанціях:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-300">
            <li><b>1-й ряд:</b> <b>2 місця</b> поруч із водієм (Місце 1 — центр, Місце 2 — панорамний вид біля вікна).</li>
            <li><b>2-й ряд:</b> <b>3 місця</b> (Місце 3 — вікно ліворуч, Місце 4 — центр, Місце 5 — вікно праворуч біля зсувних дверей).</li>
            <li><b>3-й ряд:</b> <b>3 місця</b> (Місце 6 — вікно ліворуч, Місце 7 — центр, Місце 8 — вікно праворуч).</li>
            <li><b>Регулювання та комфорт:</b> Нахил спинок для комфортного сну, індивідуальні ремені, зарядні USB-порти для телефонів та кондиціонер салону.</li>
            <li><b>Вибір місця:</b> Фіксація будь-якого конкретного місця по порядку коштує <b>всього 5€</b>. Якщо не обираєте заздалегідь — вільна посадка на будь-яке вільне місце коштує <b>0€</b>.</li>
          </ul>
        </div>
      )
    },
    {
      icon: ShieldCheck,
      question: 'Які документи потрібні? Страховка та багаж',
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-slate-300">
          <p>
            Усе дуже просто та зрозуміло:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-slate-300">
            <li><b>Документи:</b> Закордонний паспорт + дійсний європейський ВНЖ (Aufenthaltstitel), ПМЖ або дійсна шенгенська віза.</li>
            <li><b>Медична страховка:</b> Обов'язкова <b>медична туристична страховка для осіб без ВНЖ в Європі</b> (для власників візи або тимчасового перебування). Для резидентів з європейською медстраховкою (AOK, TK тощо) достатньо вашої картки.</li>
            <li><b>Багаж:</b> До <b>10 кг при далеких поїздках</b> у багажне відділення + <b>ручна поклажа</b> з особистими речами в салон.</li>
          </ul>
        </div>
      )
    },
    {
      icon: Compass,
      question: 'Маршрути: як ми гуляємо на локаціях?',
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-slate-300">
          <p>
            Наш формат — це ідеальний баланс між загальним знайомством та свободою вибору:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-300">
            <li><b>Вступна прогулянка:</b> Після прибуття ми показуємо головні видові точки, ділимося лайфхаками та ракурсами для фото.</li>
            <li><b>Вільний час:</b> Ви не прив'язані до екскурсовода! Гуляйте у власному темпі, заходьте до кав'ярень, музеїв або на шопінг.</li>
            <li><b>Постійний зв'язок:</b> Організатор завжди на зв'язку у спільному чаті поїздки та ділиться точними локаціями найкращих бістро та сувенірів.</li>
          </ul>
        </div>
      )
    }
  ];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-2xl space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <HelpCircle className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">Часті питання (FAQ)</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Оплата без передоплати, таймінг локацій, вибір турів та посадка в мінівен SVOI
              </p>
            </div>
          </div>
        </div>

        <a
          href="https://t.me/c/3876884115/5"
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2"
        >
          <span>Відкрити тему FAQ у Telegram</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Accordion Questions */}
      <div className="space-y-3">
        {faqItems.map((item, idx) => {
          const isOpen = openIndex === idx;
          const Icon = item.icon;

          return (
            <div
              key={idx}
              className="bg-slate-950/80 border border-slate-800/90 rounded-xl overflow-hidden transition-all"
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-slate-900/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-900 text-blue-400 border border-slate-800 shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-white">{item.question}</span>
                </div>

                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                )}
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-800/60 bg-slate-950/40 animate-fade-in">
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
