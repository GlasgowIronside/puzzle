const DEFAULT_CONFIG = {
  board_size: [10, 5],
  allow_reflection: true,
  holes: [[1, 2], [5, 3], [10, 2]],
  fixed_blocks: {
    orange: [[9, 3], [10, 3], [9, 4], [10, 4], [9, 5], [10, 5]],
  },
  constraints: {
    forbid_reflection: [],
    fixed_piece_positions: {},
    must_cover: {},
    must_not_cover: {},
  },
  label_map: {
    months: { APR: [1, 2] },
    days: { 15: [5, 3] },
    weekdays: { WED: [10, 2] },
  },
  piece_shapes: {
    green: [[1, 1, 1, 1], [0, 0, 1, 0]],
    purple: [[1, 1, 1, 0], [0, 0, 1, 1]],
    yellow: [[0, 1, 1], [0, 1, 0], [1, 1, 0]],
    red: [[1, 1, 1], [0, 0, 1], [0, 0, 1]],
    gray: [[1, 1, 0], [0, 1, 1], [0, 1, 1]],
    pink: [[1, 1, 1], [1, 0, 1]],
    lightblue: [[1, 0], [1, 1], [1, 1]],
    darkblue: [[1, 1, 1, 1], [0, 0, 0, 1]],
  },
};

const PIECE_COLORS = {
  green: '#22c55e',
  purple: '#a855f7',
  yellow: '#facc15',
  red: '#f87171',
  gray: '#94a3b8',
  pink: '#f472b6',
  lightblue: '#38bdf8',
  darkblue: '#3b82f6',
  orange: '#fb923c',
};

const state = {
  config: clone(DEFAULT_CONFIG),
  month: 'APR',
  day: '15',
  weekday: 'WED',
  selectedPiece: null,
  placements: new Map(),
  pieceStates: {},
  message: '准备就绪',
  exportText: '',
};

const els = {};
const toastState = { timer: null };
let dragState = null;
let inputLockUntil = 0;

const CELL = 44;

main();

function main() {
  cacheElements();
  initPieceStates(state.config);
  populateSelectors();
  bindEvents();
  applyDateSelection(false);
  render();
}

function cacheElements() {
  for (const id of [
    'board', 'statusText', 'pieceList', 'jsonBox', 'monthSelect', 'daySelect',
    'weekdaySelect', 'btnAutoSolve', 'btnResetBoard', 'btnCancelSelection',
    'btnRotate', 'btnFlip', 'btnRecycle', 'btnExportLayout', 'btnImportLayout',
    'btnSaveImage', 'btnClearDate', 'configFile', 'btnLoadConfig', 'boardWrap',
  ]) {
    els[id] = document.getElementById(id);
  }
}

function initPieceStates(config) {
  state.pieceStates = {};
  for (const name of Object.keys(config.piece_shapes)) {
    state.pieceStates[name] = { rotation: 0, reflected: false };
  }
}

function bindEvents() {
  els.btnAutoSolve.addEventListener('click', handleAutoSolve);
  els.btnResetBoard.addEventListener('click', resetBoard);
  els.btnCancelSelection.addEventListener('click', () => selectPiece(null));
  els.btnRotate.addEventListener('click', () => rotateSelectedPiece());
  els.btnFlip.addEventListener('click', () => flipSelectedPiece());
  els.btnRecycle.addEventListener('click', recycleSelectedPiece);
  els.btnExportLayout.addEventListener('click', exportLayout);
  els.btnImportLayout.addEventListener('click', importLayoutFromBox);
  els.btnSaveImage.addEventListener('click', saveBoardImage);
  els.btnClearDate.addEventListener('click', clearDateSelection);
  els.btnLoadConfig.addEventListener('click', loadConfigFromFile);
  els.monthSelect.addEventListener('change', () => {
    state.month = els.monthSelect.value;
    applyDateSelection(true);
  });
  els.daySelect.addEventListener('change', () => {
    state.day = els.daySelect.value;
    applyDateSelection(true);
  });
  els.weekdaySelect.addEventListener('change', () => {
    state.weekday = els.weekdaySelect.value;
    applyDateSelection(true);
  });
  els.board.addEventListener('contextmenu', (event) => event.preventDefault());
  window.addEventListener('keydown', handleKeyboard);
}

function populateSelectors() {
  fillSelect(els.monthSelect, Object.keys(state.config.label_map?.months ?? {}), state.month);
  fillSelect(els.daySelect, Object.keys(state.config.label_map?.days ?? {}), state.day);
  fillSelect(els.weekdaySelect, Object.keys(state.config.label_map?.weekdays ?? {}), state.weekday);
}

function fillSelect(select, values, current) {
  const unique = [...new Set(values)].sort((a, b) => String(a).localeCompare(String(b), 'zh-Hans-CN', { numeric: true }));
  select.innerHTML = '';
  if (unique.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = '—';
    select.appendChild(option);
    select.disabled = true;
    return;
  }
  select.disabled = false;
  for (const value of unique) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  }
  select.value = unique.includes(current) ? current : unique[0];
}

