import { WeightEntry, TargetData } from '../types';
import { parseISO } from 'date-fns';

const DISCOVERY_DOCS = ['https://sheets.googleapis.com/$discovery/rest?version=v4'];
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

class GoogleSheetsService {
  private gapiInited = false;
  private tokenClient: any = null;
  private spreadsheetId: string = '';
  private syncStatus: SyncStatus = 'idle';
  private lastSyncTime: Date | null = null;
  private statusListeners: ((status: SyncStatus) => void)[] = [];

  constructor() {
    this.spreadsheetId = import.meta.env.VITE_GOOGLE_SHEET_ID || '';
  }

  /**
   * Initialize the Google API client
   */
  async initClient(): Promise<void> {
    if (this.gapiInited) return;

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        (window as any).gapi.load('client', async () => {
          try {
            await (window as any).gapi.client.init({
              apiKey: '', // Not needed for OAuth flow
              discoveryDocs: DISCOVERY_DOCS,
            });
            this.gapiInited = true;
            this.initTokenClient();
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      };
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  /**
   * Initialize the Google Identity Services token client
   */
  private initTokenClient(): void {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.error('Google Client ID not found in environment variables');
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => {
      this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: '', // Will be set during login
      });
    };
    document.body.appendChild(script);
  }

  /**
   * Sign in to Google account
   */
  async signIn(): Promise<void> {
    if (!this.gapiInited) {
      await this.initClient();
    }

    return new Promise((resolve, reject) => {
      try {
        this.tokenClient.callback = async (response: any) => {
          if (response.error !== undefined) {
            reject(response);
          } else {
            resolve();
          }
        };

        if ((window as any).gapi.client.getToken() === null) {
          this.tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
          this.tokenClient.requestAccessToken({ prompt: '' });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Sign out from Google account
   */
  signOut(): void {
    const token = (window as any).gapi.client.getToken();
    if (token !== null) {
      (window as any).google.accounts.oauth2.revoke(token.access_token);
      (window as any).gapi.client.setToken('');
    }
  }

  /**
   * Check if user is signed in
   */
  isSignedIn(): boolean {
    return (window as any).gapi?.client?.getToken() !== null;
  }

  /**
   * Set spreadsheet ID
   */
  setSpreadsheetId(id: string): void {
    this.spreadsheetId = id;
  }

  /**
   * Get current spreadsheet ID
   */
  getSpreadsheetId(): string {
    return this.spreadsheetId;
  }

  /**
   * Update sync status and notify listeners
   */
  private updateSyncStatus(status: SyncStatus): void {
    this.syncStatus = status;
    if (status === 'success') {
      this.lastSyncTime = new Date();
    }
    this.statusListeners.forEach(listener => listener(status));
  }

  /**
   * Subscribe to sync status changes
   */
  onStatusChange(listener: (status: SyncStatus) => void): () => void {
    this.statusListeners.push(listener);
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== listener);
    };
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return this.syncStatus;
  }

  /**
   * Get last sync time
   */
  getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }

  /**
   * Fetch weight data from Google Sheets
   */
  async fetchWeightData(): Promise<WeightEntry[]> {
    if (!this.spreadsheetId) {
      throw new Error('Spreadsheet ID not configured');
    }

    this.updateSyncStatus('syncing');

    try {
      const response = await (window as any).gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Weight Data!A2:F', // Skip header row
      });

      const rows = response.result.values || [];
      const entries: WeightEntry[] = rows.map((row: any[]) => ({
        date: row[0], // Date
        weekDay: row[1], // Week Day
        weight: parseFloat(row[2]), // Weight
        changePercent: parseFloat(row[3]) || 0, // Change %
        changeKg: parseFloat(row[4]) || 0, // Change kg
        dailyChange: parseFloat(row[5]) || 0, // Daily Change
      }));

      this.updateSyncStatus('success');
      return entries;
    } catch (error) {
      this.updateSyncStatus('error');
      console.error('Error fetching weight data:', error);
      throw new Error('Failed to fetch weight data from Google Sheets');
    }
  }

  /**
   * Fetch target data from Google Sheets
   */
  async fetchTargetData(): Promise<TargetData> {
    if (!this.spreadsheetId) {
      throw new Error('Spreadsheet ID not configured');
    }

    this.updateSyncStatus('syncing');

    try {
      const response = await (window as any).gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Target!B2:B8', // Value column only
      });

      const values = response.result.values || [];
      const targetData: TargetData = {
        startDate: values[0]?.[0] || '',
        startWeight: parseFloat(values[1]?.[0]) || 0,
        endDate: values[2]?.[0] || '',
        endWeight: parseFloat(values[3]?.[0]) || 0,
        totalDuration: parseInt(values[4]?.[0]) || 0,
        totalKg: parseFloat(values[5]?.[0]) || 0,
        height: parseFloat(values[6]?.[0]) || 0,
      };

      this.updateSyncStatus('success');
      return targetData;
    } catch (error) {
      this.updateSyncStatus('error');
      console.error('Error fetching target data:', error);
      throw new Error('Failed to fetch target data from Google Sheets');
    }
  }

  /**
   * Write weight entries to Google Sheets
   */
  async writeWeightData(entries: WeightEntry[]): Promise<void> {
    if (!this.spreadsheetId) {
      throw new Error('Spreadsheet ID not configured');
    }

    this.updateSyncStatus('syncing');

    try {
      // Sort entries by date
      const sortedEntries = [...entries].sort(
        (a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()
      );

      // Convert to sheet format
      const rows = sortedEntries.map(entry => [
        entry.date,
        entry.weekDay,
        entry.weight,
        entry.changePercent,
        entry.changeKg,
        entry.dailyChange,
      ]);

      // Clear existing data (except header)
      await (window as any).gapi.client.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: 'Weight Data!A2:F',
      });

      // Write new data
      await (window as any).gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'Weight Data!A2',
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: rows,
        },
      });

      this.updateSyncStatus('success');
    } catch (error) {
      this.updateSyncStatus('error');
      console.error('Error writing weight data:', error);
      throw new Error('Failed to write weight data to Google Sheets');
    }
  }

  /**
   * Add a single weight entry to Google Sheets
   */
  async addWeightEntry(entry: WeightEntry): Promise<void> {
    if (!this.spreadsheetId) {
      throw new Error('Spreadsheet ID not configured');
    }

    this.updateSyncStatus('syncing');

    try {
      const row = [
        entry.date,
        entry.weekDay,
        entry.weight,
        entry.changePercent,
        entry.changeKg,
        entry.dailyChange,
      ];

      await (window as any).gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'Weight Data!A2',
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [row],
        },
      });

      this.updateSyncStatus('success');
    } catch (error) {
      this.updateSyncStatus('error');
      console.error('Error adding weight entry:', error);
      throw new Error('Failed to add weight entry to Google Sheets');
    }
  }

  /**
   * Update target data in Google Sheets
   */
  async writeTargetData(targetData: TargetData): Promise<void> {
    if (!this.spreadsheetId) {
      throw new Error('Spreadsheet ID not configured');
    }

    this.updateSyncStatus('syncing');

    try {
      const values = [
        [targetData.startDate],
        [targetData.startWeight],
        [targetData.endDate],
        [targetData.endWeight],
        [targetData.totalDuration],
        [targetData.totalKg],
        [targetData.height],
      ];

      await (window as any).gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'Target!B2:B8',
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: values,
        },
      });

      this.updateSyncStatus('success');
    } catch (error) {
      this.updateSyncStatus('error');
      console.error('Error writing target data:', error);
      throw new Error('Failed to write target data to Google Sheets');
    }
  }

  /**
   * Full sync: Fetch all data from Google Sheets
   */
  async syncFromSheets(): Promise<{ entries: WeightEntry[]; targetData: TargetData }> {
    const [entries, targetData] = await Promise.all([
      this.fetchWeightData(),
      this.fetchTargetData(),
    ]);

    return { entries, targetData };
  }

  /**
   * Full sync: Push all data to Google Sheets
   */
  async syncToSheets(entries: WeightEntry[], targetData: TargetData): Promise<void> {
    await Promise.all([
      this.writeWeightData(entries),
      this.writeTargetData(targetData),
    ]);
  }
}

// Export singleton instance
export const googleSheetsService = new GoogleSheetsService();
