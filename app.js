const A4_W72 = 595, A4_H72 = 842, A4_W300 = 2480, A4_H300 = 3508;
const MM72 = 25.4 / 72, MM300 = 25.4 / 300;

const SIZES = [
  { key: 'A4', label: 'A4', w72: 595, h72: 842, w300: 2480, h300: 3508, mm: '210x297', group: 'A' },
  { key: 'A5', label: 'A5', w72: 420, h72: 595, w300: 1748, h300: 2480, mm: '148x210', group: 'A' },
  { key: 'A6', label: 'A6', w72: 298, h72: 420, w300: 1240, h300: 1748, mm: '105x148', group: 'A' },
  { key: 'A7', label: 'A7', w72: 210, h72: 298, w300: 874, h300: 1240, mm: '74x105', group: 'A' },
  { key: 'B5', label: 'B5', w72: 516, h72: 729, w300: 2150, h300: 3035, mm: '182x257', group: 'B' },
  { key: 'B6', label: 'B6', w72: 363, h72: 516, w300: 1512, h300: 2150, mm: '128x182', group: 'B' },
  { key: 'B7', label: 'B7', w72: 258, h72: 363, w300: 1075, h300: 1512, mm: '91x128', group: 'B' },
  { key: 'postcard', label: 'はがき', w72: 283, h72: 420, w300: 1181, h300: 1748, mm: '100x148', group: 'card' },
  { key: 'l-size', label: 'L判', w72: 252, h72: 360, w300: 1051, h300: 1500, mm: '89x127', group: 'card' },
  { key: 'bible', label: 'バイブル', w72: 269, h72: 482, w300: 1122, h300: 2008, mm: '95x170', group: 'book' },
  { key: 'mini5', label: 'M5', w72: 176, h72: 298, w300: 732, h300: 1240, mm: '62x105', group: 'book' },
  { key: 'hobo', label: 'ほぼ日', w72: 298, h72: 420, w300: 1240, h300: 1748, mm: '105x148', group: 'book' },
];

const GROUP_EL = { A: 'grpA', B: 'grpB', card: 'grpCard', book: 'grpBook' };
const FONT_FAMILY = { sans: "'Noto Sans JP',sans-serif", serif: "'Noto Serif JP',serif" };
const SAMPLE_TEXTS = [
  'お気に入りの言葉\nあるいは\nメモを\nここに', '日付\n場所\nメモ', 'アイデア\nスケッチ\nキーワード',
  'タスク一覧\n―\n□ 項目A\n□ 項目B', '重要事項\n―\n覚えておく\nこと', '連絡先\n名前\n電話番号\nメール',
  'ルーティン\n朝 ___\n昼 ___\n夜 ___', '目標\n―\n今週\n今月', 'メモ\n―\n自由に\n書いてください',
];

let currentSize = SIZES.find((s) => s.key === 'B6');
let currentPt = 5;
let currentFont = 'sans';
let editMode = false;
let titlePos = 'top-left';
let titleVisible = true;

const gridEl = document.getElementById('inner-grid');
const a4El = document.getElementById('a4');
const canvasAreaEl = document.getElementById('canvasArea');
const scaleOuter = document.getElementById('scaleOuter');
const scaleRangeEl = document.getElementById('scaleRange');
const scaleLabelEl = document.getElementById('scaleLabel');
const previewScaleRangeEl = document.getElementById('previewScaleRange');
const previewScaleInputEl = document.getElementById('previewScaleInput');
const drawerToggleEl = document.getElementById('drawerToggle');
const drawerBackdropEl = document.getElementById('drawerBackdrop');
const ptRangeEl = document.getElementById('ptRange');
const ptLabelEl = document.getElementById('ptLabel');

let isPanning = false;
let isSpacePressed = false;
let panStartX = 0;
let panStartY = 0;
let panOffsetX = 0;
let panOffsetY = 0;
let panBaseX = 0;
let panBaseY = 0;

