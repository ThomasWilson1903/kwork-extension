/* Kwork Dark — content script
 *
 * Управляет включением темы: по умолчанию тёмная (никакого
 * атрибута на <html>), светлая — при наличии data-kw-light.
 * Так исключается вспышка светлого фона при загрузке страницы.
 */

(function () {
  'use strict';

  var STORAGE_KEY = 'kwdEnabled';
  var TOGGLE_ID = 'kwd-toggle';

  function root() {
    return document.documentElement;
  }

  function isLight() {
    var el = root();
    return !!el && el.hasAttribute('data-kw-light');
  }

  var pendingEnabled = null;

  function whenRootReady(fn) {
    if (root()) return fn();
    document.addEventListener('readystatechange', function handler() {
      if (root()) {
        document.removeEventListener('readystatechange', handler, true);
        fn();
      }
    }, true);
    document.addEventListener('DOMContentLoaded', function handler() {
      if (root()) {
        document.removeEventListener('DOMContentLoaded', handler, true);
        fn();
      }
    }, true);
  }

  function setTheme(enabled, persist) {
    // На document_start элемент <html> может быть ещё не создан —
    // откладываем применение, иначе состояние потерялось бы.
    if (!root()) {
      pendingEnabled = enabled;
      whenRootReady(function () {
        if (pendingEnabled !== null) setTheme(pendingEnabled, false);
      });
      return;
    }
    var el = root();
    if (enabled) {
      el.removeAttribute('data-kw-light');
    } else {
      el.setAttribute('data-kw-light', '');
    }
    updateToggleLabel();
    if (persist) {
      try {
        chrome.storage.local.set({ [STORAGE_KEY]: enabled });
      } catch (e) {
        /* storage недоступен — тема просто не запомнится */
      }
    }
  }

  function updateToggleLabel() {
    var btn = document.getElementById(TOGGLE_ID);
    if (!btn) return;
    var label = btn.querySelector('.kwd-label');
    if (label) {
      label.textContent = isLight() ? 'Тёмная' : 'Светлая';
    }
    btn.setAttribute('title', isLight() ? 'Включить тёмную тему' : 'Включить светлую тему');
    btn.setAttribute('aria-label', btn.getAttribute('title'));
    btn.setAttribute('aria-pressed', String(isLight()));
  }

  function createToggle() {
    if (document.getElementById(TOGGLE_ID)) return;
    if (!document.body) return;

    var btn = document.createElement('div');
    btn.id = TOGGLE_ID;
    btn.setAttribute('role', 'button');
    btn.setAttribute('tabindex', '0');

    var ico = document.createElement('span');
    ico.className = 'kwd-ico';

    var label = document.createElement('span');
    label.className = 'kwd-label';

    btn.appendChild(ico);
    btn.appendChild(label);
    document.body.appendChild(btn);
    updateToggleLabel();

    btn.addEventListener('click', function () {
      setTheme(isLight(), true);
    });
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        setTheme(isLight(), true);
      }
    });
  }

  function applyStoredState(enabled) {
    // По умолчанию (null/undefined) — тёмная тема включена.
    setTheme(enabled !== false, false);
  }

  /* --- Старт: применяем сохранённое состояние как можно раньше --- */
  try {
    chrome.storage.local.get(STORAGE_KEY, function (data) {
      applyStoredState(data ? data[STORAGE_KEY] : undefined);
    });
  } catch (e) {
    setTheme(true, false);
  }

  /* Синхронизация с кнопкой расширения и другими вкладками */
  try {
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area === 'local' && changes[STORAGE_KEY]) {
        setTheme(changes[STORAGE_KEY].newValue !== false, false);
      }
    });
  } catch (e) {
    /* нет доступа к storage — переключатель на странице всё равно работает */
  }

  /* Переключатель появляется, как только готов <body> */
  function mountToggle() {
    createToggle();
    if (document.body) {
      document.body.classList.add('kwd-ready');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountToggle);
  } else {
    mountToggle();
  }

  /* Vue-SPA: если скрипт сайта вытеснит наш узел — вернём его */
  if (typeof MutationObserver === 'function') {
    var observer = new MutationObserver(function () {
      var btn = document.getElementById(TOGGLE_ID);
      if (btn && document.body && btn.parentNode !== document.body) {
        document.body.appendChild(btn);
      } else if (!btn && document.body) {
        createToggle();
      }
    });
    var startObserving = function () {
      if (document.body) {
        observer.observe(document.body, { childList: true });
      }
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startObserving);
    } else {
      startObserving();
    }
  }
})();
