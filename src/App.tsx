import { jsPDF } from 'jspdf';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';

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

type EditorSnapshot = {
  currentSize: PaperSize;
  currentPt: number;
  currentFont: FontType;
  cards: string[];
  titleText: string;
  titleVisible: boolean;
  titlePos: TitlePos;
};

type MemoRecord = {
  id: string;
  name: string;
  snapshot: EditorSnapshot;
  createdAt: number;
  updatedAt: number;
};

type PersistedMemoStore = {
  version: 1;
  activeMemoId: string;
  records: MemoRecord[];
};

type SimpleImportPayload = {
  title: string;
  cards: string[];
};

const A4_W72 = 595;
const A4_H72 = 842;
const A4_W300 = 2480;
const A4_H300 = 3508;
const MM72 = 25.4 / 72;
const MM300 = 25.4 / 300;
const CONTENT_MARGIN_RATIO = 0.08;
const HISTORY_LIMIT = 200;
const SIDEBAR_W = 230;
const BULK_PANEL_W = 280;
const PANEL_MIN_W = 180;
const PANEL_MAX_W = 460;
const MEMO_STORAGE_KEY = 'nine-grid-card-memo.v1';

function snapshotsEqual(a: EditorSnapshot, b: EditorSnapshot) {
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

function createMemoId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildDefaultSnapshot(): EditorSnapshot {
  const defaultSize = SIZES.find((item) => item.key === 'B6') ?? SIZES[0];
  return {
    currentSize: { ...defaultSize },
    currentPt: 5,
    currentFont: 'sans',
    cards: [...SAMPLE_TEXTS],
    titleText: 'ページタイトル',
    titleVisible: true,
    titlePos: 'top-left',
  };
}

function normalizeSnapshot(input: unknown): EditorSnapshot {
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

function createMemoRecord(snapshot?: EditorSnapshot, name?: string): MemoRecord {
  const now = Date.now();
  return {
    id: createMemoId(),
    name: name?.trim() ? name.trim() : 'メモ 1',
    snapshot: normalizeSnapshot(snapshot ?? buildDefaultSnapshot()),
    createdAt: now,
    updatedAt: now,
  };
}

function createNextMemoName(records: MemoRecord[]) {
  let index = 1;
  while (records.some((record) => record.name === `メモ ${index}`)) {
    index += 1;
  }
  return `メモ ${index}`;
}

function normalizeMemoStore(input: unknown): PersistedMemoStore | null {
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

function normalizeCards(input: unknown) {
  return Array.from({ length: 9 }, (_, index) => {
    if (!Array.isArray(input)) return '';
    const value = input[index];
    return typeof value === 'string' ? value : '';
  });
}

function extractSimpleImportPayload(input: unknown): SimpleImportPayload | null {
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

function buildImportTemplate(title: string, cards: string[]) {
  const payload: SimpleImportPayload = {
    title,
    cards: normalizeCards(cards),
  };
  return JSON.stringify(payload, null, 2);
}

function loadMemoStore(): { records: MemoRecord[]; activeMemoId: string } {
  const fallbackRecord = createMemoRecord(buildDefaultSnapshot(), 'メモ 1');

  if (typeof window === 'undefined') {
    return { records: [fallbackRecord], activeMemoId: fallbackRecord.id };
  }

  const raw = window.localStorage.getItem(MEMO_STORAGE_KEY);
  if (!raw) {
    return { records: [fallbackRecord], activeMemoId: fallbackRecord.id };
  }

  try {
    const parsed = JSON.parse(raw);
    const normalized = normalizeMemoStore(parsed);
    if (!normalized) {
      return { records: [fallbackRecord], activeMemoId: fallbackRecord.id };
    }
    return { records: normalized.records, activeMemoId: normalized.activeMemoId };
  } catch {
    return { records: [fallbackRecord], activeMemoId: fallbackRecord.id };
  }
}

function ptToScreenPx(pt: number) {
  return pt * (96 / 72);
}

function normalizeScale(value: number) {
  if (Number.isNaN(value)) return 100;
  return Math.min(Math.max(value, 50), 300);
}

function App() {
  const initialMemoStore = useMemo(() => loadMemoStore(), []);
  const initialSnapshot = useMemo(() => {
    const current = initialMemoStore.records.find((item) => item.id === initialMemoStore.activeMemoId);
    return current?.snapshot ?? buildDefaultSnapshot();
  }, [initialMemoStore]);

  const [memoRecords, setMemoRecords] = useState<MemoRecord[]>(initialMemoStore.records);
  const [activeMemoId, setActiveMemoId] = useState(initialMemoStore.activeMemoId);

  const [currentSize, setCurrentSize] = useState<PaperSize>(initialSnapshot.currentSize);
  const [currentPt, setCurrentPt] = useState(initialSnapshot.currentPt);
  const [currentFont, setCurrentFont] = useState<FontType>(initialSnapshot.currentFont);
  const [cards, setCards] = useState<string[]>(initialSnapshot.cards);
  const [activeEditIndex, setActiveEditIndex] = useState<number | null>(null);
  const [titleEditing, setTitleEditing] = useState(false);
  const [titleText, setTitleText] = useState(initialSnapshot.titleText);
  const [titleVisible, setTitleVisible] = useState(initialSnapshot.titleVisible);
  const [titlePos, setTitlePos] = useState<TitlePos>(initialSnapshot.titlePos);
  const [scalePct, setScalePct] = useState(100);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_W);
  const [bulkPanelWidth, setBulkPanelWidth] = useState(BULK_PANEL_W);
  const [activeResizer, setActiveResizer] = useState<'left' | 'right' | null>(null);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);
  const [bulkDrawerOpen, setBulkDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('PDF生成中…');
  const [customW, setCustomW] = useState('');
  const [customH, setCustomH] = useState('');
  const [customMmW, setCustomMmW] = useState('');
  const [customMmH, setCustomMmH] = useState('');
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [spacePanReady, setSpacePanReady] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [importPopupOpen, setImportPopupOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState('');
  const [memoManagePopupOpen, setMemoManagePopupOpen] = useState(false);
  const [deleteConfirmPopupOpen, setDeleteConfirmPopupOpen] = useState(false);
  const [memoCreatePopupOpen, setMemoCreatePopupOpen] = useState(false);
  const [memoCreateMode, setMemoCreateMode] = useState<'new' | 'duplicate'>('new');
  const [memoCreateName, setMemoCreateName] = useState('');
  const [selectedMemoIds, setSelectedMemoIds] = useState<string[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [switchTargetMemoId, setSwitchTargetMemoId] = useState<string | null>(null);
  const [memoSortMode, setMemoSortMode] = useState<'recent' | 'name'>('recent');
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [editingMemoName, setEditingMemoName] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [topbarDropdownOpen, setTopbarDropdownOpen] = useState(false);

  const canvasAreaRef = useRef<HTMLDivElement | null>(null);
  const topbarDropdownRef = useRef<HTMLDivElement | null>(null);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panBaseRef = useRef({ x: 0, y: 0 });
  const pinchStartDistanceRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef(100);
  const cardTextRefs = useRef<Array<HTMLDivElement | null>>([]);
  const titleTextRef = useRef<HTMLDivElement | null>(null);
  const historyRef = useRef<EditorSnapshot[]>([]);
  const historyIndexRef = useRef(-1);
  const applyingHistoryRef = useRef(false);
  const switchingMemoRef = useRef(false);
  const panelResizeStartRef = useRef({ x: 0, width: 0 });

  const innerTop = Math.round((A4_H72 - currentSize.h72) / 2);
  const innerLeft = Math.round((A4_W72 - currentSize.w72) / 2);
  const cardMargin = (currentSize.w72 / 3) * CONTENT_MARGIN_RATIO;
  const scale = scalePct / 100;

  const infoInner = currentSize.key === 'custom' ? `カスタム ${currentSize.mm}mm` : `${currentSize.label}(${currentSize.mm}mm)`;
  const infoFont = currentFont === 'sans' ? 'ゴシック' : '明朝';
  const activeMemo = useMemo(() => memoRecords.find((item) => item.id === activeMemoId) ?? null, [memoRecords, activeMemoId]);
  const sortedMemoRecords = useMemo(() => {
    const copied = [...memoRecords];
    if (memoSortMode === 'name') {
      copied.sort((left, right) => left.name.localeCompare(right.name, 'ja'));
      return copied;
    }
    copied.sort((left, right) => {
      if (right.updatedAt !== left.updatedAt) return right.updatedAt - left.updatedAt;
      return left.name.localeCompare(right.name, 'ja');
    });
    return copied;
  }, [memoRecords, memoSortMode]);
  const isMultiSelectMode = selectedMemoIds.length >= 2;
  const layoutStyle = useMemo(
    () =>
      ({
        '--sidebar-w': `${sidebarWidth}px`,
        '--bulk-panel-w': `${bulkPanelWidth}px`,
      }) as CSSProperties,
    [bulkPanelWidth, sidebarWidth],
  );

  const createSnapshot = useCallback(
    (): EditorSnapshot => ({
      currentSize: { ...currentSize },
      currentPt,
      currentFont,
      cards: [...cards],
      titleText,
      titleVisible,
      titlePos,
    }),
    [cards, currentFont, currentPt, currentSize, titlePos, titleText, titleVisible],
  );

  const applySnapshot = useCallback((snapshot: EditorSnapshot) => {
    applyingHistoryRef.current = true;
    setCurrentSize({ ...snapshot.currentSize });
    setCurrentPt(snapshot.currentPt);
    setCurrentFont(snapshot.currentFont);
    setCards([...snapshot.cards]);
    setTitleText(snapshot.titleText);
    setTitleVisible(snapshot.titleVisible);
    setTitlePos(snapshot.titlePos);
    setActiveEditIndex(null);
    setTitleEditing(false);
  }, []);

  const loadMemoSnapshot = useCallback((snapshot: EditorSnapshot) => {
    switchingMemoRef.current = true;
    historyRef.current = [snapshot];
    historyIndexRef.current = 0;
    applyingHistoryRef.current = true;
    setCurrentSize({ ...snapshot.currentSize });
    setCurrentPt(snapshot.currentPt);
    setCurrentFont(snapshot.currentFont);
    setCards([...snapshot.cards]);
    setTitleText(snapshot.titleText);
    setTitleVisible(snapshot.titleVisible);
    setTitlePos(snapshot.titlePos);
    setActiveEditIndex(null);
    setTitleEditing(false);
  }, []);

  const undoSnapshot = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const snapshot = historyRef.current[historyIndexRef.current];
    if (!snapshot) return;
    applySnapshot(snapshot);
  }, [applySnapshot]);

  const redoSnapshot = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const snapshot = historyRef.current[historyIndexRef.current];
    if (!snapshot) return;
    applySnapshot(snapshot);
  }, [applySnapshot]);

  useEffect(() => {
    const snapshot = createSnapshot();

    if (switchingMemoRef.current) {
      switchingMemoRef.current = false;
      return;
    }

    setMemoRecords((prev) =>
      prev.map((record) => {
        if (record.id !== activeMemoId) return record;
        if (snapshotsEqual(record.snapshot, snapshot)) return record;
        return { ...record, snapshot, updatedAt: Date.now() };
      }),
    );

    if (historyIndexRef.current === -1) {
      historyRef.current = [snapshot];
      historyIndexRef.current = 0;
      return;
    }

    if (applyingHistoryRef.current) {
      applyingHistoryRef.current = false;
      return;
    }

    const current = historyRef.current[historyIndexRef.current];
    if (current && snapshotsEqual(current, snapshot)) return;

    let nextHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    nextHistory.push(snapshot);
    if (nextHistory.length > HISTORY_LIMIT) {
      nextHistory = nextHistory.slice(nextHistory.length - HISTORY_LIMIT);
    }

    historyRef.current = nextHistory;
    historyIndexRef.current = nextHistory.length - 1;
  }, [activeMemoId, createSnapshot]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const payload: PersistedMemoStore = {
      version: 1,
      activeMemoId,
      records: memoRecords,
    };
    window.localStorage.setItem(MEMO_STORAGE_KEY, JSON.stringify(payload));
  }, [activeMemoId, memoRecords]);

  useEffect(() => {
    if (memoRecords.length === 0) return;
    if (memoRecords.some((record) => record.id === activeMemoId)) return;
    const fallback = memoRecords[0];
    setActiveMemoId(fallback.id);
    loadMemoSnapshot(fallback.snapshot);
  }, [activeMemoId, loadMemoSnapshot, memoRecords]);

  useEffect(() => {
    document.documentElement.style.setProperty('--card-font-size', `${ptToScreenPx(currentPt)}px`);
  }, [currentPt]);

  useEffect(() => {
    document.body.classList.toggle('settings-drawer-open', settingsDrawerOpen);
    document.body.classList.toggle('bulk-drawer-open', bulkDrawerOpen);
    return () => {
      document.body.classList.remove('settings-drawer-open');
      document.body.classList.remove('bulk-drawer-open');
    };
  }, [bulkDrawerOpen, settingsDrawerOpen]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 900) {
        setSettingsDrawerOpen(false);
        setBulkDrawerOpen(false);
      } else {
        setActiveResizer(null);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!activeResizer) return;

    const handlePointerMove = (event: PointerEvent) => {
      const deltaX = event.clientX - panelResizeStartRef.current.x;
      if (activeResizer === 'left') {
        const next = Math.min(Math.max(panelResizeStartRef.current.width + deltaX, PANEL_MIN_W), PANEL_MAX_W);
        setSidebarWidth(next);
        return;
      }
      const next = Math.min(Math.max(panelResizeStartRef.current.width - deltaX, PANEL_MIN_W), PANEL_MAX_W);
      setBulkPanelWidth(next);
    };

    const handlePointerUp = () => {
      setActiveResizer(null);
    };

    document.body.classList.add('panel-resizing');
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      document.body.classList.remove('panel-resizing');
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [activeResizer]);

  useEffect(() => {
    const autoScale = () => {
      const isMobile = window.innerWidth <= 900;
      const sidePanels = isMobile ? 0 : sidebarWidth + bulkPanelWidth;
      const canvasWidth = window.innerWidth - sidePanels - 56;
      const canvasHeight = window.innerHeight - 60;
      let pct = Math.floor(Math.min(canvasWidth / A4_W72, canvasHeight / A4_H72) * 100);
      pct = Math.min(Math.max(pct, 30), 300);
      setScalePct(pct);
    };

    autoScale();
    window.addEventListener('resize', autoScale);
    return () => window.removeEventListener('resize', autoScale);
  }, [bulkPanelWidth, sidebarWidth]);

  const startPanelResize = (side: 'left' | 'right', event: ReactPointerEvent<HTMLButtonElement>) => {
    if (window.innerWidth <= 900) return;
    event.preventDefault();
    panelResizeStartRef.current = {
      x: event.clientX,
      width: side === 'left' ? sidebarWidth : bulkPanelWidth,
    };
    setActiveResizer(side);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditableTarget = !!target?.closest('input, textarea, select, button') || !!target?.closest('[contenteditable="true"]');

      if ((event.ctrlKey || event.metaKey) && !event.altKey) {
        const lowerKey = event.key.toLowerCase();
        const isUndo = lowerKey === 'z' && !event.shiftKey;
        const isRedo = (lowerKey === 'z' && event.shiftKey) || lowerKey === 'y';
        if (isUndo || isRedo) {
          event.preventDefault();
          if (isUndo) {
            undoSnapshot();
          } else {
            redoSnapshot();
          }
          return;
        }
      }

      if (event.key === 'Escape') {
        setSettingsDrawerOpen(false);
        setBulkDrawerOpen(false);
        setImportPopupOpen(false);
        setMemoManagePopupOpen(false);
        setDeleteConfirmPopupOpen(false);
        setMemoCreatePopupOpen(false);
        setTopbarDropdownOpen(false);
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
  }, [redoSnapshot, undoSnapshot]);

  useEffect(() => {
    if (!topbarDropdownOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (topbarDropdownRef.current?.contains(target)) return;
      setTopbarDropdownOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [topbarDropdownOpen]);

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

  useEffect(() => {
    if (activeEditIndex === null) return;
    const target = cardTextRefs.current[activeEditIndex];
    if (!target) return;
    requestAnimationFrame(() => {
      target.focus();
      const selection = window.getSelection();
      if (!selection) return;
      const range = document.createRange();
      range.selectNodeContents(target);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    });
  }, [activeEditIndex]);

  useEffect(() => {
    if (!titleEditing) return;
    const target = titleTextRef.current;
    if (!target) return;
    requestAnimationFrame(() => {
      target.focus();
      const selection = window.getSelection();
      if (!selection) return;
      const range = document.createRange();
      range.selectNodeContents(target);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    });
  }, [titleEditing]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('.card-text, #page-title')) return;
      setActiveEditIndex(null);
      setTitleEditing(false);
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, []);

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

  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return null;
    const first = touches[0];
    const second = touches[1];
    const dx = second.clientX - first.clientX;
    const dy = second.clientY - first.clientY;
    return Math.hypot(dx, dy);
  };

  const handleCanvasMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('#previewZoom')) return;
    if (target.closest('input, textarea, select, button')) return;
    if (target.closest('#page-title')) return;
    if (target.closest('.card-text')) return;
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

  const handleCanvasTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length >= 2) {
      const distance = getTouchDistance(event.touches);
      if (distance) {
        pinchStartDistanceRef.current = distance;
        pinchStartScaleRef.current = scalePct;
      }
      setIsPanning(false);
      event.preventDefault();
      return;
    }

    const target = event.target as HTMLElement;
    if (target.closest('#previewZoom')) return;
    if (target.closest('input, textarea, select, button')) return;
    if (target.closest('#page-title')) return;
    if (target.closest('.card-text')) return;
    if (target.closest('[contenteditable="true"]')) return;

    if (event.touches.length === 1) {
      const touch = event.touches[0];
      startPan(touch.clientX, touch.clientY);
      event.preventDefault();
    }
  };

  const handleCanvasTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length >= 2) {
      const startDistance = pinchStartDistanceRef.current;
      const distance = getTouchDistance(event.touches);
      if (!startDistance || !distance) return;

      const ratio = distance / startDistance;
      const nextScale = normalizeScale(Math.round(pinchStartScaleRef.current * ratio));
      setScalePct(nextScale);
      event.preventDefault();
      return;
    }

    if (event.touches.length === 1 && isPanning) {
      const touch = event.touches[0];
      const dx = touch.clientX - panStartRef.current.x;
      const dy = touch.clientY - panStartRef.current.y;
      setPanOffset({ x: panBaseRef.current.x + dx, y: panBaseRef.current.y + dy });
      event.preventDefault();
    }
  };

  const handleCanvasTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length >= 2) {
      const distance = getTouchDistance(event.touches);
      pinchStartDistanceRef.current = distance;
      pinchStartScaleRef.current = scalePct;
      return;
    }

    pinchStartDistanceRef.current = null;

    if (event.touches.length === 1) {
      const touch = event.touches[0];
      startPan(touch.clientX, touch.clientY);
      return;
    }

    setIsPanning(false);
  };

  const updateCard = (index: number, value: string) => {
    setCards((prev) => prev.map((item, idx) => (idx === index ? value : item)));
  };

  const toggleSettingsDrawer = () => {
    setSettingsDrawerOpen((prev) => {
      const next = !prev;
      if (next) setBulkDrawerOpen(false);
      return next;
    });
  };

  const toggleBulkDrawer = () => {
    setBulkDrawerOpen((prev) => {
      const next = !prev;
      if (next) setSettingsDrawerOpen(false);
      return next;
    });
  };

  const switchMemo = (memoId: string) => {
    if (memoId === activeMemoId) return;
    const target = memoRecords.find((record) => record.id === memoId);
    if (!target) return;
    setActiveMemoId(memoId);
    loadMemoSnapshot(target.snapshot);
  };

  const createNewMemo = (name?: string) => {
    const snapshot = buildDefaultSnapshot();
    const nextName = name?.trim() ? name.trim() : createNextMemoName(memoRecords);
    const record = createMemoRecord(snapshot, nextName);
    setMemoRecords((prev) => [record, ...prev]);
    setActiveMemoId(record.id);
    loadMemoSnapshot(snapshot);
  };

  const duplicateMemo = (name?: string) => {
    const baseName = activeMemo?.name ?? 'メモ';
    const snapshot = createSnapshot();
    const nextName = name?.trim() ? name.trim() : `${baseName} コピー`;
    const record = createMemoRecord(snapshot, nextName);
    setMemoRecords((prev) => [record, ...prev]);
    setActiveMemoId(record.id);
    loadMemoSnapshot(snapshot);
  };

  const openCreateMemoPopup = (mode: 'new' | 'duplicate') => {
    setMemoCreateMode(mode);
    const defaultName = mode === 'new' ? createNextMemoName(memoRecords) : `${activeMemo?.name ?? 'メモ'} コピー`;
    setMemoCreateName(defaultName);
    setMemoCreatePopupOpen(true);
  };

  const submitCreateMemo = () => {
    const trimmedName = memoCreateName.trim();
    if (!trimmedName) return;

    if (memoCreateMode === 'new') {
      createNewMemo(trimmedName);
    } else {
      duplicateMemo(trimmedName);
    }

    setMemoCreatePopupOpen(false);
  };

  const openImportDialog = () => {
    setImportJsonText(buildImportTemplate(titleText, cards));
    setImportError('');
    setImportPopupOpen(true);
  };

  const openMemoManageDialog = () => {
    setSelectedMemoIds([]);
    setSwitchTargetMemoId(activeMemoId);
    setDeleteError('');
    setEditingMemoId(null);
    setEditingMemoName('');
    setDeleteConfirmPopupOpen(false);
    setMemoManagePopupOpen(true);
  };

  const toggleMemoSelection = (memoId: string) => {
    setSelectedMemoIds((prev) => (prev.includes(memoId) ? prev.filter((id) => id !== memoId) : [...prev, memoId]));
    if (deleteError) setDeleteError('');
  };

  const askDeleteConfirmation = (targetIds: string[]) => {
    if (targetIds.length === 0) {
      setDeleteError('削除するメモを1件以上選択してください。');
      return;
    }
    setPendingDeleteIds(targetIds);
    setDeleteConfirmPopupOpen(true);
  };

  const closeDeletePopups = () => {
    setMemoManagePopupOpen(false);
    setDeleteConfirmPopupOpen(false);
    setDeleteError('');
    setPendingDeleteIds([]);
    setSwitchTargetMemoId(null);
  };

  const closeDeleteConfirmOnly = () => {
    setDeleteConfirmPopupOpen(false);
    setPendingDeleteIds([]);
  };

  const switchFromSelection = () => {
    if (!switchTargetMemoId) return;
    switchMemo(switchTargetMemoId);
    setMemoManagePopupOpen(false);
    setSwitchTargetMemoId(null);
    setDeleteError('');
  };

  const switchFromTopbarDropdown = (memoId: string) => {
    setTopbarDropdownOpen(false);
    switchMemo(memoId);
  };

  const deleteFromTopbarDropdown = (memoId: string) => {
    setTopbarDropdownOpen(false);
    askDeleteConfirmation([memoId]);
  };

  const startMemoNameEdit = (memoId: string, name: string) => {
    setEditingMemoId(memoId);
    setEditingMemoName(name);
  };

  const commitMemoNameEdit = () => {
    if (!editingMemoId) return;
    const nextName = editingMemoName.trim().slice(0, 40) || '無題メモ';
    setMemoRecords((prev) =>
      prev.map((record) => (record.id === editingMemoId ? { ...record, name: nextName, updatedAt: Date.now() } : record)),
    );
    setEditingMemoId(null);
    setEditingMemoName('');
  };

  const cancelMemoNameEdit = () => {
    setEditingMemoId(null);
    setEditingMemoName('');
  };

  const executeDeleteMemos = () => {
    const targetSet = new Set(pendingDeleteIds);
    const remaining = memoRecords.filter((record) => !targetSet.has(record.id));

    if (remaining.length === 0) {
      const snapshot = buildDefaultSnapshot();
      const record = createMemoRecord(snapshot, 'メモ 1');
      setMemoRecords([record]);
      setActiveMemoId(record.id);
      loadMemoSnapshot(snapshot);
      closeDeletePopups();
      return;
    }

    const shouldSwitchActive = targetSet.has(activeMemoId);
    setMemoRecords(remaining);
    setSelectedMemoIds((prev) => prev.filter((id) => !targetSet.has(id)));
    if (shouldSwitchActive) {
      const nextActive = remaining[0];
      setActiveMemoId(nextActive.id);
      loadMemoSnapshot(nextActive.snapshot);
    }

    closeDeleteConfirmOnly();
  };

  const parseImportJson = () => {
    try {
      const parsed = JSON.parse(importJsonText);
      const normalized = extractSimpleImportPayload(parsed);
      if (!normalized) {
        setImportError('`title` と `cards`（または `cells`）を含むJSONを入力してください。');
        return null;
      }

      return normalized;
    } catch {
      setImportError('JSONの構文が不正です。カンマやクォートを確認してください。');
      return null;
    }
  };

  const importAsNewMemo = () => {
    const normalized = parseImportJson();
    if (!normalized) return;

      const snapshot = buildDefaultSnapshot();
      snapshot.titleText = normalized.title.slice(0, 80);
      snapshot.cards = normalized.cards;

      const nextMemoName = normalized.title.trim().slice(0, 40) || createNextMemoName(memoRecords);
      const record = createMemoRecord(snapshot, nextMemoName);
      setMemoRecords((prev) => [record, ...prev]);
      setActiveMemoId(record.id);
      loadMemoSnapshot(snapshot);

      setImportPopupOpen(false);
      setImportError('');
  };

  const importOverwriteCurrentMemo = () => {
    const normalized = parseImportJson();
    if (!normalized) return;

    const titleValue = normalized.title.slice(0, 80);
    setTitleText(titleValue);
    setCards(normalized.cards);

    setMemoRecords((prev) =>
      prev.map((record) => {
        if (record.id !== activeMemoId) return record;
        const nextName = titleValue.trim().slice(0, 40) || record.name;
        return {
          ...record,
          name: nextName,
          updatedAt: Date.now(),
        };
      }),
    );

    setImportPopupOpen(false);
    setImportError('');
  };

  const renderExportCanvas = (isWeb: boolean) => {
    const dpi = isWeb ? 72 : 300;
    const renderScale = isWeb ? 4 : 1;
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
      const padX = cw * CONTENT_MARGIN_RATIO;
      const padY = cw * CONTENT_MARGIN_RATIO;
      const startX = cx + padX;
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
  };

  const exportPrintPdf = async () => {
    setLoadingMsg('印刷用(300dpi) PDFを生成中...');
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 80));

    try {
      const canvas = renderExportCanvas(false);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297);
      pdf.save('card-layout-print-300dpi.pdf');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      window.alert(`PDF生成エラー: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const exportWebPng = async () => {
    setLoadingMsg('Web用(72dpi / 4x高精細) PNGを生成中...');
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 80));

    try {
      const canvas = renderExportCanvas(true);
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = 'card-layout-web-72dpi.png';
      link.click();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      window.alert(`PNG生成エラー: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const bulkEditorPanel = (
    <div className="bulk-editor-panel">
      <div className="bulk-title">まとめて入力</div>
      <div className="bulk-input-group">
        <label className="bulk-input-label">ページタイトル</label>
        <input
          className="bulk-title-input"
          type="text"
          value={titleText}
          onChange={(event) => setTitleText(event.target.value)}
          maxLength={80}
        />
      </div>

      <div className="bulk-input-grid">
        {cards.map((text, index) => (
          <div key={index} className="bulk-input-card">
            <label className="bulk-input-label">カード {index + 1}</label>
            <textarea
              className="bulk-textarea"
              value={text}
              onChange={(event) => updateCard(index, event.target.value)}
              onFocus={() => {
                setActiveEditIndex(null);
                setTitleEditing(false);
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <div className={`loading-overlay${loading ? ' show' : ''}`}>
        <div className="spinner" />
        <div>{loadingMsg}</div>
      </div>

      <div className={`import-popup-overlay${importPopupOpen ? ' show' : ''}`}>
        <div className="import-popup" role="dialog" aria-modal="true" aria-label="JSONインポート">
          <div className="import-popup-title">JSONインポート（タイトル + 9マス）</div>
          <p className="import-popup-help">`title` と `cards` のみ反映します。新規作成か上書きを選択してください。</p>
          <textarea
            className="import-json-input"
            value={importJsonText}
            onChange={(event) => {
              setImportJsonText(event.target.value);
              if (importError) setImportError('');
            }}
          />
          {importError ? <div className="import-popup-error">{importError}</div> : null}
          <div className="import-popup-actions">
            <button
              className="toggle-btn"
              type="button"
              onClick={() => {
                setImportPopupOpen(false);
                setImportError('');
              }}
            >
              キャンセル
            </button>
            <button className="toggle-btn" type="button" onClick={importOverwriteCurrentMemo}>
              上書き
            </button>
            <button className="toggle-btn active" type="button" onClick={importAsNewMemo}>
              新規作成
            </button>
          </div>
        </div>
      </div>

      <div className={`import-popup-overlay${memoManagePopupOpen ? ' show' : ''}`}>
        <div className="import-popup delete-popup" role="dialog" aria-modal="true" aria-label="メモ管理">
          <div className="import-popup-title">メモ切り替え・管理</div>
          <div className="memo-manage-toolbar">
            <select
              id="memoSortMode"
              className="memo-sort-select"
              value={memoSortMode}
              onChange={(event) => setMemoSortMode(event.target.value === 'name' ? 'name' : 'recent')}
            >
              <option value="recent">最近使った順</option>
              <option value="name">五十音順</option>
            </select>
            <button className="toggle-btn" type="button" onClick={() => openCreateMemoPopup('new')}>
              新規作成
            </button>
            <button className="toggle-btn" type="button" onClick={() => openCreateMemoPopup('duplicate')}>
              複製
            </button>
            <button
              className={`toggle-btn${isMultiSelectMode ? ' active' : ''}`}
              type="button"
              onClick={() => askDeleteConfirmation(selectedMemoIds)}
              disabled={!isMultiSelectMode}
            >
              まとめて削除
            </button>
          </div>
          <div className="delete-list">
            {sortedMemoRecords.map((record) => {
              const selected = selectedMemoIds.includes(record.id);
              const editing = editingMemoId === record.id;
              return (
                <div
                  key={record.id}
                  className={`memo-manage-row${selected ? ' selected' : ''}${switchTargetMemoId === record.id ? ' switch-target' : ''}`}
                  onClick={() => setSwitchTargetMemoId(record.id)}
                >
                  <label
                    className="memo-select-check"
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                  >
                    <input type="checkbox" checked={selected} onChange={() => toggleMemoSelection(record.id)} />
                  </label>
                  <div className="memo-manage-left">
                    {editing ? (
                      <input
                        className="memo-name-inline"
                        type="text"
                        value={editingMemoName}
                        maxLength={40}
                        autoFocus
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => setEditingMemoName(event.target.value)}
                        onBlur={commitMemoNameEdit}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            commitMemoNameEdit();
                          }
                          if (event.key === 'Escape') {
                            event.preventDefault();
                            cancelMemoNameEdit();
                          }
                        }}
                      />
                    ) : (
                      <span className="memo-name-text">{record.name}</span>
                    )}
                  </div>
                  <div className="memo-row-actions">
                    <button
                      className="toggle-btn memo-row-icon-btn"
                      type="button"
                      aria-label="このメモ名を編集"
                      title="名前を編集"
                      onClick={(event) => {
                        event.stopPropagation();
                        startMemoNameEdit(record.id, record.name);
                      }}
                    >
                      ✎
                    </button>
                    <button
                      className="toggle-btn memo-row-icon-btn"
                      type="button"
                      aria-label="このメモを削除"
                      title="削除"
                      onClick={(event) => {
                        event.stopPropagation();
                        askDeleteConfirmation([record.id]);
                      }}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {deleteError ? <div className="import-popup-error">{deleteError}</div> : null}
          <div className="import-popup-actions two-col">
            <button className="toggle-btn" type="button" onClick={closeDeletePopups}>
              キャンセル
            </button>
            <button
              className={`toggle-btn${switchTargetMemoId ? ' active' : ''}`}
              type="button"
              onClick={switchFromSelection}
              disabled={!switchTargetMemoId}
            >
              切り替え
            </button>
          </div>
        </div>
      </div>

      <div className={`import-popup-overlay${deleteConfirmPopupOpen ? ' show' : ''}`}>
        <div className="import-popup delete-confirm-popup" role="dialog" aria-modal="true" aria-label="削除確認">
          <div className="import-popup-title">削除の確認</div>
          <p className="import-popup-help">選択中の {pendingDeleteIds.length} 件を削除します。よろしいですか？</p>
          <div className="import-popup-actions two-col">
            <button className="toggle-btn" type="button" onClick={closeDeleteConfirmOnly}>
              キャンセル
            </button>
            <button className="toggle-btn active" type="button" onClick={executeDeleteMemos}>
              削除する
            </button>
          </div>
        </div>
      </div>

      <div className={`import-popup-overlay${memoCreatePopupOpen ? ' show' : ''}`}>
        <div className="import-popup create-memo-popup" role="dialog" aria-modal="true" aria-label="メモ作成">
          <div className="import-popup-title">{memoCreateMode === 'new' ? '新規メモ作成' : '複製メモ作成'}</div>
          <input
            className="memo-create-input"
            type="text"
            value={memoCreateName}
            maxLength={40}
            autoFocus
            onChange={(event) => setMemoCreateName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && memoCreateName.trim()) {
                event.preventDefault();
                submitCreateMemo();
              }
            }}
          />
          <div className="import-popup-actions two-col">
            <button className="toggle-btn" type="button" onClick={() => setMemoCreatePopupOpen(false)}>
              キャンセル
            </button>
            <button
              className={`toggle-btn${memoCreateName.trim() ? ' active' : ''}`}
              type="button"
              onClick={submitCreateMemo}
              disabled={!memoCreateName.trim()}
            >
              作成
            </button>
          </div>
        </div>
      </div>

      <button
        className="drawer-toggle settings-toggle"
        type="button"
        aria-label="設定パネルを開く"
        aria-controls="sidePanel"
        aria-expanded={settingsDrawerOpen}
        onClick={toggleSettingsDrawer}
      >
        設定
      </button>
      <button
        className="drawer-toggle bulk-toggle"
        type="button"
        aria-label="一括入力パネルを開く"
        aria-controls="bulkDrawerPanel"
        aria-expanded={bulkDrawerOpen}
        onClick={toggleBulkDrawer}
      >
        入力
      </button>
      <div
        className={`drawer-backdrop${settingsDrawerOpen || bulkDrawerOpen ? ' show' : ''}`}
        aria-hidden={!settingsDrawerOpen && !bulkDrawerOpen}
        onClick={() => {
          setSettingsDrawerOpen(false);
          setBulkDrawerOpen(false);
        }}
      />

      <div className="app-shell">
        <header className="memo-topbar" aria-label="メモ管理バー">
          <div className="memo-topbar-dropdown" ref={topbarDropdownRef}>
            <button
              className="memo-topbar-select"
              type="button"
              aria-haspopup="listbox"
              aria-expanded={topbarDropdownOpen}
              aria-label="メモ切り替え"
              onClick={() => setTopbarDropdownOpen((prev) => !prev)}
            >
              <span className="memo-topbar-select-text">{activeMemo?.name ?? 'メモ 1'}</span>
              <span className="memo-topbar-caret">▾</span>
            </button>

            <div className={`memo-topbar-dropdown-menu${topbarDropdownOpen ? ' show' : ''}`} role="listbox" aria-label="メモ一覧">
              {memoRecords.map((record) => (
                <div key={record.id} className={`memo-topbar-option${record.id === activeMemoId ? ' active' : ''}`}>
                  <button className="memo-topbar-option-name" type="button" onClick={() => switchFromTopbarDropdown(record.id)}>
                    {record.name}
                  </button>
                  <button
                    className="memo-topbar-option-delete"
                    type="button"
                    aria-label="このメモを削除"
                    title="削除"
                    onClick={() => deleteFromTopbarDropdown(record.id)}
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>
          </div>
          <button className="toggle-btn memo-topbar-btn" onClick={openMemoManageDialog} type="button">
            管理
          </button>
          <button className="toggle-btn memo-topbar-btn" onClick={() => openCreateMemoPopup('new')} type="button">
            新規
          </button>
          <button className="toggle-btn memo-topbar-btn" onClick={() => openCreateMemoPopup('duplicate')} type="button">
            複製
          </button>
          <button className="toggle-btn memo-topbar-btn" onClick={openImportDialog} type="button">
            JSON
          </button>
        </header>

        <div className={`layout${activeResizer ? ' is-resizing' : ''}`} style={layoutStyle}>
        <aside className="sidebar" id="sidePanel">
          <div className="sidebar-inner">
            <div>
              <div className="app-title">A4 カードレイアウト</div>
              <div className="app-info">
                メモ：<em>{activeMemo?.name ?? 'メモ 1'}</em>
                <br />
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
                  className="ui-range"
                  type="range"
                  min={3}
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
                  className="ui-range"
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
              <div className="pdf-group" style={{ marginTop: 4 }}>
                <div className="pdf-label">データ書き出し</div>
                <button className="action-btn" onClick={() => void exportWebPng()} type="button">
                  ⬇ Web 用 PNG（72dpi）
                </button>
                <button className="action-btn" onClick={() => void exportPrintPdf()} type="button">
                  ⬇ 印刷用（300dpi）
                </button>
              </div>
              <button className="action-btn dim" onClick={() => window.print()} type="button" style={{ marginTop: 4 }}>
                🖨 ブラウザ印刷
              </button>
            </div>
          </div>
        </aside>

        <button
          className="panel-resizer panel-resizer-left"
          type="button"
          aria-label="左パネル幅を変更"
          onPointerDown={(event) => startPanelResize('left', event)}
        />

        <main
          ref={canvasAreaRef}
          className={`canvas-area${spacePanReady ? ' space-pan-ready' : ''}${isPanning ? ' is-panning' : ''}`}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleCanvasTouchStart}
          onTouchMove={handleCanvasTouchMove}
          onTouchEnd={handleCanvasTouchEnd}
          onTouchCancel={handleCanvasTouchEnd}
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
                  <div key={index} className="card">
                    <div
                      ref={(element) => {
                        cardTextRefs.current[index] = element;
                      }}
                      className="card-text"
                      data-placeholder="テキストを入力"
                      suppressContentEditableWarning
                      contentEditable={activeEditIndex === index}
                      style={{ fontFamily: FONT_FAMILY[currentFont] }}
                      onMouseDown={() => {
                        setTitleEditing(false);
                        setActiveEditIndex(index);
                      }}
                      onTouchStart={() => {
                        setTitleEditing(false);
                        setActiveEditIndex(index);
                      }}
                      onBlur={() => setActiveEditIndex((prev) => (prev === index ? null : prev))}
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
                  ref={titleTextRef}
                  id="page-title"
                  className={titlePos}
                  suppressContentEditableWarning
                  contentEditable={titleEditing}
                  style={{
                    display: titleVisible ? '' : 'none',
                    fontFamily: FONT_FAMILY[currentFont],
                    fontSize: `${ptToScreenPx(currentPt)}px`,
                    padding: `0 ${cardMargin}px`,
                    top: titlePos.startsWith('bottom') ? 'auto' : `${cardMargin}px`,
                    bottom: titlePos.startsWith('bottom') ? `${cardMargin}px` : 'auto',
                  }}
                  onMouseDown={() => {
                    setActiveEditIndex(null);
                    setTitleEditing(true);
                  }}
                  onTouchStart={() => {
                    setActiveEditIndex(null);
                    setTitleEditing(true);
                  }}
                  onBlur={() => setTitleEditing(false)}
                  onInput={(event) => {
                    const value = (event.currentTarget.textContent ?? '').replace(/\r/g, '');
                    setTitleText(value);
                  }}
                >
                  {titleText}
                </div>
              </div>
            </div>
          </div>

          <div className="preview-zoom" id="previewZoom">
            <input
              className="ui-range"
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

        <button
          className="panel-resizer panel-resizer-right"
          type="button"
          aria-label="右パネル幅を変更"
          onPointerDown={(event) => startPanelResize('right', event)}
        />

        <aside className="bulk-sidebar" id="bulkPanel">
          {bulkEditorPanel}
        </aside>

        <aside className="bulk-drawer" id="bulkDrawerPanel">
          {bulkEditorPanel}
        </aside>
      </div>
      </div>
    </>
  );
}

export default App;