function setDrawerOpen(open) {
  document.body.classList.toggle('drawer-open', open);
  if (drawerToggleEl) drawerToggleEl.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function toggleDrawer() {
  setDrawerOpen(!document.body.classList.contains('drawer-open'));
}

function applyPanOffset() {
  scaleOuter.style.transform = `translate(${panOffsetX}px, ${panOffsetY}px)`;
}

function buildGrid() {
  document.querySelectorAll('#inner-grid .card').forEach((card) => card.remove());

  const old = document.getElementById('page-title');
  if (old) old.remove();

  const ff = FONT_FAMILY[currentFont];
  for (let index = 0; index < 9; index += 1) {
    const card = document.createElement('div');
    card.className = 'card';
    const text = document.createElement('div');
    text.className = 'card-text';
    text.dataset.placeholder = 'テキストを入力';
    text.style.fontFamily = ff;
    text.innerHTML = SAMPLE_TEXTS[index].replace(/\n/g, '<br>');
    card.appendChild(text);
    gridEl.appendChild(card);
  }

  const titleEl = document.createElement('div');
  titleEl.id = 'page-title';
  titleEl.className = titlePos;
  titleEl.style.fontFamily = ff;
  titleEl.textContent = document.getElementById('titleInput').value;
  gridEl.appendChild(titleEl);
  applyTitleVisibility();
}

function buildSizeButtons() {
  SIZES.forEach((size) => {
    const el = document.getElementById(GROUP_EL[size.group]);
    if (!el) return;
    const btn = document.createElement('button');
    btn.className = `s-btn${size.key === 'B6' ? ' active' : ''}`;
    btn.dataset.key = size.key;
    btn.title = `${size.mm}mm`;
    btn.textContent = size.label;
    btn.onclick = () => selectSize(size);
    el.appendChild(btn);
  });
}

function selectSize(size) {
  currentSize = size;
  document.querySelectorAll('.s-btn[data-key]').forEach((button) => {
    button.classList.toggle('active', button.dataset.key === size.key);
  });
  applyInnerSize();
  document.getElementById('infoInner').textContent = `${size.label}(${size.mm}mm)`;
}

function applyCustomPx() {
  const width = parseInt(document.getElementById('customW').value, 10);
  const height = parseInt(document.getElementById('customH').value, 10);
  if (!width || !height || width < 50 || height < 50) {
    alert('50px以上で入力してください。');
    return;
  }
  if (width >= A4_W72 && height >= A4_H72) {
    alert('A4以上のサイズは設定できません。');
    return;
  }
  const ratio = 300 / 72;
  setCustom(width, height, Math.round(width * ratio), Math.round(height * ratio), width * MM72, height * MM72, `カスタム ${width}x${height}px`);
}

function applyCustomMm() {
  const mmWidth = parseFloat(document.getElementById('customMmW').value);
  const mmHeight = parseFloat(document.getElementById('customMmH').value);
  if (!mmWidth || !mmHeight || mmWidth < 5 || mmHeight < 5) {
    alert('5mm以上で入力してください。');
    return;
  }
  const w72 = Math.round(mmWidth / MM72);
  const h72 = Math.round(mmHeight / MM72);
  const w300 = Math.round(mmWidth / MM300);
  const h300 = Math.round(mmHeight / MM300);
  if (w72 >= A4_W72 && h72 >= A4_H72) {
    alert('A4以上のサイズは設定できません。');
    return;
  }
  setCustom(w72, h72, w300, h300, mmWidth, mmHeight, `カスタム ${mmWidth}x${mmHeight}mm`);
}

function setCustom(w72, h72, w300, h300, mmW, mmH, label) {
  currentSize = { key: 'custom', label: 'カスタム', w72, h72, w300, h300, mm: `${parseFloat(mmW).toFixed(1)}x${parseFloat(mmH).toFixed(1)}` };
  document.querySelectorAll('.s-btn[data-key]').forEach((button) => button.classList.remove('active'));
  applyInnerSize();
  document.getElementById('infoInner').textContent = label;
}

function applyInnerSize() {
  const width = currentSize.w72;
  const height = currentSize.h72;
  gridEl.style.width = `${width}px`;
  gridEl.style.height = `${height}px`;
  gridEl.style.top = `${Math.round((A4_H72 - height) / 2)}px`;
  gridEl.style.left = `${Math.round((A4_W72 - width) / 2)}px`;
}

function updateTitle() {
  const el = document.getElementById('page-title');
  if (el) el.textContent = document.getElementById('titleInput').value;
}

function applyTitleVisibility() {
  const titleEl = document.getElementById('page-title');
  if (titleEl) {
    titleEl.style.display = titleVisible ? '' : 'none';
  }
  const button = document.getElementById('titleVisibilityBtn');
  if (button) {
    button.classList.toggle('active', titleVisible);
    button.textContent = titleVisible ? 'タイトル表示: ON' : 'タイトル表示: OFF';
  }
}

function toggleTitleVisibility() {
  titleVisible = !titleVisible;
  applyTitleVisibility();
}

function setTitlePos(pos) {
  titlePos = pos;
  const el = document.getElementById('page-title');
  if (el) el.className = pos;
  document.querySelectorAll('.pos-btn').forEach((button) => button.classList.toggle('active', button.dataset.pos === pos));
}

function setFont(type) {
  currentFont = type;
  const ff = FONT_FAMILY[type];
  document.querySelectorAll('.card-text').forEach((text) => {
    text.style.fontFamily = ff;
  });
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.style.fontFamily = ff;
  document.getElementById('fontToggleSans').classList.toggle('active', type === 'sans');
  document.getElementById('fontToggleSerif').classList.toggle('active', type === 'serif');
  document.getElementById('infoFont').textContent = type === 'sans' ? 'ゴシック' : '明朝';
}

function ptToScreenPx(pt) { return pt * (96 / 72); }

function applyFontSize(pt) {
  currentPt = pt;
  document.documentElement.style.setProperty('--card-font-size', `${ptToScreenPx(pt)}px`);
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.style.fontSize = `${ptToScreenPx(pt)}px`;
  ptLabelEl.textContent = `${pt} pt`;
  document.getElementById('infoSize').textContent = `${pt}pt`;
}

ptRangeEl.addEventListener('input', () => applyFontSize(parseInt(ptRangeEl.value, 10)));

function applyScale(pct) {
  const safePct = Math.min(Math.max(Number.isNaN(pct) ? 100 : pct, 50), 300);
  const scale = safePct / 100;
  scaleOuter.style.width = `${Math.round(A4_W72 * scale)}px`;
  scaleOuter.style.height = `${Math.round(A4_H72 * scale)}px`;
  a4El.style.transform = `scale(${scale})`;
  scaleLabelEl.textContent = `${safePct}%`;
  scaleRangeEl.value = String(safePct);
  if (previewScaleRangeEl) previewScaleRangeEl.value = String(safePct);
  if (previewScaleInputEl) previewScaleInputEl.value = String(safePct);
}

scaleRangeEl.addEventListener('input', () => applyScale(parseInt(scaleRangeEl.value, 10)));
if (previewScaleRangeEl) {
  previewScaleRangeEl.addEventListener('input', () => applyScale(parseInt(previewScaleRangeEl.value, 10)));
}
if (previewScaleInputEl) {
  previewScaleInputEl.addEventListener('change', () => applyScale(parseInt(previewScaleInputEl.value, 10)));
  previewScaleInputEl.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      applyScale(parseInt(previewScaleInputEl.value, 10));
      previewScaleInputEl.blur();
    }
  });
}

