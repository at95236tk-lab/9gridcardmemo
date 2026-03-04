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

async function buildPrintPdfBlob(params: ExportPdfParams) {
  await new Promise((resolve) => setTimeout(resolve, UI_TOKENS.export.delayMs));

  const canvas = renderExportCanvas({
    isWeb: false,
    ...params,
  });

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, UI_TOKENS.export.printMm.width, UI_TOKENS.export.printMm.height);
  return pdf.output('blob');
}

export async function exportPrintPdf(params: ExportPdfParams) {
  const blob = await buildPrintPdfBlob(params);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'card-layout-print-300dpi.pdf';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export async function printGeneratedPdfInBrowser(params: ExportPdfParams) {
  const blob = await buildPrintPdfBlob(params);
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');

  if (!printWindow) {
    URL.revokeObjectURL(url);
    throw new Error('印刷プレビューを開けませんでした。ブラウザのポップアップ設定を確認してください。');
  }

  const tryPrint = () => {
    try {
      printWindow.focus();
      printWindow.print();
    } catch {
      // Some PDF viewers ignore scripted print calls; keeping the tab open allows manual printing.
    }
  };

  // Give the PDF viewer a moment to initialize before calling print.
  window.setTimeout(tryPrint, 600);
  window.setTimeout(() => URL.revokeObjectURL(url), 120000);
}
