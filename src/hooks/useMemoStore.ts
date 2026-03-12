import { useEffect, useMemo, useRef, useState } from 'react';
import type { EditorSnapshot } from '../types/editor';
import type { MemoRecord } from '../types/memo';
import { buildDefaultSnapshot } from '../utils/snapshot';
import { snapshotsEqual } from '../utils/snapshot';
import { deleteRemoteMemos, listRemoteMemos, upsertRemoteMemos } from '../services/memoRemoteStorage';
import { getMemoOwnerKey, loadMemoStore, saveMemoStore } from '../services/memoStorage';

const REMOTE_SYNC_DEBOUNCE_MS = 1200;

function isSameRecord(left: MemoRecord, right: MemoRecord) {
  if (left.id !== right.id) return false;
  if (left.name !== right.name) return false;
  if (left.createdAt !== right.createdAt) return false;
  if (left.updatedAt !== right.updatedAt) return false;
  return snapshotsEqual(left.snapshot, right.snapshot);
}

export function useMemoStore() {
  const initialMemoStore = useMemo(() => loadMemoStore(), []);
  const ownerKey = useMemo(() => getMemoOwnerKey(), []);
  const initialRecordsRef = useRef(initialMemoStore.records);
  const previousSyncedRecordsRef = useRef(initialMemoStore.records);
  const remoteReadyRef = useRef(false);
  const syncQueueRef = useRef(Promise.resolve());
  const syncDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingUpsertRef = useRef<MemoRecord[]>([]);
  const pendingDeleteRef = useRef<string[]>([]);

  const initialSnapshot = useMemo<EditorSnapshot>(() => {
    const current = initialMemoStore.records.find((item) => item.id === initialMemoStore.activeMemoId);
    return current?.snapshot ?? buildDefaultSnapshot();
  }, [initialMemoStore]);

  const [memoRecords, setMemoRecords] = useState<MemoRecord[]>(initialMemoStore.records);
  const [activeMemoId, setActiveMemoId] = useState(initialMemoStore.activeMemoId);

  useEffect(() => {
    saveMemoStore(activeMemoId, memoRecords);
  }, [activeMemoId, memoRecords]);

  useEffect(() => {
    let cancelled = false;

    const hydrateFromRemote = async () => {
      const remoteRecords = await listRemoteMemos(ownerKey);
      if (cancelled) return;

      if (remoteRecords === null) {
        remoteReadyRef.current = false;
        return;
      }

      if (remoteRecords.length > 0) {
        setMemoRecords(remoteRecords);
        previousSyncedRecordsRef.current = remoteRecords;
        remoteReadyRef.current = true;
        return;
      }

      const initialLocalRecords = initialRecordsRef.current;
      await upsertRemoteMemos(ownerKey, initialLocalRecords);
      if (cancelled) return;

      previousSyncedRecordsRef.current = initialLocalRecords;
      remoteReadyRef.current = true;
    };

    void hydrateFromRemote();

    return () => {
      cancelled = true;
    };
  }, [ownerKey]);

  useEffect(() => {
    if (!remoteReadyRef.current) return;

    const previousRecords = previousSyncedRecordsRef.current;
    const nextRecords = memoRecords;

    const previousById = new Map(previousRecords.map((record) => [record.id, record]));
    const nextById = new Map(nextRecords.map((record) => [record.id, record]));

    const upsertTargets: MemoRecord[] = [];
    nextRecords.forEach((record) => {
      const previous = previousById.get(record.id);
      if (!previous || !isSameRecord(previous, record)) {
        upsertTargets.push(record);
      }
    });

    const deleteTargets: string[] = [];
    previousRecords.forEach((record) => {
      if (!nextById.has(record.id)) {
        deleteTargets.push(record.id);
      }
    });

    previousSyncedRecordsRef.current = nextRecords;
    if (upsertTargets.length === 0 && deleteTargets.length === 0) return;

    pendingUpsertRef.current = upsertTargets;
    pendingDeleteRef.current = deleteTargets;

    if (syncDebounceTimerRef.current) {
      clearTimeout(syncDebounceTimerRef.current);
    }

    const flushSync = () => {
      const toUpsert = pendingUpsertRef.current;
      const toDelete = pendingDeleteRef.current;
      pendingUpsertRef.current = [];
      pendingDeleteRef.current = [];
      if (toUpsert.length === 0 && toDelete.length === 0) return;
      syncQueueRef.current = syncQueueRef.current
        .then(async () => {
          await upsertRemoteMemos(ownerKey, toUpsert);
          await deleteRemoteMemos(ownerKey, toDelete);
        })
        .catch((error) => {
          const message = error instanceof Error ? error.message : String(error);
          console.error('[useMemoStore] failed to sync memo records', message);
        });
    };

    syncDebounceTimerRef.current = setTimeout(() => {
      syncDebounceTimerRef.current = null;
      flushSync();
    }, REMOTE_SYNC_DEBOUNCE_MS);

    return () => {
      if (!syncDebounceTimerRef.current) return;
      clearTimeout(syncDebounceTimerRef.current);
      syncDebounceTimerRef.current = null;
    };
  }, [memoRecords, ownerKey]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'hidden') return;
      if (syncDebounceTimerRef.current) {
        clearTimeout(syncDebounceTimerRef.current);
        syncDebounceTimerRef.current = null;
      }
      const toUpsert = pendingUpsertRef.current;
      const toDelete = pendingDeleteRef.current;
      pendingUpsertRef.current = [];
      pendingDeleteRef.current = [];
      if (toUpsert.length === 0 && toDelete.length === 0) return;
      syncQueueRef.current = syncQueueRef.current
        .then(async () => {
          await upsertRemoteMemos(ownerKey, toUpsert);
          await deleteRemoteMemos(ownerKey, toDelete);
        })
        .catch((error) => {
          const message = error instanceof Error ? error.message : String(error);
          console.error('[useMemoStore] failed to flush sync on hide', message);
        });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [ownerKey]);

  return {
    memoRecords,
    setMemoRecords,
    activeMemoId,
    setActiveMemoId,
    initialSnapshot,
  };
}
