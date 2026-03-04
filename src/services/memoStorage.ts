import { MEMO_STORAGE_KEY } from '../constants/editor';
import { buildDefaultSnapshot, createMemoRecord, normalizeMemoStore } from '../utils/snapshot';
import type { MemoRecord, PersistedMemoStore } from '../types/memo';

export function loadMemoStore(): { records: MemoRecord[]; activeMemoId: string } {
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

export function saveMemoStore(activeMemoId: string, records: MemoRecord[]) {
  if (typeof window === 'undefined') return;

  const payload: PersistedMemoStore = {
    version: 1,
    activeMemoId,
    records,
  };

  window.localStorage.setItem(MEMO_STORAGE_KEY, JSON.stringify(payload));
}
