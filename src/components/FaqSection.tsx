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
      question: 'Точки сбора пассажиров: откуда забираете и куда привозите?',
      answer: (
        <div className="space-y-3 text-xs leading-relaxed text-slate-300">
          <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-800/60">
            <p className="font-semibold text-blue-300 flex items-center gap-1.5">
              <span>🏡 Сбор по адресу (Door-to-Door):</span>
            </p>
            <p className="text-slate-200 mt-1">
              <b>Забираем всех прямо по адресу</b> по земле <b>Саарланд (Saarland)</b>, в <b>Трире (Trier)</b> и <b>Люксембурге (Luxembourg)</b>! После завершения путешествия развозим также обратно по указанному адресу.
            </p>
          </div>

          <div>
            <p className="font-semibold text-white mb-1.5">
              🛣 Сбор в других землях и возможность подсадки:
            </p>
            <p className="text-slate-300">
              Можем забрать и в других землях — это зависит от маршрута (по пути или нет), или же если это не однодневный тур. 
              <span className="text-amber-400 font-semibold block mt-0.5">
                👉 При наличии от 4-х человек можем забрать с других земель!
              </span>
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-300 mt-2 pl-1">
              <li><b>Хомбург (Homburg Saar)</b> — уточняйте</li>
              <li><b>Кайзерслаутерн (Kaiserslautern)</b> — возможен если более 4х человек и не однодневный тур</li>
              <li><b>Мангейм / Людвигсхафен (Mannheim)</b> — возможен если более 4х человек и не однодневный тур</li>
              <li><b>Франкфурт-на-Майне (Frankfurt am Main)</b> — возможен если более 4х человек и не однодневный тур</li>
              <li><b>Карлсруэ (Karlsruhe)</b> — для южных направлений по пути</li>
              <li><b>Страсбург (Strasbourg)</b> — по Франции и Швейцарии</li>
              <li><b>Бельгия</b> — при поездках в Нормандию, Голландию и Париж</li>
            </ul>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-[11px]">
            <p className="text-slate-300">
              ⏰ <b>Точное время:</b> Точное время, за которым за вами заедут, высылается <b>в личный чат за день вечером перед поездкой</b>.
            </p>
            <p className="text-slate-300">
              👥 <b>Связь с водителем:</b> Основные вопросы водителю и по поездке вы сможете задать в новосозданной <b>однодневной группе для коммуникации</b>. Через день группа автоматически удаляется.
            </p>
            <p className="pt-1 text-amber-300">
              💬 <i>Писать менеджеру для уточнения — возможность подсадки уточняйте: </i>
              <a href="https://t.me/SVOI_travel_admin" target="_blank" rel="noreferrer" className="underline font-bold text-blue-400">@SVOI_travel_admin</a>
            </p>
          </div>
        </div>
      )
    },
    {
      icon: CreditCard,
      question: 'Когда и как происходит оплата поездки?',
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-slate-300">
          <p className="font-semibold text-emerald-400">
            🔥 Мы работаем БЕЗ ПРЕДОПЛАТЫ на все однодневные поездки!
          </p>

          <p>
            Бронирование тура происходит быстро и без финансовых рисков для вас:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-slate-300">
            <li><b>Однодневные туры:</b> Вы бронируете место через бота или менеджера. Никаких авансов переводить не нужно — полная оплата происходит при посадке в минивэн!</li>
            <li><b>Многодневные поездки (2–3 дня):</b> Предоплата требуется <b>ТОЛЬКО для многодневных туров</b> (например, Лазурный берег или Мон-Сен-Мишель) исключительно для бронирования номеров в отелях.</li>
            <li><b>Способы оплаты:</b> Наличными при посадке (в евро), банковским переводом SEPA / IBAN (Германия и любые банки ЕС), либо PayPal.</li>
            <li><b>Отмена без потерь:</b> При предупреждении более чем за 72 часа бронь отменяется или переносится на любую удобную вам дату.</li>
          </ul>
        </div>
      )
    },
    {
      icon: Clock,
      question: 'Сколько времени мы проводим на каждой локации? Комбинированные туры',
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-slate-300">
          <p>
            Мы выстраиваем маршруты так, чтобы у вас было достаточно времени на прогулки, фотосессии и уютные обеды:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-slate-300">
            <li><b>Однодневные туры в один город (Париж, Амстердам, Брюгге):</b> от <b>5 до 8 часов чистого свободного времени</b> в городе! Без спешки и беготни.</li>
            <li><b>Комбинированные маршруты:</b> продуманный тайминг:
              <div className="pl-4 pt-1 space-y-1 text-slate-300">
                <div>• <b>Этрета + Париж:</b> к примеру, <b>5 часов</b> на алебастровых скалах Этрета и океанском побережье + <b>2–3 часа</b> в вечернем сияющем Париже!</div>
                <div>• <b>Швейцария комбо:</b> <b>3 часа</b> Лаутербруннен (долина 72 водопадов), <b>2 часа</b> ледниковое ущелье Ааре, <b>2 часа</b> старинный Берн!</div>
              </div>
            </li>
            <li><b>Туры на выходные (2–3 дня):</b> спокойная программа с размеренными прогулками и комфортным ночным отдыхом в отеле.</li>
          </ul>
        </div>
      )
    },
    {
      icon: Sparkles,
      question: 'Как выбрать тур? Размеренные туры vs. в активном темпе',
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-slate-300">
          <p>
            В клубе SVOI есть форматы под разный стиль отдыха — выбирайте по душе:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
              <div className="font-bold text-emerald-400 flex items-center gap-1.5 text-xs">
                <span>🌿 Размеренные туры (релакс и прогулки)</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Для тех, кто хочет не спеша гулять по старинным улочкам, пить кофе на террасах, пробовать местную кухню и наслаждаться атмосферой:
              </p>
              <ul className="list-disc list-inside text-[11px] text-slate-400 space-y-0.5">
                <li><b>Брюгге (110€)</b> — каналы, лебеди, шоколад</li>
                <li><b>Эльзас + Страсбург (80€)</b> — пряничные фахверковые дома</li>
                <li><b>Замок Нойшванштайн (120€)</b> — прогулка к озеру и замку</li>
                <li><b>Лазурный берег (3 дня, 440€)</b> — Ницца, Монако, море</li>
              </ul>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
              <div className="font-bold text-amber-400 flex items-center gap-1.5 text-xs">
                <span>⚡️ Туры в темпе (активно, «галопом по Европам»)</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Для тех, кто хочет максимум впечатлений и драйва за один выходной:
              </p>
              <ul className="list-disc list-inside text-[11px] text-slate-400 space-y-0.5">
                <li><b>Лихтенштейн (3 страны за 1 день, 120€)</b> — Австрия + Лихтенштейн + Швейцария</li>
                <li><b>Этрета + Париж (140€)</b> — 5 ч скалы Нормандии + 2–3 ч Париж</li>
                <li><b>Швейцария комбо (120€)</b> — водопады, ущелье Ааре и Берн</li>
                <li><b>Париж или Амстердам (120€)</b> — насыщенный день с круизом</li>
              </ul>
            </div>
          </div>
          <p className="pt-1 text-[11px] text-slate-400">
            Сомневаетесь? Напишите менеджеру <a href="https://t.me/SVOI_travel_admin" target="_blank" rel="noreferrer" className="text-blue-400 font-bold hover:underline">@SVOI_travel_admin</a> — поможем подобрать идеальный формат!
          </p>
        </div>
      )
    },
    {
      icon: Armchair,
      question: 'Как расположены и регулируются сидения? Схема мест',
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-slate-300">
          <p>
            В нашем минивэне <b>Opel Vivaro (всего 8 пассажирских мест)</b> салон спланирован для комфорта на длинных дистанциях:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-300">
            <li><b>1-й ряд:</b> <b>2 места</b> рядом с водителем (Место 1 — центр, Место 2 — панорамный вид у окна).</li>
            <li><b>2-й ряд:</b> <b>3 места</b> (Место 3 — окно слева, Место 4 — центр, Место 5 — окно справа у сдвижной двери).</li>
            <li><b>3-й ряд:</b> <b>3 места</b> (Место 6 — окно слева, Место 7 — центр, Место 8 — окно справа).</li>
            <li><b>Регулировки и комфорт:</b> Наклон спинок для комфортного сна, индивидуальные ремни, зарядные USB-порты для телефонов и кондиционер салона.</li>
            <li><b>Выбор места:</b> Фиксация любого конкретного места по порядку стоит <b>всего 5€</b>. Если не выбираете заранее — свободная посадка на любое свободное место стоит <b>0€</b>.</li>
          </ul>
        </div>
      )
    },
    {
      icon: ShieldCheck,
      question: 'Какие документы нужны? Страховка и багаж',
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-slate-300">
          <p>
            Всё очень просто и понятно:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-slate-300">
            <li><b>Документы:</b> Заграничный паспорт + действующий европейский ВНЖ (Aufenthaltstitel), ПМЖ или действующая шенгенская виза.</li>
            <li><b>Медицинская страховка:</b> Обязательна <b>медицинская туристическая страховка для людей без ВНЖ в Европе</b> (для обладателей визы или временного пребывания). Для резидентов с европейской медстраховкой (AOK, TK и др.) достаточно вашей карты.</li>
            <li><b>Багаж:</b> До <b>10 кг при дальних поездках</b> в багажное отделение + <b>ручная кладь</b> с личными вещами в салон.</li>
          </ul>
        </div>
      )
    },
    {
      icon: Compass,
      question: 'Маршруты: как мы гуляем по локациям?',
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-slate-300">
          <p>
            Наш формат — это идеальный баланс между общим знакомством и свободой выбора:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-300">
            <li><b>Вводная прогулка:</b> По прибытии мы показываем главные видовые точки, делимся лайфхаками и ракурсами для фото.</li>
            <li><b>Свободное время:</b> Вы не привязаны к экскурсоводу! Гуляйте в своем темпе, заходите в кофейни, музеи или на шопинг.</li>
            <li><b>Постоянная связь:</b> Организатор всегда в контакте в общем чате поездки и делится точными локациями лучших бистро и сувениров.</li>
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
              <h2 className="text-xl font-bold text-white tracking-wide">Частые вопросы (FAQ)</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Оплата без предоплаты, тайминг локаций, выбор туров и посадка в минивэн SVOI
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
          <span>Открыть тему FAQ в Telegram</span>
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
