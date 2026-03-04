export type SizeGroup = 'A' | 'B' | 'card' | 'book';

export type TitlePos =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export type FontType = 'sans' | 'serif';

export type PaperSize = {
  key: string;
  label: string;
  w72: number;
  h72: number;
  w300: number;
  h300: number;
  mm: string;
  group?: SizeGroup;
};

export type EditorSnapshot = {
  currentSize: PaperSize;
  currentPt: number;
  currentFont: FontType;
  cards: string[];
  titleText: string;
  titleVisible: boolean;
  titlePos: TitlePos;
};

export type SimpleImportPayload = {
  title: string;
  cards: string[];
};