function applyDateSelection(resetPlacements) {
  const holes = resolveHoles(state.config, state.month, state.day, state.weekday);
  state.message = `日期点：${[state.month, state.day, state.weekday].filter(Boolean).join(' / ') || '未选择'}`;
  if (resetPlacements) {
    state.placements.clear();
    selectPiece(null);
  }
  render();
  if (holes.size === 0) {
    toast('当前没有新增日期点，使用固定障碍块继续摆放。');
  }
}

function clearDateSelection() {
  state.month = '';
  state.day = '';
  state.weekday = '';
  els.monthSelect.value = '';
  els.daySelect.value = '';
  els.weekdaySelect.value = '';
  state.placements.clear();
  selectPiece(null);
  state.message = '已清空日期点';
  render();
}

function resetBoard() {
  state.placements.clear();
  initPieceStates(state.config);
  selectPiece(null);
  state.message = '已重置摆放';
  render();
}

function selectPiece(pieceName) {
  state.selectedPiece = pieceName;
  if (pieceName) {
    state.message = `已选中 ${pieceName}，点击棋盘空位放置`;
  } else {
    state.message = '已取消选中';
  }
  render();
}

function recycleSelectedPiece() {
  const piece = state.selectedPiece;
  if (!piece) {
    toast('请先选择一个拼块。');
    return;
  }
  if (state.placements.delete(piece)) {
    state.message = `已回收 ${piece}`;
  } else {
    state.message = `${piece} 当前不在棋盘上`;
  }
  render();
}

function rotateSelectedPiece() {
  const piece = state.selectedPiece;
  if (!piece) {
    toast('请先选择一个拼块。');
    return;
  }
  if (state.placements.has(piece)) {
    state.placements.delete(piece);
  }
  state.pieceStates[piece].rotation = (state.pieceStates[piece].rotation + 1) % 4;
  state.message = `${piece} 已旋转`;
  render();
}

function flipSelectedPiece() {
  const piece = state.selectedPiece;
  if (!piece) {
    toast('请先选择一个拼块。');
    return;
  }
  if (!canReflectPiece(piece)) {
    toast(`拼块 ${piece} 不允许翻面。`);
    return;
  }
  if (state.placements.has(piece)) {
    state.placements.delete(piece);
  }
  state.pieceStates[piece].reflected = !state.pieceStates[piece].reflected;
  state.message = `${piece} 已翻转`;
  render();
}

function handleKeyboard(event) {
  if (event.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) {
    return;
  }
  const key = event.key.toLowerCase();
  if (key === 'r') {
    event.preventDefault();
    rotateSelectedPiece();
  } else if (key === 'f') {
    event.preventDefault();
    flipSelectedPiece();
  } else if (key === 'e') {
    event.preventDefault();
    selectPiece(null);
    toast('已取消选中。');
  }
}

function render() {
  renderBoard();
  renderPieceList();
  updateStatus();
}

function renderBoard() {
  const { width, height } = getBoardSize(state.config);
  const board = els.board;
  board.innerHTML = '';
  board.style.gridTemplateColumns = `repeat(${width}, ${CELL}px)`;
  board.style.gridTemplateRows = `repeat(${height}, ${CELL}px)`;
  board.style.width = `${width * CELL}px`;
  board.style.height = `${height * CELL}px`;

  const holes = resolveHoles(state.config, state.month, state.day, state.weekday);
  const fixedBlocks = toCellSets(state.config.fixed_blocks ?? {});
  const selectedPieceCells = state.selectedPiece && state.placements.get(state.selectedPiece)?.cells;
  const occupied = buildOccupiedMap();

  for (let y = 1; y <= height; y += 1) {
    for (let x = 1; x <= width; x += 1) {
      const key = cellKey(x, y);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'board-cell';
      button.dataset.x = String(x);
      button.dataset.y = String(y);
      button.textContent = x === 1 ? `${y}` : '';
      if (isTargetCell(key, holes, fixedBlocks)) button.classList.add('is-target');
      if (holes.has(key)) button.classList.add('is-hole');
      if (fixedBlocks.has(key)) button.classList.add('is-fixed');
      if (selectedPieceCells && selectedPieceCells.has(key)) button.classList.add('is-selected-target');
      button.addEventListener('click', () => handleBoardClick(x, y));
      button.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        handleBoardRightClick(x, y, occupied);
      });
      board.appendChild(button);
    }
  }

  const overlay = document.createElement('div');
  overlay.className = 'board-overlay';

  for (const [piece, placement] of state.placements.entries()) {
    const layer = renderPlacementLayer(piece, placement.cells, width, height);
    layer.classList.toggle('selected', piece === state.selectedPiece);
    overlay.appendChild(layer);
  }

  board.appendChild(overlay);
}

