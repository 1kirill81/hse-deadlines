/**
 * Модуль работы с локальным хранилищем (localStorage)
 */
const STORAGE_KEYS = {
  ICAL_URL: 'ical_url',
  COURSES_MAPPING: 'courses_mapping'
};

function getStoredUrl() {
  return (localStorage.getItem(STORAGE_KEYS.ICAL_URL) || "").trim();
}

function setStoredUrl(url) {
  localStorage.setItem(STORAGE_KEYS.ICAL_URL, (url || "").trim());
}

function getCourseMapping() {
  try {
    const custom = JSON.parse(localStorage.getItem(STORAGE_KEYS.COURSES_MAPPING) || '{}');
    return { ...DEFAULT_COURSES, ...custom };
  } catch (e) {
    console.error("Ошибка при чтении сопоставления курсов:", e);
    return { ...DEFAULT_COURSES };
  }
}

function saveCourseMapping(customMapping) {
  localStorage.setItem(STORAGE_KEYS.COURSES_MAPPING, JSON.stringify(customMapping));
}
