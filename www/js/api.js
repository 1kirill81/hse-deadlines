/**
 * Сетевой слой: загрузка данных календаря SmartLMS
 * Поддерживает как нативное приложение (CapacitorHttp), так и веб-версию на GitHub Pages (через CORS-fallback)
 */
async function fetchCalendar(url) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36'
  };

  // 1. Мобильное окружение (Android Capacitor): нативный запрос в обход любых ограничений CORS
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.CapacitorHttp) {
    const response = await window.Capacitor.Plugins.CapacitorHttp.get({ url, headers });
    return response.data;
  }

  // 2. Веб-окружение (браузер / GitHub Pages):
  // Сервер ВШЭ (edu.hse.ru) блокирует прямые запросы из браузера политикой CORS.
  // Сначала пробуем прямой запрос:
  try {
    const directRes = await fetch(url, { headers });
    if (directRes.ok) {
      const text = await directRes.text();
      if (text.includes('BEGIN:VCALENDAR')) {
        return text;
      }
    }
  } catch (err) {
    console.warn("Прямой запрос заблокирован CORS, переключаемся на CORS-прокси:", err);
  }

  // Если прямой запрос заблокирован CORS — используем надежные CORS-прокси
  const proxyList = [
    (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
    (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`
  ];

  let lastError = null;
  for (const getProxyUrl of proxyList) {
    try {
      const proxyUrl = getProxyUrl(url);
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const text = await res.text();
        if (text && text.includes('BEGIN:VCALENDAR')) {
          return text;
        }
      }
    } catch (e) {
      lastError = e;
    }
  }

  throw new Error(
    lastError 
      ? `Не удалось загрузить календарь: ${lastError.message || lastError}` 
      : 'Ошибка загрузки календаря через веб-прокси. Проверьте правильность ссылки.'
  );
}
