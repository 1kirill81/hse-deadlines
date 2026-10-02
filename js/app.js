/**
 * Главный модуль интерфейса: состояние приложения, фильтрация, события
 */

let allDeadlines = [];
let detectedCourseIds = [];
let currentTimeFilter = 'active';

function showNoUrlState() {
  document.getElementById('criticalCount').innerText = 0;
  document.getElementById('soonCount').innerText = 0;
  document.getElementById('totalCount').innerText = 0;
  
  const container = document.getElementById('deadlinesContainer');
  container.innerHTML = `
    <div class="text-center py-12 px-4 bg-cardbg rounded-2xl border border-dashed border-bordercol text-slate-300 space-y-3">
      <div class="w-12 h-12 mx-auto rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center text-2xl border border-blue-500/20">
        <i class="fa-solid fa-link-slash"></i>
      </div>
      <div>
        <h3 class="text-sm font-semibold text-white">Ссылка на календарь не указана</h3>
        <p class="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
          Чтобы отобразить дедлайны, добавьте ссылку iCal из SmartLMS в настройках
        </p>
      </div>
      <button onclick="openSettingsModal()" class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-500/20 transition active:scale-95">
        <i class="fa-solid fa-plus"></i>
        <span>Указать ссылку</span>
      </button>
    </div>
  `;
}

async function loadDeadlines() {
  const url = getStoredUrl();
  if (!url) {
    showNoUrlState();
    return;
  }

  const icon = document.getElementById('refreshIcon');
  icon.classList.add('fa-spin');

  try {
    const icsText = await fetchCalendar(url);
    const { tasks, detectedCodes } = parseICal(icsText);
    allDeadlines = tasks;
    detectedCourseIds = detectedCodes;

    updateCourseSelect();
    updateMetrics();
    applyFilters();
  } catch (e) {
    document.getElementById('deadlinesContainer').innerHTML = `
      <div class="text-center py-8 bg-cardbg rounded-xl border border-red-500/30 p-4 text-xs text-red-400 space-y-2">
        <i class="fa-solid fa-triangle-exclamation text-2xl mb-1 text-red-400"></i>
        <p class="font-medium">Ошибка загрузки календаря</p>
        <p class="text-[11px] text-slate-400">${escapeHtml(e.message || String(e))}</p>
        <button onclick="openSettingsModal()" class="mt-2 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-bordercol">
          Проверить ссылку
        </button>
      </div>
    `;
  } finally {
    icon.classList.remove('fa-spin');
  }
}

function updateCourseSelect() {
  const select = document.getElementById('courseSelectFilter');
  const curVal = select.value;
  select.innerHTML = '<option value="all">Все дисциплины</option>';

  const mapping = getCourseMapping();
  const uniqueIds = [...new Set(allDeadlines.map(d => d.course_id))];
  uniqueIds.forEach(id => {
    const name = mapping[id] || id;
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = name;
    select.appendChild(opt);
  });
  select.value = curVal || "all";
}

function updateMetrics() {
  let crit = 0, soon = 0, activeCount = 0;
  allDeadlines.forEach(item => {
    const { status } = calculateTimeRemaining(item.date);
    if (status !== 'expired') {
      activeCount++;
      if (status === 'critical') crit++;
      else if (status === 'week') soon++;
    }
  });
  document.getElementById('criticalCount').innerText = crit;
  document.getElementById('soonCount').innerText = soon;
  document.getElementById('totalCount').innerText = activeCount;
}

function setTimeFilter(filter) {
  currentTimeFilter = filter;
  document.querySelectorAll('.time-filter-btn').forEach(btn => {
    if (btn.dataset.filter === filter) {
      btn.className = "time-filter-btn active py-1.5 rounded-md text-[11px] font-semibold bg-blue-600 text-white transition text-center whitespace-nowrap shadow-sm";
    } else {
      btn.className = "time-filter-btn py-1.5 rounded-md text-[11px] font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition text-center whitespace-nowrap";
    }
  });
  applyFilters();
}

