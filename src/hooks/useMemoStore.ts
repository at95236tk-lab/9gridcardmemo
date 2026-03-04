import { useEffect, useMemo, useState } from 'react';
import type { EditorSnapshot } from '../types/editor';
import type { MemoRecord } from '../types/memo';
import { buildDefaultSnapshot } from '../utils/snapshot';
import { loadMemoStore, saveMemoStore } from '../services/memoStorage';

export function useMemoStore() {
  const initialMemoStore = useMemo(() => loadMemoStore(), []);
  const initialSnapshot = useMemo<EditorSnapshot>(() => {
    const current = initialMemoStore.records.find((item) => item.id === initialMemoStore.activeMemoId);
    return current?.snapshot ?? buildDefaultSnapshot();
  }, [initialMemoStore]);

  const [memoRecords, setMemoRecords] = useState<MemoRecord[]>(initialMemoStore.records);
  const [activeMemoId, setActiveMemoId] = useState(initialMemoStore.activeMemoId);

  useEffect(() => {
    saveMemoStore(activeMemoId, memoRecords);
  }, [activeMemoId, memoRecords]);

  return {
    memoRecords,
    setMemoRecords,
    activeMemoId,
    setActiveMemoId,
    initialSnapshot,
  };
}
