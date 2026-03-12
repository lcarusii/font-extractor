import { get, set, del, keys } from 'idb-keyval';
import { FontResult } from './aiService';

export interface LicenseDocument {
  id: string;
  name: string;
  mimeType: string;
  base64: string;
  timestamp: number;
}

export interface HistoryRecord {
  id: string;
  timestamp: number;
  image: { base64: string; mimeType: string };
  results: FontResult[];
  brandName?: string;
  provider: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export async function saveLicenseDocument(doc: Omit<LicenseDocument, 'id' | 'timestamp'>): Promise<LicenseDocument> {
  const id = crypto.randomUUID();
  const newDoc: LicenseDocument = {
    ...doc,
    id,
    timestamp: Date.now(),
  };
  await set(`license_${id}`, newDoc);
  return newDoc;
}

export async function getLicenseDocuments(): Promise<LicenseDocument[]> {
  const allKeys = await keys();
  const licenseKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith('license_'));
  const docs = await Promise.all(licenseKeys.map(k => get<LicenseDocument>(k as string)));
  return docs.filter((d): d is LicenseDocument => d !== undefined).sort((a, b) => b.timestamp - a.timestamp);
}

export async function deleteLicenseDocument(id: string): Promise<void> {
  await del(`license_${id}`);
}

export async function getHistoryRecords(): Promise<HistoryRecord[]> {
  const records = await get<HistoryRecord[]>('font_history');
  return records || [];
}

export async function saveHistoryRecord(record: Omit<HistoryRecord, 'id' | 'timestamp'>): Promise<void> {
  const records = await getHistoryRecords();
  const newRecord: HistoryRecord = {
    ...record,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  // Keep last 50 records
  const updatedRecords = [newRecord, ...records].slice(0, 50);
  await set('font_history', updatedRecords);
}

export async function deleteHistoryRecord(id: string): Promise<void> {
  const records = await getHistoryRecords();
  const updatedRecords = records.filter(r => r.id !== id);
  await set('font_history', updatedRecords);
}

export async function clearHistoryRecords(): Promise<void> {
  await set('font_history', []);
}

export async function getChatHistory(): Promise<ChatMessage[]> {
  const messages = await get<ChatMessage[]>('chat_history');
  return messages || [];
}

export async function saveChatHistory(messages: ChatMessage[]): Promise<void> {
  await set('chat_history', messages);
}

export async function clearChatHistory(): Promise<void> {
  await set('chat_history', []);
}