function applyFilters() {
  if (!getStoredUrl()) {
    showNoUrlState();
    return;
  }

  const query = document.getElementById('searchInput').value.toLowerCase();
  const selectedCourse = document.getElementById('courseSelectFilter').value;
  const container = document.getElementById('deadlinesContainer');
  container.innerHTML = '';

  const filtered = allDeadlines.filter(item => {
    const { status } = calculateTimeRemaining(item.date);
    
    let matchesTime = false;
    if (currentTimeFilter === 'all') {
      matchesTime = true;
    } else if (currentTimeFilter === 'active') {
      matchesTime = status !== 'expired';
    } else if (currentTimeFilter === 'critical') {
      matchesTime = status === 'critical';
    } else if (currentTimeFilter === 'week') {
      matchesTime = status === 'week' || status === 'critical';
    } else if (currentTimeFilter === 'expired') {
      matchesTime = status === 'expired';
    }

    const matchesCourse = (selectedCourse === 'all') || (item.course_id === selectedCourse);
    const matchesSearch = item.title.toLowerCase().includes(query) || 
                          item.description.toLowerCase().includes(query) ||
                          item.course_name.toLowerCase().includes(query);
    return matchesTime && matchesCourse && matchesSearch;
  });

  // Если смотрим прошедшие — самые свежие дедлайны показываем первыми
  if (currentTimeFilter === 'expired') {
    filtered.sort((a, b) => b.date - a.date);
  } else {
    filtered.sort((a, b) => a.date - b.date);
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="text-center py-10 bg-cardbg rounded-xl border border-bordercol text-slate-400 text-xs">
        <i class="fa-solid fa-calendar-xmark text-2xl mb-1 text-slate-500"></i>
        <p>Нет задач по выбранным критериям</p>
      </div>
    `;
    return;
  }

  filtered.forEach((task, idx) => {
    const { text: remainText, status } = calculateTimeRemaining(task.date);
    let borderClass = "border-slate-800";
    let badgeClass = "bg-blue-500/10 text-blue-400 border border-blue-500/20";
    let courseClass = "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30";
    let titleClass = "text-white";
    let pulseDot = "";

    if (status === "critical") {
      borderClass = "border-red-500/40";
      badgeClass = "bg-red-500/20 text-red-400 border border-red-500/30";
      pulseDot = `<span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping inline-block mr-1"></span>`;
    } else if (status === "week") {
      borderClass = "border-amber-500/40";
      badgeClass = "bg-amber-500/20 text-amber-400 border border-amber-500/30";
    } else if (status === "expired") {
      borderClass = "border-slate-800/80 bg-slate-900/60 opacity-75";
      badgeClass = "bg-slate-800 text-slate-400 border border-slate-700/60";
      courseClass = "bg-slate-800/70 text-slate-400 border border-slate-700/50";
      titleClass = "text-slate-300";
    }

    const hasDesc = task.description.length > 0;
    const descId = `desc-${idx}`;

    const card = document.createElement('div');
    card.className = `bg-cardbg border ${borderClass} rounded-xl p-3.5 transition shadow-sm`;
    card.innerHTML = `
      <div class="flex items-start justify-between gap-2">
        <div class="space-y-1.5 flex-1 min-w-0">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeClass} flex items-center shrink-0">
              ${pulseDot}${remainText}
            </span>
            <span class="text-[10px] font-medium px-2 py-0.5 rounded-full ${courseClass} flex items-center gap-1 truncate max-w-full" title="${escapeHtml(task.course_name)}">
              <i class="fa-solid fa-book-bookmark text-[8px] shrink-0"></i>
              <span class="truncate">${escapeHtml(task.course_name)}</span>
            </span>
          </div>
          <h3 class="text-xs sm:text-sm font-semibold ${titleClass} leading-snug break-words">${escapeHtml(task.title)}</h3>
          <div class="text-[11px] text-slate-400 font-mono flex items-center gap-1">
            <i class="fa-regular fa-clock text-[10px]"></i>
            <span>${escapeHtml(task.date_display)}</span>
          </div>
        </div>
        
        ${hasDesc ? `
          <button onclick="toggleDesc('${descId}', this)" class="shrink-0 text-[10px] font-medium px-2 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-bordercol flex items-center gap-1 transition">
            <span>Инфо</span>
            <i class="fa-solid fa-chevron-down transition-transform duration-200"></i>
          </button>
        ` : ''}
      </div>

      ${hasDesc ? `
        <div id="${descId}" class="hidden mt-2.5 pt-2 border-t border-bordercol text-[11px] text-slate-300 leading-relaxed whitespace-pre-line bg-darkbg/50 p-2.5 rounded-lg border border-slate-800 custom-scroll max-h-48 overflow-y-auto">
          ${escapeHtml(task.description)}
        </div>
      ` : ''}
    `;
    container.appendChild(card);
  });
}

function toggleDesc(id, btn) {
  const el = document.getElementById(id);
  const icon = btn.querySelector('i');
  if (el.classList.contains('hidden')) {
    el.classList.remove('hidden');
    icon.classList.add('rotate-180');
  } else {
    el.classList.add('hidden');
    icon.classList.remove('rotate-180');
  }
}

function openSettingsModal() {
  document.getElementById('modalIcalUrl').value = getStoredUrl();
  const list = document.getElementById('coursesMappingList');
  list.innerHTML = '';

  const mapping = getCourseMapping();
  const allIds = [...new Set([...detectedCourseIds, ...Object.keys(mapping)])];

  allIds.slice(0, 20).forEach(cid => {
    const val = mapping[cid] || '';
    const row = document.createElement('div');
    row.className = "flex items-center gap-1.5";
    row.innerHTML = `
      <span class="text-[10px] font-mono text-slate-400 w-28 truncate bg-darkbg px-2 py-1 rounded border border-bordercol" title="${escapeHtml(cid)}">${escapeHtml(cid)}</span>
      <input type="text" data-course-id="${escapeHtml(cid)}" value="${escapeHtml(val)}" placeholder="Название предмета" 
             class="flex-1 bg-darkbg border border-bordercol rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-blue-500">
    `;
    list.appendChild(row);
  });

  document.getElementById('settingsModal').classList.remove('hidden');
}

function closeSettingsModal() {
  document.getElementById('settingsModal').classList.add('hidden');
}

function saveSettings() {
  const url = document.getElementById('modalIcalUrl').value.trim();
  setStoredUrl(url);

  const custom = JSON.parse(localStorage.getItem(STORAGE_KEYS.COURSES_MAPPING) || '{}');
  document.querySelectorAll('#coursesMappingList input[data-course-id]').forEach(input => {
    const cid = input.getAttribute('data-course-id');
    custom[cid] = input.value.trim();
  });
  saveCourseMapping(custom);

  closeSettingsModal();
  loadDeadlines();
}

// Запуск приложения и интервала автообновления
document.addEventListener('DOMContentLoaded', () => {
  loadDeadlines();
  setInterval(applyFilters, 60000);
});