function renderPlacementLayer(piece, cells, width, height) {
  const layer = document.createElement('button');
  layer.type = 'button';
  layer.className = 'piece-layer';
  layer.style.pointerEvents = 'none';
  const color = PIECE_COLORS[piece] ?? '#60a5fa';
  const arr = [...cells].map(parseKey);
  const minX = Math.min(...arr.map(([x]) => x));
  const minY = Math.min(...arr.map(([, y]) => y));
  const maxX = Math.max(...arr.map(([x]) => x));
  const maxY = Math.max(...arr.map(([, y]) => y));
  layer.style.left = `${(minX - 1) * CELL}px`;
  layer.style.top = `${(minY - 1) * CELL}px`;
  layer.style.width = `${(maxX - minX + 1) * CELL}px`;
  layer.style.height = `${(maxY - minY + 1) * CELL}px`;
  layer.style.background = 'transparent';
  layer.addEventListener('click', (event) => {
    event.stopPropagation();
    selectPiece(piece);
  });
  layer.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    event.stopPropagation();
    state.placements.delete(piece);
    state.selectedPiece = piece;
    state.message = `已移除 ${piece}`;
    render();
  });

  for (const [x, y] of arr) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.piece = piece;
    cell.style.pointerEvents = 'auto';
    cell.style.touchAction = 'none';
    cell.style.left = `${(x - minX) * CELL}px`;
    cell.style.top = `${(y - minY) * CELL}px`;
    cell.style.width = `${CELL}px`;
    cell.style.height = `${CELL}px`;
    cell.style.background = color;
    cell.addEventListener('click', (event) => {
      event.stopPropagation();
      if (shouldIgnoreInput()) return;
      selectPiece(piece);
    });
    cell.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (shouldIgnoreInput()) return;
      state.placements.delete(piece);
      state.selectedPiece = piece;
      state.message = `已移除 ${piece}`;
      render();
    });
    cell.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.button !== 0 || shouldIgnoreInput()) return;
      beginDrag(piece, x, y, event);
    });
    layer.appendChild(cell);
  }

  return layer;
}

function renderPieceList() {
  const list = els.pieceList;
  list.innerHTML = '';
  for (const name of Object.keys(state.config.piece_shapes)) {
    const template = document.getElementById('pieceTemplate');
    const card = template.content.firstElementChild.cloneNode(true);
    const title = card.querySelector('.piece-card-title');
    const preview = card.querySelector('.piece-preview');
    title.textContent = name;
    card.classList.toggle('active', state.selectedPiece === name);
    card.addEventListener('click', () => selectPiece(name));
    card.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      state.selectedPiece = name;
      state.placements.delete(name);
      render();
    });

    const placement = state.placements.get(name);
    const ps = state.pieceStates[name];
    const orientation = getCurrentOrientationCells(name);
    const previewCells = orientation.length ? orientation : matrixToCells(state.config.piece_shapes[name]);
    const bounds = getBounds(previewCells);
    const previewInner = document.createElement('div');
    previewInner.style.position = 'relative';
    previewInner.style.width = `${bounds.width * 24}px`;
    previewInner.style.height = `${bounds.height * 24}px`;
    previewInner.style.margin = '0 auto';
    previewInner.style.marginTop = '10px';

    for (const [x, y] of previewCells) {
      const block = document.createElement('div');
      block.className = 'cell';
      block.style.left = `${(x - bounds.minX) * 24}px`;
      block.style.top = `${(y - bounds.minY) * 24}px`;
      block.style.width = '24px';
      block.style.height = '24px';
      block.style.background = PIECE_COLORS[name] ?? '#60a5fa';
      previewInner.appendChild(block);
    }
    preview.appendChild(previewInner);

    const status = document.createElement('div');
    status.className = 'piece-status';
    status.textContent = placement ? '已放置' : `旋转 ${ps.rotation * 90}°${ps.reflected ? ' · 翻面' : ''}`;
    card.appendChild(status);

    list.appendChild(card);
  }
}

function updateStatus() {
  const holes = resolveHoles(state.config, state.month, state.day, state.weekday);
  const summary = [
    state.message,
    `日期点 ${holes.size > 0 ? [...holes].map(parseKey).map(([x, y]) => `(${x},${y})`).join(' / ') : '无'}`,
    `已放置 ${state.placements.size}/${Object.keys(state.config.piece_shapes).length}`,
  ].join(' · ');
  els.statusText.textContent = summary;
}

function handleBoardClick(x, y) {
  if (shouldIgnoreInput()) return;
  if (!state.selectedPiece) {
    const owner = getOccupiedOwner(x, y);
    if (owner) {
      selectPiece(owner);
    } else {
      toast('请先选择一个拼块，再点击棋盘放置。');
    }
    return;
  }
  placeSelectedPiece(x, y);
}

function handleBoardRightClick(x, y, occupied) {
  if (shouldIgnoreInput()) return;
  const owner = getOccupiedOwner(x, y);
  if (!owner) return;
  state.placements.delete(owner);
  state.selectedPiece = owner;
  state.message = `已移除 ${owner}`;
  render();
}

function shouldIgnoreInput() {
  return performance.now() < inputLockUntil;
}

function lockInput(ms = 220) {
  inputLockUntil = performance.now() + ms;
}

