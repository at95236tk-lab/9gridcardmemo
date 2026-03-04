import type { EditorSnapshot } from './editor';

export type MemoRecord = {
  id: string;
  name: string;
  snapshot: EditorSnapshot;
  createdAt: number;
  updatedAt: number;
};

export type PersistedMemoStore = {
  version: 1;
  activeMemoId: string;
  records: MemoRecord[];
};
