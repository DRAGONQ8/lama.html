function startExtra(id) {
  if (screen !== 'setup' || state?.id !== id || coreBlocked()) return;
  clearTimers();
  seededRandom = dailyRun
    ? makeSeed(dailyRun.date + ':' + id)
    : tourney?.active
      ? makeSeed(tourney.seed + ':' + id)
      : null;
  const name = player(),
    fixed = !!(dailyRun || tourney?.active),
    difficulty = fixed ? 'normal' : $('level')?.value || 'normal';
  state = {
    id,
    name,
    level: ['easy', 'normal', 'hard'].includes(difficulty) ? difficulty : 'normal',
    done: false,
    fixed,
    extraRandom: seededRandom,
  };
  screen = id;
  try {
    switch (id) {
      case 'ttt':
      case 'connect':
        startBoard(id);
        break;
      case 'code':
        startCode();
        break;
      case 'simon':
        startSimon();
        break;
      case 'slide':
        startSlide();
        break;
      case 'sudoku':
        startSudoku();
        break;
      case 'word':
        startWord();
        break;
      case 'math':
      case 'color':
      case 'pattern':
        startQuiz(id);
        break;
      case 'spy':
        startSpy();
        break;
      case 'taboo':
        startTaboo();
        break;
    }
  } finally {
    seededRandom = null;
  }
  goTop();
}
function smallStats(a) {
  return `<div class="stats">${a.map((v) => `<div class="stat"><small>${v[0]}</small><b${v[2] ? ` id="${v[2]}"` : ''}${/^\d+\s*\/\s*\d+$/.test(String(v[1])) ? ' dir="ltr"' : ''}>${v[1]}</b></div>`).join('')}</div>`;
}
function startBoard(id) {
  const s = state;
  s.bot = ($('opponent')?.value || 'bot') === 'bot';
  s.names = [
    s.name,
    s.bot ? 'الخصم الذكي' : store.players[Number($('second')?.value || 1)] || store.players[0],
  ];
  if (!s.bot && s.names[0] === s.names[1]) {
    screen = 'setup';
    return toast('اختار اسم مختلف للاعب الثاني.');
  }
  const first = $('first')?.value || '0';
  s.turn = first === 'random' ? gameRand(2) : first === '1' ? 1 : 0;
  s.roundStarter = s.turn;
  s.series = {
    limit: s.fixed ? 1 : extraOption('boardseries', 1, 1, 5),
    round: 1,
    wins: [0, 0],
    draws: 0,
    points: [0, 0],
    rounds: [],
  };
  s.board = Array(id === 'ttt' ? 9 : 42).fill(0);
  s.moves = 0;
  s.waiting = false;
  s.winline = [];
  s.history = [];
  renderBoard();
  if (s.bot && s.turn === 1) scheduleBot();
}
const winLines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];
function tttWinner(b) {
  for (const l of winLines)
    if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[0]] === b[l[2]]) return { p: b[l[0]], line: l };
  return b.includes(0) ? null : { p: 0, line: [] };
}
function tttBest(b, p) {
  function solve(board, turn, depth) {
    const w = tttWinner(board);
    if (w) return w.p === p ? 10 - depth : w.p === 0 ? 0 : depth - 10;
    let value = turn === p ? -100 : 100;
    for (let i = 0; i < 9; i++)
      if (!board[i]) {
        board[i] = turn;
        const n = solve(board, 3 - turn, depth + 1);
        board[i] = 0;
        value = turn === p ? Math.max(value, n) : Math.min(value, n);
      }
    return value;
  }
  let score = -Infinity,
    moves = [];
  for (let i = 0; i < 9; i++)
    if (!b[i]) {
      b[i] = p;
      const v = solve(b, 3 - p, 0);
      b[i] = 0;
      if (v > score) {
        score = v;
        moves = [i];
      } else if (v === score) moves.push(i);
    }
  return moves[extraRand(moves.length)];
}
function boardWinningMove(board, id, p) {
  const legal =
    id === 'ttt'
      ? board.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0)
      : [3, 2, 4, 1, 5, 0, 6].filter((c) => landing(board, c) >= 0);
  for (const move of legal) {
    const i = id === 'ttt' ? move : landing(board, move);
    board[i] = p;
    const won = (id === 'ttt' ? tttWinner(board) : connectWinner(board))?.p === p;
    board[i] = 0;
    if (won) return move;
  }
  return -1;
}
function connectWinner(b) {
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (let r = 0; r < 6; r++)
    for (let c = 0; c < 7; c++) {
      const p = b[r * 7 + c];
      if (!p) continue;
      for (const [dr, dc] of dirs) {
        const line = [r * 7 + c];
        for (let k = 1; k < 4; k++) {
          const rr = r + dr * k,
            cc = c + dc * k;
          if (rr < 0 || rr >= 6 || cc < 0 || cc >= 7 || b[rr * 7 + cc] !== p) break;
          line.push(rr * 7 + cc);
        }
        if (line.length === 4) return { p, line };
      }
    }
  return b.includes(0) ? null : { p: 0, line: [] };
}
function landing(b, c) {
  if (!Number.isInteger(c) || c < 0 || c > 6) return -1;
  for (let r = 5; r >= 0; r--) if (!b[r * 7 + c]) return r * 7 + c;
  return -1;
}
function connectEval(b) {
  let score = 0;
  for (let r = 0; r < 6; r++) {
    if (b[r * 7 + 3] === 2) score += 5;
    if (b[r * 7 + 3] === 1) score -= 5;
  }
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (let r = 0; r < 6; r++)
    for (let c = 0; c < 7; c++)
      for (const [dr, dc] of dirs) {
        const rr = r + 3 * dr,
          cc = c + 3 * dc;
        if (rr < 0 || rr >= 6 || cc < 0 || cc >= 7) continue;
        let a = 0,
          z = 0;
        for (let k = 0; k < 4; k++) {
          const v = b[(r + k * dr) * 7 + c + k * dc];
          if (v === 2) a++;
          if (v === 1) z++;
        }
        if (!z) score += [0, 1, 7, 45, 100000][a];
        if (!a) score -= [0, 1, 9, 65, 100000][z];
      }
  return score;
}
function connectBest(b, depth = 5, p = 2) {
  // The same search can coach either colour without changing the live board.
  if (p === 1)
    return connectBest(
      b.map((v) => (v ? 3 - v : 0)),
      depth,
      2,
    );
  const order = [3, 2, 4, 1, 5, 0, 6],
    valid = order.filter((c) => landing(b, c) >= 0);
  if (!valid.length) return -1;
  for (const p of [2, 1])
    for (const c of valid) {
      const i = landing(b, c);
      b[i] = p;
      const w = connectWinner(b);
      b[i] = 0;
      if (w?.p === p) return c;
    }
  let nodes = 0;
  function solve(turn, d, alpha, beta) {
    nodes++;
    const w = connectWinner(b);
    if (w) return w.p === 2 ? 100000 + d : w.p === 1 ? -100000 - d : 0;
    if (d === 0 || nodes > 12000) return connectEval(b);
    const cols = order.filter((c) => landing(b, c) >= 0);
    let score = turn === 2 ? -Infinity : Infinity;
    for (const c of cols) {
      const i = landing(b, c);
      b[i] = turn;
      const v = solve(3 - turn, d - 1, alpha, beta);
      b[i] = 0;
      if (turn === 2) {
        score = Math.max(score, v);
        alpha = Math.max(alpha, v);
      } else {
        score = Math.min(score, v);
        beta = Math.min(beta, v);
      }
      if (beta <= alpha) break;
    }
    return score;
  }
  let best = valid[0],
    score = -Infinity;
  for (const c of valid) {
    const i = landing(b, c);
    b[i] = 2;
    const v = solve(1, depth - 1, -Infinity, Infinity);
    b[i] = 0;
    if (v > score) {
      score = v;
      best = c;
    }
  }
  return best;
}
function renderBoard() {
  const s = state,
    w = s.winner,
    display = Number.isInteger(s.replayIndex)
      ? s.history[s.replayIndex]?.board || s.board
      : s.board;
  const focused = document.activeElement?.closest?.('[data-board-pos]');
  if (focused) s.boardFocus = Number(focused.dataset.boardPos);
  const body =
    s.id === 'ttt'
      ? `<div class="ttt" dir="ltr" aria-label="لوحة إكس أو؛ الأرقام من اليسار إلى اليمين">${display.map((v, i) => `<button data-board-pos="${i}" class="${v ? 'p' + v : ''} ${s.replayIndex === undefined && s.winline.includes(i) ? 'win' : ''} ${s.replayIndex === undefined && s.lastMove === i ? 'last-move' : ''}" ${s.suggested === i ? 'style="outline:3px solid var(--mint)"' : ''} onclick="boardMove(${i})" ${v || s.waiting || s.done ? 'disabled' : ''} aria-label="خانة ${i + 1}${v ? ' ' + (v === 1 ? 'X' : 'O') : ''}${s.suggested === i ? ' حركة مقترحة' : ''}">${v ? (v === 1 ? '×' : '○') : `<small class="board-shortcut">${i + 1}</small>`}</button>`).join('')}</div>`
      : `<div class="connect" dir="ltr" aria-label="لوحة وصل أربعة؛ الأعمدة من اليسار إلى اليمين">${Array.from({ length: 7 }, (_, c) => `<button data-board-pos="${c}" class="drop" ${s.suggested === c ? 'style="outline:3px solid var(--mint)"' : ''} onclick="boardMove(${c})" ${s.waiting || s.done || landing(s.board, c) < 0 ? 'disabled' : ''} aria-label="إنزال قطعة في العمود ${c + 1}${s.suggested === c ? ' حركة مقترحة' : ''}">↓ <small>${c + 1}</small></button>`).join('')}${display.map((v, i) => `<div class="disc ${v === 1 ? 'red' : v === 2 ? 'yellow' : ''} ${s.replayIndex === undefined && s.winline.includes(i) ? 'win' : ''} ${s.replayIndex === undefined && s.lastMove === i ? 'last-move' : ''}" aria-label="صف ${Math.floor(i / 7) + 1} عمود ${(i % 7) + 1}: ${v === 1 ? 'أحمر' : v === 2 ? 'أصفر' : 'فاضي'}">${v === 1 ? '●' : v === 2 ? '◆' : ''}</div>`).join('')}</div>`;
  setHTML(
    wrap(
      s.id,
      `<section class="panel"><div class="legend"><span>${s.id === 'ttt' ? '×' : '🔴 ●'} ${esc(s.names[0])}</span><span>${s.id === 'ttt' ? '○' : '🟡 ◆'} ${esc(s.names[1])}</span></div><div class="turnmark" role="status">${s.done ? (w === 0 ? 'تعادل!' : esc(s.names[w - 1]) + ' فاز 🏆') : s.waiting ? 'الخصم يفكّر…' : 'الدور على ' + esc(s.names[s.turn])}</div>${body}<p class="note center">${s.moves} حركة${s.bot ? ' · ' + { easy: 'خصم خفيف', normal: 'خصم متوسط', hard: 'خصم قوي' }[s.level] : ''} · الأرقام 1–${s.id === 'ttt' ? 9 : 7} أو انقر اللوحة.</p>${boardMatchHTML(s)}${s.coachMessage ? `<p class="hintpanel" role="status">${esc(s.coachMessage)}</p>` : ''}<div class="actions">${s.done ? `${boardSeriesOver(s) ? '<button class="primary" onclick="showBoardResult()">شوف النتيجة</button>' : '<button class="primary" onclick="nextBoardRound()">الجولة التالية ←</button>'}` : `<button onclick="undoBoard()" ${!boardUndoAvailable(s) || s.waiting ? 'disabled' : ''}>↶ تراجع${s.bot ? ' عن دورك' : ''}</button><button onclick="hintBoard()" ${s.waiting || s.suggested !== undefined || s.fixed ? 'disabled' : ''}>💡 اقترح حركة −10</button>`}<button class="quiet" onclick="setup('${s.id}')">تحدّي جديد</button></div></section>`,
    ),
  );
  if (Number.isInteger(s.boardFocus) && !s.waiting) {
    const buttons = [...$('app').querySelectorAll('[data-board-pos]:not(:disabled)')],
      target =
        buttons.find((button) => Number(button.dataset.boardPos) === s.boardFocus) || buttons[0];
    if (target) target.focus({ preventScroll: true });
    else if (s.done)
      $('app').querySelector('[onclick="showBoardResult()"]')?.focus({ preventScroll: true });
  }
}
function boardUndoAvailable(s = state) {
  return !!s?.history?.length && (!s.bot || s.history.some((move) => move.turn === 0));
}
function boardMove(pos, botMove = false) {
  const s = state;
  if (
    !s ||
    s.done ||
    advancedBlocked(s) ||
    !['ttt', 'connect'].includes(screen) ||
    (botMove && (!s.bot || s.turn !== 1)) ||
    (s.waiting && !botMove) ||
    (!botMove && s.bot && s.turn === 1)
  )
    return;
  let i = s.id === 'ttt' ? pos : landing(s.board, pos);
  if (!Number.isInteger(i) || i < 0 || i >= s.board.length || s.board[i]) return;
  const ownWin = boardWinningMove(s.board, s.id, s.turn + 1),
    danger = boardWinningMove(s.board, s.id, 2 - s.turn);
  const note =
    ownWin === pos ? 'حركة تكمل خط الفوز.' : danger === pos ? 'صدّ تهديد مباشر للخصم.' : '';
  s.history.push({ board: [...s.board], turn: s.turn, moves: s.moves, note, pos });
  s.lastMove = i;
  s.board[i] = s.turn + 1;
  delete s.suggested;
  s.coachMessage = '';
  s.moves++;
  s.waiting = false;
  tone();
  const w = s.id === 'ttt' ? tttWinner(s.board) : connectWinner(s.board);
  if (w) {
    s.done = true;
    s.winner = w.p;
    s.winline = w.line;
    clearTimers();
    const winPoints = Math.max(10, 50 - (s.coachHints?.[w.p - 1] || 0) * 10),
      p = w.p === 0 ? 10 : !s.bot || w.p === 1 ? winPoints : 0;
    // Record participation for both people, including a zero-point loss.
    if (s.bot) {
      s.name = s.names[0];
      addScore(s.name, p);
    } else {
      s.name = w.p ? s.names[w.p - 1] : s.names[0];
      for (let index = 0; index < s.names.length; index++)
        addScore(s.names[index], w.p === 0 ? 10 : w.p === index + 1 ? winPoints : 0);
    }
    s.roundRecorded = true;
    s.points = p;
    if (s.series) {
      if (w.p) s.series.wins[w.p - 1]++;
      else s.series.draws++;
      s.series.points[0] += w.p === 0 ? 10 : w.p === 1 ? winPoints : 0;
      s.series.points[1] += w.p === 0 ? 10 : w.p === 2 ? winPoints : 0;
      s.series.rounds.push({ winner: w.p, moves: s.moves });
    }
    renderBoard();
    if (p > 10) {
      tone(true);
      confetti();
    }
    return;
  }
  s.turn = 1 - s.turn;
  renderBoard();
  if (s.bot && s.turn === 1) scheduleBot();
}
function scheduleBot() {
  const s = state,
    token = (s.botToken || 0) + 1;
  s.botToken = token;
  s.waiting = true;
  renderBoard();
  advancedLater(
    s,
    () => {
      if (s.botToken !== token || s.turn !== 1 || !s.bot) return;
      let move;
      if (s.id === 'ttt') {
        const legal = s.board.map((v, i) => (v ? null : i)).filter((i) => i !== null);
        const win = boardWinningMove(s.board, 'ttt', 2),
          block = s.level !== 'easy' ? boardWinningMove(s.board, 'ttt', 1) : -1;
        move =
          win >= 0
            ? win
            : block >= 0
              ? block
              : s.level === 'easy' || (s.level === 'normal' && extraRand(100, s) < 30)
                ? legal[extraRand(legal.length, s)]
                : tttBest(s.board, 2);
      } else {
        const legal = [0, 1, 2, 3, 4, 5, 6].filter((c) => landing(s.board, c) >= 0);
        const win = boardWinningMove(s.board, 'connect', 2);
        move =
          win >= 0
            ? win
            : s.level === 'easy'
              ? legal[extraRand(legal.length, s)]
              : connectBest(s.board, s.level === 'normal' ? 3 : 5);
      }
      boardMove(move, true);
    },
    350,
  );
}
function undoBoard() {
  const s = state;
  if (
    !s ||
    !['ttt', 'connect'].includes(screen) ||
    s.done ||
    advancedBlocked(s) ||
    s.waiting ||
    !boardUndoAvailable(s)
  )
    return;
  let snap = s.history.pop();
  if (s.bot && snap.turn === 1 && s.history.length) snap = s.history.pop();
  s.board = snap.board;
  s.turn = snap.turn;
  s.moves = snap.moves;
  delete s.suggested;
  s.coachMessage = '';
  s.lastMove = undefined;
  renderBoard();
  if (s.bot && s.turn === 1) scheduleBot();
}
function hintBoard() {
  const s = state;
  if (
    !s ||
    !['ttt', 'connect'].includes(screen) ||
    s.done ||
    s.waiting ||
    s.fixed ||
    advancedBlocked(s) ||
    s.suggested !== undefined ||
    (s.bot && s.turn === 1)
  )
    return;
  const p = s.turn + 1,
    win = boardWinningMove(s.board, s.id, p),
    block = boardWinningMove(s.board, s.id, 3 - p);
  s.suggested =
    win >= 0
      ? win
      : block >= 0
        ? block
        : s.id === 'ttt'
          ? tttBest(s.board, p)
          : connectBest(s.board, 4, p);
  s.coachHints ??= [0, 0];
  s.coachHints[s.turn]++;
  s.coachMessage =
    (win >= 0
      ? 'هذه الحركة تكمل خط الفوز.'
      : block >= 0
        ? 'هذه الحركة تمنع فوز الخصم في دوره القادم.'
        : s.id === 'ttt'
          ? 'هذه الحركة تحافظ على أفضل نتيجة ممكنة؛ راقب المركز والزوايا.'
          : 'هذه الحركة تفحص التهديدات المقبلة؛ المركز يمنحك أكثر من اتجاه.') +
    ' تخصم 10 نقاط من نقاط فوزك.';
  renderBoard();
}
function showBoardResult() {
  const s = state;
  if (
    !s?.done ||
    !['ttt', 'connect'].includes(screen) ||
    s.reported ||
    advancedBlocked(s) ||
    !boardSeriesOver(s)
  )
    return;
  s.reported = true;
  if (s.series?.limit > 1) {
    const [a, b] = s.series.wins;
    s.winner = a === b ? 0 : a > b ? 1 : 2;
    s.points = s.bot
      ? s.series.points[0]
      : s.winner
        ? s.series.points[s.winner - 1]
        : s.series.points[0];
  }
  result(
    s.id,
    s.winner === 0 ? 'تعادل جميل!' : esc(s.names[s.winner - 1]) + ' فاز!',
    s.series?.limit > 1
      ? `حصيلة المباراة ${s.series.wins.join(' : ')}؛ ${s.series.draws} تعادل. مجموع النقاط محفوظ لكل لاعب.`
      : s.bot && s.winner === 2
        ? 'جرّب خطة ثانية أو خفّف قوة الخصم.'
        : `بعد ${s.moves} حركة.`,
    s.points,
  );
}