function beginDrag(piece, cellX, cellY, event) {
  const placement = state.placements.get(piece);
  if (!placement) return;

  const cells = [...placement.cells].map(parseKey);
  const minX = Math.min(...cells.map(([x]) => x));
  const minY = Math.min(...cells.map(([, y]) => y));

  dragState = {
    piece,
    pointerId: event.pointerId,
    originMinX: minX,
    originMinY: minY,
    offsetX: cellX - minX,
    offsetY: cellY - minY,
    ghost: null,
    currentClientX: event.clientX,
    currentClientY: event.clientY,
    started: false,
    previousMessage: state.message,
    lastValidAnchor: null,
  };

  state.selectedPiece = piece;
  state.message = `拖动 ${piece} 中`;
  render();

  try {
    event.currentTarget?.setPointerCapture?.(event.pointerId);
  } catch {
    // Ignore capture failures in browsers that do not support it in this context.
  }

  document.addEventListener('pointermove', onGlobalPointerMove, true);
  document.addEventListener('pointerup', onGlobalPointerUp, true);
  document.addEventListener('mouseup', onGlobalMouseUp, true);
  document.addEventListener('pointercancel', cancelDrag, true);
}

function onGlobalPointerMove(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) return;
  dragState.currentClientX = event.clientX;
  dragState.currentClientY = event.clientY;

  const boardPoint = clientToBoardCell(event.clientX, event.clientY);
  if (!boardPoint) {
    if (dragState.lastValidAnchor) {
      showDragGhost(dragState.piece, dragState.lastValidAnchor.x, dragState.lastValidAnchor.y);
    } else {
      hideDragGhost();
    }
    return;
  }

  const [boardX, boardY] = boardPoint;
  const anchorX = boardX - dragState.offsetX;
  const anchorY = boardY - dragState.offsetY;
  if (!dragState.started) {
    dragState.started = true;
    lockInput(300);
  }
  dragState.lastValidAnchor = { x: anchorX, y: anchorY };
  showDragGhost(dragState.piece, anchorX, anchorY);
}

function onGlobalPointerUp(event) {
  if (!dragState || (event.pointerId !== undefined && event.pointerId !== dragState.pointerId)) return;

  const boardPoint = clientToBoardCell(event.clientX, event.clientY);
  const piece = dragState.piece;
  const previousMessage = dragState.previousMessage;
  const hasMoved = dragState.started;
  const fallbackAnchor = dragState.lastValidAnchor;
  removeDragGhost();
  cleanupDragListeners();

  if (!hasMoved || (!boardPoint && !fallbackAnchor)) {
    state.message = previousMessage;
    render();
    dragState = null;
    lockInput(180);
    return;
  }

  const [boardX, boardY] = boardPoint ?? [fallbackAnchor.x + dragState.offsetX, fallbackAnchor.y + dragState.offsetY];
  const anchorX = boardPoint ? boardX - dragState.offsetX : fallbackAnchor.x;
  const anchorY = boardPoint ? boardY - dragState.offsetY : fallbackAnchor.y;
  dragState = null;
  lockInput(220);
  state.selectedPiece = piece;
  const success = placeSelectedPiece(anchorX, anchorY);
  if (!success) {
    state.message = previousMessage;
    render();
  }
}

function cancelDrag() {
  removeDragGhost();
  cleanupDragListeners();
  if (dragState?.previousMessage) {
    state.message = dragState.previousMessage;
    render();
  }
  dragState = null;
}

function cleanupDragListeners() {
  document.removeEventListener('pointermove', onGlobalPointerMove, true);
  document.removeEventListener('pointerup', onGlobalPointerUp, true);
  document.removeEventListener('mouseup', onGlobalMouseUp, true);
  document.removeEventListener('pointercancel', cancelDrag, true);
}

function onGlobalMouseUp(event) {
  if (!dragState) return;
  onGlobalPointerUp({
    pointerId: dragState.pointerId,
    clientX: event.clientX,
    clientY: event.clientY,
  });
}

function clientToBoardCell(clientX, clientY) {
  const rect = els.board.getBoundingClientRect();
  const x = Math.floor((clientX - rect.left) / CELL) + 1;
  const y = Math.floor((clientY - rect.top) / CELL) + 1;
  const { width, height } = getBoardSize(state.config);
  if (x < 1 || y < 1 || x > width || y > height) return null;
  return [x, y];
}

function showDragGhost(piece, anchorX, anchorY) {
  const placement = state.placements.get(piece);
  if (!placement) return;
  const cells = [...placement.cells].map(parseKey);
  const minX = Math.min(...cells.map(([x]) => x));
  const minY = Math.min(...cells.map(([, y]) => y));
  const layer = dragState?.ghost ?? createGhostLayer(piece, cells, minX, minY);
  if (!dragState.ghost) {
    dragState.ghost = layer;
    els.board.appendChild(layer);
  }
  layer.style.left = `${(anchorX - 1) * CELL}px`;
  layer.style.top = `${(anchorY - 1) * CELL}px`;
  layer.style.display = 'block';
}

function hideDragGhost() {
  if (dragState?.ghost) {
    dragState.ghost.style.display = 'none';
  }
}

function removeDragGhost() {
  if (dragState?.ghost) {
    dragState.ghost.remove();
    dragState.ghost = null;
  }
}

