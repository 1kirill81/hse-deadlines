/**
 * Модуль парсинга iCalendar (.ics) и вычисления времени
 */

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function parseICal(rawText) {
  // Разворачиваем перенесенные строки RFC 5545 (строки, начинающиеся с пробела или табуляции)
  const unfolded = rawText.replace(/\r?\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/);
  
  const events = [];
  let current = null;

  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) {
      current = {};
    } else if (line.startsWith('END:VEVENT')) {
      if (current) events.push(current);
      current = null;
    } else if (current) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      
      const rawKey = line.substring(0, colonIdx);
      const value = line.substring(colonIdx + 1);
      const key = rawKey.split(';')[0].toUpperCase();

      current[key] = value;
    }
  }

  const now = new Date();
  const mapping = getCourseMapping();
  const parsedTasks = [];
  const foundCodes = new Set();

  for (const ev of events) {
    const dtStr = ev.DTEND || ev.DTSTART;
    if (!dtStr) continue;

    const m = dtStr.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})Z?)?$/);
    if (!m) continue;

    const date = m[4] !== undefined 
      ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]))
      : new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 23, 59, 59));

    const isExpired = date < now;

    const catStr = ev.CATEGORIES || "";
    const codeMatch = catStr.match(/\b(\d+_\d+_\d+)\b/);
    const courseId = codeMatch ? codeMatch[1] : catStr.trim();
    if (courseId) foundCodes.add(courseId);

    const courseName = mapping[courseId] || (courseId ? courseId : "Общий курс");
    
    const title = (ev.SUMMARY || "Без названия")
      .replace(/\\,/g, ',').replace(/\\;/g, ';').trim();
    const desc = (ev.DESCRIPTION || "")
      .replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').trim();

    parsedTasks.push({
      id: ev.UID || Math.random().toString(),
      title,
      description: desc,
      course_id: courseId,
      course_name: courseName,
      date,
      is_expired: isExpired,
      iso_time: date.toISOString(),
      date_display: date.toLocaleString('ru-RU', { 
        timeZone: 'Europe/Moscow',
        day: '2-digit', month: '2-digit', year: 'numeric',
        weekday: 'short', hour: '2-digit', minute: '2-digit'
      })
    });
  }

  // Сортировка по возрастанию даты дедлайна
  parsedTasks.sort((a, b) => a.date - b.date);
  return { tasks: parsedTasks, detectedCodes: Array.from(foundCodes) };
}

function calculateTimeRemaining(targetDate) {
  const diff = targetDate - new Date();
  if (diff <= 0) {
    const pastDiff = Math.abs(diff);
    const days = Math.floor(pastDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((pastDiff / (1000 * 60 * 60)) % 24);
    
    let agoText = "";
    if (days > 0) {
      agoText = `${days}д назад`;
    } else if (hours > 0) {
      agoText = `${hours}ч назад`;
    } else {
      agoText = "только что";
    }
    return { text: `Истёк ${agoText}`, status: "expired" };
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);

  let text = days > 0 ? `${days}д ` : "";
  text += `${hours}ч ${minutes}м`;

  const totalHours = diff / (1000 * 60 * 60);
  let status = "later";
  if (totalHours <= 48) status = "critical";
  else if (totalHours <= 24 * 7) status = "week";

  return { text: `Осталось: ${text}`, status };
}
