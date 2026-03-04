import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react';
import {
  A4_H72,
  A4_W72,
  BULK_PANEL_W,
  CONTENT_MARGIN_RATIO,
  GROUPS,
  MM72,
  MM300,
  PANEL_MAX_W,
  PANEL_MIN_W,
  SIDEBAR_W,
  SIZES,
  TITLE_POSITIONS,
} from './constants/editor';
import type { PaperSize, SizeGroup } from './types/editor';
import {
  buildDefaultSnapshot,
  buildImportTemplate,
  createMemoRecord,
  createNextMemoName,
  extractSimpleImportPayload,
} from './utils/snapshot';
import { useMemoStore } from './hooks/useMemoStore';
import { useEditorState } from './hooks/useEditorState';
import { useHistory } from './hooks/useHistory';
import { UI_TOKENS } from './tokens/uiTokens';
import { TopBar } from './components/layout/TopBar';
import { LeftSidebar } from './components/layout/LeftSidebar';
import { BulkEditorPanel } from './components/layout/BulkEditorPanel';
import { GridEditor } from './components/editor/GridEditor';
import { Button } from './components/atoms/Button';
import { exportPrintPdf } from './services/exportPdf';
import { exportWebPng } from './services/exportPng';

function ptToScreenPx(pt: number) {
  return pt * (96 / 72);
}

function normalizeScale(value: number) {
  if (Number.isNaN(value)) return UI_TOKENS.slider.zoom.default;
  return Math.min(Math.max(value, UI_TOKENS.slider.zoom.min), UI_TOKENS.slider.zoom.max);
}