function createGhostLayer(piece, cells, minX, minY) {
  const layer = document.createElement('div');
  layer.className = 'piece-layer drag-ghost';
  layer.style.pointerEvents = 'none';
  const color = PIECE_COLORS[piece] ?? '#60a5fa';
  const maxX = Math.max(...cells.map(([x]) => x));
  const maxY = Math.max(...cells.map(([, y]) => y));
  layer.style.width = `${(maxX - minX + 1) * CELL}px`;
  layer.style.height = `${(maxY - minY + 1) * CELL}px`;
  for (const [x, y] of cells) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.style.left = `${(x - minX) * CELL}px`;
    cell.style.top = `${(y - minY) * CELL}px`;
    cell.style.width = `${CELL}px`;
    cell.style.height = `${CELL}px`;
    cell.style.background = color;
    layer.appendChild(cell);
  }
  return layer;
}

function placeSelectedPiece(anchorX, anchorY) {
  const piece = state.selectedPiece;
  if (!piece) return false;
  const current = state.placements.get(piece);
  if (current) state.placements.delete(piece);
  const result = buildPlacement(piece, anchorX, anchorY);
  if (!result.valid) {
    if (current) state.placements.set(piece, current);
    toast(result.reason);
    return false;
  }
  state.placements.set(piece, { cells: result.cells });
  state.message = `已放置 ${piece} 到 (${anchorX}, ${anchorY})`;
  render();
  return true;
}

function buildPlacement(piece, anchorX, anchorY) {
  const oriented = getCurrentOrientationCells(piece);
  const { width, height } = getBoardSize(state.config);
  const holes = resolveHoles(state.config, state.month, state.day, state.weekday);
  const occupied = buildOccupiedMap();
  const cells = new Set();
  for (const [dx, dy] of oriented) {
    const x = anchorX + dx;
    const y = anchorY + dy;
    if (x < 1 || y < 1 || x > width || y > height) {
      return { valid: false, reason: `拼块 ${piece} 超出棋盘边界` };
    }
    const key = cellKey(x, y);
    if (holes.has(key)) return { valid: false, reason: `拼块 ${piece} 不能覆盖日期点` };
    if (isFixedCell(key, state.config)) return { valid: false, reason: `拼块 ${piece} 不能覆盖固定障碍块` };
    const owner = occupied.get(key);
    if (owner && owner !== piece) return { valid: false, reason: `位置与 ${owner} 冲突` };
    cells.add(key);
  }
  return { valid: true, cells };
}

function buildOccupiedMap() {
  const map = new Map();
  for (const [piece, placement] of state.placements.entries()) {
    for (const key of placement.cells) {
      map.set(key, piece);
    }
  }
  return map;
}

function getOccupiedOwner(x, y) {
  const key = cellKey(x, y);
  for (const [piece, placement] of state.placements.entries()) {
    if (placement.cells.has(key)) return piece;
  }
  return null;
}

function getCurrentOrientationCells(piece) {
  const base = matrixToCells(state.config.piece_shapes[piece]);
  const ps = state.pieceStates[piece];
  let cells = base.map(([x, y]) => [x, y]);
  if (ps.reflected) cells = reflect(cells);
  for (let i = 0; i < ps.rotation; i += 1) {
    cells = rotate90(cells);
  }
  return normalize(cells);
}

function matrixToCells(matrix) {
  const cells = [];
  matrix.forEach((row, y) => {
    row.forEach((v, x) => {
      if (v) cells.push([x, y]);
    });
  });
  return cells;
}

function rotate90(cells) {
  return cells.map(([x, y]) => [y, -x]);
}

function reflect(cells) {
  return cells.map(([x, y]) => [-x, y]);
}

function normalize(cells) {
  const minX = Math.min(...cells.map(([x]) => x));
  const minY = Math.min(...cells.map(([, y]) => y));
  return cells
    .map(([x, y]) => [x - minX, y - minY])
    .sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}

function canReflectPiece(piece) {
  const disabled = state.config.constraints?.forbid_reflection ?? [];
  return Boolean(state.config.allow_reflection) && !disabled.includes(piece);
}

function resolveHoles(config, month, day, weekday) {
  const holes = new Set((config.holes ?? []).map((cell) => cellKey(cell[0], cell[1])));
  const labelMap = config.label_map ?? null;
  if ((month || day || weekday) && !labelMap) {
    throw new Error('当前配置缺少 label_map，无法按日期点求解。');
  }
  if (month) {
    const value = labelMap?.months?.[month.toUpperCase()];
    if (!value) throw new Error(`month=${month} 不在 label_map.months 中`);
    holes.add(cellKey(value[0], value[1]));
  }
  if (day) {
    const value = labelMap?.days?.[String(day)];
    if (!value) throw new Error(`day=${day} 不在 label_map.days 中`);
    holes.add(cellKey(value[0], value[1]));
  }
  if (weekday) {
    const value = labelMap?.weekdays?.[weekday.toUpperCase()];
    if (!value) throw new Error(`weekday=${weekday} 不在 label_map.weekdays 中`);
    holes.add(cellKey(value[0], value[1]));
  }
  return holes;
}

function handleAutoSolve() {
  try {
    const result = solveCurrentState();
    if (!result) {
      toast('当前约束下无解。');
      state.message = '无解';
      render();
      return;
    }
    state.placements = result;
    state.selectedPiece = null;
    state.message = '自动解完成';
    render();
  } catch (error) {
    toast(error.message || String(error));
    state.message = '自动解失败';
    render();
  }
}

