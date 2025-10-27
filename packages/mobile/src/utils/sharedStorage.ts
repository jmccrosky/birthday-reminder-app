import { NativeModules, Platform } from 'react-native';

const APP_GROUP_ID = 'group.com.incitefuldataconsulting.birthdayreminder';
const PENDING_IMPORT_KEY = 'pendingCSVImport';

export interface PendingImport {
  csvContent: string;
  fileName: string;
  timestamp: number;
}

/**
 * Native module bridge for accessing App Groups shared storage
 * This will be implemented in native iOS code
 */
interface SharedStorageModule {
  getString(key: string, appGroup: string): Promise<string | null>;
  setString(key: string, value: string, appGroup: string): Promise<void>;
  removeKey(key: string, appGroup: string): Promise<void>;
}

// Get the native module (will be implemented later)
const SharedStorage: SharedStorageModule | null =
  Platform.OS === 'ios' ? NativeModules.SharedStorage : null;

/**
 * Check if there's a pending CSV import from the Share Extension
 */
export async function getPendingImport(): Promise<PendingImport | null> {
  if (!SharedStorage) {
    console.warn('SharedStorage module not available');
    return null;
  }

  try {
    const data = await SharedStorage.getString(PENDING_IMPORT_KEY, APP_GROUP_ID);

    if (!data) {
      return null;
    }

    return JSON.parse(data) as PendingImport;
  } catch (error) {
    console.error('Error reading pending import:', error);
    return null;
  }
}

/**
 * Clear the pending import after processing
 */
export async function clearPendingImport(): Promise<void> {
  if (!SharedStorage) {
    console.warn('SharedStorage module not available');
    return;
  }

  try {
    await SharedStorage.removeKey(PENDING_IMPORT_KEY, APP_GROUP_ID);
  } catch (error) {
    console.error('Error clearing pending import:', error);
  }
}

/**
 * Store a pending import (used by Share Extension)
 * This function is primarily for the Share Extension to call
 */
export async function storePendingImport(pendingImport: PendingImport): Promise<void> {
  if (!SharedStorage) {
    console.warn('SharedStorage module not available');
    return;
  }

  try {
    const data = JSON.stringify(pendingImport);
    await SharedStorage.setString(PENDING_IMPORT_KEY, data, APP_GROUP_ID);
  } catch (error) {
    console.error('Error storing pending import:', error);
    throw error;
  }
}

export { APP_GROUP_ID };
