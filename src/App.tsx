import { jsPDF } from 'jspdf';
import { useEffect, useMemo, useRef, useState } from 'react';

type SizeGroup = 'A' | 'B' | 'card' | 'book';
type TitlePos =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';
type FontType = 'sans' | 'serif';

type PaperSize = {
  key: string;
  label: string;
  w72: number;
  h72: number;
  w300: number;
  h300: number;
  mm: string;
  group?: SizeGroup;
};

const A4_W72 = 595;
const A4_H72 = 842;
const A4_W300 = 2480;
const A4_H300 = 3508;
const MM72 = 25.4 / 72;
const MM300 = 25.4 / 300;

const SIZES: PaperSize[] = [
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

const SAMPLE_TEXTS = [
  'お気に入りの言葉\nあるいは\nメモを\nここに',
  '日付\n場所\nメモ',
  'アイデア\nスケッチ\nキーワード',
  'タスク一覧\n―\n□ 項目A\n□ 項目B',
  '重要事項\n―\n覚えておく\nこと',
  '連絡先\n名前\n電話番号\nメール',
  'ルーティン\n朝 ___\n昼 ___\n夜 ___',
  '目標\n―\n今週\n今月',
  'メモ\n―\n自由に\n書いてください',
];

const TITLE_POSITIONS: { value: TitlePos; label: string }[] = [
  { value: 'top-left', label: '左上' },
  { value: 'top-center', label: '中央上' },
  { value: 'top-right', label: '右上' },
  { value: 'bottom-left', label: '左下' },
  { value: 'bottom-center', label: '中央下' },
  { value: 'bottom-right', label: '右下' },
];

const GROUPS: { key: SizeGroup; label: string }[] = [
  { key: 'A', label: 'A 系' },
  { key: 'B', label: 'B 系（JIS）' },
  { key: 'card', label: '写真・はがき' },
  { key: 'book', label: '手帳' },
];

const FONT_FAMILY = {
  sans: "'Noto Sans JP', sans-serif",
  serif: "'Noto Serif JP', serif",
} satisfies Record<FontType, string>;

function ptToScreenPx(pt: number) {
  return pt * (96 / 72);
}

function normalizeScale(value: number) {
  if (Number.isNaN(value)) return 100;
  return Math.min(Math.max(value, 50), 300);
}

function App() {
  const [currentSize, setCurrentSize] = useState<PaperSize>(SIZES.find((item) => item.key === 'B6')!);
  const [currentPt, setCurrentPt] = useState(5);
  const [currentFont, setCurrentFont] = useState<FontType>('sans');
  const [cards, setCards] = useState<string[]>(SAMPLE_TEXTS);
  const [editMode, setEditMode] = useState(false);
  const [titleText, setTitleText] = useState('ページタイトル');
  const [titleVisible, setTitleVisible] = useState(true);
  const [titlePos, setTitlePos] = useState<TitlePos>('top-left');
  const [scalePct, setScalePct] = useState(100);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('PDF生成中…');
  const [customW, setCustomW] = useState('');
  const [customH, setCustomH] = useState('');
  const [customMmW, setCustomMmW] = useState('');
  const [customMmH, setCustomMmH] = useState('');
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [spacePanReady, setSpacePanReady] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  const canvasAreaRef = useRef<HTMLDivElement | null>(null);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panBaseRef = useRef({ x: 0, y: 0 });

  const innerTop = Math.round((A4_H72 - currentSize.h72) / 2);
  const innerLeft = Math.round((A4_W72 - currentSize.w72) / 2);
  const scale = scalePct / 100;

  const infoInner = currentSize.key === 'custom' ? `カスタム ${currentSize.mm}mm` : `${currentSize.label}(${currentSize.mm}mm)`;
  const infoFont = currentFont === 'sans' ? 'ゴシック' : '明朝';

  useEffect(() => {
    document.documentElement.style.setProperty('--card-font-size', `${ptToScreenPx(currentPt)}px`);
  }, [currentPt]);

  useEffect(() => {
    document.body.classList.toggle('drawer-open', drawerOpen);
    return () => {
      document.body.classList.remove('drawer-open');
    };
  }, [drawerOpen]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 900) {
        setDrawerOpen(false);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const autoScale = () => {
      const canvasWidth = window.innerWidth - 230 - 56;
      const canvasHeight = window.innerHeight - 60;
      let pct = Math.floor(Math.min(canvasWidth / A4_W72, canvasHeight / A4_H72) * 100);
      pct = Math.min(Math.max(pct, 30), 300);
      setScalePct(pct);
    };

    autoScale();
    window.addEventListener('resize', autoScale);
    return () => window.removeEventListener('resize', autoScale);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditableTarget = !!target?.closest('input, textarea, select, button') || !!target?.closest('[contenteditable="true"]');

      if (event.key === 'Escape') {
        setDrawerOpen(false);
      }

      if ((event.ctrlKey || event.metaKey) && !isEditableTarget) {
        if (event.key === '+' || event.key === '=') {
          event.preventDefault();
          setScalePct((prev) => normalizeScale(prev + 5));
        }
        if (event.key === '-' || event.key === '_') {
          event.preventDefault();
          setScalePct((prev) => normalizeScale(prev - 5));
        }
      }

      if (event.code === 'Space' && !isEditableTarget) {
        setSpacePanReady(true);
        event.preventDefault();
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        setSpacePanReady(false);
        setIsPanning(false);
      }
    };

    const onBlur = () => {
      setSpacePanReady(false);
      setIsPanning(false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  useEffect(() => {
    const handleBeforePrint = () => {
      document.documentElement.style.setProperty('--card-font-size', `${currentPt}pt`);
    };
    const handleAfterPrint = () => {
      document.documentElement.style.setProperty('--card-font-size', `${ptToScreenPx(currentPt)}px`);
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [currentPt]);

  const sizeByGroup = useMemo(() => {
    const grouped = new Map<SizeGroup, PaperSize[]>();
    GROUPS.forEach((group) => grouped.set(group.key, []));
    SIZES.forEach((size) => {
      if (!size.group) return;
      grouped.get(size.group)?.push(size);
    });
    return grouped;
  }, []);

  const applyCustomPx = () => {
    const width = Number.parseInt(customW, 10);
    const height = Number.parseInt(customH, 10);
    if (!width || !height || width < 50 || height < 50) {
      window.alert('50px以上で入力してください。');
      return;
    }
    if (width >= A4_W72 && height >= A4_H72) {
      window.alert('A4以上のサイズは設定できません。');
      return;
    }
    const ratio = 300 / 72;
    setCurrentSize({
      key: 'custom',
      label: 'カスタム',
      w72: width,
      h72: height,
      w300: Math.round(width * ratio),
      h300: Math.round(height * ratio),
      mm: `${(width * MM72).toFixed(1)}x${(height * MM72).toFixed(1)}`,
    });
  };

  const applyCustomMm = () => {
    const mmWidth = Number.parseFloat(customMmW);
    const mmHeight = Number.parseFloat(customMmH);
    if (!mmWidth || !mmHeight || mmWidth < 5 || mmHeight < 5) {
      window.alert('5mm以上で入力してください。');
      return;
    }

    const w72 = Math.round(mmWidth / MM72);
    const h72 = Math.round(mmHeight / MM72);
    if (w72 >= A4_W72 && h72 >= A4_H72) {
      window.alert('A4以上のサイズは設定できません。');
      return;
    }

    setCurrentSize({
      key: 'custom',
      label: 'カスタム',
      w72,
      h72,
      w300: Math.round(mmWidth / MM300),
      h300: Math.round(mmHeight / MM300),
      mm: `${mmWidth.toFixed(1)}x${mmHeight.toFixed(1)}`,
    });
  };

  const startPan = (clientX: number, clientY: number) => {
    panStartRef.current = { x: clientX, y: clientY };
    panBaseRef.current = { ...panOffset };
    setIsPanning(true);
  };

  const handleCanvasMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('#previewZoom')) return;
    if (target.closest('input, textarea, select, button')) return;
    if (target.closest('[contenteditable="true"]')) return;

    startPan(event.clientX, event.clientY);
    event.preventDefault();
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    const dx = event.clientX - panStartRef.current.x;
    const dy = event.clientY - panStartRef.current.y;
    setPanOffset({ x: panBaseRef.current.x + dx, y: panBaseRef.current.y + dy });
    event.preventDefault();
  };

  const handleMouseUp = () => {
    if (!isPanning) return;
    setIsPanning(false);
  };

  const updateCard = (index: number, value: string) => {
    setCards((prev) => prev.map((item, idx) => (idx === index ? value : item)));
  };

  const exportPDF = async (mode: 'web' | 'print') => {
    const isWeb = mode === 'web';
    const dpi = isWeb ? 72 : 300;
    const a4W = isWeb ? A4_W72 : A4_W300;
    const a4H = isWeb ? A4_H72 : A4_H300;
    const innerW = isWeb ? currentSize.w72 : currentSize.w300;
    const innerH = isWeb ? currentSize.h72 : currentSize.h300;
    const fontPx = currentPt * (dpi / 72);
    const ff = currentFont === 'sans' ? 'Noto Sans JP' : 'Noto Serif JP';
    const fileName = isWeb ? 'card-layout-web-72dpi.pdf' : 'card-layout-print-300dpi.pdf';

    setLoadingMsg(`${isWeb ? 'Web用(72dpi)' : '印刷用(300dpi)'} PDFを生成中...`);
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 80));

    try {
      const canvas = document.createElement('canvas');
      canvas.width = a4W;
      canvas.height = a4H;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas context が取得できませんでした');
      }

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
      ctx.font = `${fontPx}px "${ff}", sans-serif`;
      ctx.textBaseline = 'top';

      cards.forEach((text, index) => {
        const col = index % 3;
        const row = Math.floor(index / 3);
        const cx = gx + col * cw;
        const cy = gy + row * ch;
        const lines = text.split('\n');
        const lh = fontPx * 2.0;
        const totalH = lines.length * lh;
        const totalW = Math.max(...lines.map((line) => ctx.measureText(line).width), 0);
        const padX = cw * 0.05;
        const padY = cw * 0.05;
        const startX = Math.max(cx + padX, cx + padX + (cw - padX * 2 - totalW) / 2);
        const startY = Math.max(cy + padY, cy + padY + (ch - padY * 2 - totalH) / 2);

        lines.forEach((line, lineIndex) => {
          let x = startX;
          const y = startY + lineIndex * lh;
          for (const char of line) {
            ctx.fillText(char, x, y);
            x += ctx.measureText(char).width + fontPx * 0.18;
          }
        });
      });

      const cleanedTitle = titleText.trim();
      if (titleVisible && cleanedTitle) {
        const tpx = currentPt * (dpi / 72);
        const mgX = innerW * 0.025;
        const mgY = innerH * 0.02;

        ctx.font = `${tpx}px "${ff}", sans-serif`;
        const isBottom = titlePos.startsWith('bottom');
        const align = titlePos.includes('center') ? 'center' : titlePos.includes('right') ? 'right' : 'left';

        ctx.textAlign = align;
        ctx.textBaseline = isBottom ? 'bottom' : 'top';
        const tx = align === 'center' ? gx + innerW / 2 : align === 'right' ? gx + innerW - mgX : gx + mgX;
        const ty = isBottom ? gy + innerH - mgY : gy + mgY;
        ctx.fillText(cleanedTitle, tx, ty);
      }

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297);
      pdf.save(fileName);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      window.alert(`PDF生成エラー: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className={`loading-overlay${loading ? ' show' : ''}`}>
        <div className="spinner" />
        <div>{loadingMsg}</div>
      </div>

      <button
        className="drawer-toggle"
        type="button"
        aria-label="編集パネルを開く"
        aria-controls="sidePanel"
        aria-expanded={drawerOpen}
        onClick={() => setDrawerOpen((prev) => !prev)}
      >
        編集
      </button>
      <div className="drawer-backdrop" aria-hidden={!drawerOpen} onClick={() => setDrawerOpen(false)} />

      <div className="layout">
        <aside className="sidebar" id="sidePanel">
          <div className="sidebar-inner">
            <div>
              <div className="app-title">A4 カードレイアウト</div>
              <div className="app-info">
                外：A4　内：<em>{infoInner}</em>
                <br />
                書体：<em>{infoFont}</em>　<em>{currentPt}pt</em>
              </div>
            </div>

            <div className="section">
              <div className="sec-label">ページタイトル</div>
              <input
                className="title-input"
                type="text"
                value={titleText}
                onChange={(event) => setTitleText(event.target.value)}
                maxLength={80}
              />
              <div className="toggle-row">
                <button
                  className={`toggle-btn${titleVisible ? ' active' : ''}`}
                  onClick={() => setTitleVisible((prev) => !prev)}
                  type="button"
                >
                  タイトル表示: {titleVisible ? 'ON' : 'OFF'}
                </button>
              </div>
              <div className="pos-grid">
                {TITLE_POSITIONS.map((item) => (
                  <button
                    key={item.value}
                    className={`pos-btn${titlePos === item.value ? ' active' : ''}`}
                    onClick={() => setTitlePos(item.value)}
                    type="button"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="section">
              <div className="sec-label">内側の用紙サイズ</div>
              {GROUPS.map((group) => (
                <div className="group-block" key={group.key}>
                  <div className="group-name">{group.label}</div>
                  <div className="btn-row">
                    {sizeByGroup.get(group.key)?.map((size) => (
                      <button
                        key={size.key}
                        type="button"
                        className={`s-btn${currentSize.key === size.key ? ' active' : ''}`}
                        title={`${size.mm}mm`}
                        onClick={() => setCurrentSize(size)}
                      >
                        {size.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="custom-block">
                <div className="input-line">
                  <span>px W</span>
                  <input className="nano" type="number" min={50} value={customW} onChange={(e) => setCustomW(e.target.value)} />
                  <span>×</span>
                  <input className="nano" type="number" min={50} value={customH} onChange={(e) => setCustomH(e.target.value)} />
                  <button className="apply-btn" onClick={applyCustomPx} type="button">
                    適用
                  </button>
                </div>
                <div className="input-line">
                  <span>mm W</span>
                  <input className="nano" type="number" min={5} step={0.5} value={customMmW} onChange={(e) => setCustomMmW(e.target.value)} />
                  <span>×</span>
                  <input className="nano" type="number" min={5} step={0.5} value={customMmH} onChange={(e) => setCustomMmH(e.target.value)} />
                  <button className="apply-btn" onClick={applyCustomMm} type="button">
                    適用
                  </button>
                </div>
              </div>
            </div>

            <div className="section">
              <div className="sec-label">書体</div>
              <div className="toggle-row">
                <button
                  className={`toggle-btn${currentFont === 'sans' ? ' active' : ''}`}
                  onClick={() => setCurrentFont('sans')}
                  type="button"
                >
                  ゴシック
                </button>
                <button
                  className={`toggle-btn${currentFont === 'serif' ? ' active' : ''}`}
                  onClick={() => setCurrentFont('serif')}
                  type="button"
                >
                  明朝
                </button>
              </div>
            </div>

            <div className="section">
              <div className="sec-label">フォントサイズ</div>
              <div className="slider-row">
                <input
                  type="range"
                  min={4}
                  max={24}
                  step={1}
                  value={currentPt}
                  onChange={(event) => setCurrentPt(Number.parseInt(event.target.value, 10))}
                />
                <span className="slider-val">{currentPt} pt</span>
              </div>
            </div>

            <div className="section">
              <div className="sec-label">表示倍率</div>
              <div className="slider-row">
                <input
                  type="range"
                  min={50}
                  max={300}
                  step={5}
                  value={scalePct}
                  onChange={(event) => setScalePct(normalizeScale(Number.parseInt(event.target.value, 10)))}
                />
                <span className="slider-val">{scalePct}%</span>
              </div>
            </div>

            <div className="section">
              <button className="action-btn" onClick={() => setEditMode((prev) => !prev)} type="button">
                {editMode ? '✅ 編集完了' : '✏ テキスト編集'}
              </button>
              <div className="pdf-group" style={{ marginTop: 4 }}>
                <div className="pdf-label">PDF 書き出し</div>
                <button className="action-btn" onClick={() => void exportPDF('web')} type="button">
                  ⬇ Web 用（72dpi）
                </button>
                <button className="action-btn" onClick={() => void exportPDF('print')} type="button">
                  ⬇ 印刷用（300dpi）
                </button>
              </div>
              <button className="action-btn dim" onClick={() => window.print()} type="button" style={{ marginTop: 4 }}>
                🖨 ブラウザ印刷
              </button>
            </div>
          </div>
        </aside>

        <main
          ref={canvasAreaRef}
          className={`canvas-area${spacePanReady ? ' space-pan-ready' : ''}${isPanning ? ' is-panning' : ''}`}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            className="scale-outer"
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
              width: `${Math.round(A4_W72 * scale)}px`,
              height: `${Math.round(A4_H72 * scale)}px`,
            }}
          >
            <div
              className="a4"
              style={{
                transform: `scale(${scale})`,
              }}
            >
              <div
                id="inner-grid"
                style={{
                  width: `${currentSize.w72}px`,
                  height: `${currentSize.h72}px`,
                  top: `${innerTop}px`,
                  left: `${innerLeft}px`,
                }}
              >
                {cards.map((text, index) => (
                  <div key={index} className={`card${editMode ? ' edit-mode' : ''}`}>
                    <div
                      className="card-text"
                      data-placeholder="テキストを入力"
                      suppressContentEditableWarning
                      contentEditable={editMode}
                      style={{ fontFamily: FONT_FAMILY[currentFont] }}
                      onInput={(event) => {
                        const value = (event.currentTarget.textContent ?? '').replace(/\r/g, '');
                        updateCard(index, value);
                      }}
                    >
                      {text}
                    </div>
                  </div>
                ))}

                <div
                  id="page-title"
                  className={titlePos}
                  style={{
                    display: titleVisible ? '' : 'none',
                    fontFamily: FONT_FAMILY[currentFont],
                    fontSize: `${ptToScreenPx(currentPt)}px`,
                  }}
                >
                  {titleText}
                </div>
              </div>
            </div>
          </div>

          <div className="preview-zoom" id="previewZoom">
            <input
              type="range"
              min={50}
              max={300}
              step={5}
              value={scalePct}
              onChange={(event) => setScalePct(normalizeScale(Number.parseInt(event.target.value, 10)))}
            />
            <div className="preview-zoom-input-wrap">
              <input
                type="number"
                min={50}
                max={300}
                step={5}
                value={scalePct}
                onChange={(event) => setScalePct(normalizeScale(Number.parseInt(event.target.value, 10)))}
              />
              <span>%</span>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

export default App;
