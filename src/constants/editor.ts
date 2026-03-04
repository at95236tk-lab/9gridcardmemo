import type { FontType, SizeGroup, TitlePos, PaperSize } from '../types/editor';

export const A4_W72 = 595;
export const A4_H72 = 842;
export const A4_W300 = 2480;
export const A4_H300 = 3508;
export const MM72 = 25.4 / 72;
export const MM300 = 25.4 / 300;
export const CONTENT_MARGIN_RATIO = 0.08;
export const HISTORY_LIMIT = 200;
export const SIDEBAR_W = 230;
export const BULK_PANEL_W = 280;
export const PANEL_MIN_W = 180;
export const PANEL_MAX_W = 460;
export const MEMO_STORAGE_KEY = 'nine-grid-card-memo.v1';

export const SIZES: PaperSize[] = [
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

export const SAMPLE_TEXTS = [
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

export const TITLE_POSITIONS: { value: TitlePos; label: string }[] = [
  { value: 'top-left', label: '左上' },
  { value: 'top-center', label: '中央上' },
  { value: 'top-right', label: '右上' },
  { value: 'bottom-left', label: '左下' },
  { value: 'bottom-center', label: '中央下' },
  { value: 'bottom-right', label: '右下' },
];

export const GROUPS: { key: SizeGroup; label: string }[] = [
  { key: 'A', label: 'A 系' },
  { key: 'B', label: 'B 系（JIS）' },
  { key: 'card', label: '写真・はがき' },
  { key: 'book', label: '手帳' },
];

export const FONT_FAMILY = {
  sans: "'Noto Sans JP', sans-serif",
  serif: "'Noto Serif JP', serif",
} satisfies Record<FontType, string>;
