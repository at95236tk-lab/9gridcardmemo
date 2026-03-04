import { A4_H72, A4_H300, A4_W72, A4_W300, CONTENT_MARGIN_RATIO } from '../constants/editor';
import { UI_TOKENS } from '../tokens/uiTokens';
import type { FontType, PaperSize, TitlePos } from '../types/editor';

type ExportCanvasOptions = {
  isWeb: boolean;
  currentSize: PaperSize;
  currentPt: number;
  currentFont: FontType;
  cards: string[];
  titleText: string;
  titleVisible: boolean;
  titlePos: TitlePos;
};

export function renderExportCanvas({ isWeb, currentSize, currentPt, currentFont, cards, titleText, titleVisible, titlePos }: ExportCanvasOptions) {
  const dpi = isWeb ? UI_TOKENS.export.webDpi : UI_TOKENS.export.printDpi;
  const renderScale = isWeb ? UI_TOKENS.export.webRenderScale : UI_TOKENS.export.printRenderScale;
  const a4W = isWeb ? A4_W72 : A4_W300;
  const a4H = isWeb ? A4_H72 : A4_H300;
  const innerW = isWeb ? currentSize.w72 : currentSize.w300;
  const innerH = isWeb ? currentSize.h72 : currentSize.h300;
  const fontPx = currentPt * (dpi / 72);
  const ff = currentFont === 'sans' ? 'Noto Sans JP' : 'Noto Serif JP';

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(a4W * renderScale);
  canvas.height = Math.round(a4H * renderScale);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas context が取得できませんでした');
  }

  if (renderScale !== 1) {
    ctx.scale(renderScale, renderScale);
  }

  ctx.fillStyle = UI_TOKENS.export.canvas.backgroundColor;
  ctx.fillRect(0, 0, a4W, a4H);

  const gx = Math.round((a4W - innerW) / 2);
  const gy = Math.round((a4H - innerH) / 2);
  const cw = innerW / UI_TOKENS.sizing.gridCount;
  const ch = innerH / UI_TOKENS.sizing.gridCount;
  const lw = isWeb ? UI_TOKENS.export.canvas.webLineWidth : UI_TOKENS.export.canvas.printLineWidth;

  ctx.strokeStyle = UI_TOKENS.export.canvas.borderColor;
  ctx.lineWidth = lw;
  ctx.strokeRect(gx + lw / 2, gy + lw / 2, innerW - lw, innerH - lw);
  ctx.beginPath();
  for (let col = 1; col < UI_TOKENS.sizing.gridCount; col += 1) {
    const x = gx + Math.round(cw * col);
    ctx.moveTo(x, gy);
    ctx.lineTo(x, gy + innerH);
  }
  for (let row = 1; row < UI_TOKENS.sizing.gridCount; row += 1) {
    const y = gy + Math.round(ch * row);
    ctx.moveTo(gx, y);
    ctx.lineTo(gx + innerW, y);
  }
  ctx.stroke();

  ctx.fillStyle = UI_TOKENS.export.canvas.textColor;
  ctx.font = `${fontPx}px "${ff}", sans-serif`;
  ctx.textBaseline = 'top';

  cards.forEach((text, index) => {
    const col = index % UI_TOKENS.sizing.gridCount;
    const row = Math.floor(index / UI_TOKENS.sizing.gridCount);
    const cx = gx + col * cw;
    const cy = gy + row * ch;
    const lines = text.split('\n');
    const lh = fontPx * UI_TOKENS.export.canvas.lineHeightMultiplier;
    const totalH = lines.length * lh;
    const padX = cw * CONTENT_MARGIN_RATIO;
    const padY = cw * CONTENT_MARGIN_RATIO;
    const startX = cx + padX;
    const startY = Math.max(cy + padY, cy + padY + (ch - padY * 2 - totalH) / 2);

    lines.forEach((line, lineIndex) => {
      let x = startX;
      const y = startY + lineIndex * lh;
      for (const char of line) {
        ctx.fillText(char, x, y);
        x += ctx.measureText(char).width + fontPx * UI_TOKENS.export.canvas.charSpacingRatio;
      }
    });
  });

  const cleanedTitle = titleText.trim();
  if (titleVisible && cleanedTitle) {
    const tpx = currentPt * (dpi / 72);
    const mgX = cw * CONTENT_MARGIN_RATIO;
    const mgY = cw * CONTENT_MARGIN_RATIO;

    ctx.font = `${tpx}px "${ff}", sans-serif`;
    const isBottom = titlePos.startsWith('bottom');
    const align = titlePos.includes('center') ? 'center' : titlePos.includes('right') ? 'right' : 'left';

    ctx.textAlign = align;
    ctx.textBaseline = isBottom ? 'bottom' : 'top';
    const tx = align === 'center' ? gx + innerW / 2 : align === 'right' ? gx + innerW - mgX : gx + mgX;
    const ty = isBottom ? gy + innerH - mgY : gy + mgY;
    ctx.fillText(cleanedTitle, tx, ty);
  }

  return canvas;
}
