import { db } from '../config/firebase.js';
import ActivityLogDTO from '../dtos/activityDTO.js';
import type { ActivityLog } from '../types/Activity.js';

const collection = db.collection('activityLogs');

/**
 * Tambah Activity Log
 * Setiap log menjadi dokumen di subcollection 'history' per account
 */
export const addActivityLog = async (data: Partial<ActivityLog>) => {
  const dto = new ActivityLogDTO(data);
  dto.validate();

  const entry: ActivityLog = {
    timestamp: dto.timestamp ?? Date.now(),
    type: dto.type,
    action: dto.action,
    account: dto.account,
    txHash: dto.txHash,
    contractAddress: dto.contractAddress,
    extra: dto.extra ?? undefined,
    onChainInfo: dto.onChainInfo,
  };

  const historyRef = collection.doc(dto.account).collection('history');
  await historyRef.add(entry);

  return entry;
};

/**
 * Ambil semua account yang punya activity
 */
export const getAllAccounts = async (): Promise<string[]> => {
  const snapshot = await collection.get();
  return snapshot.docs.map((doc) => doc.id);
};

/**
 * Ambil activity log per account dengan pagination
 */
export const getActivityByAccount = async (
  account: string,
  options?: { limit?: number; startAfterTimestamp?: number }
): Promise<ActivityLog[]> => {
  let query = collection.doc(account).collection('history').orderBy('timestamp', 'desc');

  if (options?.startAfterTimestamp) {
    query = query.startAfter(options.startAfterTimestamp);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const snapshot = await query.get();
  const logs: ActivityLog[] = snapshot.docs.map((doc) => doc.data() as ActivityLog);
  return logs;
};

/**
 * Ambil semua activity log dengan filter (account / txHash / contractAddress) — paginasi optional
 */
export const getAllActivities = async (
  filter?: { account?: string; txHash?: string; contractAddress?: string; limit?: number; startAfterTimestamp?: number }
): Promise<ActivityLog[]> => {
  let logs: ActivityLog[] = [];

  if (filter?.account) {
    logs = await getActivityByAccount(filter.account, {
      limit: filter.limit,
      startAfterTimestamp: filter.startAfterTimestamp,
    });
  } else {
    const snapshot = await collection.get();
    for (const doc of snapshot.docs) {
      const accountLogs = await getActivityByAccount(doc.id, {
        limit: filter?.limit,
        startAfterTimestamp: filter?.startAfterTimestamp,
      });
      logs.push(...accountLogs);
    }
  }

  if (filter?.txHash) logs = logs.filter((l) => l.txHash === filter.txHash);
  if (filter?.contractAddress) logs = logs.filter((l) => l.contractAddress === filter.contractAddress);

  // Sort descending just in case
  logs.sort((a, b) => b.timestamp - a.timestamp);
  return logs;
};