function autoScale() {
  const canvasWidth = window.innerWidth - 230 - 56;
  const canvasHeight = window.innerHeight - 60;
  let pct = Math.floor(Math.min(canvasWidth / A4_W72, canvasHeight / A4_H72) * 100);
  pct = Math.min(Math.max(pct, 30), 300);
  scaleRangeEl.value = pct;
  applyScale(pct);
}

window.addEventListener('resize', autoScale);

function isTextEditingTarget(target) {
  if (!target) return false;
  if (target.closest('input, textarea, select, button')) return true;
  if (target.isContentEditable) return true;
  const editableParent = target.closest('[contenteditable="true"]');
  return !!editableParent;
}

function setSpacePanReady(enabled) {
  if (!canvasAreaEl) return;
  canvasAreaEl.classList.toggle('space-pan-ready', enabled);
}

function isZoomShortcut(event) {
  if (!event.ctrlKey && !event.metaKey) return false;
  const key = event.key;
  return key === '+' || key === '=' || key === '-' || key === '_';
}

function zoomByShortcut(event) {
  if (isTextEditingTarget(event.target)) return;
  if (!isZoomShortcut(event)) return;
  event.preventDefault();
  const currentPct = parseInt(scaleRangeEl.value, 10) || 100;
  const zoomIn = event.key === '+' || event.key === '=';
  const nextPct = currentPct + (zoomIn ? 5 : -5);
  applyScale(nextPct);
}

function startPan(clientX, clientY) {
  if (!canvasAreaEl) return;
  isPanning = true;
  panStartX = clientX;
  panStartY = clientY;
  panBaseX = panOffsetX;
  panBaseY = panOffsetY;
  canvasAreaEl.classList.add('is-panning');
}