function boardSeriesOver(s = state) {
  return (
    !s.series ||
    s.series.round >= s.series.limit ||
    s.series.wins.some((wins) => wins > s.series.limit / 2)
  );
}
function boardMatchHTML(s) {
  const match = s.series;
  return `${match?.limit > 1 ? `<div class="match-score" role="status"><b>الجولة ${match.round} / ${match.limit}</b><span>${esc(s.names[0])} ${match.wins[0]} : ${match.wins[1]} ${esc(s.names[1])}</span><small>البداية تتناوب؛ الفوز بأغلبية الجولات يحسم المباراة.</small></div>` : ''}${s.done ? `<details class="history"><summary>راجع الحركات والتكتيك</summary><p class="note">اختر حركة لترى اللوحة قبلها. لا يمكن تغيير النتيجة المسجلة.</p><div class="review-moves">${s.history.map((h, i) => `<button onclick="reviewBoardMove(${i})" aria-pressed="${s.replayIndex === i}">${i + 1}. ${esc(s.names[h.turn])} · ${s.id === 'ttt' ? 'خانة' : 'عمود'} ${h.pos + 1}${h.note ? ' ✓' : ''}</button>`).join('')}<button onclick="reviewBoardMove(-1)">اللوحة النهائية</button></div>${Number.isInteger(s.replayIndex) ? `<p class="hintpanel">قبل الحركة ${s.replayIndex + 1}: ${esc(s.history[s.replayIndex]?.note || 'حركة بناء؛ راقب خطوط الخصم قبل اختيار خطك.')}</p>` : ''}</details>` : ''}`;
}
function reviewBoardMove(index) {
  const s = state;
  if (
    !['ttt', 'connect'].includes(screen) ||
    !s.done ||
    advancedBlocked(s) ||
    !Number.isInteger(index) ||
    index < -1 ||
    index >= s.history.length
  )
    return;
  if (index === -1) delete s.replayIndex;
  else s.replayIndex = index;
  renderBoard();
  $('app').querySelector('.history')?.setAttribute('open', '');
}
function nextBoardRound() {
  const s = state;
  if (!['ttt', 'connect'].includes(screen) || !s.done || advancedBlocked(s) || boardSeriesOver(s))
    return;
  clearTimers();
  s.series.round++;
  s.roundStarter = 1 - s.roundStarter;
  Object.assign(s, {
    done: false,
    resultShown: false,
    roundRecorded: false,
    reported: false,
    turn: s.roundStarter,
    board: Array(s.id === 'ttt' ? 9 : 42).fill(0),
    moves: 0,
    waiting: false,
    winline: [],
    history: [],
    coachMessage: '',
    coachHints: [0, 0],
  });
  delete s.replayIndex;
  delete s.suggested;
  delete s.lastMove;
  renderBoard();
  if (s.bot && s.turn === 1) scheduleBot();
}

// Every advanced game uses the same input gate and cancellable delayed work.
function advancedBlocked(s = state) {
  return !s || screen !== s.id || s.pausedAt || !$('modalback')?.hidden || !!$('pausecover');
}
function advancedLater(s, callback, delay = 0) {
  let remaining = Math.max(0, delay),
    last = Date.now();
  function tick() {
    if (state !== s || s.done || screen !== s.id) return;
    const now = Date.now();
    if (!advancedBlocked(s)) remaining -= now - last;
    last = now;
    if (remaining <= 0 && !advancedBlocked(s)) callback();
    else later(tick, Math.min(80, Math.max(16, remaining)));
  }
  return later(tick, Math.min(80, Math.max(16, remaining)));
}
function extraOption(id, fallback, min, max) {
  const value = Number($(id)?.value);
  return Number.isFinite(value) && value >= min && value <= max ? Math.floor(value) : fallback;
}
function extraRand(n, s = state) {
  return s?.extraRandom ? Math.floor(s.extraRandom() * n) : randInt(n);
}
function extraElapsed(s = state) {
  return Math.max(0, Math.floor(((s.pausedAt || Date.now()) - s.started) / 1000));
}
function rememberExtraInput(id, key) {
  const input = $(id);
  if (input) state[key] = input.value;
}

function startCode() {
  const s = state;
  s.length = s.fixed ? 4 : extraOption('codelength', 4, 3, 5);
  s.duplicates = !s.fixed && $('repeatdigits')?.value === 'yes';
  s.secret = s.duplicates
    ? Array.from({ length: s.length }, () => gameRand(10))
    : gShuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, s.length);
  s.attempts = [];
  s.max = { easy: 12, normal: 10, hard: 8 }[s.level] || 10;
  s.hints = 0;
  s.revealed = {};
  s.draft = Array.from({ length: s.length }, (_, i) => (s.duplicates ? 0 : i));
  s.analysis = null;
  s.digitNotes = Array(10).fill(0);
  renderCode();
}
function codeFeedback(secret, guess) {
  let exact = 0,
    all = 0;
  const a = Array(10).fill(0),
    b = Array(10).fill(0);
  for (let i = 0; i < secret.length; i++) {
    if (secret[i] === guess[i]) exact++;
    a[secret[i]]++;
    b[guess[i]]++;
  }
  for (let i = 0; i < 10; i++) all += Math.min(a[i], b[i]);
  return { exact, misplaced: all - exact };
}
function readCodeDraft() {
  const s = state;
  s.draft = Array.from({ length: s.length }, (_, i) => Number($('digit' + i)?.value ?? s.draft[i]));
  for (const [i, digit] of Object.entries(s.revealed)) s.draft[Number(i)] = digit;
  const quick = $('codequick');
  if (quick && document.activeElement !== quick) quick.value = s.draft.join('');
  captureSoloSession();
  return s.draft;
}
function enterCodeText(value, explain = false) {
  if (screen !== 'code' || state.done || advancedBlocked()) return false;
  const s = state,
    digits = latin(value).replace(/[\s,،-]/g, '');
  if (!new RegExp(`^[0-9]{${s.length}}$`).test(digits)) {
    if (explain) toast(`اكتب ${s.length} أرقام للشفرة؛ الصفر في البداية مسموح.`);
    return false;
  }
  const draft = Array.from(digits, Number);
  if (Object.entries(s.revealed).some(([i, n]) => draft[Number(i)] !== n)) {
    if (explain) toast('احتفظ بالرقم الصحيح في الخانات المكشوفة.');
    return false;
  }
  s.draft = draft;
  draft.forEach((n, i) => {
    if ($('digit' + i)) $('digit' + i).value = String(n);
  });
  captureSoloSession();
  return true;
}
function renderCode(msg = '') {
  const s = state;
  s.digitNotes ??= Array(10).fill(0);
  const last = s.attempts.at(-1);
  setHTML(
    wrap(
      'code',
      smallStats([
        ['المحاولات', s.attempts.length + ' / ' + s.max],
        ['الخانات', s.length],
        ['المساعدة', s.hints],
      ]) +
        `<section class="panel advanced-code"><div class="spot"><small>افتح الخزنة · ${s.duplicates ? 'الأرقام قد تتكرر' : 'كل رقم مختلف'}</small><div class="huge" dir="ltr">${s.secret.map((v, i) => (i in s.revealed ? v : '●')).join(' ')}</div></div><p class="hintpanel code-response" role="status">${esc(msg || (last ? `المحاولة ${s.attempts.length}: ${last.exact} رقم في مكانه الصحيح، و${last.misplaced} رقم في مكان آخر. بقيت ${s.max - s.attempts.length} محاولات.` : 'الصفر مسموح في أول خانة. اختر الأرقام أو اكتب الشفرة كاملة.'))}</p><form onsubmit="event.preventDefault();submitCode()"><label for="codequick">كتابة الشفرة مباشرة</label><input id="codequick" class="codequick" dir="ltr" inputmode="numeric" enterkeyhint="go" autocomplete="off" maxlength="${s.length}" value="${s.draft.join('')}" oninput="enterCodeText(this.value)" aria-label="الشفرة من ${s.length} أرقام"><div class="codeentry" dir="ltr">${Array.from({ length: s.length }, (_, i) => `<select id="digit${i}" aria-label="الرقم في الخانة ${i + 1}" onchange="readCodeDraft()" ${i in s.revealed ? 'disabled' : ''}>${Array.from({ length: 10 }, (_, n) => `<option value="${n}" ${s.draft[i] === n ? 'selected' : ''}>${n}</option>`).join('')}</select>`).join('')}</div><div class="actions"><button class="primary" type="submit">جرّب الشفرة</button><button type="button" onclick="codeHint()" ${Object.keys(s.revealed).length >= s.length - 1 ? 'disabled' : ''}>💡 اكشف خانة −15</button><button type="button" onclick="analyzeCode()">🔎 حلّل المحاولات</button><button type="button" onclick="suggestCode()">🧠 اقترح احتمالًا</button><button type="button" onclick="inspectCodeDraft()">✓ اختبر منطق التخمين</button></div></form>${s.analysis !== null ? `<div class="hintpanel">${s.analysis} شفرة تطابق جميع التلميحات المتاحة.${s.analysisData ? `<details><summary>الأرقام الممكنة في كل خانة</summary>${s.analysisData.possible.map((a, i) => `<p>الخانة ${i + 1}: <bdi>${a.join('، ') || 'لا يوجد'}</bdi></p>`).join('')}</details>` : ''}<p class="tiny">التحليل والاقتراح مجانيان ويستنتجان من المحاولات والخانات المكشوفة فقط.</p></div>` : ''}${codeNotebookHTML(s)}<div class="legend"><span>✓ الرقم والمكان صحيحان</span><span>↔ الرقم صحيح في مكان آخر</span></div><div class="codehistory">${s.attempts.map((v, i) => `<div class="codeline"><small>${i + 1}</small><span class="digits" dir="ltr">${v.guess.join('')}</span><span class="feedback" aria-label="${v.exact} في المكان الصحيح و${v.misplaced} في مكان آخر"><span class="code-exact">✓ ${v.exact}</span> &nbsp; <span class="code-misplaced">↔ ${v.misplaced}</span></span></div>`).join('')}</div><p class="tiny">كل رقم يحسب مرة واحدة؛ مجموع العلامتين هو عدد الأرقام المشتركة.</p><div class="actions"><button class="quiet" onclick="giveUpCode()">أنهي الجولة واكشف الشفرة</button></div></section>`,
    ),
  );
}
function submitCode() {
  if (screen !== 'code' || state.done || advancedBlocked()) return;
  const s = state,
    quick = $('codequick');
  if (quick && quick.value !== s.draft.join('') && !enterCodeText(quick.value, true)) return;
  const g = readCodeDraft();
  if (g.some((v) => !Number.isInteger(v) || v < 0 || v > 9))
    return toast('اختر رقماً من 0 إلى 9 لكل خانة.');
  if (!s.duplicates && new Set(g).size < s.length)
    return toast('الأرقام يجب أن تختلف في هذه الجولة.');
  if (s.attempts.some((v) => v.guess.join('') === g.join('')))
    return toast('جرّبت هذه الشفرة من قبل.');
  const f = codeFeedback(s.secret, g);
  s.attempts.push({ guess: [...g], ...f });
  s.analysis = null;
  if (f.exact === s.length)
    return finishExtra(
      'الخزنة انفتحت! 🔐',
      `وصلت للشفرة في ${s.attempts.length} محاولات، مع ${s.hints} تلميحات.`,
      Math.max(10, 110 - s.attempts.length * 10 - s.hints * 15),
      s.secret.join(''),
    );
  if (s.attempts.length >= s.max)
    return finishExtra(
      'انكشفت الشفرة',
      'انتهت المحاولات. راجع التلميحات وجرّب جولة جديدة.',
      0,
      s.secret.join(''),
    );
  tone();
  s.analysisData = codeCandidates(s.length, s.duplicates, s.attempts, s.revealed, 120);
  s.analysis = s.analysisData.count;
  renderCode();
  $('app').querySelector('.code-response')?.scrollIntoView({ block: 'nearest' });
}
function codeNotebookHTML(s) {
  const total = s.duplicates
    ? 10 ** s.length
    : Array.from({ length: s.length }, (_, i) => 10 - i).reduce((a, b) => a * b, 1);
  return `<details class="history"><summary>دفتر أدلة الأرقام${s.analysis !== null ? ` · استبعدت ${Math.round((1 - s.analysis / total) * 100)}% من الاحتمالات` : ''}</summary><p class="note">اضغط الرقم لتبدّل ملاحظتك: غير معروف ← موجود ← مستبعد. هذا دفتر يدوي؛ لا يكشف الشفرة ولا يغيّر التخمينات.</p><div class="digit-notebook" dir="ltr">${s.digitNotes.map((flag, n) => `<button onclick="markCodeDigit(${n})" class="${flag === 1 ? 'correct' : flag === 2 ? 'wrong' : ''}" aria-label="الرقم ${n}: ${['غير معروف', 'أعتقد أنه موجود', 'أعتقد أنه مستبعد'][flag]}">${n}<small>${['؟', '✓', '✕'][flag]}</small></button>`).join('')}</div></details>`;
}
function markCodeDigit(n) {
  if (
    screen !== 'code' ||
    state.done ||
    advancedBlocked() ||
    !Number.isInteger(n) ||
    n < 0 ||
    n > 9
  )
    return;
  readCodeDraft();
  state.digitNotes ??= Array(10).fill(0);
  state.digitNotes[n] = (state.digitNotes[n] + 1) % 3;
  renderCode();
  $('app').querySelector('.history')?.setAttribute('open', '');
}
function inspectCodeDraft() {
  if (screen !== 'code' || state.done || advancedBlocked()) return;
  const s = state;
  if ($('codequick')?.value !== s.draft.join('') && !enterCodeText($('codequick').value, true))
    return;
  const draft = readCodeDraft();
  if (!s.duplicates && new Set(draft).size !== s.length)
    return renderCode('هذا التخمين يكرر أرقاماً، والجولة لا تسمح بالتكرار. لم تُستهلك محاولة.');
  const conflicts = s.attempts.flatMap((a, i) => {
    const f = codeFeedback(draft, a.guess);
    return f.exact !== a.exact || f.misplaced !== a.misplaced ? [i + 1] : [];
  });
  renderCode(
    conflicts.length
      ? `هذا التخمين لا يمكن أن يكون الشفرة: يتعارض مع دليل المحاولة ${conflicts.join('، ')}. يمكنك تجربة ترتيب آخر؛ لم تُستهلك محاولة.`
      : 'التخمين يطابق كل الأدلة المتاحة. هذا لا يضمن أنه الصحيح؛ أرسله عندما تكون جاهزاً. لم تُستهلك محاولة.',
  );
}
function codeHint() {
  if (screen !== 'code' || state.done || advancedBlocked()) return;
  const s = state;
  readCodeDraft();
  const i = s.secret.findIndex((_, k) => !(k in s.revealed));
  if (i < 0 || Object.keys(s.revealed).length >= s.length - 1) return;
  s.hints++;
  s.revealed[i] = s.secret[i];
  s.draft[i] = s.secret[i];
  if (!s.duplicates) {
    const used = new Set(Object.values(s.revealed));
    for (let k = 0; k < s.length; k++) {
      if (k in s.revealed) continue;
      if (used.has(s.draft[k]))
        s.draft[k] = Array.from({ length: 10 }, (_, n) => n).find((n) => !used.has(n));
      used.add(s.draft[k]);
    }
  }
  s.analysis = null;
  renderCode('كشفنا خانة واحدة. التلميح يخصم 15 نقطة من النتيجة.');
}
function analyzeCode() {
  if (screen !== 'code' || state.done || advancedBlocked()) return;
  const s = state;
  readCodeDraft();
  s.analysisData = codeCandidates(s.length, s.duplicates, s.attempts, s.revealed, 120);
  s.analysis = s.analysisData.count;
  renderCode();
}
function suggestCode() {
  if (screen !== 'code' || state.done || advancedBlocked()) return;
  const s = state;
  readCodeDraft();
  const data = codeCandidates(s.length, s.duplicates, s.attempts, s.revealed, 120);
  s.analysisData = data;
  s.analysis = data.count;
  const suggestion = codeSuggestion(data.samples, s.attempts);
  if (!suggestion) return renderCode('لا توجد شفرة جديدة متوافقة مع هذه المحاولات.');
  s.draft = [...suggestion];
  renderCode(
    data.count === 1
      ? 'بقي احتمال واحد فقط. وضعناه في الخانات؛ أرسل التخمين عندما تكون جاهزًا.'
      : 'وضعنا احتمالًا متوافقًا يفرّق بين نتائج كثيرة في عينة الاحتمالات. لا يستهلك محاولة حتى ترسله.',
  );
}
function codeSuggestion(samples = [], attempts = []) {
  const used = new Set(attempts.map((a) => a.guess.join(''))),
    options = samples.filter((a) => !used.has(a.join('')));
  let best = null,
    score = Infinity;
  for (const candidate of options.slice(0, 40)) {
    const groups = new Map();
    for (const secret of samples) {
      const f = codeFeedback(secret, candidate),
        key = `${f.exact}:${f.misplaced}`;
      groups.set(key, (groups.get(key) || 0) + 1);
    }
    const value = [...groups.values()].reduce((sum, n) => sum + n * n, 0);
    if (value < score) {
      score = value;
      best = candidate;
    }
  }
  return best ? [...best] : null;
}
function codeCandidates(length, duplicates, attempts, revealed = {}, sampleLimit = 0) {
  const possible = Array.from({ length }, () => new Set()),
    digits = Array(10).fill(0),
    guess = Array(length),
    samples = [],
    constraints = attempts.map((a) => {
      const counts = Array(10).fill(0);
      a.guess.forEach((n) => counts[n]++);
      return { ...a, counts, common: a.exact + a.misplaced };
    });
  let count = 0;
  function visit(depth) {
    // Reject impossible prefixes early instead of allocating 100,000 candidate arrays.
    for (const a of constraints) {
      let exact = 0,
        common = 0;
      for (let i = 0; i < depth; i++) if (guess[i] === a.guess[i]) exact++;
      for (let i = 0; i < 10; i++) common += Math.min(digits[i], a.counts[i]);
      const remaining = length - depth;
      if (
        exact > a.exact ||
        exact + remaining < a.exact ||
        common > a.common ||
        common + remaining < a.common
      )
        return;
    }
    if (depth === length) {
      count++;
      guess.forEach((n, i) => possible[i].add(n));
      if (sampleLimit > 0) {
        // A deterministic reservoir keeps the sample spread across the search,
        // without reading the secret or changing the game's random generator.
        if (samples.length < sampleLimit) samples.push([...guess]);
        else {
          const index = (Math.imul(count, 2654435761) >>> 0) % count;
          if (index < sampleLimit) samples[index] = [...guess];
        }
      }
      return;
    }
    const choices = depth in revealed ? [revealed[depth]] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (const digit of choices) {
      if (!duplicates && digits[digit]) continue;
      guess[depth] = digit;
      digits[digit]++;
      visit(depth + 1);
      digits[digit]--;
    }
  }
  visit(0);
  return {
    count,
    possible: possible.map((a) => [...a].sort((a, b) => a - b)),
    ...(sampleLimit > 0 ? { samples } : {}),
  };
}
function giveUpCode() {
  if (screen !== 'code' || state.done || advancedBlocked()) return;
  finishExtra('الشفرة كانت…', 'تستطيع إعادة التحدي بشفرة جديدة.', 0, state.secret.join(''));
}

