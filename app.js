/* ========================================
   習慣トラッカー Pro  app.js
   Day 4 of 30 — 2026-06-14
   ======================================== */

'use strict';

// ---- ユーティリティ：日付 ---------------------------------------------------

const DAY_NAMES = ['日','月','火','水','木','金','土'];
const MONTH_NAMES = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

/** YYYY-MM-DD 形式の今日 */
function todayStr() {
  return dateToStr(new Date());
}

function dateToStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function strToDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// ---- データ構造 ------------------------------------------------------------
/*
habits: [
  {
    id: number,
    name: string,
    icon: string,
    createdAt: string,        // YYYY-MM-DD
    completions: string[],    // 達成した日付の配列 YYYY-MM-DD
  }
]
*/

// ---- 状態 -----------------------------------------------------------------

let habits = load('ht_habits') || [];
let calViewYear  = new Date().getFullYear();
let calViewMonth = new Date().getMonth();
let selectedEmoji = '💪';

// ---- DOM 参照 --------------------------------------------------------------

const habitList      = document.getElementById('habitList');
const emptyHabits    = document.getElementById('emptyHabits');
const todayDateEl    = document.getElementById('todayDate');
const todayRateEl    = document.getElementById('todayRate');
const totalHabitsEl  = document.getElementById('totalHabits');
const bestStreakEl   = document.getElementById('bestStreak');
const weekGraphEl    = document.getElementById('weekGraph');
const calMonthEl     = document.getElementById('calMonth');
const calendarWrapEl = document.getElementById('calendarWrap');
const modalOverlay   = document.getElementById('modalOverlay');
const openModalBtn   = document.getElementById('openModalBtn');
const closeModalBtn  = document.getElementById('closeModalBtn');
const habitNameInput = document.getElementById('habitNameInput');
const modalSubmitBtn = document.getElementById('modalSubmitBtn');
const emojiBtns      = document.querySelectorAll('.emoji-btn');
const calPrev        = document.getElementById('calPrev');
const calNext        = document.getElementById('calNext');

// ---- 初期化 ----------------------------------------------------------------

todayDateEl.textContent = formatDisplayDate(new Date());
renderAll();

// ---- イベント --------------------------------------------------------------

openModalBtn.addEventListener('click', openModal);
closeModalBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });

modalSubmitBtn.addEventListener('click', addHabit);
habitNameInput.addEventListener('keydown', e => { if (e.key === 'Enter') addHabit(); });

emojiBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    selectedEmoji = btn.dataset.emoji;
    emojiBtns.forEach(b => b.classList.toggle('active', b === btn));
  });
});

calPrev.addEventListener('click', () => {
  calViewMonth--;
  if (calViewMonth < 0) { calViewMonth = 11; calViewYear--; }
  renderCalendar();
});

calNext.addEventListener('click', () => {
  calViewMonth++;
  if (calViewMonth > 11) { calViewMonth = 0; calViewYear++; }
  renderCalendar();
});

// ---- 機能 ------------------------------------------------------------------

function addHabit() {
  const name = habitNameInput.value.trim();
  if (!name) { habitNameInput.focus(); return; }

  habits.push({
    id: Date.now(),
    name,
    icon: selectedEmoji,
    createdAt: todayStr(),
    completions: [],
  });

  save('ht_habits', habits);
  habitNameInput.value = '';
  closeModal();
  renderAll();
}

function toggleToday(id) {
  const habit = habits.find(h => h.id === id);
  if (!habit) return;

  const today = todayStr();
  const idx = habit.completions.indexOf(today);
  if (idx === -1) {
    habit.completions.push(today);
  } else {
    habit.completions.splice(idx, 1);
  }

  save('ht_habits', habits);
  renderAll();
}

function deleteHabit(id) {
  habits = habits.filter(h => h.id !== id);
  save('ht_habits', habits);
  renderAll();
}

// ---- 連続記録計算 ----------------------------------------------------------

function calcStreak(habit) {
  if (!habit.completions.length) return 0;

  const sorted = [...habit.completions].sort().reverse();
  const today = todayStr();
  const yesterday = dateToStr(new Date(Date.now() - 86400000));

  // 今日か昨日からスタートしていなければ途切れてる
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

  let streak = 0;
  let check = sorted[0] === today ? today : yesterday;

  for (const d of sorted) {
    if (d === check) {
      streak++;
      const prev = new Date(strToDate(check).getTime() - 86400000);
      check = dateToStr(prev);
    } else {
      break;
    }
  }
  return streak;
}

function calcBestStreak(habit) {
  if (!habit.completions.length) return 0;
  const sorted = [...habit.completions].sort();
  let best = 1, cur = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = strToDate(sorted[i - 1]);
    const curr = strToDate(sorted[i]);
    const diff = (curr - prev) / 86400000;
    if (diff === 1) {
      cur++;
      best = Math.max(best, cur);
    } else {
      cur = 1;
    }
  }
  return best;
}

// ---- 達成率計算 ------------------------------------------------------------

function todayRate() {
  if (!habits.length) return 0;
  const today = todayStr();
  const done = habits.filter(h => h.completions.includes(today)).length;
  return Math.round((done / habits.length) * 100);
}

function rateOnDate(dateStr) {
  if (!habits.length) return 0;
  const done = habits.filter(h => h.completions.includes(dateStr)).length;
  // その日以前に作成された習慣のみカウント
  const eligible = habits.filter(h => h.createdAt <= dateStr).length;
  if (!eligible) return 0;
  return Math.round((done / eligible) * 100);
}