function solveCurrentState() {
  const config = clone(state.config);
  const holes = [...resolveHoles(config, state.month, state.day, state.weekday)].map(parseKey);
  const fixedPiecePositions = {};
  for (const [piece, placement] of state.placements.entries()) {
    fixedPiecePositions[piece] = [...placement.cells].map(parseKey);
  }
  config.constraints = clone(config.constraints ?? {});
  config.constraints.fixed_piece_positions = fixedPiecePositions;
  config.holes = holes;
  const solution = solvePuzzle(config, state.month, state.day, state.weekday);
  if (!solution) return null;
  const placements = new Map();
  for (const [piece, cells] of Object.entries(solution)) {
    placements.set(piece, { cells: new Set(cells.map(([x, y]) => cellKey(x, y))) });
  }
  return placements;
}

function solvePuzzle(config, month, day, weekday) {
  const [boardW, boardH] = config.board_size;
  const pieces = config.piece_shapes;
  const holes = resolveHoles(config, month, day, weekday);
  const fixedBlocks = toCellSets(config.fixed_blocks ?? {});
  const fixedBlockCells = new Set([...fixedBlocks.values()].flatMap((set) => [...set]));
  const blocked = new Set([...holes, ...fixedBlockCells]);
  const board = new Set();
  for (let x = 1; x <= boardW; x += 1) {
    for (let y = 1; y <= boardH; y += 1) board.add(cellKey(x, y));
  }
  const target = new Set([...board].filter((cell) => !blocked.has(cell)));
  const pieceCellCount = Object.values(pieces).reduce((sum, matrix) => sum + matrix.flat().reduce((a, b) => a + b, 0), 0);
  if (pieceCellCount !== target.size) {
    throw new Error(`拼块总格数(${pieceCellCount}) 与可覆盖格数(${target.size}) 不一致，无法求解`);
  }

  const placements = generatePlacements(boardW, boardH, pieces, blocked, config);
  const names = Object.keys(pieces);
  const mustCover = toCellSets(config.constraints?.must_cover ?? {});
  const mustNotCover = toCellSets(config.constraints?.must_not_cover ?? {});
  const fixedPiecePositions = toCellSets(config.constraints?.fixed_piece_positions ?? {});

  for (const name of names) {
    const req = mustCover.get(name) ?? new Set();
    const ban = mustNotCover.get(name) ?? new Set();
    const fixed = fixedPiecePositions.get(name) ?? null;
    const filtered = placements.get(name).filter((placement) => {
      if (fixed && !sameSet(placement.cells, fixed)) return false;
      if (req.size && !isSuperset(placement.cells, req)) return false;
      if (ban.size && intersects(placement.cells, ban)) return false;
      return true;
    });
    placements.set(name, filtered);
    if (filtered.length === 0) return null;
  }

  const used = new Set();
  const solution = new Map();
  const minPieceSize = Math.min(...names.map((name) => Object.values(pieces[name]).flat().reduce((a, b) => a + b, 0)));

  function backtrack() {
    if (solution.size === names.length) {
      return sameSet(used, target);
    }
    let bestName = null;
    let bestOpts = null;
    for (const name of names) {
      if (solution.has(name)) continue;
      const opts = placements.get(name).filter((placement) => isDisjoint(placement.cells, used));
      if (!bestOpts || opts.length < bestOpts.length) {
        bestName = name;
        bestOpts = opts;
      }
    }
    if (!bestOpts || bestOpts.length === 0) return false;

    for (const placement of bestOpts) {
      solution.set(bestName, placement);
      addSet(used, placement.cells);

      const remaining = difference(target, used);
      let ok = true;
      for (const comp of connectedComponents(remaining)) {
        if (comp.size < minPieceSize) {
          ok = false;
          break;
        }
      }

      if (ok && backtrack()) return true;

      removeSet(used, placement.cells);
      solution.delete(bestName);
    }
    return false;
  }

  if (!backtrack()) return null;
  const out = {};
  for (const [name, placement] of solution.entries()) {
    out[name] = [...placement.cells].map(parseKey).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  }
  return out;
}

function generatePlacements(boardW, boardH, pieces, blocked, config) {
  const board = new Set();
  for (let x = 1; x <= boardW; x += 1) {
    for (let y = 1; y <= boardH; y += 1) board.add(cellKey(x, y));
  }
  const placements = new Map();
  const allowReflection = Boolean(config.allow_reflection);
  const forbidden = new Set(config.constraints?.forbid_reflection ?? []);
  const fixedPiecePositions = toCellSets(config.constraints?.fixed_piece_positions ?? {});

  for (const [name, matrix] of Object.entries(pieces)) {
    const base = matrixToCells(matrix);
    const pieceAllowReflection = allowReflection && !forbidden.has(name);
    const orients = uniqueOrientations(base, pieceAllowReflection);
    const seen = new Set();
    const list = [];
    const fixed = fixedPiecePositions.get(name) ?? null;

    for (const orient of orients) {
      const maxX = Math.max(...orient.map(([x]) => x));
      const maxY = Math.max(...orient.map(([, y]) => y));
      for (let oy = 1; oy <= boardH - maxY; oy += 1) {
        for (let ox = 1; ox <= boardW - maxX; ox += 1) {
          const cells = new Set(orient.map(([x, y]) => cellKey(ox + x, oy + y)));
          if (!isSubset(cells, board)) continue;
          if (intersects(cells, blocked)) continue;
          if (fixed && !sameSet(cells, fixed)) continue;
          const key = serializeSet(cells);
          if (seen.has(key)) continue;
          seen.add(key);
          list.push({ piece: name, cells });
        }
      }
    }
    placements.set(name, list);
  }

  return placements;
}