function App() {
  const { memoRecords, setMemoRecords, activeMemoId, setActiveMemoId, initialSnapshot } = useMemoStore();
  const {
    currentSize,
    setCurrentSize,
    currentPt,
    setCurrentPt,
    currentFont,
    setCurrentFont,
    cards,
    setCards,
    activeEditIndex,
    setActiveEditIndex,
    titleEditing,
    setTitleEditing,
    titleText,
    setTitleText,
    titleVisible,
    setTitleVisible,
    titlePos,
    setTitlePos,
    createSnapshot,
    applySnapshot,
    updateCard,
  } = useEditorState(initialSnapshot);
  const [scalePct, setScalePct] = useState<number>(UI_TOKENS.slider.zoom.default);
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
  const [memoSelectionAnchorId, setMemoSelectionAnchorId] = useState<string | null>(null);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [switchTargetMemoId, setSwitchTargetMemoId] = useState<string | null>(null);
  const [renameTargetMemoId, setRenameTargetMemoId] = useState<string | null>(null);
  const [renameMemoName, setRenameMemoName] = useState('');
  const [memoSortMode, setMemoSortMode] = useState<'recent' | 'name'>('recent');
  const [deleteError, setDeleteError] = useState('');
  const [topbarDropdownOpen, setTopbarDropdownOpen] = useState(false);

  const canvasAreaRef = useRef<HTMLElement | null>(null);
  const topbarAreaRef = useRef<HTMLDivElement | null>(null);
  const topbarDropdownRef = useRef<HTMLDivElement | null>(null);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panBaseRef = useRef({ x: 0, y: 0 });
  const pinchStartDistanceRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef<number>(UI_TOKENS.slider.zoom.default);
  const cardTextRefs = useRef<Array<HTMLDivElement | null>>([]);
  const titleTextRef = useRef<HTMLDivElement | null>(null);
  const panelResizeStartRef = useRef({ x: 0, width: 0 });

  const innerTop = Math.round((A4_H72 - currentSize.h72) / 2);
  const innerLeft = Math.round((A4_W72 - currentSize.w72) / 2);
  const cardMargin = (currentSize.w72 / 3) * CONTENT_MARGIN_RATIO;
  const scale = scalePct / 100;

  const infoInner = currentSize.key === 'custom' ? `カスタム ${currentSize.mm}mm` : `${currentSize.label}(${currentSize.mm}mm)`;
  const infoFont = currentFont === 'sans' ? 'ゴシック' : '明朝';
  const activeMemo = useMemo(() => memoRecords.find((item) => item.id === activeMemoId) ?? null, [memoRecords, activeMemoId]);
  const getMemoTitle = (record: { name: string; snapshot: { titleText: string } }) => record.snapshot.titleText.trim() || record.name || '無題メモ';
  const activeMemoTitle = activeMemo ? getMemoTitle(activeMemo) : '無題メモ';
  const sortedMemoRecords = useMemo(() => {
    const copied = [...memoRecords];
    if (memoSortMode === 'name') {
      copied.sort((left, right) => getMemoTitle(left).localeCompare(getMemoTitle(right), 'ja'));
      return copied;
    }
    copied.sort((left, right) => {
      if (right.updatedAt !== left.updatedAt) return right.updatedAt - left.updatedAt;
      return getMemoTitle(left).localeCompare(getMemoTitle(right), 'ja');
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
  const { loadMemoSnapshot, undoSnapshot, redoSnapshot } = useHistory({
    activeMemoId,
    historyLimit: UI_TOKENS.history.limit,
    createSnapshot,
    applySnapshot,
    setMemoRecords,
  });

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
      if (window.innerWidth > UI_TOKENS.panel.mobileBreakpoint) {
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
      const isMobile = window.innerWidth <= UI_TOKENS.panel.mobileBreakpoint;
      const sidePanels = isMobile ? 0 : sidebarWidth + bulkPanelWidth;
      const canvasWidth = window.innerWidth - sidePanels - UI_TOKENS.panel.autoScalePaddingX;
      const canvasHeight = window.innerHeight - UI_TOKENS.panel.autoScalePaddingY;
      let pct = Math.floor(Math.min(canvasWidth / A4_W72, canvasHeight / A4_H72) * 100);
      pct = Math.min(Math.max(pct, 30), UI_TOKENS.slider.zoom.max);
      setScalePct(pct);
    };

    autoScale();
    window.addEventListener('resize', autoScale);
    return () => window.removeEventListener('resize', autoScale);
  }, [bulkPanelWidth, sidebarWidth]);

  const startPanelResize = (side: 'left' | 'right', event: ReactPointerEvent<HTMLButtonElement>) => {
    if (window.innerWidth <= UI_TOKENS.panel.mobileBreakpoint) return;
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
    if (!topbarDropdownOpen && !importPopupOpen && !memoManagePopupOpen && !deleteConfirmPopupOpen && !memoCreatePopupOpen) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (topbarAreaRef.current?.contains(target)) return;
      setTopbarDropdownOpen(false);
      setImportPopupOpen(false);
      setMemoManagePopupOpen(false);
      setDeleteConfirmPopupOpen(false);
      setMemoCreatePopupOpen(false);
      setDeleteError('');
      setPendingDeleteIds([]);
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [deleteConfirmPopupOpen, importPopupOpen, memoCreatePopupOpen, memoManagePopupOpen, topbarDropdownOpen]);

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
    if (!width || !height || width < UI_TOKENS.sizing.customPxMin || height < UI_TOKENS.sizing.customPxMin) {
      window.alert(`${UI_TOKENS.sizing.customPxMin}px以上で入力してください。`);
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
    if (!mmWidth || !mmHeight || mmWidth < UI_TOKENS.sizing.customMmMin || mmHeight < UI_TOKENS.sizing.customMmMin) {
      window.alert(`${UI_TOKENS.sizing.customMmMin}mm以上で入力してください。`);
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

  const handleCanvasMouseDown = (event: React.MouseEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('#previewFontSize')) return;
    if (target.closest('#previewZoom')) return;
    if (target.closest('input, textarea, select, button')) return;
    if (target.closest('#page-title')) return;
    if (target.closest('.card-text')) return;
    if (target.closest('[contenteditable="true"]')) return;

    startPan(event.clientX, event.clientY);
    event.preventDefault();
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLElement>) => {
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

  const handleCanvasWheel = (event: ReactWheelEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('#previewFontSize')) return;
    if (target.closest('#previewZoom')) return;
    if (target.closest('input, textarea, select, button')) return;
    if (target.closest('#page-title')) return;
    if (target.closest('.card-text')) return;
    if (target.closest('[contenteditable="true"]')) return;

    const delta = event.deltaY < 0 ? UI_TOKENS.slider.zoom.step : -UI_TOKENS.slider.zoom.step;
    setScalePct((prev) => normalizeScale(prev + delta));
    event.preventDefault();
  };

  const handleCanvasTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    if (event.touches.length >= 2) {
      const distance = getTouchDistance(event.touches);
      if (distance) {
        pinchStartDistanceRef.current = distance;
        pinchStartScaleRef.current = scalePct;
      }
      setIsPanning(false);
      return;
    }

    const target = event.target as HTMLElement;
    if (target.closest('#previewFontSize')) return;
    if (target.closest('#previewZoom')) return;
    if (target.closest('input, textarea, select, button')) return;
    if (target.closest('#page-title')) return;
    if (target.closest('.card-text')) return;
    if (target.closest('[contenteditable="true"]')) return;

    if (event.touches.length === 1) {
      const touch = event.touches[0];
      startPan(touch.clientX, touch.clientY);
    }
  };

  const handleCanvasTouchMove = (event: React.TouchEvent<HTMLElement>) => {
    if (event.touches.length >= 2) {
      const startDistance = pinchStartDistanceRef.current;
      const distance = getTouchDistance(event.touches);
      if (!startDistance || !distance) return;

      const ratio = distance / startDistance;
      const nextScale = normalizeScale(Math.round(pinchStartScaleRef.current * ratio));
      setScalePct(nextScale);
      return;
    }

    if (event.touches.length === 1 && isPanning) {
      const touch = event.touches[0];
      const dx = touch.clientX - panStartRef.current.x;
      const dy = touch.clientY - panStartRef.current.y;
      setPanOffset({ x: panBaseRef.current.x + dx, y: panBaseRef.current.y + dy });
    }
  };

  const handleCanvasTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
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
    snapshot.titleText = nextName;
    const record = createMemoRecord(snapshot, nextName);
    setMemoRecords((prev) => [record, ...prev]);
    setActiveMemoId(record.id);
    loadMemoSnapshot(record.snapshot);
  };

  const duplicateMemo = (name?: string) => {
    const baseName = activeMemo ? getMemoTitle(activeMemo) : 'メモ';
    const snapshot = createSnapshot();
    const nextName = name?.trim() ? name.trim() : `${baseName} コピー`;
    snapshot.titleText = nextName;
    const record = createMemoRecord(snapshot, nextName);
    setMemoRecords((prev) => [record, ...prev]);
    setActiveMemoId(record.id);
    loadMemoSnapshot(record.snapshot);
  };

  const openCreateMemoPopup = (mode: 'new' | 'duplicate') => {
    setTopbarDropdownOpen(false);
    setImportPopupOpen(false);
    setMemoManagePopupOpen(false);
    setDeleteConfirmPopupOpen(false);
    setMemoCreateMode(mode);
    const defaultName = mode === 'new' ? createNextMemoName(memoRecords) : `${activeMemoTitle} コピー`;
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
    setTopbarDropdownOpen(false);
    setMemoManagePopupOpen(false);
    setDeleteConfirmPopupOpen(false);
    setMemoCreatePopupOpen(false);
    setImportJsonText(buildImportTemplate(titleText, cards));
    setImportError('');
    setImportPopupOpen(true);
  };

  const openMemoManageDialog = () => {
    setTopbarDropdownOpen(false);
    setImportPopupOpen(false);
    setMemoCreatePopupOpen(false);
    setSelectedMemoIds([]);
    setMemoSelectionAnchorId(activeMemoId);
    setSwitchTargetMemoId(activeMemoId);
    setDeleteError('');
    setRenameTargetMemoId(null);
    setRenameMemoName('');
    setDeleteConfirmPopupOpen(false);
    setMemoManagePopupOpen(true);
  };

  const startRenameMemo = (memoId: string) => {
    const target = memoRecords.find((record) => record.id === memoId);
    if (!target) return;
    setRenameTargetMemoId(memoId);
    setRenameMemoName(getMemoTitle(target));
  };

  const cancelRenameMemo = () => {
    setRenameTargetMemoId(null);
    setRenameMemoName('');
  };

  const submitRenameMemo = () => {
    if (!renameTargetMemoId) return;
    const trimmed = renameMemoName.trim();
    if (!trimmed) return;

    const now = Date.now();
    setMemoRecords((prev) =>
      prev.map((record) => {
        if (record.id !== renameTargetMemoId) return record;
        return {
          ...record,
          name: trimmed,
          snapshot: {
            ...record.snapshot,
            titleText: trimmed,
          },
          updatedAt: now,
        };
      }),
    );

    if (renameTargetMemoId === activeMemoId) {
      setTitleText(trimmed);
    }

    cancelRenameMemo();
  };

  const handleMemoManageRowSelection = (
    memoId: string,
    options?: {
      shiftKey?: boolean;
      ctrlKey?: boolean;
      metaKey?: boolean;
    },
  ) => {
    const shiftKey = options?.shiftKey ?? false;
    const ctrlOrMetaKey = !!(options?.ctrlKey || options?.metaKey);
    const clickedIndex = sortedMemoRecords.findIndex((record) => record.id === memoId);

    if (clickedIndex < 0) return;

    setSwitchTargetMemoId(memoId);

    setSelectedMemoIds((prev) => {
      if (shiftKey) {
        const anchorId = memoSelectionAnchorId ?? memoId;
        const anchorIndex = sortedMemoRecords.findIndex((record) => record.id === anchorId);
        const safeAnchorIndex = anchorIndex >= 0 ? anchorIndex : clickedIndex;
        const rangeStart = Math.min(safeAnchorIndex, clickedIndex);
        const rangeEnd = Math.max(safeAnchorIndex, clickedIndex);
        const rangeIds = sortedMemoRecords.slice(rangeStart, rangeEnd + 1).map((record) => record.id);
        if (ctrlOrMetaKey) {
          return Array.from(new Set([...prev, ...rangeIds]));
        }
        return rangeIds;
      }

      if (ctrlOrMetaKey) {
        return prev.includes(memoId) ? prev.filter((id) => id !== memoId) : [...prev, memoId];
      }

      return [memoId];
    });

    if (!shiftKey || !memoSelectionAnchorId) {
      setMemoSelectionAnchorId(memoId);
    }
    if (deleteError) setDeleteError('');
  };

  const askDeleteConfirmation = (targetIds: string[]) => {
    if (targetIds.length === 0) {
      setDeleteError('削除するメモを1件以上選択してください。');
      return;
    }
    setPendingDeleteIds(targetIds);
    setMemoManagePopupOpen(false);
    setDeleteConfirmPopupOpen(true);
  };

  const closeDeletePopups = () => {
    setMemoManagePopupOpen(false);
    setDeleteConfirmPopupOpen(false);
    setDeleteError('');
    setRenameTargetMemoId(null);
    setRenameMemoName('');
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

  const toggleTopbarMemoDropdown = () => {
    if (topbarDropdownOpen) {
      setTopbarDropdownOpen(false);
      return;
    }

    setImportPopupOpen(false);
    setMemoManagePopupOpen(false);
    setDeleteConfirmPopupOpen(false);
    setMemoCreatePopupOpen(false);
    setTopbarDropdownOpen(true);
  };

  const deleteFromTopbarDropdown = (memoId: string) => {
    setTopbarDropdownOpen(false);
    askDeleteConfirmation([memoId]);
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
      snapshot.titleText = normalized.title.slice(0, UI_TOKENS.typography.titleMaxLength);
      snapshot.cards = normalized.cards;

      const nextMemoName = normalized.title.trim().slice(0, UI_TOKENS.typography.memoNameMaxLength) || createNextMemoName(memoRecords);
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

    const titleValue = normalized.title.slice(0, UI_TOKENS.typography.titleMaxLength);
    setTitleText(titleValue);
    setCards(normalized.cards);

    setMemoRecords((prev) =>
      prev.map((record) => {
        if (record.id !== activeMemoId) return record;
        const nextName = titleValue.trim().slice(0, UI_TOKENS.typography.memoNameMaxLength) || record.name;
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

  const handleExportPrintPdf = async () => {
    setLoadingMsg('印刷用(300dpi) PDFを生成中...');
    setLoading(true);

    try {
      await exportPrintPdf({
        currentSize,
        currentPt,
        currentFont,
        cards,
        titleText,
        titleVisible,
        titlePos,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      window.alert(`PDF生成エラー: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExportWebPng = async () => {
    setLoadingMsg('Web用(72dpi / 4x高精細) PNGを生成中...');
    setLoading(true);

    try {
      await exportWebPng({
        currentSize,
        currentPt,
        currentFont,
        cards,
        titleText,
        titleVisible,
        titlePos,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      window.alert(`PNG生成エラー: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const buildPlainTextExport = () => {
    const normalizedTitle = titleText.trim() || '無題';
    const lines = [`タイトル: ${normalizedTitle}`, ''];
    cards.forEach((text, index) => {
      lines.push(`[${index + 1}]`);
      lines.push(text.trim() || '');
      lines.push('');
    });
    return lines.join('\n').trimEnd();
  };

  const copyTextToClipboard = async (text: string) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  };

  const handleCopyPlainText = async () => {
    try {
      await copyTextToClipboard(buildPlainTextExport());
      window.alert('プレーンテキストをコピーしました。');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      window.alert(`プレーンテキストコピーに失敗しました: ${message}`);
    }
  };

  const handleCopyJson = async () => {
    try {
      await copyTextToClipboard(buildImportTemplate(titleText, cards));
      window.alert('JSONをコピーしました。');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      window.alert(`JSONコピーに失敗しました: ${message}`);
    }
  };

  return (
    <>
      <div className={`loading-overlay${loading ? ' show' : ''}`}>
        <div className="spinner" />
        <div>{loadingMsg}</div>
      </div>

      <Button
        className="drawer-toggle settings-toggle"
        type="button"
        aria-label="設定パネルを開く"
        aria-controls="sidePanel"
        aria-expanded={settingsDrawerOpen}
        onClick={toggleSettingsDrawer}
      >
        設定
      </Button>
      <Button
        className="drawer-toggle bulk-toggle"
        type="button"
        aria-label="一括入力パネルを開く"
        aria-controls="bulkDrawerPanel"
        aria-expanded={bulkDrawerOpen}
        onClick={toggleBulkDrawer}
      >
        入力
      </Button>
      <div
        className={`drawer-backdrop${settingsDrawerOpen || bulkDrawerOpen ? ' show' : ''}`}
        aria-hidden={!settingsDrawerOpen && !bulkDrawerOpen}
        onClick={() => {
          setSettingsDrawerOpen(false);
          setBulkDrawerOpen(false);
        }}
      />

      <div className="app-shell">
        <div className="topbar-stack" ref={topbarAreaRef}>
          <TopBar
            topbarDropdownRef={topbarDropdownRef}
            topbarDropdownOpen={topbarDropdownOpen}
            activeMemoId={activeMemoId}
            activeMemoTitle={activeMemoTitle}
            memoRecords={memoRecords}
            onToggleDropdown={toggleTopbarMemoDropdown}
            onSwitchMemo={switchFromTopbarDropdown}
            onDeleteMemo={deleteFromTopbarDropdown}
            onOpenManage={openMemoManageDialog}
            onOpenCreateNew={() => openCreateMemoPopup('new')}
            onOpenDuplicate={() => openCreateMemoPopup('duplicate')}
            onOpenImport={openImportDialog}
          />

          <div className="topbar-pulldown-layer">
            {importPopupOpen ? (
              <div className="import-popup topbar-pulldown" role="dialog" aria-label="JSONインポート">
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
                  <Button
                    className="toggle-btn"
                    type="button"
                    onClick={() => {
                      setImportPopupOpen(false);
                      setImportError('');
                    }}
                  >
                    キャンセル
                  </Button>
                  <Button className="toggle-btn" type="button" onClick={importOverwriteCurrentMemo}>
                    上書き
                  </Button>
                  <Button className="toggle-btn active" type="button" onClick={importAsNewMemo}>
                    新規作成
                  </Button>
                </div>
              </div>
            ) : null}

            {memoManagePopupOpen ? (
              <div className="import-popup delete-popup topbar-pulldown" role="dialog" aria-label="メモ管理">
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
                  <Button className="toggle-btn" type="button" onClick={() => openCreateMemoPopup('new')}>
                    新規作成
                  </Button>
                  <Button className="toggle-btn" type="button" onClick={() => openCreateMemoPopup('duplicate')}>
                    複製
                  </Button>
                  <Button
                    className={`toggle-btn${isMultiSelectMode ? ' active' : ''}`}
                    type="button"
                    onClick={() => askDeleteConfirmation(selectedMemoIds)}
                    disabled={!isMultiSelectMode}
                  >
                    まとめて削除
                  </Button>
                </div>
                <div className="delete-list">
                  {sortedMemoRecords.map((record) => {
                    const selected = selectedMemoIds.includes(record.id);
                    const editingName = renameTargetMemoId === record.id;
                    return (
                      <div
                        key={record.id}
                        className={`memo-manage-row${selected ? ' selected' : ''}${switchTargetMemoId === record.id ? ' switch-target' : ''}`}
                        onClick={(event) =>
                          handleMemoManageRowSelection(record.id, {
                            shiftKey: event.shiftKey,
                            ctrlKey: event.ctrlKey,
                            metaKey: event.metaKey,
                          })
                        }
                      >
                        <label
                          className="memo-select-check"
                          onClick={(event) => {
                            event.stopPropagation();
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onClick={(event) => {
                              event.stopPropagation();
                              event.preventDefault();
                              handleMemoManageRowSelection(record.id, {
                                shiftKey: event.shiftKey,
                                ctrlKey: event.ctrlKey,
                                metaKey: event.metaKey,
                              });
                            }}
                            onChange={() => {
                              // no-op: selection is handled in onClick to support modifier keys
                            }}
                          />
                        </label>
                        <div className="memo-manage-left">
                          {editingName ? (
                            <input
                              className="memo-create-input"
                              type="text"
                              value={renameMemoName}
                              maxLength={UI_TOKENS.typography.memoNameMaxLength}
                              autoFocus
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) => setRenameMemoName(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' && renameMemoName.trim()) {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  submitRenameMemo();
                                }
                                if (event.key === 'Escape') {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  cancelRenameMemo();
                                }
                              }}
                            />
                          ) : (
                            <span className="memo-name-text">{getMemoTitle(record)}</span>
                          )}
                        </div>
                        <div className="memo-row-actions">
                          {editingName ? (
                            <>
                              <Button
                                className={`toggle-btn memo-row-icon-btn${renameMemoName.trim() ? ' active' : ''}`}
                                type="button"
                                aria-label="メモ名を保存"
                                title="保存"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  submitRenameMemo();
                                }}
                                disabled={!renameMemoName.trim()}
                              >
                                保存
                              </Button>
                              <Button
                                className="toggle-btn memo-row-icon-btn"
                                type="button"
                                aria-label="メモ名編集をキャンセル"
                                title="キャンセル"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  cancelRenameMemo();
                                }}
                              >
                                取消
                              </Button>
                            </>
                          ) : (
                            <Button
                              className="toggle-btn memo-row-icon-btn"
                              type="button"
                              aria-label="このメモの名前を変更"
                              title="名前変更"
                              onClick={(event) => {
                                event.stopPropagation();
                                startRenameMemo(record.id);
                              }}
                            >
                              名前
                            </Button>
                          )}
                          <Button
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
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {deleteError ? <div className="import-popup-error">{deleteError}</div> : null}
                <div className="import-popup-actions two-col">
                  <Button className="toggle-btn" type="button" onClick={closeDeletePopups}>
                    キャンセル
                  </Button>
                  <Button
                    className={`toggle-btn${switchTargetMemoId ? ' active' : ''}`}
                    type="button"
                    onClick={switchFromSelection}
                    disabled={!switchTargetMemoId}
                  >
                    切り替え
                  </Button>
                </div>
              </div>
            ) : null}

            {deleteConfirmPopupOpen ? (
              <div className="import-popup delete-confirm-popup topbar-pulldown" role="dialog" aria-label="削除確認">
                <div className="import-popup-title">削除の確認</div>
                <p className="import-popup-help">選択中の {pendingDeleteIds.length} 件を削除します。よろしいですか？</p>
                <div className="import-popup-actions two-col">
                  <Button className="toggle-btn" type="button" onClick={closeDeleteConfirmOnly}>
                    キャンセル
                  </Button>
                  <Button className="toggle-btn active" type="button" onClick={executeDeleteMemos}>
                    削除する
                  </Button>
                </div>
              </div>
            ) : null}

            {memoCreatePopupOpen ? (
              <div className="import-popup create-memo-popup topbar-pulldown" role="dialog" aria-label="メモ作成">
                <div className="import-popup-title">{memoCreateMode === 'new' ? '新規メモ作成' : '複製メモ作成'}</div>
                <input
                  className="memo-create-input"
                  type="text"
                  value={memoCreateName}
                  maxLength={UI_TOKENS.typography.memoNameMaxLength}
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
                  <Button className="toggle-btn" type="button" onClick={() => setMemoCreatePopupOpen(false)}>
                    キャンセル
                  </Button>
                  <Button
                    className={`toggle-btn${memoCreateName.trim() ? ' active' : ''}`}
                    type="button"
                    onClick={submitCreateMemo}
                    disabled={!memoCreateName.trim()}
                  >
                    作成
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className={`layout${activeResizer ? ' is-resizing' : ''}`} style={layoutStyle}>
        <LeftSidebar
          infoInner={infoInner}
          infoFont={infoFont}
          currentPt={currentPt}
          titleText={titleText}
          titleMaxLength={UI_TOKENS.typography.titleMaxLength}
          onTitleTextChange={setTitleText}
          titleVisible={titleVisible}
          onToggleTitleVisible={() => setTitleVisible((prev) => !prev)}
          titlePos={titlePos}
          titlePositions={TITLE_POSITIONS}
          onSelectTitlePos={setTitlePos}
          groups={GROUPS}
          sizeByGroup={sizeByGroup}
          currentSizeKey={currentSize.key}
          onSelectSize={setCurrentSize}
          customW={customW}
          customH={customH}
          customMmW={customMmW}
          customMmH={customMmH}
          onChangeCustomW={setCustomW}
          onChangeCustomH={setCustomH}
          onChangeCustomMmW={setCustomMmW}
          onChangeCustomMmH={setCustomMmH}
          onApplyCustomPx={applyCustomPx}
          onApplyCustomMm={applyCustomMm}
          currentFont={currentFont}
          onSelectFont={setCurrentFont}
          fontPtMin={UI_TOKENS.slider.fontPt.min}
          fontPtMax={UI_TOKENS.slider.fontPt.max}
          fontPtStep={UI_TOKENS.slider.fontPt.step}
          onChangePt={setCurrentPt}
          zoomMin={UI_TOKENS.slider.zoom.min}
          zoomMax={UI_TOKENS.slider.zoom.max}
          zoomStep={UI_TOKENS.slider.zoom.step}
          scalePct={scalePct}
          onChangeScale={(value) => setScalePct(normalizeScale(value))}
          onExportWebPng={() => void handleExportWebPng()}
          onExportPrintPdf={() => void handleExportPrintPdf()}
          onCopyPlainText={() => void handleCopyPlainText()}
          onCopyJson={() => void handleCopyJson()}
          onPrintBrowser={() => window.print()}
          customPxMin={UI_TOKENS.sizing.customPxMin}
          customMmMin={UI_TOKENS.sizing.customMmMin}
          customMmStep={UI_TOKENS.sizing.customMmStep}
        />

        <Button
          className="panel-resizer panel-resizer-left"
          type="button"
          aria-label="左パネル幅を変更"
          onPointerDown={(event) => startPanelResize('left', event)}
        />

        <GridEditor
          canvasAreaRef={canvasAreaRef}
          cardTextRefs={cardTextRefs}
          titleTextRef={titleTextRef}
          spacePanReady={spacePanReady}
          isPanning={isPanning}
          onMouseDownCanvas={handleCanvasMouseDown}
          onMouseMoveCanvas={handleMouseMove}
          onMouseUpCanvas={handleMouseUp}
          onWheelCanvas={handleCanvasWheel}
          onTouchStartCanvas={handleCanvasTouchStart}
          onTouchMoveCanvas={handleCanvasTouchMove}
          onTouchEndCanvas={handleCanvasTouchEnd}
          panOffset={panOffset}
          a4Width={A4_W72}
          a4Height={A4_H72}
          scale={scale}
          currentSize={currentSize}
          innerTop={innerTop}
          innerLeft={innerLeft}
          cards={cards}
          activeEditIndex={activeEditIndex}
          currentFont={currentFont}
          onStartCardEdit={(index) => {
            setTitleEditing(false);
            setActiveEditIndex(index);
          }}
          onBlurCardEdit={(index) => setActiveEditIndex((prev) => (prev === index ? null : prev))}
          onInputCard={updateCard}
          titlePos={titlePos}
          titleEditing={titleEditing}
          titleVisible={titleVisible}
          cardMargin={cardMargin}
          onStartTitleEdit={() => {
            setActiveEditIndex(null);
            setTitleEditing(true);
          }}
          onBlurTitleEdit={() => setTitleEditing(false)}
          onInputTitle={setTitleText}
          titleText={titleText}
          currentPt={currentPt}
          fontPtMin={UI_TOKENS.slider.fontPt.min}
          fontPtMax={UI_TOKENS.slider.fontPt.max}
          fontPtStep={UI_TOKENS.slider.fontPt.step}
          onChangePt={setCurrentPt}
          scalePct={scalePct}
          zoomMin={UI_TOKENS.slider.zoom.min}
          zoomMax={UI_TOKENS.slider.zoom.max}
          zoomStep={UI_TOKENS.slider.zoom.step}
          onChangeScale={(value) => setScalePct(value)}
          normalizeScale={normalizeScale}
        />

        <Button
          className="panel-resizer panel-resizer-right"
          type="button"
          aria-label="右パネル幅を変更"
          onPointerDown={(event) => startPanelResize('right', event)}
        />

        <aside className="bulk-sidebar" id="bulkPanel">
          <BulkEditorPanel
            titleText={titleText}
            titleMaxLength={UI_TOKENS.typography.titleMaxLength}
            onTitleChange={setTitleText}
            cards={cards}
            onCardChange={updateCard}
            onFocusInput={() => {
              setActiveEditIndex(null);
              setTitleEditing(false);
            }}
          />
        </aside>

        <aside className="bulk-drawer" id="bulkDrawerPanel">
          <BulkEditorPanel
            titleText={titleText}
            titleMaxLength={UI_TOKENS.typography.titleMaxLength}
            onTitleChange={setTitleText}
            cards={cards}
            onCardChange={updateCard}
            onFocusInput={() => {
              setActiveEditIndex(null);
              setTitleEditing(false);
            }}
          />
        </aside>
      </div>
      </div>
    </>
  );
}

export default App;
