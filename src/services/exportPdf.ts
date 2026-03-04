import { jsPDF } from 'jspdf';
import { UI_TOKENS } from '../tokens/uiTokens';
import { renderExportCanvas } from './exportCanvas';
import type { FontType, PaperSize, TitlePos } from '../types/editor';

type ExportPdfParams = {
  currentSize: PaperSize;
  currentPt: number;
  currentFont: FontType;
  cards: string[];
  titleText: string;
  titleVisible: boolean;
  titlePos: TitlePos;
};

export async function exportPrintPdf(params: ExportPdfParams) {
  await new Promise((resolve) => setTimeout(resolve, UI_TOKENS.export.delayMs));

  const canvas = renderExportCanvas({
    isWeb: false,
    ...params,
  });

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, UI_TOKENS.export.printMm.width, UI_TOKENS.export.printMm.height);
  pdf.save('card-layout-print-300dpi.pdf');
}
