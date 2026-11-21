// Обгортка над Telegram WebApp API. Поза Telegram усе тихо нічого не робить.
/* eslint-disable @typescript-eslint/no-explicit-any */

export const tg: any = (window as any).Telegram?.WebApp;

export const inTelegram = Boolean(tg && tg.initData);

export function initTelegram() {
  if (!tg) return;
  try {
    tg.ready();
    tg.expand();
    tg.disableVerticalSwipes?.();
  } catch {
    /* ignore */
  }
}

export function haptic(kind: 'light' | 'medium' | 'success' | 'error' | 'select' = 'light') {
  const h = tg?.HapticFeedback;
  if (!h) return;
  try {
    if (kind === 'success' || kind === 'error') h.notificationOccurred(kind);
    else if (kind === 'select') h.selectionChanged();
    else h.impactOccurred(kind);
  } catch {
    /* ignore */
  }
}

export function setChrome(bg: string) {
  try {
    tg?.setHeaderColor?.(bg);
    tg?.setBackgroundColor?.(bg);
    tg?.setBottomBarColor?.(bg);
  } catch {
    /* ignore */
  }
}

export function onBackButton(handler: (() => void) | null) {
  const b = tg?.BackButton;
  if (!b) return () => {};
  if (!handler) {
    b.hide();
    return () => {};
  }
  b.onClick(handler);
  b.show();
  return () => {
    b.offClick(handler);
  };
}

export function requestPhone(): Promise<string | null> {
  return new Promise((resolve) => {
    if (!tg?.requestContact) return resolve(null);
    try {
      tg.requestContact((ok: boolean, res: any) => {
        const phone = res?.responseUnsafe?.contact?.phone_number;
        if (ok && phone) resolve(String(phone).startsWith('+') ? phone : `+${phone}`);
        else resolve(null);
      });
    } catch {
      resolve(null);
    }
  });
}

export function openLink(url: string) {
  if (tg?.openTelegramLink && url.startsWith('https://t.me/')) tg.openTelegramLink(url);
  else window.open(url, '_blank');
}

export function userName(): string {
  const u = tg?.initDataUnsafe?.user;
  if (!u) return '';
  return [u.first_name, u.last_name].filter(Boolean).join(' ');
}

export function closeApp() {
  try {
    tg?.close();
  } catch {
    /* ignore */
  }
}
