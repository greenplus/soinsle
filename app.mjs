import { RANKS, POINTS, SAMPLE, counts, evaluate, jstDate, dailyIndex } from './core.mjs';
import { addToken, canAddOperator, draftRole, roleTokens, shareText, xPostUrl } from './ui-model.mjs';

const $ = id => document.getElementById(id);
let catalog, mode = 'daily', day = jstDate(), practiceId = '', puzzle;
let rows = [], draft = [], best = 0, storageAvailable = true;

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { storageAvailable = false; return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { storageAvailable = false; }
}
function key() { return 'soinsle:v1:' + (mode === 'daily' ? day : practiceId); }
function message(text, success = false) {
  $('message').textContent = text;
  $('message').classList.toggle('success', success);
}
function refreshDay() {
  const now = jstDate();
  if (mode === 'daily' && now !== day) {
    day = now;
    start();
    message('日付が変わりました。新しい今日の問題です。', true);
    return true;
  }
  return false;
}
function start() {
  puzzle = mode === 'daily' ? catalog.problems[dailyIndex(day, catalog.problems.length)]
    : practiceId === 'sample' ? { hand: SAMPLE }
    : catalog.problems[Number(practiceId.split('-')[0])];
  const state = load(key(), {});
  rows = []; draft = []; best = 0;
  try {
    if (Array.isArray(state.rows)) {
      evaluate(puzzle.hand, state.rows);
      rows = state.rows;
    }
    best = Number.isFinite(state.best) ? Math.max(0, state.best) : 0;
    if (Array.isArray(state.draft)) {
      const remaining = evaluate(puzzle.hand, rows).remaining;
      let restored = [];
      for (const token of state.draft) restored = addToken(restored, token, remaining);
      draft = restored;
    }
  } catch { draft = []; }
  $('daily').classList.toggle('active', mode === 'daily');
  $('practice').classList.toggle('active', mode === 'practice');
  $('next').hidden = mode !== 'practice';
  $('puzzle-label').textContent = mode === 'daily' ? day.replaceAll('-', '.') + '  /  DAILY'
    : practiceId === 'sample' ? 'PRACTICE / 動作確認の問題'
    : 'PRACTICE / ' + String(Number(practiceId.split('-')[0]) + 1).padStart(4, '0');
  message(storageAvailable ? '' : '保存機能を利用できません。この画面を閉じると進行は失われます。');
  render();
}
function persist(result) {
  best = Math.max(best, result.score);
  save(key(), { rows, draft, best });
  if (mode === 'daily') {
    const records = load('soinsle:records', {});
    const old = records[day] || { best: 0, complete: false };
    records[day] = { best: Math.max(old.best, result.score), complete: old.complete || result.complete };
    save('soinsle:records', records);
  }
}
function tile(rank, button = false) {
  const el = document.createElement(button ? 'button' : 'span');
  el.className = 'card';
  el.append(document.createTextNode(rank));
  const small = document.createElement('small');
  small.textContent = POINTS[RANKS.indexOf(rank)];
  el.append(small);
  return el;
}
function formula(tokens) {
  const el = document.createElement('div');
  el.className = 'formula';
  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', tokens.length ? tokens.join('') : '空の式');
  let exponent;
  for (const token of tokens) {
    if (token === '^') {
      exponent = document.createElement('sup');
      exponent.className = 'exponent';
      const marker = document.createElement('span');
      marker.className = 'power-marker'; marker.textContent = '^';
      exponent.append(marker); el.append(exponent);
    } else if (RANKS.includes(token)) {
      (exponent ?? el).append(tile(token));
    } else {
      exponent = undefined;
      const op = document.createElement('span');
      op.className = 'operator'; op.textContent = token;
      el.append(op);
    }
  }
  return el;
}
function renderBoard(result) {
  const board = $('answers');
  board.replaceChildren();
  rows.forEach((role, i) => {
    const row = document.createElement('li'); row.className = 'equation-row confirmed';
    const expression = formula(roleTokens(role));
    expression.setAttribute('aria-label', `${role.left} = ${role.right}`);
    const meta = document.createElement('div'); meta.className = 'row-meta';
    const detail = document.createElement('span');
    detail.textContent = `${result.roles[i].points}点 × ${result.roles[i].count}枚`;
    const score = document.createElement('strong'); score.textContent = `${result.roles[i].score}点`;
    const undo = document.createElement('button'); undo.className = 'text-button'; undo.textContent = '戻す';
    undo.setAttribute('aria-label', `${i + 1}番目の式を戻す`);
    undo.onclick = () => {
      if (refreshDay()) return;
      rows.splice(i, 1); render(); message('式を取り消しました。', true);
    };
    meta.append(detail, score, undo); row.append(expression, meta); board.append(row);
  });
  if (!result.complete) {
    const row = document.createElement('li'); row.id = 'draft-row'; row.className = 'equation-row current';
    row.setAttribute('aria-label', '入力中の式');
    const expression = formula(draft);
    if (!draft.length) {
      const hint = document.createElement('span'); hint.className = 'draft-hint';
      hint.textContent = '手札と＝・×で式を作る'; expression.append(hint);
    }
    const cursor = document.createElement('span'); cursor.className = 'cursor'; cursor.setAttribute('aria-hidden', 'true');
    expression.append(cursor); row.append(expression); board.append(row);
    for (let i = 0; i < Math.max(0, 2 - rows.length); i++) {
      const blank = document.createElement('li'); blank.className = 'equation-row blank';
      blank.setAttribute('aria-hidden', 'true'); board.append(blank);
    }
  }
}
function render() {
  const result = evaluate(puzzle.hand, rows);
  persist(result);
  $('score').textContent = result.score;
  $('used').textContent = result.used + ' / 17枚';
  $('best').textContent = '自己ベスト ' + best + '点';
  $('role-count').textContent = rows.length + '手';
  $('finished').hidden = !result.complete;
  renderBoard(result);
  const remaining = [...result.remaining];
  const pending = counts(draft.filter(c => RANKS.includes(c)));
  $('hand').replaceChildren();
  for (const c of puzzle.hand) {
    const i = RANKS.indexOf(c), button = tile(c, true);
    const available = remaining[i]-- > 0, selected = available && pending[i]-- > 0;
    if (!available) button.classList.add('spent');
    if (selected) button.classList.add('drafted');
    button.disabled = !available || selected;
    button.setAttribute('aria-label', `${c}、${POINTS[i]}点${!available ? '、使用済み' : selected ? '、入力中' : ''}`);
    button.onclick = () => insert(c);
    $('hand').append(button);
  }
  for (const [id, op] of [['equals', '='], ['multiply', '×'], ['power', '^']]) {
    $(id).disabled = result.complete || !canAddOperator(draft, op);
  }
  $('backspace').disabled = $('clear').disabled = !draft.length;
  $('submit').disabled = result.complete || !draft.includes('=') || !RANKS.includes(draft.at(-1) ?? ' ');
}
function insert(token) {
  if (!catalog || refreshDay()) return;
  try {
    draft = addToken(draft, token, evaluate(puzzle.hand, rows).remaining);
    message(''); render();
  } catch (e) { message(e.message); }
}
for (const [id, op] of [['equals', '='], ['multiply', '×'], ['power', '^']]) $(id).onclick = () => insert(op);
$('backspace').onclick = () => { if (!refreshDay()) { draft = draft.slice(0, -1); message(''); render(); } };
$('clear').onclick = () => { if (!refreshDay()) { draft = []; message(''); render(); } };
$('submit').onclick = () => {
  if (refreshDay()) return;
  try {
    const result = evaluate(puzzle.hand, [...rows, draftRole(draft)]);
    rows = result.roles.map(({ left, right }) => ({ left, right }));
    draft = []; render();
    message(result.complete ? '17枚をすべて使い切りました！' : `${result.roles.at(-1).score}点を獲得しました。次の行に進めます。`, true);
  } catch (e) { message(e.message); }
};
$('daily').onclick = () => { mode = 'daily'; day = jstDate(); start(); };
function newPractice() {
  mode = 'practice';
  const rand = new Uint32Array(1); crypto.getRandomValues(rand);
  practiceId = (rand[0] % catalog.problems.length) + '-' + Date.now();
  save('soinsle:lastPractice', practiceId); start();
}
$('practice').onclick = () => {
  mode = 'practice'; practiceId = load('soinsle:lastPractice', '');
  if (!practiceId || !(practiceId === 'sample' || /^\d+-\d+$/.test(practiceId)) || Number(practiceId.split('-')[0]) >= catalog.problems.length) newPractice();
  else start();
};
$('next').onclick = newPractice;
$('help').onclick = () => $('help-dialog').showModal();
$('stats').onclick = () => {
  const records = Object.values(load('soinsle:records', {}));
  $('stats-content').replaceChildren();
  for (const [name, value] of [['挑戦した日数', records.filter(r => r.best > 0).length], ['使い切った日数', records.filter(r => r.complete).length], ['最高得点', Math.max(0, ...records.map(r => r.best))]]) {
    const p = document.createElement('p'); p.textContent = name;
    const b = document.createElement('b'); b.className = 'stat-num'; b.textContent = value;
    p.append(b); $('stats-content').append(p);
  }
  $('stats-dialog').showModal();
};
for (const b of document.querySelectorAll('.close')) b.onclick = () => b.closest('dialog').close();
for (const d of document.querySelectorAll('dialog')) d.addEventListener('click', e => {
  if (e.target === d) {
    const r = d.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close();
  }
});
$('share').onclick = () => {
  if (refreshDay()) return;
  const result = evaluate(puzzle.hand, rows);
  const text = shareText({ mode, day, ...result, url: new URL('./', location.href).href });
  $('share-text').value = text;
  $('share-x').href = xPostUrl(text);
  $('copy-share').textContent = '文面をコピー'; $('share-message').textContent = '';
  $('share-dialog').showModal();
};
$('copy-share').onclick = async () => {
  try {
    await navigator.clipboard.writeText($('share-text').value);
    $('copy-share').textContent = 'コピーしました';
    $('share-message').textContent = '文面をコピーしました。';
  } catch {
    $('share-message').textContent = 'コピーできませんでした。下の文面を選択してコピーしてください。';
    $('share-text').select();
  }
};
$('point-table').innerHTML = [...RANKS].map((c, i) => `<span><b>${c}</b>${POINTS[i]}</span>`).join('');
for (const id of ['daily', 'practice', 'submit', 'share', 'next', 'clear', 'equals', 'multiply', 'power', 'backspace']) $(id).disabled = true;
try {
  const response = await fetch('./data/problems.json');
  if (!response.ok) throw Error('問題データの読み込みに失敗しました。');
  catalog = await response.json();
  if (location.hash === '#sample') { mode = 'practice'; practiceId = 'sample'; }
  for (const id of ['daily', 'practice', 'share', 'next']) $(id).disabled = false;
  start();
  setInterval(refreshDay, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshDay(); });
} catch (e) { message(e.message + ' ページを再読み込みしてください。'); }