const padColors = ['#80ebca', '#fdc978', '#a5c9ff', '#e3a8d8'];
const padNames = ['أخضر', 'أصفر', 'أزرق', 'وردي'];
function startSimon() {
  const s = state;
  s.input = 0;
  s.mode = s.fixed ? 'forward' : $('simonmode')?.value === 'reverse' ? 'reverse' : 'forward';
  s.phase = 'idle';
  s.completed = 0;
  s.speed = { easy: 700, normal: 510, hard: 350 }[s.level] || 510;
  s.playToken = 0;
  s.replays = 0;
  s.lives = s.level === 'easy' ? 2 : 1;
  s.mistakes = 0;
  s.message = '';
  s.sequenceBank = Array.from({ length: 15 }, () => gameRand(4));
  s.sequence = [s.sequenceBank[0]];
  s.onPause = () => {
    if (['show', 'between'].includes(s.phase)) {
      s.playToken++;
      s.phase = 'idle';
      s.input = 0;
      renderSimon();
    }
  };
  s.onResume = () => renderSimon();
  renderSimon();
}
function simonExpected(s = state) {
  return s.mode === 'reverse' ? [...s.sequence].reverse() : s.sequence;
}
function padTone(i) {
  if (!store.sound) return;
  try {
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.resume();
    const o = audioCtx.createOscillator(),
      g = audioCtx.createGain();
    o.connect(g);
    g.connect(audioCtx.destination);
    o.frequency.value = [262, 330, 392, 523][i];
    g.gain.setValueAtTime(0.06, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
    o.start();
    o.stop(audioCtx.currentTime + 0.26);
  } catch (e) {}
}
function renderSimon() {
  const s = state;
  setHTML(
    wrap(
      'simon',
      smallStats([
        ['المرحلة', s.sequence.length + ' / 15'],
        ['النجاحات', s.completed],
        ['خطوتك', s.input + ' / ' + s.sequence.length],
      ]) +
        `<section class="panel"><div class="turnmark" id="seqstatus" role="status">${s.phase === 'input' ? (s.mode === 'reverse' ? 'دورك: كرر الترتيب من الأخير إلى الأول' : 'دورك: كرر نفس الترتيب') : s.phase === 'show' ? 'راقب الأضواء…' : 'جاهز للتسلسل؟'}</div><div class="sequencepad">${padColors.map((c, i) => `<button id="pad${i}" style="--pad:${c}" onclick="simonTap(${i})" ${s.phase !== 'input' ? 'disabled' : ''} aria-label="${['أخضر', 'أصفر', 'أزرق', 'وردي'][i]} رقم ${i + 1}">${['●', '▲', '■', '◆'][i]}<small>${i + 1}</small></button>`).join('')}</div><div id="seqtrace" class="sequence-trace" dir="ltr" aria-label="خطواتك الصحيحة">${
          s.input > 0
            ? `${simonExpected(s)
                .slice(0, Math.min(s.input, s.sequence.length))
                .map(
                  (v) =>
                    `<span style="--pad:${padColors[v]}">${['●', '▲', '■', '◆'][v]} ${v + 1}</span>`,
                )
                .join('')}`
            : ''
        }</div>${s.message ? `<p class="hintpanel" role="status">${esc(s.message)}</p>` : ''}<div class="actions"><button class="primary" onclick="playSimon()" ${['show', 'input'].includes(s.phase) ? 'disabled' : ''}>اعرض التسلسل</button><button onclick="replaySimon()" ${s.phase !== 'input' || s.input !== 0 ? 'disabled' : ''}>↻ إعادة العرض −5</button><button onclick="endSimon()">أنهي التحدي</button></div><p class="note center">${s.mode === 'reverse' ? 'التحدي العكسي: شاهد من البداية، ثم أجب من النهاية. ' : ''}رمز وصوت لكل لون. استخدم الأرقام 1–4؛ لا يوجد حد زمني لإجابتك. إعادة العرض ${s.replays} مرة.${s.level === 'easy' ? ` في التدريب عندك ${s.lives} فرصة؛ الفرصة الثانية تخصم 10 نقاط.` : ''}</p></section>`,
    ),
  );
}
function playSimon() {
  if (
    screen !== 'simon' ||
    state.done ||
    advancedBlocked() ||
    !['idle', 'between'].includes(state.phase)
  )
    return;
  const s = state,
    token = ++s.playToken;
  s.phase = 'show';
  s.input = 0;
  renderSimon();
  function showStep(i) {
    if (s.playToken !== token || s.phase !== 'show') return;
    if (i >= s.sequence.length) {
      s.phase = 'input';
      renderSimon();
      return;
    }
    const v = s.sequence[i],
      pad = $('pad' + v);
    if ($('seqstatus'))
      $('seqstatus').textContent =
        `شاهد الخطوة ${i + 1} من ${s.sequence.length}: ${padNames[v]}، الزر ${v + 1}.`;
    pad?.classList.add('lit');
    padTone(v);
    advancedLater(
      s,
      () => {
        if (s.playToken !== token) return;
        $('pad' + v)?.classList.remove('lit');
        advancedLater(s, () => showStep(i + 1), 220);
      },
      s.speed,
    );
  }
  advancedLater(s, () => showStep(0), 350);
}
function replaySimon() {
  if (
    screen !== 'simon' ||
    state.done ||
    advancedBlocked() ||
    state.phase !== 'input' ||
    state.input !== 0
  )
    return;
  state.replays++;
  state.phase = 'idle';
  playSimon();
}
function simonTap(i) {
  if (
    screen !== 'simon' ||
    state.done ||
    advancedBlocked() ||
    state.phase !== 'input' ||
    !Number.isInteger(i) ||
    i < 0 ||
    i > 3
  )
    return;
  const s = state;
  padTone(i);
  const pad = $('pad' + i);
  pad?.classList.add('lit');
  later(() => pad?.classList.remove('lit'), 180);
  if (simonExpected(s)[s.input] !== i) {
    s.mistakes++;
    if (s.lives > 1) {
      s.lives--;
      s.message = `الخطوة ${s.input + 1} كانت ${padNames[simonExpected(s)[s.input]]} (${simonExpected(s)[s.input] + 1}). جرّب نفس التسلسل من البداية؛ خصم 10 نقاط.`;
      s.input = 0;
      s.phase = 'idle';
      renderSimon();
      return;
    }
    return finishExtra(
      'نتيجة التسلسل 🎵',
      `أكملت ${s.completed} مراحل. الخطوة المطلوبة كانت ${padNames[simonExpected(s)[s.input]]} (${simonExpected(s)[s.input] + 1}).`,
      Math.max(
        0,
        Math.min(100, s.completed * 7) - s.replays * 5 - Math.max(0, s.mistakes - 1) * 10,
      ),
      s.sequence.map((n) => n + 1).join(' ← '),
    );
  }
  s.message = '';
  s.input++;
  if ($('seqtrace'))
    $('seqtrace').innerHTML = simonExpected(s)
      .slice(0, s.input)
      .map((v) => `<span style="--pad:${padColors[v]}">${['●', '▲', '■', '◆'][v]} ${v + 1}</span>`)
      .join('');
  if (s.input === s.sequence.length) {
    s.completed++;
    if (s.completed === 15)
      return finishExtra(
        'ذاكرتك ممتازة! 🎵',
        'كررت 15 مرحلة كاملة.',
        Math.max(10, 100 - s.replays * 5 - s.mistakes * 10),
      );
    s.phase = 'between';
    s.sequence.push(s.sequenceBank[s.completed]);
    $('seqstatus').textContent = 'صحيح! نجهز المرحلة التالية…';
    advancedLater(
      s,
      () => {
        if (s.phase === 'between') {
          renderSimon();
          playSimon();
        }
      },
      600,
    );
  } else {
    const stat = $('app').querySelectorAll('.stats .stat b');
    if (stat[2]) stat[2].textContent = s.input + ' / ' + s.sequence.length;
    if ($('seqstatus'))
      $('seqstatus').textContent =
        `✓ صحيح. أكملت ${s.input} من ${s.sequence.length} خطوات؛ أكمل الترتيب.`;
  }
}
function endSimon() {
  if (screen !== 'simon' || state.done || advancedBlocked()) return;
  finishExtra(
    'نتيجة التسلسل',
    `أكملت ${state.completed} مراحل مع ${state.replays} إعادات.`,
    Math.max(0, Math.min(100, state.completed * 7) - state.replays * 5 - state.mistakes * 10),
  );
}

function startSlide() {
  const s = state;
  s.size = extraOption('size', 3, 3, 5);
  s.board = Array.from({ length: s.size * s.size }, (_, i) => (i + 1) % (s.size * s.size));
  s.empty = s.board.length - 1;
  s.moves = 0;
  s.path = [];
  s.history = [];
  s.started = Date.now();
  s.assisted = false;
  s.hints = 0;
  const count = { easy: 18, normal: 50, hard: 110 }[s.level] || 50;
  let previous = -1;
  for (let k = 0; k < count * (s.size - 2); k++) {
    const options = slideNeighbors(s.empty, s.size).filter((i) => i !== previous),
      i = options[gameRand(options.length)];
    s.path.push(s.empty);
    [s.board[i], s.board[s.empty]] = [s.board[s.empty], s.board[i]];
    previous = s.empty;
    s.empty = i;
  }
  if (slideSolved(s.board)) {
    const i = slideNeighbors(s.empty, s.size)[0];
    s.path.push(s.empty);
    [s.board[i], s.board[s.empty]] = [s.board[s.empty], s.board[i]];
    s.empty = i;
  }
  s.initial = { board: [...s.board], empty: s.empty, path: [...s.path] };
  renderSlide();
}
function slideNeighbors(i, n) {
  const r = Math.floor(i / n),
    c = i % n;
  return [
    r > 0 ? i - n : -1,
    r < n - 1 ? i + n : -1,
    c > 0 ? i - 1 : -1,
    c < n - 1 ? i + 1 : -1,
  ].filter((v) => v >= 0);
}
function slideSolved(b) {
  return b.every((v, i) => v === (i + 1) % b.length);
}
function slideDistance(b, n) {
  return b.reduce(
    (sum, v, i) =>
      v
        ? sum +
          Math.abs(Math.floor(i / n) - Math.floor((v - 1) / n)) +
          Math.abs((i % n) - ((v - 1) % n))
        : sum,
    0,
  );
}
function solveSlide(board, size = 3, nodeLimit = 35000) {
  if (
    size !== 3 ||
    board.length !== 9 ||
    new Set(board).size !== 9 ||
    board.some((n) => !Number.isInteger(n) || n < 0 || n > 8)
  )
    return null;
  if (slideSolved(board)) return [];
  // A* finds a shortest route for 3×3 boards. Larger boards retain the guaranteed
  // shuffle route, so a hint remains available without a long UI-blocking search.
  const heap = [],
    costs = new Map(),
    goal = '1,2,3,4,5,6,7,8,0';
  let order = 0;
  const less = (a, b) =>
    a.f < b.f || (a.f === b.f && (a.h < b.h || (a.h === b.h && a.order < b.order)));
  function push(node) {
    let i = heap.length;
    heap.push(node);
    while (i) {
      const p = (i - 1) >> 1;
      if (!less(heap[i], heap[p])) break;
      [heap[i], heap[p]] = [heap[p], heap[i]];
      i = p;
    }
  }
  function pop() {
    const node = heap[0],
      tail = heap.pop();
    if (heap.length) {
      heap[0] = tail;
      let i = 0;
      while (true) {
        const l = i * 2 + 1,
          r = l + 1;
        let j = i;
        if (l < heap.length && less(heap[l], heap[j])) j = l;
        if (r < heap.length && less(heap[r], heap[j])) j = r;
        if (j === i) break;
        [heap[i], heap[j]] = [heap[j], heap[i]];
        i = j;
      }
    }
    return node;
  }
  const key = board.join(','),
    h = slideDistance(board, size);
  costs.set(key, 0);
  push({
    board: [...board],
    empty: board.indexOf(0),
    key,
    g: 0,
    h,
    f: h,
    parent: null,
    order: order++,
  });
  let visited = 0;
  while (heap.length && visited++ < nodeLimit) {
    const node = pop();
    if (costs.get(node.key) !== node.g) continue;
    if (node.key === goal) {
      const path = [];
      for (let n = node; n.parent; n = n.parent) path.push(n.empty);
      return path.reverse();
    }
    for (const i of slideNeighbors(node.empty, size)) {
      if (node.parent && i === node.parent.empty) continue;
      const next = [...node.board];
      [next[i], next[node.empty]] = [next[node.empty], next[i]];
      const k = next.join(','),
        g = node.g + 1;
      if (costs.has(k) && costs.get(k) <= g) continue;
      costs.set(k, g);
      const h = slideDistance(next, size);
      push({ board: next, empty: i, key: k, g, h, f: g + h, parent: node, order: order++ });
    }
  }
  return null;
}
function slideReachable(i, s = state) {
  if (!s.board?.[i] || !Number.isInteger(i)) return false;
  return (
    slideNeighbors(s.empty, s.size).includes(i) ||
    (s.lineMode &&
      (Math.floor(i / s.size) === Math.floor(s.empty / s.size) || i % s.size === s.empty % s.size))
  );
}
function toggleSlideLine() {
  if (screen !== 'slide' || state.done || advancedBlocked()) return;
  state.lineMode = !state.lineMode;
  renderSlide(
    state.lineMode
      ? 'الآن يمكنك دفع صف أو عمود كامل نحو الفراغ بنقرة واحدة؛ كل قطعة تتحرك تُحسب حركة.'
      : 'عدنا إلى تحريك قطعة واحدة بجانب الفراغ.',
  );
}
function renderSlide(msg = '') {
  const s = state,
    correct = s.board.filter((v, i) => v && v === i + 1).length;
  const focused = document.activeElement?.closest?.('[data-slide-pos]');
  if (focused) s.slideFocus = Number(focused.dataset.slidePos);
  setHTML(
    wrap(
      'slide',
      smallStats([
        ['الحركات', s.moves],
        ['في مكانها', correct + ' / ' + (s.board.length - 1)],
        ['مسافة القطع', slideDistance(s.board, s.size)],
      ]) +
        `<section class="panel"><div class="puzzle" dir="ltr" style="grid-template-columns:repeat(${s.size},1fr)">${s.board.map((v, i) => `<button data-slide-pos="${i}" class="${v === 0 ? 'empty' : v === i + 1 ? 'correct' : ''}" onclick="slideMove(${i})" ${!v || !slideReachable(i, s) ? 'disabled' : ''} aria-label="${v ? 'القطعة ' + v + (slideReachable(i, s) ? ' قابلة للتحريك' : ' بعيدة عن الفراغ') : 'الخانة الفارغة'}">${v || ''}</button>`).join('')}</div><p class="note center" role="status">${esc(msg || 'اضغط قطعة بجانب الفراغ، أو اسحب على اللوحة أو استخدم الأسهم لتحريك الفراغ. الترتيب من اليسار إلى اليمين.')}</p><div class="actions"><button onclick="toggleSlideLine()" aria-pressed="${!!s.lineMode}">${s.lineMode ? 'دفع الصف: مفعّل' : 'فعّل دفع الصف والعمود'}</button><button onclick="undoSlide()" ${s.history.length ? '' : 'disabled'}>↶ تراجع</button><button onclick="slideHint()">💡 خطوة نحو الحل</button><button onclick="restartSlide()">↻ نفس اللوحة</button><button class="quiet" onclick="setup('slide')">لوحة جديدة</button></div><p class="tiny center" style="margin-top:12px">لوحة 3×3 تستخدم أقصر مسار للحل متى اكتمل البحث؛ اللوحات الأكبر تتبع مساراً مضموناً وقد ترجع حركة قمت بها. أقصى نتيجة مع المساعدة 50 نقطة. استخدمت ${s.hints} خطوات مساعدة · ${extraElapsed(s)} ثانية.</p></section>`,
    ),
  );
  if (Number.isInteger(s.slideFocus)) {
    const target =
      $('app').querySelector(`[data-slide-pos="${s.slideFocus}"]:not(:disabled)`) ||
      $('app').querySelector('[data-slide-pos]:not(:disabled)');
    target?.focus({ preventScroll: true });
  }
}
function slideMove(i, assist = false) {
  const s = state;
  if (screen !== 'slide' || s.done || advancedBlocked() || !slideReachable(i, s)) return;
  if (!assist && s.lineMode && !slideNeighbors(s.empty, s.size).includes(i)) {
    const step =
        Math.floor(i / s.size) === Math.floor(s.empty / s.size)
          ? Math.sign(i - s.empty)
          : Math.sign(i - s.empty) * s.size,
      before = { board: [...s.board], empty: s.empty, path: [...s.path], moves: s.moves },
      base = s.history.length;
    while (s.empty !== i && !s.done) slideMove(s.empty + step, true);
    const moved = s.moves - before.moves;
    s.history.splice(base, s.history.length - base, { bulk: before });
    if (!s.done) renderSlide(`دفعت ${moved} قطع نحو الفراغ. التراجع يعيد الدفعة كاملة.`);
    return;
  }
  if (
    screen !== 'slide' ||
    s.done ||
    advancedBlocked() ||
    !Number.isInteger(i) ||
    !slideNeighbors(s.empty, s.size).includes(i)
  )
    return;
  s.history.push({ i, empty: s.empty, path: [...s.path] });
  const followsPlan = s.planBoard === s.board.join(',') && s.plan?.[0] === i;
  if (s.path.at(-1) === i) s.path.pop();
  else s.path.push(s.empty);
  [s.board[i], s.board[s.empty]] = [s.board[s.empty], s.board[i]];
  s.empty = i;
  if (followsPlan) {
    s.plan.shift();
    s.planBoard = s.board.join(',');
  } else {
    delete s.plan;
    delete s.planBoard;
  }
  s.moves++;
  tone();
  if (slideSolved(s.board))
    return finishExtra(
      'ترتبت اللوحة! 🔲',
      `${s.moves} حركة خلال ${extraElapsed(s)} ثانية، مع ${s.hints} خطوات مساعدة.`,
      s.assisted ? 50 : Math.max(20, 100 - Math.floor(s.moves / 3)),
    );
  renderSlide(
    assist
      ? followsPlan
        ? `هذه خطوة على أقصر مسار للحل. باقي ${s.plan.length} حركات.`
        : 'هذه خطوة على المسار المضمون للحل.'
      : '',
  );
}
function undoSlide() {
  const s = state;
  if (screen !== 'slide' || s.done || advancedBlocked() || !s.history.length) return;
  const h = s.history.pop();
  if (h.bulk) {
    Object.assign(s, {
      board: h.bulk.board,
      empty: h.bulk.empty,
      path: h.bulk.path,
      moves: h.bulk.moves,
    });
    delete s.plan;
    delete s.planBoard;
    return renderSlide('تراجعت عن دفعة الصف أو العمود بالكامل.');
  }
  [s.board[h.empty], s.board[h.i]] = [s.board[h.i], s.board[h.empty]];
  s.empty = h.empty;
  s.path = h.path;
  s.moves = Math.max(0, s.moves - 1);
  delete s.plan;
  delete s.planBoard;
  renderSlide('تراجعت عن آخر حركة.');
}
function restartSlide() {
  const s = state;
  if (screen !== 'slide' || s.done || advancedBlocked()) return;
  s.board = [...s.initial.board];
  s.empty = s.initial.empty;
  s.path = [...s.initial.path];
  s.moves = 0;
  s.history = [];
  s.started = Date.now();
  delete s.plan;
  delete s.planBoard;
  renderSlide('عدنا إلى نفس اللوحة. المساعدات السابقة تبقى محسوبة.');
}
function slideHint() {
  if (screen !== 'slide' || state.done || advancedBlocked() || !state.path.length) return;
  const s = state;
  if (s.size === 3 && (s.planBoard !== s.board.join(',') || !s.plan?.length)) {
    s.plan = solveSlide(s.board, s.size);
    s.planBoard = s.board.join(',');
  }
  s.assisted = true;
  s.hints++;
  slideMove(s.plan?.[0] ?? s.path.at(-1), true);
}

function sudokuCandidates(b, i) {
  if (b[i]) return [];
  const r = Math.floor(i / 9),
    c = i % 9,
    used = new Set();
  for (let k = 0; k < 9; k++) {
    used.add(b[r * 9 + k]);
    used.add(b[k * 9 + c]);
    const rr = Math.floor(r / 3) * 3 + Math.floor(k / 3),
      cc = Math.floor(c / 3) * 3 + (k % 3);
    used.add(b[rr * 9 + cc]);
  }
  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((n) => !used.has(n));
}
function sudokuConflicts(b, i) {
  const n = b[i];
  if (!n) return false;
  const r = Math.floor(i / 9),
    c = i % 9;
  for (let k = 0; k < 81; k++) {
    if (k === i || b[k] !== n) continue;
    const rr = Math.floor(k / 9),
      cc = k % 9;
    if (
      rr === r ||
      cc === c ||
      (Math.floor(rr / 3) === Math.floor(r / 3) && Math.floor(cc / 3) === Math.floor(c / 3))
    )
      return true;
  }
  return false;
}
function sudokuCount(board, cap = 2) {
  if (
    !Array.isArray(board) ||
    board.length !== 81 ||
    board.some((v, i) => !Number.isInteger(v) || v < 0 || v > 9 || sudokuConflicts(board, i))
  )
    return 0;
  let count = 0;
  const b = [...board];
  function solve() {
    if (count >= cap) return;
    let index = -1,
      opts = null;
    for (let i = 0; i < 81; i++)
      if (!b[i]) {
        const c = sudokuCandidates(b, i);
        if (!c.length) return;
        if (!opts || c.length < opts.length) {
          index = i;
          opts = c;
          if (c.length === 1) break;
        }
      }
    if (index < 0) {
      count++;
      return;
    }
    for (const n of opts) {
      b[index] = n;
      solve();
      b[index] = 0;
      if (count >= cap) return;
    }
  }
  solve();
  return count;
}
function generateSudoku(difficulty) {
  const digits = gShuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]),
    groups = [0, 1, 2],
    rows = gShuffle(groups).flatMap((g) => gShuffle(groups).map((r) => g * 3 + r)),
    cols = gShuffle(groups).flatMap((g) => gShuffle(groups).map((c) => g * 3 + c));
  const solution = rows.flatMap((r) =>
      cols.map((c) => digits[(r * 3 + Math.floor(r / 3) + c) % 9]),
    ),
    puzzle = [...solution],
    target = { easy: 38, normal: 46, hard: 53 }[difficulty] || 46;
  let removed = 0;
  for (const i of gShuffle(Array.from({ length: 81 }, (_, i) => i))) {
    if (removed >= target) break;
    const old = puzzle[i];
    puzzle[i] = 0;
    if (sudokuCount(puzzle) === 1) removed++;
    else puzzle[i] = old;
  }
  return { solution, puzzle };
}
function startSudoku() {
  const s = state,
    { solution, puzzle } = generateSudoku(s.level);
  Object.assign(s, {
    solution,
    board: [...puzzle],
    given: puzzle.map(Boolean),
    selected: puzzle.findIndex((v) => !v),
    hints: 0,
    started: Date.now(),
    history: [],
    notes: Array.from({ length: 81 }, () => []),
    noteMode: false,
    showCandidates: false,
    checked: [],
    checks: 0,
  });
  renderSudoku();
}
function renderSudoku(msg = '') {
  const s = state,
    filled = s.board.filter(Boolean).length,
    r = Math.floor(s.selected / 9),
    c = s.selected % 9,
    selected = s.board[s.selected],
    focusedCell = !!document.activeElement?.closest?.('.sudoku');
  const candidates = sudokuCandidates(s.board, s.selected);
  setHTML(
    wrap(
      'sudoku',
      smallStats([
        ['الخانات', filled + ' / 81'],
        ['التلميحات', s.hints],
        ['الوقت', extraElapsed(s) + ' ثانية'],
      ]) +
        `<section class="panel"><div class="sudoku" dir="ltr">${s.board
          .map((v, i) => {
            const rr = Math.floor(i / 9),
              cc = i % 9,
              notes = !v ? (s.showCandidates ? sudokuCandidates(s.board, i) : s.notes[i]) : [];
            return `<button id="sudoku-cell-${i}" tabindex="${i === s.selected ? 0 : -1}" class="${s.given[i] ? 'given' : ''} ${i === s.selected ? 'selected' : rr === r || cc === c || (Math.floor(rr / 3) === Math.floor(r / 3) && Math.floor(cc / 3) === Math.floor(c / 3)) ? 'related' : ''} ${v && v === selected ? 'same-number' : ''} ${cc === 2 || cc === 5 ? 'rightborder' : ''} ${rr === 2 || rr === 5 ? 'bottomborder' : ''} ${sudokuConflicts(s.board, i) ? 'conflict' : ''} ${s.checked.includes(i) ? 'checked-wrong' : ''}" onclick="selectSudoku(${i})" aria-label="صف ${rr + 1} عمود ${cc + 1}: ${v || 'فارغ'}${s.given[i] ? ' ثابت' : ''}${sudokuConflicts(s.board, i) ? ' رقم متكرر' : ''}${s.checked.includes(i) ? ' إدخال غير صحيح' : ''}${notes.length ? ' ملاحظات ' + notes.join('، ') : ''}" aria-pressed="${i === s.selected}">${v || `<span class="sudoku-notes">${Array.from({ length: 9 }, (_, k) => `<span>${notes.includes(k + 1) ? k + 1 : ''}</span>`).join('')}</span>`}</button>`;
          })
          .join(
            '',
          )}</div><p class="tiny center sudoku-position">الخانة المحددة: صف ${r + 1}، عمود ${c + 1}${selected ? ` · الرقم ${selected}` : ''}</p><div class="numberpad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button onclick="putSudoku(${n})" ${s.board.filter((v) => v === n).length >= 9 ? 'class="quiet"' : ''} aria-label="${s.noteMode ? 'ملاحظة' : 'إدخال'} ${n}">${n}</button>`).join('')}</div><div class="actions"><button onclick="toggleSudokuNotes()" class="${s.noteMode ? 'primary note-mode' : ''}" aria-pressed="${s.noteMode}">✎ ملاحظات ${s.noteMode ? 'مفعلة' : 'مقفلة'}</button><button onclick="toggleSudokuCandidates()" aria-pressed="${s.showCandidates}" class="${s.showCandidates ? 'primary' : ''}">الأرقام الممكنة</button><button onclick="fillSudokuNotes()" ${s.given[s.selected] || s.board[s.selected] ? 'disabled' : ''}>✎ ملاحظات الخانة</button><button onclick="fillAllSudokuNotes()">✎ ملاحظات كل الفراغات</button><button onclick="explainSudokuStep()">🧠 شرح خطوة −5</button><button onclick="putSudoku(0)">مسح</button><button onclick="undoSudoku()" ${s.history.length ? '' : 'disabled'}>↶ تراجع</button><button onclick="checkSudoku()">✓ افحص الحل −5</button><button onclick="sudokuHint()">💡 تلميح −10</button></div><p class="note center" role="status">${esc(msg || (s.given[s.selected] ? 'هذه خانة ثابتة. اختر خانة فارغة.' : s.noteMode ? 'وضع الملاحظات: الرقم يضاف كملاحظة صغيرة، واضغطه مرة ثانية لإزالته.' : s.showCandidates ? 'الأرقام الممكنة تعتمد على اللوحة الحالية، وقد تتأثر بأي إدخال خاطئ.' : 'اللون الأحمر يعني تكراراً. استخدم الأسهم والأرقام، وN للملاحظات، وCtrl+Z للتراجع.'))}</p>${s.logical ? `<div class="hintpanel" role="status"><b>صف ${Math.floor(s.logical.i / 9) + 1}، عمود ${(s.logical.i % 9) + 1}</b><p>${esc(s.logical.reason)}</p><button onclick="applySudokuLogic()">طبّق الرقم ${s.logical.n} −10</button><p class="tiny">الشرح استنتاج من اللوحة الحالية؛ تطبيقه يُحسب تلميحاً.</p></div>` : ''}${!s.given[s.selected] && !s.board[s.selected] ? `<p class="tiny center">${s.showCandidates ? 'يمكن إدخال: ' + (candidates.join('، ') || 'لا يوجد رقم ممكن، راجع الخانات المجاورة.') : 'التلميحات تخصم 10 نقاط؛ فحص الإدخالات يخصم 5 نقاط. الملاحظات والأرقام الممكنة مجانية.'}</p>` : ''}</section>`,
    ),
  );
  if (focusedCell) $('sudoku-cell-' + s.selected)?.focus({ preventScroll: true });
}
function selectSudoku(i) {
  if (
    screen !== 'sudoku' ||
    state.done ||
    advancedBlocked() ||
    !Number.isInteger(i) ||
    i < 0 ||
    i >= 81
  )
    return;
  state.selected = i;
  renderSudoku();
}
function fillAllSudokuNotes() {
  const s = state;
  if (screen !== 'sudoku' || s.done || advancedBlocked()) return;
  const notes = s.board.map((v, i) => (v ? [] : sudokuCandidates(s.board, i)));
  if (JSON.stringify(notes) === JSON.stringify(s.notes)) return;
  s.history.push({ bulkNotes: s.notes.map((a) => [...a]), selected: s.selected });
  s.notes = notes;
  renderSudoku(
    'كتبنا ملاحظات كل الفراغات حسب الصف والعمود والمربع. يمكنك التراجع عن العملية كاملة؛ راجع أي إدخال خاطئ أولاً.',
  );
}
function explainSudokuStep() {
  const s = state;
  if (screen !== 'sudoku' || s.done || advancedBlocked()) return;
  if (s.board.some((_, i) => sudokuConflicts(s.board, i)))
    return renderSudoku('صحّح الأرقام المتكررة أولاً حتى يكون الاستنتاج من اللوحة موثوقاً.');
  const step = sudokuDeduction(s.board, s.selected);
  if (!step) {
    delete s.logical;
    return renderSudoku(
      'لا توجد خانة وحيدة أو رقم وحيد في مجموعة حالياً. استخدم الملاحظات أو راجع إدخالاتك؛ لم تُخصم نقاط.',
    );
  }
  const signature = s.board.join('');
  if (s.lastExplainedBoard !== signature) s.checks++;
  s.lastExplainedBoard = signature;
  s.logical = { ...step, signature };
  s.selected = step.i;
  renderSudoku('حددنا خانة يمكن استنتاج رقمها من اللوحة. الشرح −5 نقاط، دون تغيير أي إدخال.');
}
function applySudokuLogic() {
  const s = state;
  if (
    screen !== 'sudoku' ||
    s.done ||
    advancedBlocked() ||
    !s.logical ||
    s.logical.signature !== s.board.join('')
  )
    return;
  const { i, n, reason } = s.logical;
  delete s.logical;
  s.selected = i;
  s.hints++;
  putSudoku(n, true, reason + ' التطبيق −10 نقاط.');
}
function sudokuSnapshot(i) {
  return { i, old: state.board[i], notes: state.notes.map((a) => [...a]) };
}
function putSudoku(n, forced = false, message = '') {
  const s = state;
  if (screen !== 'sudoku' || s.done || advancedBlocked() || !Number.isInteger(n) || n < 0 || n > 9)
    return;
  const i = s.selected;
  if (s.given[i]) return toast('هذه خانة ثابتة. اختر خانة فارغة.');
  if (s.noteMode && !forced && n) {
    if (s.board[i]) return toast('امسح الرقم أولاً قبل إضافة ملاحظات.');
    s.history.push(sudokuSnapshot(i));
    if (s.notes[i].includes(n)) s.notes[i] = s.notes[i].filter((v) => v !== n);
    else s.notes[i] = [...s.notes[i], n].sort();
    renderSudoku();
    return;
  }
  if (s.board[i] === n && (!s.notes[i].length || n)) return;
  s.history.push(sudokuSnapshot(i));
  s.board[i] = n;
  delete s.logical;
  s.notes[i] = [];
  s.checked = [];
  if (n) {
    const r = Math.floor(i / 9),
      c = i % 9;
    for (let k = 0; k < 81; k++) {
      const rr = Math.floor(k / 9),
        cc = k % 9;
      if (
        rr === r ||
        cc === c ||
        (Math.floor(rr / 3) === Math.floor(r / 3) && Math.floor(cc / 3) === Math.floor(c / 3))
      )
        s.notes[k] = s.notes[k].filter((v) => v !== n);
    }
  }
  tone();
  if (s.board.every((v, k) => v === s.solution[k]))
    return finishExtra(
      'حلّيت السودوكو! ✏️',
      `أنهيتها خلال ${extraElapsed(s)} ثانية، مع ${s.hints} تلميحات و${s.checks} فحوصات.`,
      Math.max(10, 100 - s.hints * 10 - s.checks * 5),
    );
  renderSudoku(message);
}
function toggleSudokuNotes() {
  if (screen !== 'sudoku' || state.done || advancedBlocked()) return;
  state.noteMode = !state.noteMode;
  renderSudoku();
}
function toggleSudokuCandidates() {
  if (screen !== 'sudoku' || state.done || advancedBlocked()) return;
  state.showCandidates = !state.showCandidates;
  renderSudoku();
}
function fillSudokuNotes() {
  const s = state;
  if (
    screen !== 'sudoku' ||
    s.done ||
    advancedBlocked() ||
    s.given[s.selected] ||
    s.board[s.selected]
  )
    return;
  const candidates = sudokuCandidates(s.board, s.selected);
  if (s.notes[s.selected].join(',') === candidates.join(',')) return;
  s.history.push(sudokuSnapshot(s.selected));
  s.notes[s.selected] = candidates;
  renderSudoku(
    'كتبنا الأرقام الممكنة لهذه الخانة كملاحظات مجانية حسب اللوحة الحالية. يمكنك التراجع عنها.',
  );
}
function undoSudoku() {
  if (screen !== 'sudoku' || state.done || advancedBlocked() || !state.history.length) return;
  const h = state.history.pop();
  delete state.logical;
  if (h.bulkNotes) {
    state.notes = h.bulkNotes;
    state.selected = h.selected;
    return renderSudoku('تراجعت عن تعبئة ملاحظات كل الفراغات.');
  }
  state.board[h.i] = h.old;
  state.notes = h.notes;
  state.selected = h.i;
  state.checked = [];
  renderSudoku('تراجعت عن آخر إدخال أو ملاحظة.');
}
function checkSudoku() {
  if (screen !== 'sudoku' || state.done || advancedBlocked()) return;
  const s = state;
  const signature = s.board.join('');
  if (signature !== s.lastCheckedBoard) s.checks++;
  s.lastCheckedBoard = signature;
  s.checked = s.board.map((v, i) => (v && v !== s.solution[i] ? i : -1)).filter((i) => i >= 0);
  renderSudoku(
    s.checked.length
      ? `${s.checked.length} خانات غير صحيحة محددة باللون الأحمر.`
      : 'كل الأرقام التي أدخلتها صحيحة حتى الآن. أكمل الخانات الباقية.',
  );
}
function sudokuHint() {
  const s = state;
  if (screen !== 'sudoku' || s.done || advancedBlocked()) return;
  const incorrect = s.board.findIndex((v, i) => v && !s.given[i] && v !== s.solution[i]);
  if (incorrect >= 0) {
    s.selected = incorrect;
    s.hints++;
    return putSudoku(
      s.solution[incorrect],
      true,
      'صححنا إدخالاً غير صحيح قبل استنتاج الخانات الباقية. التلميح −10 نقاط.',
    );
  }
  const deduction = sudokuDeduction(s.board, s.selected);
  if (deduction) {
    s.selected = deduction.i;
    s.hints++;
    return putSudoku(deduction.n, true, deduction.reason + ' التلميح −10 نقاط.');
  }
  let i = s.selected;
  if (s.given[i] || s.board[i] === s.solution[i])
    i = s.board.findIndex((v, k) => !s.given[k] && v !== s.solution[k]);
  if (i < 0) return;
  s.selected = i;
  s.hints++;
  putSudoku(
    s.solution[i],
    true,
    'كشفنا قيمة هذه الخانة من الحل؛ لا يوجد استنتاج بخانة واحدة على اللوحة الحالية. التلميح −10 نقاط.',
  );
}
function sudokuDeduction(board, preferred = -1) {
  const empty = board.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0),
    order = empty.includes(preferred)
      ? [preferred, ...empty.filter((i) => i !== preferred)]
      : empty,
    candidates = new Map(empty.map((i) => [i, sudokuCandidates(board, i)]));
  for (const i of order) {
    const values = candidates.get(i);
    if (values.length === 1)
      return {
        i,
        n: values[0],
        reason: `الرقم ${values[0]} هو الوحيد الذي لا يتكرر في الصف والعمود والمربع لهذه الخانة.`,
      };
  }
  for (const kind of ['row', 'column', 'box']) {
    for (let group = 0; group < 9; group++) {
      const cells = empty.filter((i) =>
        kind === 'row'
          ? Math.floor(i / 9) === group
          : kind === 'column'
            ? i % 9 === group
            : Math.floor(i / 27) * 3 + Math.floor((i % 9) / 3) === group,
      );
      for (let n = 1; n <= 9; n++) {
        const spots = cells.filter((i) => candidates.get(i).includes(n));
        if (spots.length === 1)
          return {
            i: spots[0],
            n,
            reason: `الرقم ${n} يمكن وضعه هنا فقط في ${kind === 'row' ? 'الصف' : kind === 'column' ? 'العمود' : 'المربع'} ${group + 1}.`,
          };
      }
    }
  }
  return null;
}

function generateChoices(answer) {
  const values = new Set([answer]),
    steps = [1, 2, 3, 5, 10, Math.max(1, Math.round(Math.abs(answer) * 0.2))];
  for (let t = 0; values.size < 4 && t < 100; t++) {
    const step = steps[gameRand(steps.length)];
    values.add(answer + (gameRand(2) ? step : -step));
  }
  for (let step = 1; values.size < 4; step++) values.add(answer + step);
  return gShuffle([...values]);
}
function makeMath(level, variant = gameRand(10)) {
  const types =
    level === 'easy'
      ? [0, 1, 2]
      : level === 'hard'
        ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
        : [0, 1, 2, 3, 4, 5];
  const op = types[variant % types.length],
    factor = level === 'easy' ? 10 : level === 'normal' ? 25 : 60;
  let a = gameRand(factor) + 1,
    b = gameRand(factor) + 1,
    answer,
    text,
    explain;
  if (op === 0) {
    answer = a + b;
    text = `${a} + ${b}`;
  } else if (op === 1) {
    if (level !== 'hard' && a < b) [a, b] = [b, a];
    answer = a - b;
    text = `${a} − ${b}`;
  } else if (op === 2) {
    a = gameRand(level === 'easy' ? 5 : level === 'normal' ? 12 : 20) + 1;
    b = gameRand(level === 'easy' ? 5 : 12) + 1;
    answer = a * b;
    text = `${a} × ${b}`;
  } else if (op === 3) {
    b = gameRand(11) + 2;
    answer = gameRand(15) + 1;
    a = answer * b;
    text = `${a} ÷ ${b}`;
  } else if (op === 4) {
    a = gameRand(12) + 1;
    b = gameRand(10) + 1;
    const c = gameRand(15) + 1;
    answer = a * b + c;
    text = `${a} × ${b} + ${c}`;
    explain = 'ننفذ الضرب أولاً ثم الجمع.';
  } else if (op === 5) {
    a = gameRand(10) + 1;
    b = gameRand(10) + 1;
    const c = gameRand(5) + 2;
    answer = (a + b) * c;
    text = `(${a} + ${b}) × ${c}`;
    explain = 'نحسب ما بين القوسين أولاً.';
  } else if (op === 6) {
    a = gameRand(18) + 2;
    answer = a * a;
    text = `${a}²`;
    explain = `مربع ${a} يعني ${a} × ${a}.`;
  } else if (op === 7) {
    a = [10, 20, 25, 50, 75][gameRand(5)];
    b = (gameRand(12) + 1) * 20;
    answer = (a * b) / 100;
    text = `${a}% × ${b}`;
    explain = `النسبة المئوية = ${a} ÷ 100 × ${b}.`;
  } else if (op === 8) {
    a = gameRand(25) + 1;
    b = gameRand(20) + 1;
    const c = gameRand(10) + 1;
    answer = a + b - c;
    text = `${a} + ${b} − ${c}`;
  } else {
    a = gameRand(8) + 2;
    b = gameRand(6) + 2;
    const c = gameRand(10) + 1;
    answer = a * b - c;
    text = `${a} × ${b} − ${c}`;
    explain = 'الضرب قبل الطرح.';
  }
  explain = (explain ? explain + ' ' : '') + `${text} = ${answer}`;
  return { text, answer, choices: generateChoices(answer), explain };
}
const inkColors = [
  ['أحمر', '#ff817e'],
  ['أزرق', '#80b6ff'],
  ['أخضر', '#79dfab'],
  ['أصفر', '#ffd56f'],
  ['بنفسجي', '#c49bff'],
  ['برتقالي', '#ffaa68'],
  ['وردي', '#f79ed8'],
];
function makeColor(level = 'normal', variant = 0) {
  const count = level === 'easy' ? 4 : level === 'hard' ? 7 : 5,
    ink = gameRand(count);
  const word = variant % 5 === 0 ? ink : (ink + 1 + gameRand(count - 1)) % count;
  return {
    text: inkColors[word][0],
    ink,
    word,
    answer: ink,
    choices: gShuffle(Array.from({ length: count }, (_, i) => i)),
    explain: 'لون الحروف هو ' + inkColors[ink][0] + '. معنى الكلمة لا يغير الإجابة.',
  };
}
function makePattern(level, variant = 0) {
  const types =
    level === 'easy'
      ? [0, 1, 2, 5]
      : level === 'hard'
        ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
        : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const type = types[variant % types.length],
    start = gameRand(8) + 1,
    step = gameRand(7) + 2;
  let seq, answer, explain;
  if (type === 0) {
    seq = Array.from({ length: 5 }, (_, i) => start + i * step);
    answer = seq.at(-1) + step;
    explain = `نضيف ${step} كل مرة.`;
  } else if (type === 1) {
    const ratio = gameRand(2) + 2;
    seq = Array.from({ length: 5 }, (_, i) => start * ratio ** i);
    answer = seq.at(-1) * ratio;
    explain = `نضرب في ${ratio} كل مرة.`;
  } else if (type === 2) {
    const top = start + step * 7;
    seq = Array.from({ length: 5 }, (_, i) => top - i * step);
    answer = seq.at(-1) - step;
    explain = `نطرح ${step} كل مرة.`;
  } else if (type === 3) {
    seq = Array.from({ length: 5 }, (_, i) => (start + i) ** 2);
    answer = (start + 5) ** 2;
    explain = `مربعات الأعداد المتتالية من ${start}.`;
  } else if (type === 4) {
    seq = [start, start + 1];
    for (let i = 2; i < 5; i++) seq.push(seq[i - 1] + seq[i - 2]);
    answer = seq[4] + seq[3];
    explain = 'كل عدد يساوي مجموع العددين السابقين.';
  } else if (type === 5) {
    const a = step,
      b = step + gameRand(5) + 2;
    seq = [start];
    for (let i = 1; i < 5; i++) seq.push(seq.at(-1) + (i % 2 ? a : b));
    answer = seq.at(-1) + a;
    explain = `نضيف ${a} ثم ${b} بالتناوب.`;
  } else if (type === 6) {
    seq = Array.from({ length: 5 }, (_, i) => {
      const n = start + i;
      return (n * (n + 1)) / 2;
    });
    const n = start + 5;
    answer = (n * (n + 1)) / 2;
    explain = 'الفروق بين الأعداد تزيد 1 كل مرة (أعداد مثلثية).';
  } else if (type === 7) {
    seq = [start];
    for (let i = 1; i < 5; i++) seq.push(seq.at(-1) * 2 + 1);
    answer = seq.at(-1) * 2 + 1;
    explain = 'نضرب العدد في 2 ثم نضيف 1.';
  } else if (type === 8) {
    seq = [start];
    for (let i = 1; i < 5; i++) seq.push(seq.at(-1) + step * i);
    answer = seq.at(-1) + step * 5;
    explain = `الفروق هي ${step}، ${step * 2}، ${step * 3}…`;
  } else if (type === 9) {
    seq = [start, start + step, start + 1, start + step + 1, start + 2];
    answer = start + step + 2;
    explain = 'سلسلتان متداخلتان؛ كل سلسلة تزيد 1.';
  } else if (type === 10) {
    const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37],
      offset = gameRand(6);
    seq = primes.slice(offset, offset + 5);
    answer = primes[offset + 5];
    explain = 'هذه أعداد أولية متتالية: لا تقبل القسمة إلا على 1 وعلى نفسها.';
  } else if (type === 11) {
    seq = Array.from({ length: 5 }, (_, i) => (i + 1) ** 3);
    answer = 216;
    explain = 'مكعبات الأعداد 1، 2، 3، 4، 5؛ ثم 6³ = 216.';
  } else if (type === 12) {
    seq = [1, 2, 6, 24, 120];
    answer = 720;
    explain = 'نضرب في 2 ثم 3 ثم 4 ثم 5، والخطوة التالية ×6 (مضروب الأعداد).';
  } else {
    seq = [start + 1];
    for (let i = 1; i < 5; i++) seq.push(seq.at(-1) * 3 - 2);
    answer = seq.at(-1) * 3 - 2;
    explain = 'نضرب في 3 ثم نطرح 2.';
  }
  return { seq, answer, choices: generateChoices(answer), explain };
}
function startQuiz(id) {
  const s = state,
    defaults = { math: [10, 60], color: [15, 45], pattern: [8, 180] },
    [defaultCount, defaultTime] = defaults[id];
  const count = s.fixed ? defaultCount : extraOption('quizcount', defaultCount, 5, 30);
  s.duration = s.fixed ? defaultTime : extraOption('quizduration', defaultTime, 30, 600);
  const variants = gShuffle(
    Array.from(
      { length: id === 'pattern' ? (s.level === 'easy' ? 4 : s.level === 'hard' ? 14 : 10) : 10 },
      (_, i) => i,
    ),
  );
  s.questions = Array.from({ length: count }, (_, i) =>
    id === 'math'
      ? makeMath(s.level, variants[i % variants.length])
      : id === 'color'
        ? makeColor(s.level, i)
        : makePattern(s.level, variants[i % variants.length]),
  );
  s.patternMode = s.fixed ? 'next' : $('patternmode')?.value === 'missing' ? 'missing' : 'next';
  if (id === 'pattern' && s.patternMode === 'missing')
    s.questions.forEach((q, i) => {
      const full = [...q.seq, q.answer],
        gap = 1 + (i % 4);
      q.gap = gap;
      q.answer = full[gap];
      q.seq = full.map((n, index) => (index === gap ? null : n));
      q.choices = generateChoices(q.answer);
      q.explain = `السلسلة المكتملة: ${full.join('، ')}. ` + q.explain;
    });
  s.colorMode = s.fixed ? 'ink' : $('colormode')?.value === 'mixed' ? 'mixed' : 'ink';
  if (id === 'color' && s.colorMode === 'mixed')
    s.questions.forEach((q, i) => {
      q.rule = i % 3 === 1 ? 'word' : 'ink';
      q.answer = q.rule === 'word' ? q.word : q.ink;
      q.explain =
        q.rule === 'word'
          ? 'القاعدة هنا معنى الكلمة: ' + inkColors[q.word][0] + '. لون الحروف مشتّت في هذا السؤال.'
          : q.explain;
    });
  Object.assign(s, {
    index: 0,
    correct: 0,
    answers: [],
    stage: 'active',
    locked: false,
    streak: 0,
    bestStreak: 0,
    feedbackRemaining: null,
    lastAt: Date.now(),
    endAt: Date.now() + s.duration * 1000,
  });
  renderQuiz();
  clockLoop(s, quizEnd);
}
function secondsLeft(s = state) {
  if (
    ((['math', 'color', 'pattern'].includes(s.id) && s.locked) ||
      (s.id === 'word' && s.roundOver)) &&
    Number.isFinite(s.feedbackRemaining)
  )
    return Math.max(0, Math.ceil(s.feedbackRemaining / 1000));
  return Math.max(0, Math.ceil((s.endAt - (s.pausedAt || Date.now())) / 1000));
}
function clockLoop(s, onEnd) {
  repeat(() => {
    if (state !== s || s.done || s.pausedAt || s.stage !== 'active') return;
    const sec = secondsLeft(s);
    if ($('gametime')) $('gametime').textContent = sec;
    if ($('clockbar'))
      $('clockbar').style.width =
        Math.max(0, Math.min(100, (sec / (s.duration || 180)) * 100)) + '%';
    if (sec === 0) onEnd();
  }, 150);
}
function renderQuiz() {
  const s = state,
    q = s.questions[s.index],
    keyboardFocus = !!document.activeElement?.closest?.('.quizanswers');
  if (!q) return;
  const question =
    s.id === 'color'
      ? `<p class="quiz-rule ${q.rule === 'word' ? 'rule-word' : ''} center">${q.rule === 'word' ? '📖 اختر معنى الكلمة' : '🎨 اختر لون الحروف'}${s.colorMode === 'mixed' ? ' · انتبه: القاعدة تتبدّل' : ''}</p><div class="inkword" style="color:${inkColors[q.ink][1]}">${q.text}</div>`
      : s.id === 'pattern'
        ? `<p class="tiny center">${Number.isInteger(q.gap) ? 'ما العدد الناقص داخل السلسلة؟' : 'ما العدد التالي؟'}</p><div class="chain" dir="ltr" style="margin:26px 0">${q.seq.map((n) => `<span class="${n === null ? 'missing' : ''}">${n === null ? '?' : n}</span>`).join('')}${Number.isInteger(q.gap) ? '' : '<span class="missing">?</span>'}</div>`
        : `<div class="quizquestion" dir="ltr">${q.text} = ?</div>`;
  setHTML(
    wrap(
      s.id,
      smallStats([
        ['السؤال', s.index + 1 + ' / ' + s.questions.length],
        ['صحيح', s.correct],
        ['الوقت', secondsLeft(s), 'gametime'],
      ]) +
        `${s.practice ? '<p class="hintpanel">🧠 تدريب على أسئلة الجولة السابقة؛ لا نقاط إضافية.</p>' : ''}<section class="panel"><div class="bar"><span id="clockbar" style="width:${(secondsLeft(s) / s.duration) * 100}%"></span></div>${question}<div class="quizanswers" ${s.id === 'color' ? '' : 'dir="ltr"'}>${q.choices.map((v, i) => `<button onclick="answerQuiz(${i})" ${s.locked ? 'disabled' : ''} class="${s.locked && v === q.answer ? 'correct' : s.locked && i === s.lastChoice ? 'wrong' : ''}" aria-label="الاختيار ${i + 1}: ${s.id === 'color' ? inkColors[v][0] : v}"><small class="quiz-shortcut" aria-hidden="true">${i + 1}</small>${s.id === 'color' ? inkColors[v][0] : v}</button>`).join('')}</div>${s.id === 'math' && !s.locked ? `<form class="math-direct" onsubmit="event.preventDefault();answerMathText()"><label for="mathanswer">أو احسب واكتب الإجابة مباشرة</label><div class="math-input"><input id="mathanswer" dir="ltr" inputmode="text" maxlength="22" autocomplete="off" placeholder="إجابتك" aria-label="الإجابة الحسابية"><button class="primary" type="submit">اعتمد الإجابة</button></div><p class="tiny">الأرقام العربية مسموحة؛ إشارة − للسالب. الكتابة والاختيارات لهما نفس النتيجة.</p></form>` : ''}${s.locked ? `<div class="hintpanel" role="status">${s.lastSkipped ? '↷ تجاوزت السؤال. الجواب الصحيح: ' + (s.id === 'color' ? inkColors[q.answer][0] : q.answer) : s.lastCorrect ? '✓ صحيح!' : '✕ الجواب الصحيح: ' + (s.id === 'color' ? inkColors[q.answer][0] : q.answer)}${Number.isFinite(s.lastTyped) ? `<p>إجابتك المكتوبة: <bdi>${s.lastTyped}</bdi></p>` : ''}<br><bdi>${esc(q.explain)}</bdi><p class="tiny">الوقت متوقف. اقرأ الشرح ثم انتقل عندما تكون جاهزًا.</p></div><div class="actions"><button id="quiznext" class="primary" onclick="nextQuiz()">${s.index === s.questions.length - 1 ? 'شوف نتيجة الجولة' : 'السؤال التالي ←'}</button></div>` : `<p class="note center">${s.id === 'color' ? (q.rule === 'word' ? 'اقرأ معنى الكلمة هذه المرة. ' : 'ركز على لون الكلمة. ') : 'اختر الجواب الصحيح. '}يمكنك استخدام الأرقام 1–${q.choices.length}.</p>`}<p class="tiny center">أفضل سلسلة صحيحة: ${s.bestStreak} · ${Math.round((s.correct / Math.max(1, s.answers.length)) * 100)}% دقة</p><div class="actions">${!s.locked ? '<button onclick="skipQuiz()">تجاوز السؤال</button>' : ''}<button class="quiet" onclick="quizEnd()">أنهي الجولة</button></div></section>`,
    ),
  );
  if (keyboardFocus && s.locked) $('quiznext')?.focus({ preventScroll: true });
}
function answerMathText() {
  if (screen !== 'math' || state.done || state.locked || advancedBlocked()) return;
  const value = latin($('mathanswer')?.value || '')
    .trim()
    .replace(/−/g, '-')
    .replace(/٫/g, '.');
  if (
    !/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(value) ||
    !Number.isFinite(Number(value)) ||
    Math.abs(Number(value)) > 1e9
  )
    return toast('اكتب جواباً رقمياً واضحاً، مثل 24 أو -5.');
  answerQuiz(-1, Number(value));
}
function answerQuiz(i, typed) {
  const s = state;
  if (
    !s ||
    s.done ||
    s.locked ||
    !['math', 'color', 'pattern'].includes(screen) ||
    advancedBlocked(s)
  )
    return;
  if (secondsLeft(s) === 0) return quizEnd();
  const q = s.questions[s.index];
  const direct = s.id === 'math' && i === -1 && Number.isFinite(typed);
  if (!direct && (!Number.isInteger(i) || i < 0 || i >= q.choices.length)) return;
  const choice = direct ? typed : q.choices[i];
  s.lastTyped = direct ? choice : null;
  s.locked = true;
  s.feedbackRemaining = Math.max(0, s.endAt - Date.now());
  s.lastChoice = i;
  s.lastSkipped = false;
  s.lastCorrect = choice === q.answer;
  if (s.lastCorrect) {
    s.correct++;
    s.streak++;
    s.bestStreak = Math.max(s.bestStreak, s.streak);
    tone();
  } else s.streak = 0;
  s.answers.push({
    index: s.index,
    correct: s.lastCorrect,
    choice,
    ms: Math.max(0, Date.now() - s.lastAt),
  });
  renderQuiz();
}
function skipQuiz() {
  const s = state;
  if (
    !s ||
    s.done ||
    s.locked ||
    !['math', 'color', 'pattern'].includes(screen) ||
    advancedBlocked(s)
  )
    return;
  if (secondsLeft(s) === 0) return quizEnd();
  s.answers.push({
    index: s.index,
    correct: false,
    skipped: true,
    ms: Math.max(0, Date.now() - s.lastAt),
  });
  s.streak = 0;
  s.locked = true;
  s.feedbackRemaining = Math.max(0, s.endAt - Date.now());
  s.lastChoice = -1;
  s.lastTyped = null;
  s.lastCorrect = false;
  s.lastSkipped = true;
  renderQuiz();
}
function nextQuiz() {
  const s = state;
  if (!s || s.done || !s.locked || !['math', 'color', 'pattern'].includes(screen)) return;
  if (advancedBlocked(s)) {
    s.pendingAdvance = true;
    return;
  }
  if (secondsLeft(s) === 0) return quizEnd();
  s.pendingAdvance = false;
  if (Number.isFinite(s.feedbackRemaining)) s.endAt = Date.now() + s.feedbackRemaining;
  s.feedbackRemaining = null;
  s.index++;
  if (s.index >= s.questions.length) return quizEnd();
  s.locked = false;
  s.lastSkipped = false;
  s.lastAt = Date.now();
  renderQuiz();
  $('app').querySelector('.quizanswers button')?.focus({ preventScroll: true });
}
function quizEnd() {
  const s = state;
  if (!s || s.done || !['math', 'color', 'pattern'].includes(screen) || advancedBlocked(s)) return;
  const total = s.questions.length,
    base = Math.round((s.correct / total) * 90),
    bonus = s.correct === total ? 10 : 0;
  s.practiceBank = s.questions.filter((_, i) => !s.answers.find((a) => a.index === i)?.correct);
  if (s.practice) {
    clearTimers();
    s.done = true;
    s.stage = 'result';
    setHTML(
      wrap(
        s.id,
        `<section class="panel success center"><div class="resulticon">🧠</div><h2>انتهى التدريب</h2><p class="note">صححت ${s.correct} من ${total} أسئلة. التدريب لا يضيف نقاطاً ولا يغيّر النتيجة الأصلية.</p><div class="actions">${tourney?.active ? '<button class="primary" onclick="nextTournament()">الدور اللي بعده ←</button>' : `<button onclick="setup('${s.id}')">تحدّ جديد</button>`}<button onclick="home()">الألعاب</button></div></section>`,
      ),
    );
  } else
    finishExtra(
      s.correct === total ? 'جولة كاملة! ✨' : 'نتيجة التحدي',
      `أجبت ${s.correct} إجابات صحيحة من ${total}. الوقت المتبقي ${secondsLeft(s)} ثانية، وأفضل سلسلة صحيحة ${s.bestStreak}.`,
      base + bonus,
      `${s.correct} / ${total}`,
    );
  const timed = s.answers.filter((a) => a.correct && Number.isFinite(a.ms)),
    avgMs = timed.length
      ? Math.round(timed.reduce((sum, a) => sum + a.ms, 0) / timed.length)
      : null;
  const review = `${avgMs !== null ? `<p class="note center">متوسط زمن الإجابة الصحيحة: ${(avgMs / 1000).toFixed(2)} ثانية. فترات الشرح والإيقاف لا تحتسب.</p>` : ''}<details class="history"><summary>راجع الأسئلة والحلول</summary>${s.questions
    .map((q, i) => {
      const a = s.answers.find((v) => v.index === i),
        label =
          s.id === 'color'
            ? q.text
            : s.id === 'pattern'
              ? q.seq.map((n) => (n === null ? '؟' : n)).join('، ') +
                (Number.isInteger(q.gap) ? '' : '، ؟')
              : q.text;
      return `<div class="hint"><b>${i + 1}. ${esc(label)} ${a?.correct ? '✓' : '✕'}</b><p>${a && !a.skipped ? 'إجابتك: ' + (s.id === 'color' ? inkColors[a.choice][0] : a.choice) : a?.skipped ? 'تجاوزت السؤال' : 'لم تجب'} · الصحيح: ${s.id === 'color' ? inkColors[q.answer][0] : q.answer}${Number.isFinite(a?.ms) ? ' · ' + (a.ms / 1000).toFixed(2) + ' ثانية' : ''}</p><p><bdi>${esc(q.explain)}</bdi></p></div>`;
    })
    .join('')}</details>`;
  $('app')
    .querySelector('.success')
    ?.insertAdjacentHTML(
      'beforeend',
      review +
        (s.practiceBank.length
          ? `<div class="actions"><button onclick="startQuizPractice()">🧠 تدريب على ${s.practiceBank.length} أسئلة دون نقاط إضافية</button></div>`
          : ''),
    );
}
function startQuizPractice() {
  const s = state;
  if (
    !['math', 'color', 'pattern'].includes(screen) ||
    !s.done ||
    advancedBlocked(s) ||
    !s.practiceBank?.length
  )
    return;
  clearTimers();
  Object.assign(s, {
    questions: [...s.practiceBank],
    practice: true,
    done: false,
    stage: 'active',
    index: 0,
    correct: 0,
    answers: [],
    locked: false,
    streak: 0,
    bestStreak: 0,
    feedbackRemaining: null,
    lastAt: Date.now(),
    duration: Math.max(60, s.duration),
  });
  s.endAt = Date.now() + s.duration * 1000;
  renderQuiz();
  clockLoop(s, quizEnd);
}

function wordLetters(name) {
  return Array.from(name.replace(/[\u064B-\u065F\u0670ـ\s\-]/g, ''));
}
function startWord() {
  const s = state;
  let pool = (
    tourney?.active && Array.isArray(tourney.wordItems)
      ? tourney.wordItems
      : selectedItems().map((i) => items[i])
  ).filter(
    (v) =>
      wordLetters(v.name).length >= 2 &&
      wordLetters(v.name).length <= ({ easy: 7, normal: 12, hard: 20 }[s.level] || 12),
  );
  if (!pool.length)
    pool = items.filter((v) => wordLetters(v.name).length >= 2 && wordLetters(v.name).length <= 12);
  if (!pool.length)
    return finishExtra('لا توجد كلمات مناسبة', 'أضف كلمات إلى قاعدة التخمين ثم جرّب مجدداً.', 0);
  const count = s.fixed
    ? 7
    : extraOption('wordcount', { easy: 5, normal: 7, hard: 10 }[s.level] || 7, 3, 20);
  s.queue = gShuffle(pool).slice(0, count);
  s.scrambleBank = s.queue.map((v) => scrambleWord(v.name));
  Object.assign(s, {
    index: 0,
    correct: 0,
    points: 0,
    hints: 0,
    tries: 0,
    attempted: [],
    stage: 'active',
    duration: s.fixed ? 180 : { easy: 240, normal: 180, hard: 150 }[s.level] || 180,
    review: [],
  });
  s.endAt = Date.now() + s.duration * 1000;
  prepareWord();
  renderWord();
  clockLoop(s, wordEnd);
}
function scrambleWord(name) {
  const chars = wordLetters(name),
    scrambled = gShuffle(chars);
  if (scrambled.join('') === chars.join('') && new Set(chars).size > 1) {
    const j = chars.findIndex((v) => v !== chars[0]);
    [scrambled[0], scrambled[j]] = [scrambled[j], scrambled[0]];
  }
  return scrambled;
}
function prepareWord() {
  const s = state;
  s.item = s.queue[s.index];
  s.scrambled = [...s.scrambleBank[s.index]];
  Object.assign(s, {
    hints: 0,
    tries: 0,
    attempted: [],
    roundOver: false,
    message: '',
    wordDraft: '',
    usedLetters: [],
    selectedLetter: -1,
    feedbackRemaining: null,
  });
}
function renderWord() {
  const s = state,
    category = categories.find((c) => c[0] === s.item.cat)?.[1] || 'كلمات متنوعة';
  setHTML(
    wrap(
      'word',
      smallStats([
        ['الكلمة', s.index + 1 + ' / ' + s.queue.length],
        ['عرفتها', s.correct],
        ['الوقت', secondsLeft(s), 'gametime'],
      ]) +
        `<section class="panel"><div class="scramble">${s.scrambled.map((c, i) => `<button class="letter ${s.usedLetters.includes(i) ? 'quiet' : ''}" onclick="tapWordLetter(${i})" ${s.roundOver || s.usedLetters.includes(i) ? 'disabled' : ''} aria-label="أضف الحرف ${esc(c)}">${esc(c)}</button>`).join('')}</div><p class="tiny center">${s.scrambled.length} حرفاً · ${esc(category)} · ${s.item.name.split(/\s+/).length} كلمة</p>${
          s.hints
            ? s.item.hints
                .slice(0, Math.min(s.hints, 3))
                .map((h, i) => `<div class="hint"><b>التلميح ${i + 1}</b>${esc(h)}</div>`)
                .join('')
            : ''
        }${s.roundOver ? `<div class="spot"><small>${esc(s.message)}</small><div class="secret">${esc(s.item.name)}</div></div><p class="tiny">الوقت متوقف أثناء قراءة الحل.</p><div class="actions"><button class="primary" onclick="nextWord()">${s.index === s.queue.length - 1 ? 'نتيجة الجولة' : 'الكلمة التالية ←'}</button></div>` : `<form onsubmit="event.preventDefault();guessWord()"><div id="wordslots">${wordSlotsHTML(s)}</div><label for="wordanswer" style="margin-top:18px">رتّب الحروف بالنقر أو الكتابة</label><input id="wordanswer" maxlength="50" autocomplete="off" placeholder="اكتب الكلمة" value="${esc(s.wordDraft)}" oninput="updateWordDraft(this.value)"><div class="actions"><button class="primary" type="submit">خمنت!</button><button type="button" onclick="eraseWordLetter()">⌫ آخر حرف</button><button type="button" onclick="removeWordSlot()" ${s.selectedLetter < 0 ? 'disabled' : ''}>احذف الحرف المحدد</button><button type="button" onclick="moveWordSlot(-1)" ${s.selectedLetter <= 0 ? 'disabled' : ''}>قدّم الحرف</button><button type="button" onclick="moveWordSlot(1)" ${s.selectedLetter < 0 || s.selectedLetter >= Array.from(s.wordDraft).length - 1 ? 'disabled' : ''}>أخّر الحرف</button><button type="button" onclick="hintWord()" ${s.hints >= 2 ? 'disabled' : ''}>تلميح −4</button><button type="button" onclick="skipWord()">تجاوز</button></div></form><p class="note" role="status">${esc(s.message || `بقيت ${3 - s.tries} تخمينات. الإجابة من أول محاولة دون تلميحات = 14 نقطة للكلمة.`)}</p>`}<div class="actions"><button class="quiet" onclick="wordEnd()">أنهي الجولة</button></div></section>`,
    ),
  );
}
function wordSlotsHTML(s = state) {
  return `<div class="word-slots" aria-label="ترتيب إجابتك">${
    Array.from(s.wordDraft)
      .map(
        (char, i) =>
          `<button type="button" onclick="selectWordSlot(${i})" aria-pressed="${s.selectedLetter === i}" class="${s.selectedLetter === i ? 'primary' : ''}" aria-label="الحرف ${esc(char)} في الموضع ${i + 1}">${esc(char)}</button>`,
      )
      .join('') || '<span class="tiny">رتّب الحروف هنا؛ اختر حرفاً لتغيّر مكانه أو تحذفه.</span>'
  }</div>`;
}
function selectWordSlot(index) {
  const s = state;
  if (
    screen !== 'word' ||
    s.done ||
    s.roundOver ||
    advancedBlocked() ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= Array.from(s.wordDraft).length
  )
    return;
  if (secondsLeft(s) === 0) return wordEnd();
  s.selectedLetter = index;
  renderWord();
}
function moveWordSlot(delta) {
  const s = state;
  if (screen !== 'word' || s.done || s.roundOver || advancedBlocked() || ![-1, 1].includes(delta))
    return;
  if (secondsLeft(s) === 0) return wordEnd();
  const chars = Array.from(s.wordDraft),
    i = s.selectedLetter,
    next = i + delta;
  if (i < 0 || next < 0 || next >= chars.length) return;
  [chars[i], chars[next]] = [chars[next], chars[i]];
  s.wordDraft = chars.join('');
  s.usedLetters = usedWordLetters(s.wordDraft, s.scrambled);
  s.selectedLetter = next;
  renderWord();
}
function removeWordSlot() {
  const s = state;
  if (screen !== 'word' || s.done || s.roundOver || advancedBlocked()) return;
  if (secondsLeft(s) === 0) return wordEnd();
  const chars = Array.from(s.wordDraft),
    i = s.selectedLetter;
  if (!Number.isInteger(i) || i < 0 || i >= chars.length) return;
  chars.splice(i, 1);
  s.wordDraft = chars.join('');
  s.usedLetters = usedWordLetters(s.wordDraft, s.scrambled);
  s.selectedLetter = Math.min(i, chars.length - 1);
  renderWord();
}
function freezeWordRead(s = state) {
  s.feedbackRemaining = Math.max(0, s.endAt - Date.now());
}
function usedWordLetters(draft, scrambled) {
  const used = [];
  for (const char of wordLetters(draft)) {
    const i = scrambled.findIndex((v, k) => !used.includes(k) && norm(v) === norm(char));
    if (i >= 0) used.push(i);
  }
  return used;
}
function updateWordDraft(value) {
  if (screen !== 'word' || state.done || state.roundOver || advancedBlocked()) return;
  if (secondsLeft() === 0) return wordEnd();
  state.wordDraft = value;
  state.selectedLetter = -1;
  if ($('wordslots')) $('wordslots').innerHTML = wordSlotsHTML(state);
  state.usedLetters = usedWordLetters(value, state.scrambled);
  $('app')
    .querySelectorAll('.scramble .letter')
    .forEach((button, i) => {
      const used = state.usedLetters.includes(i);
      button.disabled = used;
      button.classList.toggle('quiet', used);
    });
}
function tapWordLetter(i) {
  const s = state;
  if (
    screen !== 'word' ||
    s.done ||
    s.roundOver ||
    advancedBlocked() ||
    !Number.isInteger(i) ||
    i < 0 ||
    i >= s.scrambled.length ||
    s.usedLetters.includes(i)
  )
    return;
  if (secondsLeft(s) === 0) return wordEnd();
  s.wordDraft = $('wordanswer')?.value ?? s.wordDraft;
  s.usedLetters = usedWordLetters(s.wordDraft, s.scrambled);
  if (s.usedLetters.includes(i)) return;
  s.wordDraft += s.scrambled[i];
  s.usedLetters = usedWordLetters(s.wordDraft, s.scrambled);
  renderWord();
}
function eraseWordLetter() {
  const s = state;
  if (screen !== 'word' || s.done || s.roundOver || advancedBlocked()) return;
  if (secondsLeft(s) === 0) return wordEnd();
  s.wordDraft = Array.from($('wordanswer')?.value ?? s.wordDraft)
    .slice(0, -1)
    .join('');
  s.usedLetters = usedWordLetters(s.wordDraft, s.scrambled);
  renderWord();
}
function guessWord() {
  const s = state;
  if (screen !== 'word' || s.done || s.roundOver || advancedBlocked()) return;
  if (secondsLeft(s) === 0) return wordEnd();
  s.wordDraft = $('wordanswer').value;
  const a = norm(s.wordDraft).replace(/\s/g, '');
  if (!a) return toast('اكتب الكلمة.');
  if (s.attempted.includes(a)) return toast('جرّبت هذه الإجابة.');
  s.attempted.push(a);
  s.tries++;
  if ([s.item.name, ...(s.item.aliases || [])].some((n) => norm(n).replace(/\s/g, '') === a)) {
    s.correct++;
    s.points += Math.max(2, 14 - s.hints * 4 - (s.tries - 1) * 2);
    s.roundOver = true;
    s.message = '✓ عرفت الكلمة!';
    s.review.push({ name: s.item.name, correct: true, hints: s.hints, tries: s.tries });
    tone(true);
  } else if (s.tries === 3) {
    s.roundOver = true;
    s.message = 'الإجابة كانت…';
    s.review.push({ name: s.item.name, correct: false, hints: s.hints, tries: s.tries });
  } else {
    s.message = 'ليست هذه الكلمة. بقيت ' + (3 - s.tries) + ' تخمينات.';
    s.wordDraft = '';
    s.usedLetters = [];
  }
  if (s.roundOver) freezeWordRead(s);
  renderWord();
  if (!s.roundOver) $('wordanswer').focus();
}
function hintWord() {
  if (screen !== 'word' || state.done || state.roundOver || state.hints >= 2 || advancedBlocked())
    return;
  if (secondsLeft() === 0) return wordEnd();
  state.wordDraft = $('wordanswer')?.value || '';
  state.hints++;
  renderWord();
}
function skipWord() {
  if (screen !== 'word' || state.done || state.roundOver || advancedBlocked()) return;
  if (secondsLeft() === 0) return wordEnd();
  state.roundOver = true;
  freezeWordRead();
  state.message = 'الإجابة كانت…';
  state.review.push({
    name: state.item.name,
    correct: false,
    hints: state.hints,
    tries: state.tries,
  });
  renderWord();
}
function nextWord() {
  const s = state;
  if (screen !== 'word' || s.done || !s.roundOver || advancedBlocked()) return;
  if (secondsLeft(s) === 0) return wordEnd();
  if (Number.isFinite(s.feedbackRemaining)) s.endAt = Date.now() + s.feedbackRemaining;
  s.index++;
  if (s.index >= s.queue.length) return wordEnd();
  prepareWord();
  renderWord();
}
function wordEnd() {
  if (screen !== 'word' || state.done || advancedBlocked()) return;
  const s = state;
  finishExtra(
    s.correct === s.queue.length ? 'عرفت كل الكلمات! 🔤' : 'نتيجة الحروف',
    `عرفت ${s.correct} كلمات من ${s.queue.length}.`,
    Math.min(
      100,
      Math.round((s.points / (s.queue.length * 14)) * 98) + (s.correct === s.queue.length ? 2 : 0),
    ),
  );
  $('app')
    .querySelector('.success')
    ?.insertAdjacentHTML(
      'beforeend',
      `<details class="history"><summary>كلمات الجولة</summary><div class="listchips">${s.queue.map((v) => `<span>${s.review.find((r) => r.name === v.name)?.correct ? '✓' : '○'} ${esc(v.name)}</span>`).join('')}</div></details>`,
    );
}

const spyPlaces = {
  everyday: [
    'مدرسة',
    'مستشفى',
    'مطعم',
    'سينما',
    'مكتبة',
    'نادي رياضي',
    'جمعية',
    'مسبح',
    'محطة بنزين',
    'حديقة',
    'مخبز',
    'صيدلية',
    'بنك',
    'جامعة',
    'ملعب',
    'محل عطور',
    'محل ألعاب',
    'مركز إطفاء',
    'سوق السمك',
    'استوديو تصوير',
    'محكمة',
    'مركز بريد',
    'مغسلة سيارات',
    'صالون حلاقة',
    'ورشة نجارة',
    'مصنع شوكولاتة',
    'محل زهور',
    'عيادة أسنان',
    'محطة تلفزيون',
    'مسرح',
    'مركز تسوق',
    'مزرعة',
    'معرض سيارات',
    'مطعم على السطح',
    'حلبة تزلج',
  ],
  travel: [
    'مطار',
    'شاطئ',
    'فندق',
    'متحف',
    'محطة قطار',
    'حديقة حيوانات',
    'مدينة ألعاب',
    'مخيم',
    'مرسى قوارب',
    'جزيرة فيلكا',
    'برج الكويت',
    'سفينة سياحية',
    'قطار سريع',
    'منتجع جبلي',
    'واحة صحراوية',
    'شلال',
    'محطة مترو',
    'منارة بحرية',
    'كهف',
    'غابة',
    'سوق قديم',
    'ميناء تجاري',
    'قرية ثلجية',
    'جسر معلق',
    'محمية طبيعية',
    'حافلة سياحية',
    'قاعة مغادرة',
    'مهرجان ثقافي',
  ],
  fantasy: [
    'محطة فضائية',
    'قاعدة على القمر',
    'مدينة تحت الماء',
    'قلعة قديمة',
    'مملكة من الثلج',
    'مختبر سفر عبر الزمن',
    'جزيرة قراصنة',
    'مدرسة سحر',
    'كوكب بعيد',
    'مدينة الروبوتات',
    'سفينة فضاء',
    'مخبأ أبطال خارقين',
    'قصر في السحاب',
    'معبد في الغابة',
    'حديقة ديناصورات',
    'برج تنين',
    'مختبر اختراعات',
    'قرية عمالقة',
    'قطار بين الكواكب',
    'مكتبة عائمة',
  ],
};
const spyLocations = [...new Set(Object.values(spyPlaces).flat())];
const spyPrompts = [
  'ما أول شيء تفعله عندما تصل إلى هذا المكان؟',
  'هل تذهب إلى هذا المكان وحدك أم مع الآخرين؟',
  'ما الشيء الذي يجب أن تحمله معك؟',
  'هل المكان صاخب أم هادئ؟',
  'أي وقت من اليوم يناسب زيارته؟',
  'ماذا يرتدي العاملون في هذا المكان؟',
  'ما الشيء الذي لا تتوقع أن تجده هناك؟',
  'هل يحتاج الدخول إلى تذكرة أو موعد؟',
  'ما الرائحة أو الصوت الذي يميز المكان؟',
  'هل تقضي هناك دقائق أم ساعات؟',
  'ما الشيء الذي يمكنك شراءه أو طلبه هناك؟',
  'هل تفضل زيارته في الصيف أم الشتاء؟',
  'كيف تتصرف إن تعطلت الكهرباء هناك؟',
  'من الشخص الذي تطلب مساعدته في هذا المكان؟',
  'ما القاعدة التي يلتزم بها الزوار؟',
];
function startSpy() {
  const s = state,
    theme = $('spytheme')?.value || 'all',
    pool = spyPlaces[theme] || spyLocations;
  Object.assign(s, {
    players: [...store.players],
    location: pool[gameRand(pool.length)],
    locationPool: [...pool],
    spy: gameRand(store.players.length),
    turn: 0,
    stage: 'handoff',
    duration: extraOption('duration', 300, 60, 900),
    votes: [],
    voteTurn: 0,
    questionIndex: 0,
    questionOrder: gShuffle(spyPrompts),
    asker: gameRand(store.players.length),
    roles: gShuffle([
      'زائر لأول مرة',
      'زائر دائم',
      'المسؤول عن المكان',
      'موظف جديد',
      'مرشد للزوار',
      'شخص ينتظر صديقه',
      'شخص وصل مبكراً',
      'شخص مستعجل',
      'ضيف مهم',
      'مصور',
      'شخص يسأل عن الاتجاه',
      'شخص يحب الاستكشاف',
    ]),
  });
  s.target = (s.asker + 1) % s.players.length;
  s.questionHistory = [];
  spyHandoff();
}
function spyHandoff() {
  const s = state;
  s.stage = 'handoff';
  setHTML(
    wrap(
      'spy',
      `<section class="panel center"><div class="secretcover"><div class="symbol">🔒</div><h3>الجهاز مع ${esc(s.players[s.turn])}</h3><p class="note">اللاعب ${s.turn + 1} / ${s.players.length}. البقية لا ينظرون إلى الشاشة.</p></div><div class="actions"><button class="primary" onclick="spyReveal()">أنا ${esc(s.players[s.turn])}، اعرض دوري</button></div></section>`,
    ),
  );
}
function spyReveal() {
  if (screen !== 'spy' || state.stage !== 'handoff' || state.done || advancedBlocked()) return;
  const s = state;
  s.stage = 'view';
  const spy = s.turn === s.spy;
  setHTML(
    wrap(
      'spy',
      `<section class="panel center"><div class="secretcover"><div class="symbol">${spy ? '🕶️' : '📍'}</div><small>دورك سري</small><h2>${spy ? 'أنت الجاسوس' : esc(s.location)}</h2>${spy ? '' : `<p class="pill">دورك التمثيلي: ${esc(s.roles[s.turn])}</p>`}<p class="note">${spy ? 'حاول معرفة المكان من الأسئلة دون أن يكتشفوك. لديك محاولة واحدة لتخمينه.' : 'أجب كأنك في هذا المكان وبهذا الدور، دون قول اسم المكان.'}</p></div><div class="actions"><button class="primary" onclick="spyHide()">إخفاء وتمرير الجهاز</button></div></section>`,
    ),
  );
}
function spyHide() {
  if (screen !== 'spy' || state.stage !== 'view' || advancedBlocked()) return;
  state.turn++;
  if (state.turn < state.players.length) return spyHandoff();
  state.stage = 'ready';
  setHTML(
    wrap(
      'spy',
      '<section class="panel center"><div class="resulticon">🕶️</div><h2>الكل شاهد دوره</h2><p class="note">اسألوا بعضكم عن المكان دون ذكر اسمه. تجنبوا الأسئلة التي تكشفه فوراً. التصويت سري؛ التعادل يسمح للجاسوس بالفوز.</p><div class="actions"><button class="primary" onclick="spyDiscuss()">نبدأ النقاش</button></div></section>',
    ),
  );
}
function spyDiscuss() {
  if (screen !== 'spy' || state.stage !== 'ready' || advancedBlocked()) return;
  const s = state;
  s.stage = 'active';
  s.endAt = Date.now() + s.duration * 1000;
  renderSpy();
  clockLoop(s, startSpyVote);
}
function renderSpy() {
  const s = state;
  setHTML(
    wrap(
      'spy',
      smallStats([
        ['اللاعبون', s.players.length],
        ['وقت النقاش', secondsLeft(s), 'gametime'],
      ]) +
        `<section class="panel center"><div class="resulticon">🕶️</div><h2>من إجاباته غريبة؟</h2><div class="hintpanel"><b>${esc(s.players[s.asker])} يسأل ${esc(s.players[s.target])}</b><label for="spytarget">وجّه السؤال إلى</label><select id="spytarget" onchange="setSpyTarget(Number(this.value))">${s.players.map((name, i) => (i === s.asker ? '' : `<option value="${i}" ${i === s.target ? 'selected' : ''}>${esc(name)}</option>`)).join('')}</select><p>${esc(s.questionOrder[s.questionIndex % s.questionOrder.length])}</p><button onclick="nextSpyPrompt()">سجّل السؤال وانتقل للّاعب المجيب</button></div><p class="note">لا تقولوا اسم المكان. يمكنكم سؤال أي لاعب، ثم الانتقال لغيره. صاحب أعلى عدد أصوات منفرداً يُتهم؛ التعادل = نجاة الجاسوس.</p>${spyQuestionLog(s)}<details class="history"><summary>الأماكن المحتملة (${s.locationPool.length})</summary><div class="listchips">${s.locationPool.map((v) => `<span>${esc(v)}</span>`).join('')}</div></details><div class="actions"><button class="primary" onclick="startSpyVote()">جاهزون للتصويت</button><button onclick="spyGuess()">الجاسوس يخمّن المكان</button></div></section>`,
    ),
  );
}
function setSpyTarget(index) {
  const s = state;
  if (
    screen !== 'spy' ||
    s.stage !== 'active' ||
    advancedBlocked() ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= s.players.length ||
    index === s.asker
  )
    return;
  if (secondsLeft(s) === 0) return startSpyVote();
  s.target = index;
  renderSpy();
}
function spyQuestionLog(s = state) {
  return `<details class="history"><summary>سجل النقاش (${s.questionHistory?.length || 0} أسئلة)</summary>${(s.questionHistory || []).map((q) => `<p><b>${esc(s.players[q.asker])} ← ${esc(s.players[q.target])}</b>: ${esc(q.text)}</p>`).join('') || '<p class="note">بعد الإجابة، سجّل السؤال للانتقال.</p>'}</details>`;
}
function nextSpyPrompt() {
  if (screen !== 'spy' || state.stage !== 'active' || advancedBlocked()) return;
  if (secondsLeft() === 0) return startSpyVote();
  state.questionHistory ??= [];
  state.questionHistory.push({
    asker: state.asker,
    target: state.target,
    text: state.questionOrder[state.questionIndex % state.questionOrder.length],
  });
  state.questionIndex++;
  const previous = state.asker;
  state.asker = state.target;
  state.target = (state.asker + 1) % state.players.length;
  if (state.target === previous && state.players.length > 2)
    state.target = (state.target + 1) % state.players.length;
  renderSpy();
}
function spyGuess() {
  if (screen !== 'spy' || state.stage !== 'active' || advancedBlocked()) return;
  if (secondsLeft() === 0) return startSpyVote();
  openModal(
    `<div class="modalhead"><h2 id="modaltitle">تخمين الجاسوس</h2><button onclick="closeModal()" aria-label="إغلاق">✕</button></div><p class="muted">الجاسوس يعلن نفسه ويخمّن مكاناً واحداً. التخمين الصحيح يفوز، والخطأ يعطي الفوز للبقية. يمكنك إلغاء النافذة قبل اعتماد الإجابة.</p><label for="spyguess" style="margin-top:14px">أين المكان؟</label><select id="spyguess">${state.locationPool.map((v) => `<option>${esc(v)}</option>`).join('')}</select><div class="actions"><button onclick="closeModal()">إلغاء</button><button class="primary" onclick="submitSpyGuess()">اعتمد التخمين</button></div>`,
  );
}
function cancelSpyGuess() {
  closeModal();
}
function submitSpyGuess() {
  if (screen !== 'spy' || state.stage !== 'active' || state.done || !$('spyguess')) return;
  const correct = $('spyguess').value === state.location;
  closeModal();
  spyResult(correct, correct ? 'الجاسوس عرف المكان!' : 'تخمين الجاسوس غير صحيح.');
}
function startSpyVote() {
  if (screen !== 'spy' || state.stage !== 'active' || state.done || advancedBlocked()) return;
  clearTimers();
  state.stage = 'vote-handoff';
  state.voteTurn = 0;
  state.votes = [];
  spyVoteHandoff();
}
function spyVoteHandoff() {
  const s = state;
  s.stage = 'vote-handoff';
  setHTML(
    wrap(
      'spy',
      `<section class="panel center"><div class="resulticon">🗳️</div><h2>${esc(s.players[s.voteTurn])} يصوّت سراً</h2><p class="note">التصويت ${s.voteTurn + 1} / ${s.players.length}. مرّر الجهاز إليه.</p><div class="actions"><button class="primary" onclick="spyVoteReveal()">أنا جاهز للتصويت</button></div></section>`,
    ),
  );
}
function spyVoteReveal() {
  if (screen !== 'spy' || state.stage !== 'vote-handoff' || advancedBlocked()) return;
  const s = state;
  s.stage = 'voting';
  setHTML(
    wrap(
      'spy',
      `<section class="panel"><h2 class="center">من تتوقع أنه الجاسوس؟</h2><div class="actions">${s.players.map((n, i) => (i === s.voteTurn ? '' : `<button onclick="castSpyVote(${i})">${esc(n)}</button>`)).join('')}</div><p class="note center">لا تستطيع التصويت لنفسك. اختيارك يُحفظ ثم يُخفى.</p></section>`,
    ),
  );
}
function castSpyVote(i) {
  const s = state;
  if (
    screen !== 'spy' ||
    s.stage !== 'voting' ||
    advancedBlocked() ||
    !Number.isInteger(i) ||
    i < 0 ||
    i >= s.players.length ||
    i === s.voteTurn
  )
    return;
  s.votes.push(i);
  s.voteTurn++;
  if (s.voteTurn < s.players.length) return spyVoteHandoff();
  const counts = s.players.map((_, k) => s.votes.filter((v) => v === k).length),
    max = Math.max(...counts),
    leaders = counts.map((v, k) => (v === max ? k : -1)).filter((k) => k >= 0),
    caught = leaders.length === 1 && leaders[0] === s.spy;
  s.counts = counts;
  spyResult(
    !caught,
    caught
      ? 'كشفتم الجاسوس!'
      : leaders.length > 1
        ? 'تعادلت الأصوات، فنجا الجاسوس.'
        : 'الجاسوس أفلت من التصويت.',
  );
}
function spyResult(spyWon, reason) {
  const s = state;
  if (s.done) return;
  clearTimers();
  s.done = true;
  s.stage = 'result';
  const results = Object.fromEntries(
    s.players.map((n, i) => [n, (spyWon ? i === s.spy : i !== s.spy) ? 40 : 0]),
  );
  for (const [n, p] of Object.entries(results)) addScore(n, p);
  tone(true);
  confetti();
  setHTML(
    wrap(
      'spy',
      `<section class="panel success center"><div class="resulticon">${spyWon ? '🕶️' : '🏆'}</div><h2>${esc(reason)}</h2><p class="note">الجاسوس: <b>${esc(s.players[s.spy])}</b></p><div class="spot"><small>المكان كان</small><div class="secret">${esc(s.location)}</div></div>${s.counts ? `<p class="note">الأصوات: ${s.players.map((n, i) => esc(n) + ' ' + s.counts[i]).join(' · ')}</p>` : ''}<div style="margin-top:20px;text-align:right">${boardHTML(s.players, results)}</div>${spyQuestionLog(s)}<div class="actions"><button class="primary" onclick="setup('spy')">جولة جديدة</button><button onclick="home()">الألعاب</button></div></section>`,
    ),
  );
}

// Four forbidden words per card and five themed collections.
const tabooDeck = [
  ['قهوة', 'مشروب', 'كافيين', 'فنجان', 'بن', 'food'],
  ['سيارة', 'مقود', 'عجلات', 'شارع', 'سائق', 'everyday'],
  ['هاتف', 'اتصال', 'جوال', 'تطبيق', 'رقم', 'everyday'],
  ['بيتزا', 'جبن', 'عجين', 'إيطاليا', 'فرن', 'food'],
  ['مطار', 'طائرة', 'سفر', 'تذكرة', 'جواز', 'travel'],
  ['مدرسة', 'طالب', 'معلم', 'صف', 'دراسة', 'everyday'],
  ['مستشفى', 'طبيب', 'مريض', 'علاج', 'عملية', 'everyday'],
  ['بحر', 'ماء', 'موج', 'شاطئ', 'ملح', 'travel'],
  ['شوكولاتة', 'كاكاو', 'حلو', 'حليب', 'لوح', 'food'],
  ['جمل', 'صحراء', 'سنام', 'بعير', 'ناقة', 'travel'],
  ['ساعة', 'وقت', 'عقارب', 'دقيقة', 'ثانية', 'everyday'],
  ['نظارة', 'عين', 'عدسة', 'نظر', 'إطار', 'everyday'],
  ['كرة قدم', 'هدف', 'ملعب', 'لاعب', 'حارس', 'sport'],
  ['مكتبة', 'كتاب', 'قراءة', 'رف', 'استعارة', 'everyday'],
  ['عطر', 'رائحة', 'بخاخ', 'قنينة', 'ورد', 'everyday'],
  ['آيس كريم', 'بارد', 'حلوى', 'ذوبان', 'مثلجات', 'food'],
  ['سينما', 'فيلم', 'شاشة', 'تذكرة', 'ممثل', 'everyday'],
  ['رمضان', 'صيام', 'إفطار', 'شهر', 'سحور', 'everyday'],
  ['كمبيوتر', 'حاسوب', 'شاشة', 'لوحة مفاتيح', 'برنامج', 'science'],
  ['حديقة', 'شجر', 'أخضر', 'مشي', 'زهور', 'everyday'],
  ['مجبوس', 'أرز', 'دجاج', 'بهارات', 'لحم', 'food'],
  ['بلايستيشن', 'سوني', 'ألعاب', 'يد تحكم', 'جهاز', 'everyday'],
  ['دراجة', 'عجلتان', 'دواسة', 'سيكل', 'مقود', 'sport'],
  ['سفينة', 'بحر', 'باخرة', 'بضائع', 'ميناء', 'travel'],
  ['ثلج', 'بارد', 'أبيض', 'ذوبان', 'تجمد', 'science'],
  ['مظلة', 'مطر', 'شمسية', 'حماية', 'بلل', 'everyday'],
  ['مفتاح', 'قفل', 'باب', 'فتح', 'أسنان', 'everyday'],
  ['كيك', 'عيد ميلاد', 'كريمة', 'حلوى', 'شموع', 'food'],
  ['دونات', 'حلقة', 'عجين', 'مقلي', 'سكر', 'food'],
  ['ثلاجة', 'مطبخ', 'تبريد', 'أكل', 'باب', 'everyday'],
  ['مقص', 'قص', 'شفرة', 'ورق', 'حديد', 'everyday'],
  ['حذاء', 'قدم', 'نعال', 'لبس', 'رباط', 'everyday'],
  ['مرآة', 'انعكاس', 'وجه', 'زجاج', 'صورة', 'everyday'],
  ['قلم', 'كتابة', 'حبر', 'رصاص', 'ورق', 'everyday'],
  ['كاميرا', 'تصوير', 'عدسة', 'صورة', 'فيديو', 'science'],
  ['موز', 'أصفر', 'فاكهة', 'قشر', 'قرد', 'food'],
  ['تفاح', 'أحمر', 'فاكهة', 'شجرة', 'عصير', 'food'],
  ['حوت', 'بحر', 'كبير', 'ثديي', 'محيط', 'science'],
  ['بطريق', 'ثلج', 'طائر', 'أسود وأبيض', 'قطب', 'science'],
  ['نحلة', 'عسل', 'خلية', 'لسعة', 'حشرة', 'science'],
  ['فندق', 'غرفة', 'سفر', 'إقامة', 'استقبال', 'travel'],
  ['مسبح', 'سباحة', 'ماء', 'غوص', 'عوامة', 'sport'],
  ['هليكوبتر', 'مروحة', 'طيران', 'عمودي', 'هبوط', 'travel'],
  ['متحف', 'آثار', 'تاريخ', 'تحف', 'عرض', 'travel'],
  ['مخبز', 'خبز', 'فرن', 'طحين', 'عجين', 'food'],
  ['صياد', 'سمك', 'صنارة', 'شبكة', 'قارب', 'travel'],
  ['نجار', 'خشب', 'أثاث', 'منشار', 'مسمار', 'everyday'],
  ['ممرض', 'مريض', 'مستشفى', 'رعاية', 'دواء', 'everyday'],
  ['تابلت', 'لوحي', 'شاشة', 'آيباد', 'لمس', 'science'],
  ['مروحة', 'هواء', 'دوران', 'شفرات', 'حرارة', 'everyday'],
  ['بركان', 'حمم', 'جبل', 'ثوران', 'نار', 'science'],
  ['جاذبية', 'سقوط', 'أرض', 'نيوتن', 'قوة', 'science'],
  ['قمر', 'ليل', 'فضاء', 'هلال', 'أرض', 'science'],
  ['شمس', 'حرارة', 'ضوء', 'نجم', 'نهار', 'science'],
  ['روبوت', 'آلة', 'برمجة', 'ذكاء', 'معدن', 'science'],
  ['إنترنت', 'شبكة', 'موقع', 'اتصال', 'واي فاي', 'science'],
  ['بطارية', 'شحن', 'كهرباء', 'طاقة', 'جهاز', 'science'],
  ['مجهر', 'عدسة', 'صغير', 'مختبر', 'تكبير', 'science'],
  ['تلسكوب', 'نجوم', 'فضاء', 'عدسة', 'رصد', 'science'],
  ['ديناصور', 'انقراض', 'قديم', 'حيوان', 'أحفورة', 'science'],
  ['مغناطيس', 'حديد', 'جذب', 'قطب', 'معدن', 'science'],
  ['كسوف', 'شمس', 'قمر', 'ظلام', 'ظل', 'science'],
  ['قوس قزح', 'ألوان', 'مطر', 'سماء', 'ضوء', 'science'],
  ['صاروخ', 'فضاء', 'إطلاق', 'قمر', 'وقود', 'science'],
  ['ذكاء اصطناعي', 'حاسوب', 'تعلم', 'آلة', 'بيانات', 'science'],
  ['طاقة شمسية', 'شمس', 'ألواح', 'كهرباء', 'متجددة', 'science'],
  ['بوصلة', 'شمال', 'اتجاه', 'إبرة', 'مغناطيس', 'science'],
  ['حمض نووي', 'جينات', 'وراثة', 'خلية', 'دي إن إيه', 'science'],
  ['أكسجين', 'تنفس', 'هواء', 'غاز', 'رئة', 'science'],
  ['طابعة ثلاثية الأبعاد', 'مجسم', 'طبقات', 'بلاستيك', 'تصميم', 'science'],
  ['جواز سفر', 'حدود', 'هوية', 'ختم', 'دولة', 'travel'],
  ['حقيبة سفر', 'ملابس', 'عجلات', 'مطار', 'أمتعة', 'travel'],
  ['خيمة', 'تخييم', 'قماش', 'أوتاد', 'بر', 'travel'],
  ['جزيرة', 'بحر', 'ماء', 'يابسة', 'شاطئ', 'travel'],
  ['قطار', 'سكة', 'محطة', 'عربات', 'سفر', 'travel'],
  ['منارة', 'بحر', 'ضوء', 'سفن', 'برج', 'travel'],
  ['غابة', 'أشجار', 'حيوانات', 'طبيعة', 'أخضر', 'travel'],
  ['شلال', 'ماء', 'سقوط', 'نهر', 'صخور', 'travel'],
  ['غواصة', 'بحر', 'تحت الماء', 'قائد', 'غوص', 'travel'],
  ['تأشيرة', 'سفر', 'دخول', 'جواز', 'سفارة', 'travel'],
  ['سوق قديم', 'دكاكين', 'تجارة', 'تراث', 'شراء', 'travel'],
  ['رحلة سفاري', 'صحراء', 'حيوانات', 'سيارة', 'مغامرة', 'travel'],
  ['منتجع', 'فندق', 'إجازة', 'راحة', 'مسبح', 'travel'],
  ['منطاد', 'هواء', 'سلة', 'ارتفاع', 'بالون', 'travel'],
  ['كهف', 'صخور', 'مظلم', 'جبل', 'دخول', 'travel'],
  ['تنس', 'مضرب', 'كرة', 'شبكة', 'ملعب', 'sport'],
  ['سباحة', 'ماء', 'مسبح', 'غوص', 'نظارة', 'sport'],
  ['ملاكمة', 'قفاز', 'حلبة', 'لكمة', 'حكم', 'sport'],
  ['كرة سلة', 'سلة', 'كرة', 'ملعب', 'نقاط', 'sport'],
  ['ماراثون', 'جري', 'مسافة', 'سباق', 'نهاية', 'sport'],
  ['يوغا', 'تنفس', 'مرونة', 'بساط', 'وضعية', 'sport'],
  ['رفع أثقال', 'عضلات', 'حديد', 'أوزان', 'نادي', 'sport'],
  ['تزلج', 'ثلج', 'جليد', 'زحليقة', 'شتاء', 'sport'],
  ['بولينغ', 'كرة', 'قوارير', 'مسار', 'إسقاط', 'sport'],
  ['غولف', 'مضرب', 'حفرة', 'كرة', 'عشب', 'sport'],
  ['شطرنج', 'ملك', 'وزير', 'رقعة', 'كش', 'sport'],
  ['كرة طائرة', 'شبكة', 'كرة', 'فريق', 'إرسال', 'sport'],
  ['فروسية', 'حصان', 'ركوب', 'سرج', 'سباق', 'sport'],
  ['حكم', 'صافرة', 'مباراة', 'قرار', 'بطاقة', 'sport'],
  ['ميدالية', 'فوز', 'ذهب', 'فضة', 'برونز', 'sport'],
  ['سوشي', 'يابان', 'أرز', 'سمك', 'أعشاب', 'food'],
  ['كرواسون', 'فرنسا', 'عجين', 'هلال', 'زبدة', 'food'],
  ['شاورما', 'لحم', 'دجاج', 'خبز', 'سيخ', 'food'],
  ['فلافل', 'حمص', 'مقلي', 'ساندويتش', 'طحينة', 'food'],
  ['عسل', 'نحل', 'حلو', 'خلية', 'ذهبي', 'food'],
  ['فشار', 'ذرة', 'سينما', 'فرقعة', 'حبوب', 'food'],
  ['ليمون', 'حامض', 'أصفر', 'فاكهة', 'عصير', 'food'],
  ['رمان', 'حبات', 'أحمر', 'فاكهة', 'قشر', 'food'],
  ['بطيخ', 'أحمر', 'أخضر', 'بذور', 'صيف', 'food'],
  ['بطاطس', 'مقلي', 'أصابع', 'نشا', 'تربة', 'food'],
  ['عدس', 'شوربة', 'حبوب', 'بروتين', 'أصفر', 'food'],
  ['جبن', 'حليب', 'بيتزا', 'أبيض', 'شيدر', 'food'],
  ['كبسة', 'أرز', 'لحم', 'بهارات', 'دجاج', 'food'],
  ['معكرونة', 'إيطاليا', 'صلصة', 'عجين', 'سباغيتي', 'food'],
  ['تمر', 'نخلة', 'حلو', 'رمضان', 'نواة', 'food'],
  ['سماعة', 'أذن', 'صوت', 'موسيقى', 'بلوتوث', 'everyday'],
  ['مصعد', 'طابق', 'ارتفاع', 'زر', 'بناية', 'everyday'],
  ['غسالة', 'ملابس', 'ماء', 'تنظيف', 'صابون', 'everyday'],
  ['كنبة', 'جلوس', 'أثاث', 'صالة', 'وسادة', 'everyday'],
  ['محفظة', 'نقود', 'بطاقات', 'جيب', 'جلد', 'everyday'],
  ['فرشاة أسنان', 'معجون', 'فم', 'تنظيف', 'تسوس', 'everyday'],
  ['شمعة', 'نار', 'شمع', 'ضوء', 'فتيل', 'everyday'],
  ['هدية', 'مناسبة', 'تغليف', 'مفاجأة', 'عيد', 'everyday'],
  ['تقويم', 'أيام', 'شهور', 'تاريخ', 'سنة', 'everyday'],
  ['خريطة', 'بلدان', 'اتجاه', 'طريق', 'موقع', 'everyday'],
  ['مكبر صوت', 'صوت', 'موسيقى', 'سماعة', 'عالي', 'everyday'],
  ['بريد', 'رسالة', 'طابع', 'عنوان', 'ظرف', 'everyday'],
  ['مسرح', 'ممثل', 'عرض', 'جمهور', 'ستارة', 'everyday'],
  ['تاج', 'ملك', 'رأس', 'ذهب', 'ملكة', 'everyday'],
  ['سجادة', 'أرض', 'قماش', 'غرفة', 'نسج', 'everyday'],
];
function startTaboo() {
  const s = state,
    category = $('taboocategory')?.value || 'all',
    pool = tabooDeck.filter((v) => category === 'all' || v[5] === category);
  Object.assign(s, {
    players: [...store.players],
    duration: extraOption('duration', 60, 30, 180),
    rounds: extraOption('rounds', 1, 1, 5),
    turn: 0,
    queue: gShuffle(pool.length ? pool : tabooDeck),
    index: 0,
    results: Object.fromEntries(store.players.map((n) => [n, 0])),
    stage: 'handoff',
    turnHistory: [],
    cardHidden: true,
    turnSummaries: [],
  });
  s.onPause = () => {
    if (s.stage === 'active') {
      s.cardHidden = true;
      s.cardPauseAt = Date.now();
      renderTaboo();
    }
  };
  s.onResume = () => {
    if (s.cardPauseAt) {
      s.cardAt += Date.now() - s.cardPauseAt;
      delete s.cardPauseAt;
    }
    if (s.stage === 'active') renderTaboo();
  };
  tabooHandoff();
}
function tabooHandoff() {
  const s = state;
  clearTimers();
  if (s.turn >= s.players.length * s.rounds) {
    s.done = true;
    return partyResult('taboo', s);
  }
  s.stage = 'handoff';
  setHTML(
    wrap(
      'taboo',
      `<section class="panel center"><div class="resulticon">🚫</div><h2>الدور على ${esc(s.players[s.turn % s.players.length])}</h2><p class="note">الجولة ${Math.floor(s.turn / s.players.length) + 1} / ${s.rounds}. الشاشة مع الشخص الذي يشرح؛ البقية يسمعون.</p><p class="note">المراقب: ${esc(s.players[(s.turn + 1) % s.players.length])}؛ يتابع الكلمات الممنوعة ويسجل المخالفات. يتبدل مع كل دور.</p><p class="tiny">${s.queue.length} بطاقة في المجموعة · 4 كلمات ممنوعة لكل بطاقة.</p><div class="actions"><button class="primary" onclick="tabooReady()">أنا جاهز للشرح</button></div></section>`,
    ),
  );
}
function tabooReady() {
  if (screen !== 'taboo' || state.stage !== 'handoff' || advancedBlocked()) return;
  Object.assign(state, {
    stage: 'active',
    cardHidden: false,
    started: Date.now(),
    cardAt: Date.now(),
    score: 0,
    correct: 0,
    skips: 0,
    violations: 0,
    streak: 0,
    bestStreak: 0,
    endAt: Date.now() + state.duration * 1000,
    turnHistory: [],
  });
  nextTabooCard();
  renderTaboo();
  clockLoop(state, endTaboo);
}
function nextTabooCard() {
  const s = state;
  if (s.index >= s.queue.length) {
    const previous = s.card;
    s.queue = gShuffle(s.queue);
    if (s.queue.length > 1 && s.queue[0] === previous)
      [s.queue[0], s.queue[1]] = [s.queue[1], s.queue[0]];
    s.index = 0;
  }
  s.card = s.queue[s.index++];
}
function renderTaboo() {
  const s = state;
  setHTML(
    wrap(
      'taboo',
      smallStats([
        ['الدور على', esc(s.players[s.turn % s.players.length])],
        ['الوقت', secondsLeft(s), 'gametime'],
        ['النقاط', s.score],
      ]) +
        `<section class="panel center"><div class="spot"><small>اشرح هذه الكلمة</small><div class="secret">${s.cardHidden ? '🔒 البطاقة مخفية' : esc(s.card[0])}</div></div><div class="actions"><button onclick="toggleTabooCard()" aria-pressed="${!s.cardHidden}">${s.cardHidden ? 'اعرض البطاقة للشارح' : 'اخفِ البطاقة'}</button></div><p class="tiny">${s.cardHidden ? 'اعرض البطاقة عندما تكون الشاشة مع الشارح.' : 'ممنوع ذكر الكلمة أو جزء منها، وكذلك:'}</p><div class="forbidden">${(s.cardHidden
          ? []
          : s.card
        )
          .slice(1, 5)
          .map((w) => `<span>${esc(w)}</span>`)
          .join(
            '',
          )}</div><div class="actions"><button class="primary" onclick="tabooAnswer('correct')" ${s.cardHidden ? 'disabled' : ''}>عرفوها! +10</button><button onclick="tabooAnswer('skip')" ${s.cardHidden ? 'disabled' : ''}>تجاوز −2</button><button class="softred" onclick="tabooAnswer('violation')" ${s.cardHidden ? 'disabled' : ''}>مخالفة −5</button><button onclick="undoTaboo()" ${s.turnHistory.length ? '' : 'disabled'}>↶ تراجع عن التسجيل</button></div><p class="note">الصحيح ${s.correct} · التجاوز ${s.skips} · المخالفات ${s.violations} · سلسلة ${s.streak}. كل 3 كلمات صحيحة متتالية تمنح +5؛ التجاوز والمخالفة يقطعان السلسلة.</p><p class="tiny">البقية يحكمون؛ الشرح بالكلام دون تمثيل أو تهجئة. النقاط لا تنزل تحت الصفر.</p><div class="actions"><button class="quiet" onclick="endTaboo()">أنهي الدور</button></div></section>`,
    ),
  );
}
function toggleTabooCard() {
  const s = state;
  if (screen !== 'taboo' || s.done || s.stage !== 'active' || advancedBlocked()) return;
  if (secondsLeft(s) === 0) return endTaboo();
  s.cardHidden = !s.cardHidden;
  renderTaboo();
}
function tabooAnswer(answer) {
  const s = state;
  if (
    screen !== 'taboo' ||
    s.stage !== 'active' ||
    s.done ||
    s.cardHidden ||
    advancedBlocked() ||
    !['correct', 'skip', 'violation'].includes(answer)
  )
    return;
  if (secondsLeft(s) === 0) return endTaboo();
  s.turnHistory.push({
    answer,
    ms: Math.max(0, Date.now() - s.cardAt),
    cardAt: s.cardAt,
    word: s.card[0],
    card: s.card,
    queue: [...s.queue],
    index: s.index,
    score: s.score,
    correct: s.correct,
    skips: s.skips,
    violations: s.violations,
    streak: s.streak,
    bestStreak: s.bestStreak,
  });
  if (answer === 'correct') {
    s.streak++;
    s.bestStreak = Math.max(s.bestStreak, s.streak);
    s.score += 10 + (s.streak % 3 === 0 ? 5 : 0);
    s.correct++;
    tone();
  } else if (answer === 'skip') {
    s.streak = 0;
    s.score = Math.max(0, s.score - 2);
    s.skips++;
  } else {
    s.streak = 0;
    s.score = Math.max(0, s.score - 5);
    s.violations++;
  }
  nextTabooCard();
  s.cardAt = Date.now();
  renderTaboo();
}
function undoTaboo() {
  const s = state;
  if (screen !== 'taboo' || s.stage !== 'active' || advancedBlocked() || !s.turnHistory.length)
    return;
  if (secondsLeft(s) === 0) return endTaboo();
  const h = s.turnHistory.pop();
  Object.assign(s, {
    card: h.card,
    cardAt: h.cardAt,
    queue: h.queue,
    index: h.index,
    score: h.score,
    correct: h.correct,
    skips: h.skips,
    violations: h.violations,
    streak: h.streak,
    bestStreak: h.bestStreak,
  });
  renderTaboo();
}
function endTaboo() {
  const s = state;
  if (screen !== 'taboo' || s.stage !== 'active' || advancedBlocked()) return;
  clearTimers();
  s.stage = 'result';
  const name = s.players[s.turn % s.players.length];
  s.results[name] += s.score;
  const elapsed = extraElapsed(s),
    average = s.turnHistory.filter((h) => h.answer === 'correct');
  s.turnSummaries ??= [];
  s.turnSummaries.push({
    name,
    score: s.score,
    correct: s.correct,
    skips: s.skips,
    violations: s.violations,
    elapsed,
  });
  addScore(name, s.score);
  setHTML(
    wrap(
      'taboo',
      `<section class="panel center"><div class="resulticon">⏱</div><h2>انتهى دور ${esc(name)}</h2><div class="spot"><div class="huge">${s.score}</div><small>نقاط الدور</small></div><p class="note">${s.correct} صحيح · ${s.skips} تجاوز · ${s.violations} مخالفة · ${elapsed} ثانية · أفضل سلسلة ${s.bestStreak}</p>${average.length ? `<p class="tiny">متوسط الشرح الصحيح ${(average.reduce((sum, h) => sum + h.ms, 0) / average.length / 1000).toFixed(1)} ثانية. الأرقام أداة للمراجعة؛ الحكم على الشرح للبقية.</p>` : ''}<details class="history"><summary>سجل الكلمات في هذا الدور</summary><div class="listchips">${s.turnHistory.map((h) => `<span>${h.answer === 'correct' ? '✓' : h.answer === 'skip' ? '↷' : '✕'} ${esc(h.word)}</span>`).join('') || '<span>لم تُسجل كلمات</span>'}</div></details><div class="actions"><button class="primary" onclick="advanceTaboo()">الدور التالي ←</button></div></section>`,
    ),
  );
}
function advanceTaboo() {
  if (screen !== 'taboo' || state.stage !== 'result' || advancedBlocked()) return;
  state.turn++;
  tabooHandoff();
}

function updateRangeInfo() {
  const free = $('preset').value === 'free';
  $('minfield').hidden = free;
  $('maxfield').hidden = free;
  if (free) {
    $('rangeinfo').textContent =
      'نبدأ من 0 ونحدد الاتجاه، ثم نوسع البحث ونضيق النطاق. عدد المحاولات يزيد مع حجم الرقم.';
    return;
  }
  try {
    const [l, h] = bounds();
    $('rangeinfo').textContent =
      `${fmt(h - l + 1n)} احتمال · حتى ${limit(l, h)} محاولة بالبحث المنظم.`;
  } catch (e) {
    $('rangeinfo').textContent = latin(e.message);
  }
}
document.addEventListener('keydown', (e) => {
  if (
    advancedBlocked() ||
    e.target?.matches?.('input,select,textarea,[contenteditable="true"]') ||
    e.repeat ||
    state.done
  )
    return;
  const key = latin(e.key);
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    if (screen === 'sudoku') {
      e.preventDefault();
      undoSudoku();
    } else if (screen === 'slide') {
      e.preventDefault();
      undoSlide();
    } else if (['ttt', 'connect'].includes(screen)) {
      e.preventDefault();
      undoBoard();
    }
    return;
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (['Enter', ' '].includes(e.key) && e.target?.closest?.('button,a,summary,[role="button"]'))
    return;
  if (screen === 'sudoku') {
    if (/^[1-9]$/.test(key)) {
      e.preventDefault();
      putSudoku(Number(key));
    } else if (['Backspace', 'Delete', '0'].includes(key)) {
      e.preventDefault();
      putSudoku(0);
    } else if (e.key.toLowerCase() === 'n') {
      e.preventDefault();
      toggleSudokuNotes();
    } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      const i = state.selected,
        r = Math.floor(i / 9),
        c = i % 9;
      if (e.key === 'ArrowUp' && r > 0) selectSudoku(i - 9);
      else if (e.key === 'ArrowDown' && r < 8) selectSudoku(i + 9);
      else if (e.key === 'ArrowLeft' && c > 0) selectSudoku(i - 1);
      else if (e.key === 'ArrowRight' && c < 8) selectSudoku(i + 1);
    }
  } else if (
    screen === 'slide' &&
    ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)
  ) {
    e.preventDefault();
    const offset = { ArrowUp: -state.size, ArrowDown: state.size, ArrowLeft: -1, ArrowRight: 1 }[
        e.key
      ],
      next = state.empty + offset;
    if (slideNeighbors(state.empty, state.size).includes(next)) slideMove(next);
  } else if (screen === 'simon' && /^[1-4]$/.test(key)) {
    e.preventDefault();
    simonTap(Number(key) - 1);
  } else if (['math', 'color', 'pattern'].includes(screen) && /^[1-7]$/.test(key)) {
    e.preventDefault();
    answerQuiz(Number(key) - 1);
    $('quiznext')?.focus({ preventScroll: true });
  } else if (screen === 'connect' && /^[1-7]$/.test(key)) {
    e.preventDefault();
    boardMove(Number(key) - 1);
  } else if (screen === 'ttt' && /^[1-9]$/.test(key)) {
    e.preventDefault();
    boardMove(Number(key) - 1);
  } else if (screen === 'finder') {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      finderAnswer('higher');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      finderAnswer('lower');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      finderAnswer('correct');
    }
  } else if (
    screen === 'reaction' &&
    ['idle', 'waiting', 'ready', 'decoy'].includes(state.stage) &&
    e.key === ' '
  ) {
    e.preventDefault();
    reactionTap();
  }
});

// A deliberate swipe moves the empty square once; the following synthetic click
// is consumed so that one gesture cannot accidentally move a second tile.
let slideGesture = null,
  slideSuppressClickUntil = 0;
document.addEventListener('pointerdown', (event) => {
  if (
    screen !== 'slide' ||
    state.done ||
    advancedBlocked() ||
    !event.target.closest?.('.puzzle') ||
    event.button > 0
  )
    return;
  slideGesture = { s: state, pointerId: event.pointerId, x: event.clientX, y: event.clientY };
});
document.addEventListener('pointercancel', () => {
  slideGesture = null;
});
document.addEventListener('pointerup', (event) => {
  const gesture = slideGesture;
  slideGesture = null;
  if (
    !gesture ||
    gesture.s !== state ||
    event.pointerId !== gesture.pointerId ||
    screen !== 'slide' ||
    state.done ||
    advancedBlocked()
  )
    return;
  const dx = event.clientX - gesture.x,
    dy = event.clientY - gesture.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;
  slideSuppressClickUntil = Date.now() + 350;
  const offset = Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : Math.sign(dy) * state.size,
    next = state.empty + offset;
  if (slideNeighbors(state.empty, state.size).includes(next)) slideMove(next);
});
document.addEventListener(
  'click',
  (event) => {
    if (Date.now() < slideSuppressClickUntil && event.target.closest?.('.puzzle')) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  },
  true,
);