function uniqueOrientations(shape, allowReflection) {
  const seen = new Set();
  const out = [];
  const candidates = [shape];
  if (allowReflection) candidates.push(reflect(shape));
  for (const base of candidates) {
    let cur = base.map(([x, y]) => [x, y]);
    for (let i = 0; i < 4; i += 1) {
      const normalized = normalize(cur);
      const key = serializePoints(normalized);
      if (!seen.has(key)) {
        seen.add(key);
        out.push(normalized);
      }
      cur = rotate90(cur);
    }
  }
  return out;
}

function connectedComponents(cells) {
  const remaining = new Set(cells);
  const seen = new Set();
  const comps = [];
  for (const start of remaining) {
    if (seen.has(start)) continue;
    const comp = new Set([start]);
    const stack = [start];
    seen.add(start);
    while (stack.length) {
      const cur = stack.pop();
      const [x, y] = parseKey(cur);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nb = cellKey(x + dx, y + dy);
        if (remaining.has(nb) && !seen.has(nb)) {
          seen.add(nb);
          comp.add(nb);
          stack.push(nb);
        }
      }
    }
    comps.push(comp);
  }
  return comps;
}

function exportLayout() {
  const payload = {
    version: 1,
    configName: 'calendar-puzzle-layout',
    datepoint: { month: state.month || null, day: state.day || null, weekday: state.weekday || null },
    placements: Object.fromEntries([...state.placements.entries()].map(([piece, placement]) => [piece, [...placement.cells].map(parseKey)])),
    pieceStates: clone(state.pieceStates),
  };
  const text = JSON.stringify(payload, null, 2);
  els.jsonBox.value = text;
  state.exportText = text;
  copyToClipboard(text);
  toast('布局已导出到文本框，并尝试复制到剪贴板。');
}

function importLayoutFromBox() {
  try {
    const raw = els.jsonBox.value.trim();
    if (!raw) {
      toast('请先在文本框中粘贴布局 JSON。');
      return;
    }
    const payload = JSON.parse(raw);
    if (!payload || typeof payload !== 'object' || !payload.placements) {
      throw new Error('不是有效的布局 JSON');
    }
    applyImportedLayout(payload);
    toast('布局导入成功。');
  } catch (error) {
    toast(error.message || String(error));
  }
}

function applyImportedLayout(payload) {
  if (payload.datepoint) {
    state.month = payload.datepoint.month ?? '';
    state.day = payload.datepoint.day ?? '';
    state.weekday = payload.datepoint.weekday ?? '';
    els.monthSelect.value = state.month || '';
    els.daySelect.value = state.day || '';
    els.weekdaySelect.value = state.weekday || '';
  }
  state.placements.clear();
  for (const [piece, cells] of Object.entries(payload.placements)) {
    state.placements.set(piece, { cells: new Set(cells.map(([x, y]) => cellKey(x, y))) });
  }
  if (payload.pieceStates) {
    for (const [piece, ps] of Object.entries(payload.pieceStates)) {
      if (state.pieceStates[piece]) {
        state.pieceStates[piece] = {
          rotation: ps.rotation ?? 0,
          reflected: Boolean(ps.reflected),
        };
      }
    }
  }
  state.selectedPiece = null;
  state.message = '已导入布局';
  render();
}

async function saveBoardImage() {
  try {
    const canvas = document.createElement('canvas');
    const { width, height } = getBoardSize(state.config);
    const scale = 2;
    const logicalWidth = width * CELL + 48;
    const logicalHeight = height * CELL + 48;
    canvas.width = logicalWidth * scale;
    canvas.height = logicalHeight * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    ctx.fillStyle = '#0b1020';
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);

    const holes = resolveHoles(state.config, state.month, state.day, state.weekday);
    const fixedBlocks = toCellSets(state.config.fixed_blocks ?? {});
    ctx.translate(24, 24);

    for (let y = 1; y <= height; y += 1) {
      for (let x = 1; x <= width; x += 1) {
        const key = cellKey(x, y);
        const px = (x - 1) * CELL;
        const py = (y - 1) * CELL;
        ctx.fillStyle = holes.has(key) ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.03)';
        ctx.fillRect(px, py, CELL, CELL);
        ctx.strokeStyle = 'rgba(148,163,184,0.18)';
        ctx.strokeRect(px, py, CELL, CELL);
        if (holes.has(key)) {
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.font = '18px sans-serif';
          ctx.fillText('□', px + 12, py + 26);
        }
      }
    }

    for (const [piece, cells] of fixedBlocks.entries()) {
      drawCells(ctx, cells, PIECE_COLORS[piece] ?? '#fb923c');
    }

    for (const [piece, placement] of state.placements.entries()) {
      drawCells(ctx, placement.cells, PIECE_COLORS[piece] ?? '#60a5fa');
    }

    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = 'calendar-puzzle-board.png';
    link.click();
    toast('图片已生成并下载。');
  } catch (error) {
    toast(error.message || String(error));
  }
}