// ---- 描画 ------------------------------------------------------------------

function renderAll() {
  renderHabitList();
  renderSummary();
  renderWeekGraph();
  renderCalendar();
}

function renderSummary() {
  const rate = todayRate();
  todayRateEl.textContent = `${rate}%`;
  totalHabitsEl.textContent = habits.length;

  const globalBest = habits.reduce((max, h) => Math.max(max, calcBestStreak(h)), 0);
  bestStreakEl.textContent = `${globalBest}🔥`;
}

function renderHabitList() {
  const today = todayStr();
  habitList.innerHTML = '';

  habits.forEach(habit => {
    const isDone  = habit.completions.includes(today);
    const streak  = calcStreak(habit);
    const li = document.createElement('li');
    li.className = `habit-item${isDone ? ' done' : ''}`;

    const check = document.createElement('button');
    check.className = 'habit-check';
    check.setAttribute('aria-label', isDone ? '達成を取り消す' : '達成する');
    check.innerHTML = `<svg viewBox="0 0 12 9"><polyline points="1 4.5 4.5 8 11 1"/></svg>`;
    check.addEventListener('click', () => toggleToday(habit.id));

    const icon = document.createElement('span');
    icon.className = 'habit-icon';
    icon.textContent = habit.icon;

    const info = document.createElement('div');
    info.className = 'habit-info';

    const name = document.createElement('div');
    name.className = 'habit-name';
    name.textContent = habit.name;

    const streakEl = document.createElement('div');
    streakEl.className = 'habit-streak';
    if (streak > 0) {
      streakEl.innerHTML = `<span class="fire">🔥</span> ${streak}日継続中`;
    } else {
      streakEl.textContent = isDone ? '今日達成！' : '今日はまだ';
    }

    info.appendChild(name);
    info.appendChild(streakEl);

    const del = document.createElement('button');
    del.className = 'habit-delete';
    del.setAttribute('aria-label', '削除');
    del.innerHTML = `<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    del.addEventListener('click', () => deleteHabit(habit.id));

    li.appendChild(check);
    li.appendChild(icon);
    li.appendChild(info);
    li.appendChild(del);
    habitList.appendChild(li);
  });

  emptyHabits.classList.toggle('visible', habits.length === 0);
}

function renderWeekGraph() {
  const today = new Date();
  weekGraphEl.innerHTML = '';

  // 今週の日曜日を起点にする
  const dayOfWeek = today.getDay(); // 0=日
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - dayOfWeek);

  for (let i = 0; i <= 6; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    const ds = dateToStr(d);
    const isToday = ds === dateToStr(today);
    const rate = rateOnDate(ds);

    const col = document.createElement('div');
    col.className = `wg-col${isToday ? ' today' : ''}`;

    const barWrap = document.createElement('div');
    barWrap.className = 'wg-bar-wrap';

    const bar = document.createElement('div');
    bar.className = `wg-bar${rate === 0 ? ' empty' : ''}`;
    bar.style.height = `${rate}%`;

    const pct = document.createElement('div');
    pct.className = 'wg-pct';
    pct.textContent = rate > 0 ? `${rate}%` : '';

    const dayLabel = document.createElement('div');
    dayLabel.className = 'wg-day';
    dayLabel.textContent = DAY_NAMES[d.getDay()];

    barWrap.appendChild(bar);
    col.appendChild(barWrap);
    col.appendChild(pct);
    col.appendChild(dayLabel);
    weekGraphEl.appendChild(col);
  }
}

function renderCalendar() {
  const y = calViewYear;
  const m = calViewMonth;
  calMonthEl.textContent = `${y}年 ${MONTH_NAMES[m]}`;

  const todayD = todayStr();

  // カレンダーHTML
  const firstDay = new Date(y, m, 1).getDay(); // 0=日
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  let html = `
    <div class="cal-weekdays">
      ${DAY_NAMES.map(n => `<div class="cal-weekday">${n}</div>`).join('')}
    </div>
    <div class="cal-days">
  `;

  // 前月の空白
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="cal-day"></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = ds === todayD;
    const rate = rateOnDate(ds);

    let cls = 'cal-day this-month';
    if (rate === 100 && habits.length > 0) cls += ' has-data';
    else if (rate > 0) cls += ' partial';
    if (isToday) cls += ' today';

    html += `<div class="${cls}" title="${rate}%">${d}</div>`;
  }

  html += `</div>`;
  calendarWrapEl.innerHTML = html;
}

// ---- モーダル --------------------------------------------------------------

function openModal() {
  modalOverlay.classList.add('open');
  setTimeout(() => habitNameInput.focus(), 100);
}

function closeModal() {
  modalOverlay.classList.remove('open');
  habitNameInput.value = '';
}

// ---- ローカルストレージ ----------------------------------------------------

function save(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch(e) {}
}

function load(key) {
  try {
    const r = localStorage.getItem(key);
    return r ? JSON.parse(r) : null;
  } catch(e) { return null; }
}

// ---- フォーマット ----------------------------------------------------------

function formatDisplayDate(d) {
  return `${d.getMonth()+1}月${d.getDate()}日（${DAY_NAMES[d.getDay()]}）`;
}

// ---- Service Worker (PWA) -------------------------------------------------

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}