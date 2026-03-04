import { SAMPLE_TEXTS, SIZES, TITLE_POSITIONS } from '../constants/editor';
import type { EditorSnapshot, PaperSize, SimpleImportPayload, TitlePos } from '../types/editor';
import type { MemoRecord, PersistedMemoStore } from '../types/memo';

export function snapshotsEqual(a: EditorSnapshot, b: EditorSnapshot) {
  if (a.currentPt !== b.currentPt) return false;
  if (a.currentFont !== b.currentFont) return false;
  if (a.titleText !== b.titleText) return false;
  if (a.titleVisible !== b.titleVisible) return false;
  if (a.titlePos !== b.titlePos) return false;
  if (a.currentSize.key !== b.currentSize.key) return false;
  if (a.currentSize.label !== b.currentSize.label) return false;
  if (a.currentSize.w72 !== b.currentSize.w72) return false;
  if (a.currentSize.h72 !== b.currentSize.h72) return false;
  if (a.currentSize.w300 !== b.currentSize.w300) return false;
  if (a.currentSize.h300 !== b.currentSize.h300) return false;
  if (a.currentSize.mm !== b.currentSize.mm) return false;
  if (a.cards.length !== b.cards.length) return false;
  for (let index = 0; index < a.cards.length; index += 1) {
    if (a.cards[index] !== b.cards[index]) return false;
  }
  return true;
}

function createMemoId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function buildDefaultSnapshot(): EditorSnapshot {
  const defaultSize = SIZES.find((item) => item.key === 'B6') ?? SIZES[0];
  return {
    currentSize: { ...defaultSize },
    currentPt: 5,
    currentFont: 'sans',
    cards: [...SAMPLE_TEXTS],
    titleText: '長野・信州 旅の最終確定ログ',
    titleVisible: true,
    titlePos: 'top-left',
  };
}

export function normalizeSnapshot(input: unknown): EditorSnapshot {
  const fallback = buildDefaultSnapshot();
  if (!input || typeof input !== 'object') return fallback;

  const candidate = input as Partial<EditorSnapshot>;
  const rawSize = candidate.currentSize;
  let nextSize = fallback.currentSize;

  if (rawSize && typeof rawSize === 'object') {
    const size = rawSize as Partial<PaperSize>;
    const key = typeof size.key === 'string' ? size.key : fallback.currentSize.key;
    const preset = SIZES.find((item) => item.key === key);
    if (preset) {
      nextSize = { ...preset };
    } else if (
      typeof size.label === 'string' &&
      typeof size.w72 === 'number' &&
      typeof size.h72 === 'number' &&
      typeof size.w300 === 'number' &&
      typeof size.h300 === 'number' &&
      typeof size.mm === 'string'
    ) {
      nextSize = {
        key,
        label: size.label,
        w72: size.w72,
        h72: size.h72,
        w300: size.w300,
        h300: size.h300,
        mm: size.mm,
      };
    }
  }

  const nextCards = Array.from({ length: 9 }, (_, index) => {
    const value = Array.isArray(candidate.cards) ? candidate.cards[index] : undefined;
    return typeof value === 'string' ? value : fallback.cards[index];
  });

  const titlePosCandidate = candidate.titlePos;
  const nextTitlePos: TitlePos =
    typeof titlePosCandidate === 'string' && TITLE_POSITIONS.some((item) => item.value === titlePosCandidate)
      ? titlePosCandidate
      : fallback.titlePos;

  return {
    currentSize: nextSize,
    currentPt: typeof candidate.currentPt === 'number' ? candidate.currentPt : fallback.currentPt,
    currentFont: candidate.currentFont === 'serif' ? 'serif' : 'sans',
    cards: nextCards,
    titleText: typeof candidate.titleText === 'string' ? candidate.titleText : fallback.titleText,
    titleVisible: typeof candidate.titleVisible === 'boolean' ? candidate.titleVisible : fallback.titleVisible,
    titlePos: nextTitlePos,
  };
}

export function createMemoRecord(snapshot?: EditorSnapshot, name?: string): MemoRecord {
  const now = Date.now();
  const normalizedSnapshot = normalizeSnapshot(snapshot ?? buildDefaultSnapshot());
  const unifiedName = name?.trim() ? name.trim() : normalizedSnapshot.titleText.trim() || '無題メモ';
  return {
    id: createMemoId(),
    name: unifiedName,
    snapshot: {
      ...normalizedSnapshot,
      titleText: unifiedName,
    },
    createdAt: now,
    updatedAt: now,
  };
}

export function createNextMemoName(records: MemoRecord[]) {
  let index = 1;
  while (records.some((record) => (record.snapshot.titleText.trim() || record.name) === `メモ ${index}`)) {
    index += 1;
  }
  return `メモ ${index}`;
}

export function normalizeMemoStore(input: unknown): PersistedMemoStore | null {
  if (!input || typeof input !== 'object') return null;
  const parsed = input as Partial<PersistedMemoStore>;
  if (parsed.version !== 1 || !Array.isArray(parsed.records)) return null;

  const records = parsed.records
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') return null;
      const candidate = entry as Partial<MemoRecord>;
      const name = typeof candidate.name === 'string' && candidate.name.trim() ? candidate.name.trim() : `メモ ${index + 1}`;
      const id = typeof candidate.id === 'string' && candidate.id ? candidate.id : createMemoId();
      return {
        id,
        name,
        snapshot: normalizeSnapshot(candidate.snapshot),
        createdAt: typeof candidate.createdAt === 'number' ? candidate.createdAt : Date.now(),
        updatedAt: typeof candidate.updatedAt === 'number' ? candidate.updatedAt : Date.now(),
      } satisfies MemoRecord;
    })
    .filter((record): record is MemoRecord => !!record);

  if (records.length === 0) return null;

  const parsedActiveId = typeof parsed.activeMemoId === 'string' ? parsed.activeMemoId : records[0].id;
  const activeMemoId = records.some((record) => record.id === parsedActiveId) ? parsedActiveId : records[0].id;

  return {
    version: 1,
    activeMemoId,
    records,
  };
}

export function normalizeCards(input: unknown) {
  return Array.from({ length: 9 }, (_, index) => {
    if (!Array.isArray(input)) return '';
    const value = input[index];
    return typeof value === 'string' ? value : '';
  });
}

export function extractSimpleImportPayload(input: unknown): SimpleImportPayload | null {
  if (!input || typeof input !== 'object') return null;

  const raw = input as {
    title?: unknown;
    cards?: unknown;
    cells?: unknown;
    data?: { title?: unknown; cards?: unknown; cells?: unknown };
    memos?: Array<{ data?: { title?: unknown; cards?: unknown; cells?: unknown } }>;
  };

  if (typeof raw.title === 'string') {
    return {
      title: raw.title,
      cards: normalizeCards(raw.cards ?? raw.cells),
    };
  }

  if (raw.data && typeof raw.data === 'object' && typeof raw.data.title === 'string') {
    return {
      title: raw.data.title,
      cards: normalizeCards(raw.data.cards ?? raw.data.cells),
    };
  }

  const firstMemoData = Array.isArray(raw.memos) ? raw.memos[0]?.data : undefined;
  if (firstMemoData && typeof firstMemoData.title === 'string') {
    return {
      title: firstMemoData.title,
      cards: normalizeCards(firstMemoData.cards ?? firstMemoData.cells),
    };
  }

  return null;
}

export function buildImportTemplate(title: string, cards: string[]) {
  const payload: SimpleImportPayload = {
    title,
    cards: normalizeCards(cards),
  };
  return JSON.stringify(payload, null, 2);
}