function drawCells(ctx, cells, fill) {
  for (const key of cells) {
    const [x, y] = parseKey(key);
    const px = (x - 1) * CELL;
    const py = (y - 1) * CELL;
    ctx.fillStyle = fill;
    ctx.fillRect(px, py, CELL, CELL);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.strokeRect(px, py, CELL, CELL);
  }
}

async function loadConfigFromFile() {
  const file = els.configFile.files?.[0];
  if (!file) {
    toast('请选择一个配置 JSON 文件。');
    return;
  }
  try {
    const text = await file.text();
    const config = JSON.parse(text);
    applyConfig(config);
    toast('配置已加载。');
  } catch (error) {
    toast(error.message || String(error));
  }
}

function applyConfig(config) {
  state.config = mergeConfig(config);
  initPieceStates(state.config);
  state.placements.clear();
  state.selectedPiece = null;
  const monthValues = Object.keys(state.config.label_map?.months ?? {});
  const dayValues = Object.keys(state.config.label_map?.days ?? {});
  const weekdayValues = Object.keys(state.config.label_map?.weekdays ?? {});
  state.month = monthValues[0] ?? '';
  state.day = dayValues[0] ?? '';
  state.weekday = weekdayValues[0] ?? '';
  populateSelectors();
  render();
}

function mergeConfig(config) {
  const merged = clone(DEFAULT_CONFIG);
  if (config.board_size) merged.board_size = config.board_size;
  if (typeof config.allow_reflection === 'boolean') merged.allow_reflection = config.allow_reflection;
  if (config.holes) merged.holes = config.holes;
  if (config.fixed_blocks) merged.fixed_blocks = config.fixed_blocks;
  if (config.constraints) merged.constraints = deepMerge(merged.constraints, config.constraints);
  if (config.label_map) merged.label_map = config.label_map;
  if (config.piece_shapes) merged.piece_shapes = config.piece_shapes;
  return merged;
}

function deepMerge(base, extra) {
  const out = clone(base);
  for (const [key, value] of Object.entries(extra)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = deepMerge(out[key] ?? {}, value);
    } else {
      out[key] = clone(value);
    }
  }
  return out;
}

function toCellSets(source) {
  const map = new Map();
  for (const [name, cells] of Object.entries(source ?? {})) {
    map.set(name, new Set(cells.map(([x, y]) => cellKey(x, y))));
  }
  return map;
}

function cellSetsToKeys(source) {
  const map = new Map();
  for (const [name, cells] of Object.entries(source ?? {})) {
    map.set(name, cells.map(([x, y]) => cellKey(x, y)));
  }
  return map;
}

function isTargetCell(key, holes, fixedBlocks) {
  return !holes.has(key) && !fixedBlocks.has(key);
}

function isFixedCell(key, config) {
  const fixedBlocks = config.fixed_blocks ?? {};
  for (const cells of Object.values(fixedBlocks)) {
    for (const [x, y] of cells) {
      if (cellKey(x, y) === key) return true;
    }
  }
  return false;
}

function getBoardSize(config) {
  return { width: config.board_size[0], height: config.board_size[1] };
}

function getBounds(cells) {
  const xs = cells.map(([x]) => x);
  const ys = cells.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { minX, maxX, minY, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function sameSet(a, b) {
  if (a.size !== b.size) return false;
  for (const item of a) if (!b.has(item)) return false;
  return true;
}

function isSuperset(a, b) {
  for (const item of b) if (!a.has(item)) return false;
  return true;
}

function isSubset(a, b) {
  for (const item of a) if (!b.has(item)) return false;
  return true;
}

function isDisjoint(a, b) {
  for (const item of a) if (b.has(item)) return false;
  return true;
}

function intersects(a, b) {
  return !isDisjoint(a, b);
}

function addSet(target, source) {
  for (const item of source) target.add(item);
}

function removeSet(target, source) {
  for (const item of source) target.delete(item);
}

function difference(a, b) {
  const out = new Set();
  for (const item of a) if (!b.has(item)) out.add(item);
  return out;
}

function serializeSet(set) {
  return [...set].sort().join('|');
}

function serializePoints(points) {
  return points.map(([x, y]) => `${x},${y}`).sort().join('|');
}

function parseKey(key) {
  const [x, y] = key.split(',').map(Number);
  return [x, y];
}

function cellKey(x, y) {
  return `${x},${y}`;
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function toast(message) {
  const existing = document.querySelector('.toast');
  const el = existing ?? document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(toastState.timer);
  toastState.timer = window.setTimeout(() => {
    el.classList.remove('show');
    window.setTimeout(() => el.remove(), 180);
  }, 2200);
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Clipboard may be unavailable on file:// or non-secure contexts.
  }
}
