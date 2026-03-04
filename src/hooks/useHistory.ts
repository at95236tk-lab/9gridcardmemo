import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { snapshotsEqual } from '../utils/snapshot';
import type { EditorSnapshot } from '../types/editor';
import type { MemoRecord } from '../types/memo';

type UseHistoryParams = {
  activeMemoId: string;
  historyLimit: number;
  createSnapshot: () => EditorSnapshot;
  applySnapshot: (snapshot: EditorSnapshot) => void;
  setMemoRecords: Dispatch<SetStateAction<MemoRecord[]>>;
};

export function useHistory({ activeMemoId, historyLimit, createSnapshot, applySnapshot, setMemoRecords }: UseHistoryParams) {
  const historyRef = useRef<EditorSnapshot[]>([]);
  const historyIndexRef = useRef(-1);
  const applyingHistoryRef = useRef(false);
  const switchingMemoRef = useRef(false);

  const applySnapshotFromHistory = useCallback(
    (snapshot: EditorSnapshot) => {
      applyingHistoryRef.current = true;
      applySnapshot(snapshot);
    },
    [applySnapshot],
  );

  const loadMemoSnapshot = useCallback(
    (snapshot: EditorSnapshot) => {
      switchingMemoRef.current = true;
      historyRef.current = [snapshot];
      historyIndexRef.current = 0;
      applyingHistoryRef.current = true;
      applySnapshot(snapshot);
    },
    [applySnapshot],
  );

  const undoSnapshot = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const snapshot = historyRef.current[historyIndexRef.current];
    if (!snapshot) return;
    applySnapshotFromHistory(snapshot);
  }, [applySnapshotFromHistory]);

  const redoSnapshot = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const snapshot = historyRef.current[historyIndexRef.current];
    if (!snapshot) return;
    applySnapshotFromHistory(snapshot);
  }, [applySnapshotFromHistory]);

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
    if (nextHistory.length > historyLimit) {
      nextHistory = nextHistory.slice(nextHistory.length - historyLimit);
    }

    historyRef.current = nextHistory;
    historyIndexRef.current = nextHistory.length - 1;
  }, [activeMemoId, createSnapshot, historyLimit, setMemoRecords]);

  return {
    loadMemoSnapshot,
    undoSnapshot,
    redoSnapshot,
  };
}
