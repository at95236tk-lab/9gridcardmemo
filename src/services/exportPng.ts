import { UI_TOKENS } from '../tokens/uiTokens';
import { renderExportCanvas } from './exportCanvas';
import type { FontType, PaperSize, TitlePos } from '../types/editor';

type ExportPngParams = {
  currentSize: PaperSize;
  currentPt: number;
  currentFont: FontType;
  cards: string[];
  titleText: string;
  titleVisible: boolean;
  titlePos: TitlePos;
};

export async function exportWebPng(params: ExportPngParams) {
  await new Promise((resolve) => setTimeout(resolve, UI_TOKENS.export.delayMs));

  const canvas = renderExportCanvas({
    isWeb: true,
    ...params,
  });

  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = 'card-layout-web-72dpi.png';
  link.click();
}
