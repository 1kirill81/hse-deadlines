/**
 * Сетевой слой: загрузка данных календаря SmartLMS
 */
async function fetchCalendar(url) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36'
  };

  // CapacitorHttp обходит CORS в нативном WebView на мобильных устройствах
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.CapacitorHttp) {
    const response = await window.Capacitor.Plugins.CapacitorHttp.get({ url, headers });
    return response.data;
  }

  // Fallback для браузерного окружения
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Ошибка сети: статус ${res.status}`);
  }
  return await res.text();
}