function beginPan(event) {
  if (!canvasAreaEl || event.button !== 0) return;
  if (event.target.closest('#previewZoom')) return;
  if (isTextEditingTarget(event.target)) return;
  startPan(event.clientX, event.clientY);
  event.preventDefault();
}

function movePan(event) {
  if (!canvasAreaEl) return;

  if (!isPanning) return;
  const deltaX = event.clientX - panStartX;
  const deltaY = event.clientY - panStartY;
  panOffsetX = panBaseX + deltaX;
  panOffsetY = panBaseY + deltaY;
  applyPanOffset();
  event.preventDefault();
}

function endPan() {
  if (!isPanning || !canvasAreaEl) return;
  isPanning = false;
  canvasAreaEl.classList.remove('is-panning');
}

function onKeyDown(event) {
  if (event.code !== 'Space') return;
  if (isTextEditingTarget(event.target)) return;
  isSpacePressed = true;
  setSpacePanReady(true);
  event.preventDefault();
}

function onKeyUp(event) {
  if (event.code !== 'Space') return;
  isSpacePressed = false;
  setSpacePanReady(false);
  endPan();
}

function onWindowBlur() {
  isSpacePressed = false;
  setSpacePanReady(false);
  endPan();
}

function onGlobalKeyDown(event) {
  if (event.key === 'Escape') {
    setDrawerOpen(false);
  }
}

function onResponsiveResize() {
  if (window.innerWidth > 900 && document.body.classList.contains('drawer-open')) {
    setDrawerOpen(false);
  }
}

if (canvasAreaEl) {
  canvasAreaEl.addEventListener('mousedown', beginPan);
  window.addEventListener('mousemove', movePan);
  window.addEventListener('mouseup', endPan);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keydown', zoomByShortcut);
  window.addEventListener('keydown', onGlobalKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onWindowBlur);
  window.addEventListener('resize', onResponsiveResize);
}

if (drawerToggleEl) {
  drawerToggleEl.addEventListener('click', toggleDrawer);
}
if (drawerBackdropEl) {
  drawerBackdropEl.addEventListener('click', () => setDrawerOpen(false));
}

function toggleEdit() {
  editMode = !editMode;
  document.querySelectorAll('.card').forEach((card) => card.classList.toggle('edit-mode', editMode));
  document.querySelectorAll('.card-text').forEach((text) => {
    text.contentEditable = editMode ? 'true' : 'false';
  });
  document.getElementById('editBtn').textContent = editMode ? '✅ 編集完了' : '✏ テキスト編集';
}

