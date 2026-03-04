import type { MemoRecord } from '../types/memo';
import { normalizeSnapshot } from '../utils/snapshot';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

const MEMOS_TABLE = 'memos';

type RemoteMemoRow = {
  id: string;
  owner_key: string;
  name: string;
  snapshot: unknown;
  created_at: number;
  updated_at: number;
};

function toRemoteRow(ownerKey: string, record: MemoRecord): RemoteMemoRow {
  return {
    id: record.id,
    owner_key: ownerKey,
    name: record.name,
    snapshot: record.snapshot,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };
}

function toMemoRecord(row: RemoteMemoRow): MemoRecord {
  return {
    id: row.id,
    name: row.name,
    snapshot: normalizeSnapshot(row.snapshot),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listRemoteMemos(ownerKey: string): Promise<MemoRecord[] | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(MEMOS_TABLE)
    .select('id, owner_key, name, snapshot, created_at, updated_at')
    .eq('owner_key', ownerKey)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[memoRemoteStorage] failed to list memos', error.message);
    return null;
  }

  if (!data) return [];
  return (data as RemoteMemoRow[]).map(toMemoRecord);
}

export async function upsertRemoteMemos(ownerKey: string, records: MemoRecord[]) {
  if (!isSupabaseConfigured() || records.length === 0) return;

  const supabase = getSupabaseClient();
  if (!supabase) return;

  const payload = records.map((record) => toRemoteRow(ownerKey, record));
  const { error } = await supabase.from(MEMOS_TABLE).upsert(payload as never, { onConflict: 'id' });

  if (error) {
    console.error('[memoRemoteStorage] failed to upsert memos', error.message);
  }
}

export async function deleteRemoteMemos(ownerKey: string, memoIds: string[]) {
  if (!isSupabaseConfigured() || memoIds.length === 0) return;

  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from(MEMOS_TABLE).delete().eq('owner_key', ownerKey).in('id', memoIds);

  if (error) {
    console.error('[memoRemoteStorage] failed to delete memos', error.message);
  }
}
