/* Kwork Dark — service worker
 *
 * Иконка расширения работает как переключатель: клик инвертирует
 * тему глобально. Состояние лежит в chrome.storage.local, откуда
 * его читают content-скрипты всех вкладок kwork.
 */

const STORAGE_KEY = 'kwdEnabled';
const BADGE_ON = { text: 'ON', color: '#2fd47c' };
const BADGE_OFF = { text: 'OFF', color: '#6b7280' };

async function isEnabled() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  return data[STORAGE_KEY] !== false;
}

async function setEnabled(enabled) {
  await chrome.storage.local.set({ [STORAGE_KEY]: enabled });
}

async function renderBadge() {
  const enabled = await isEnabled();
  await chrome.action.setBadgeText({ text: enabled ? BADGE_ON.text : BADGE_OFF.text });
  await chrome.action.setBadgeBackgroundColor({ color: enabled ? BADGE_ON.color : BADGE_OFF.color });
  await chrome.action.setTitle({
    title: enabled
      ? 'Kwork Dark: тёмная тема включена — клик, чтобы отключить'
      : 'Kwork Dark: светлая тема — клик, чтобы включить тёмную',
  });
}

chrome.action.onClicked.addListener(async () => {
  const enabled = await isEnabled();
  await setEnabled(!enabled);
  await renderBadge();
});

chrome.runtime.onInstalled.addListener(renderBadge);
chrome.runtime.onStartup.addListener(renderBadge);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[STORAGE_KEY]) {
    renderBadge();
  }
});

renderBadge();