async function exportPDF(mode) {
  const isWeb = mode === 'web';
  const dpi = isWeb ? 72 : 300;
  const a4W = isWeb ? A4_W72 : A4_W300;
  const a4H = isWeb ? A4_H72 : A4_H300;
  const innerW = isWeb ? currentSize.w72 : currentSize.w300;
  const innerH = isWeb ? currentSize.h72 : currentSize.h300;
  const fontPx = currentPt * (dpi / 72);
  const ff = currentFont === 'sans' ? 'Noto Sans JP' : 'Noto Serif JP';
  const fileName = isWeb ? 'card-layout-web-72dpi.pdf' : 'card-layout-print-300dpi.pdf';

  document.getElementById('loadingMsg').textContent = `${isWeb ? 'Web用(72dpi)' : '印刷用(300dpi)'} PDFを生成中...`;
  document.getElementById('loadingOverlay').classList.add('show');
  await new Promise((resolve) => setTimeout(resolve, 80));

  try {
    const { jsPDF } = window.jspdf;
    const canvas = document.createElement('canvas');
    canvas.width = a4W;
    canvas.height = a4H;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, a4W, a4H);

    const gx = Math.round((a4W - innerW) / 2);
    const gy = Math.round((a4H - innerH) / 2);
    const cw = innerW / 3;
    const ch = innerH / 3;
    const lw = isWeb ? 0.5 : 2;
    ctx.strokeStyle = '#333';
    ctx.lineWidth = lw;
    ctx.strokeRect(gx + lw / 2, gy + lw / 2, innerW - lw, innerH - lw);
    ctx.beginPath();
    for (let col = 1; col < 3; col += 1) {
      const x = gx + Math.round(cw * col);
      ctx.moveTo(x, gy);
      ctx.lineTo(x, gy + innerH);
    }
    for (let row = 1; row < 3; row += 1) {
      const y = gy + Math.round(ch * row);
      ctx.moveTo(gx, y);
      ctx.lineTo(gx + innerW, y);
    }
    ctx.stroke();

    ctx.fillStyle = '#1a1a1a';
    ctx.font = `${fontPx}px "${ff}",sans-serif`;
    ctx.textBaseline = 'top';
    document.querySelectorAll('.card-text').forEach((el, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const cx = gx + col * cw;
      const cy = gy + row * ch;
      const lines = el.innerHTML.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').split('\n');
      const lh = fontPx * 2.0;
      const totalH = lines.length * lh;
      const totalW = Math.max(...lines.map((line) => ctx.measureText(line).width));
      const padX = cw * 0.05;
      const padY = cw * 0.05;
      const startX = Math.max(cx + padX, cx + padX + (cw - padX * 2 - totalW) / 2);
      const startY = Math.max(cy + padY, cy + padY + (ch - padY * 2 - totalH) / 2);
      lines.forEach((line, lineIndex) => {
        let x = startX;
        const y = startY + lineIndex * lh;
        for (const ch2 of line) {
          ctx.fillText(ch2, x, y);
          x += ctx.measureText(ch2).width + fontPx * 0.18;
        }
      });
    });

    const titleText = document.getElementById('titleInput').value.trim();
    if (titleVisible && titleText) {
      const tpx = currentPt * (dpi / 72);
      const mgX = innerW * 0.025;
      const mgY = innerH * 0.02;
      ctx.font = `${tpx}px "${ff}",sans-serif`;
      const isBot = titlePos.startsWith('bottom');
      const align = titlePos.includes('center') ? 'center' : titlePos.includes('right') ? 'right' : 'left';
      ctx.textAlign = align;
      ctx.textBaseline = isBot ? 'bottom' : 'top';
      const tx = align === 'center' ? gx + innerW / 2 : align === 'right' ? gx + innerW - mgX : gx + mgX;
      const ty = isBot ? gy + innerH - mgY : gy + mgY;
      ctx.fillText(titleText, tx, ty);
    }

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297);
    pdf.save(fileName);
  } catch (e) {
    console.error(e);
    alert(`PDF生成エラー: ${e.message}`);
  }
  document.getElementById('loadingOverlay').classList.remove('show');
}

window.addEventListener('beforeprint', () => {
  a4El.style.transform = 'none';
  a4El.style.position = 'relative';
  const wMm = (currentSize.w72 * MM72).toFixed(3);
  const hMm = (currentSize.h72 * MM72).toFixed(3);
  gridEl.style.cssText = `position:absolute;width:${wMm}mm;height:${hMm}mm;top:calc((297mm - ${hMm}mm)/2);left:calc((210mm - ${wMm}mm)/2);border:0.5px solid #333;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);`;
  const ff = FONT_FAMILY[currentFont];
  document.querySelectorAll('.card-text').forEach((text) => {
    text.style.fontSize = `${currentPt}pt`;
    text.style.fontFamily = ff;
  });
  document.querySelectorAll('.card').forEach((card) => {
    card.style.borderRight = '0.5px solid #333';
    card.style.borderBottom = '0.5px solid #333';
    card.style.padding = '5%';
  });
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.style.fontSize = `${currentPt}pt`;
});

window.addEventListener('afterprint', () => {
  a4El.style.position = 'absolute';
  applyScale(parseInt(scaleRangeEl.value, 10));
  applyInnerSize();
  document.querySelectorAll('.card-text').forEach((text) => {
    text.style.fontSize = `${ptToScreenPx(currentPt)}px`;
  });
  document.querySelectorAll('.card').forEach((card) => {
    card.style.borderRight = '';
    card.style.borderBottom = '';
    card.style.padding = '';
  });
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.style.fontSize = `${ptToScreenPx(currentPt)}px`;
});

window.updateTitle = updateTitle;
window.toggleTitleVisibility = toggleTitleVisibility;
window.setTitlePos = setTitlePos;
window.applyCustomPx = applyCustomPx;
window.applyCustomMm = applyCustomMm;
window.setFont = setFont;
window.toggleEdit = toggleEdit;
window.exportPDF = exportPDF;

buildSizeButtons();
buildGrid();
applyInnerSize();
applyFontSize(5);
setFont('sans');
setTitlePos('top-left');
applyTitleVisibility();
autoScale();