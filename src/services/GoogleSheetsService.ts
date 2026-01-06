import { WeightEntry, TargetData } from '../types';
import { parseISO } from 'date-fns';

const DISCOVERY_DOCS = ['https://sheets.googleapis.com/$discovery/rest?version=v4'];
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

// S6: Token refresh interval (45 minutes - before 1 hour expiry)
const TOKEN_REFRESH_INTERVAL = 45 * 60 * 1000;

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

class GoogleSheetsService {
  private gapiInited = false;
  private tokenClient: google.accounts.oauth2.TokenClient | null = null;
  private spreadsheetId: string = '';
  private syncStatus: SyncStatus = 'idle';
  private lastSyncTime: Date | null = null;
  private statusListeners: ((status: SyncStatus) => void)[] = [];
  private tokenRefreshTimer: ReturnType<typeof setInterval> | null = null;

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
        const gapiLib = (window as unknown as { gapi: typeof gapi }).gapi;
        gapiLib.load('client', async () => {
          try {
            await gapiLib.client.init({
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
   * S6: Improved with scope validation
   */
  private initTokenClient(): void {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      // S7: Removed console.error for production
      if (import.meta.env.DEV) {
        console.warn('Google Client ID not configured');
      }
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => {
      const googleLib = (window as unknown as { google: typeof google }).google;
      this.tokenClient = googleLib.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: () => {}, // Will be set during login
      });
    };
    document.body.appendChild(script);
  }

  /**
   * S6: Start automatic token refresh
   */
  private startTokenRefresh(): void {
    // Clear any existing timer
    if (this.tokenRefreshTimer) {
      clearInterval(this.tokenRefreshTimer);
    }

    // Set up periodic token refresh
    this.tokenRefreshTimer = setInterval(() => {
      this.refreshToken();
    }, TOKEN_REFRESH_INTERVAL);
  }

  /**
   * S6: Refresh the access token
   */
  private async refreshToken(): Promise<void> {
    if (!this.tokenClient) return;

    return new Promise((resolve, reject) => {
      const originalCallback = this.tokenClient!.callback;
      this.tokenClient!.callback = (response: { error?: string }) => {
        this.tokenClient!.callback = originalCallback;
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve();
        }
      };

      // Request new token silently
      this.tokenClient!.requestAccessToken({ prompt: '' });
    });
  }

  /**
   * S6: Validate that the token has the required scopes
   */
  private validateTokenScopes(): boolean {
    const gapiLib = (window as unknown as { gapi?: typeof gapi }).gapi;
    const token = gapiLib?.client?.getToken();

    if (!token) return false;

    // Check if scope is present (Google returns space-separated scopes)
    const tokenScopes = token.scope?.split(' ') || [];
    return tokenScopes.includes(SCOPES) ||
           tokenScopes.includes('https://www.googleapis.com/auth/spreadsheets');
  }

  /**
   * Sign in to Google account
   * S6: Enhanced with token refresh and scope validation
   */
  async signIn(): Promise<void> {
    if (!this.gapiInited) {
      await this.initClient();
    }

    return new Promise((resolve, reject) => {
      if (!this.tokenClient) {
        reject(new Error('Token client not initialized'));
        return;
      }

      this.tokenClient.callback = async (response) => {
        if (response.error !== undefined) {
          reject(new Error(response.error));
        } else {
          // S6: Validate scopes after login
          if (!this.validateTokenScopes()) {
            reject(new Error('Required permissions not granted'));
            return;
          }
          // S6: Start token refresh timer
          this.startTokenRefresh();
          resolve();
        }
      };

      const gapiLib = (window as unknown as { gapi: typeof gapi }).gapi;
      if (gapiLib.client.getToken() === null) {
        this.tokenClient.requestAccessToken({ prompt: 'consent' });
      } else {
        this.tokenClient.requestAccessToken({ prompt: '' });
      }
    });
  }

  /**
   * Sign out from Google account
   * S6: Enhanced to clean up refresh timer
   */
  signOut(): void {
    // Clear refresh timer
    if (this.tokenRefreshTimer) {
      clearInterval(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }

    const gapiLib = (window as unknown as { gapi?: typeof gapi }).gapi;
    const googleLib = (window as unknown as { google: typeof google }).google;

    const token = gapiLib?.client?.getToken();
    if (token) {
      googleLib.accounts.oauth2.revoke(token.access_token);
      gapiLib?.client?.setToken(null);
    }
  }

  /**
   * Check if user is signed in
   */
  isSignedIn(): boolean {
    const gapiLib = (window as unknown as { gapi?: typeof gapi }).gapi;
    return gapiLib?.client?.getToken() !== null;
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
   * S7: Removed detailed error logging
   */
  async fetchWeightData(): Promise<WeightEntry[]> {
    if (!this.spreadsheetId) {
      throw new Error('Spreadsheet ID not configured');
    }

    this.updateSyncStatus('syncing');

    try {
      const gapiLib = (window as unknown as { gapi: typeof gapi }).gapi;
      const response = await gapiLib.client.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Weight Data!A2:F', // Skip header row
      });

      const rows = response.result.values || [];
      const entries: WeightEntry[] = rows.map((row: string[]) => ({
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
      // S7: Only log error type in development, not full error details
      if (import.meta.env.DEV) {
        console.warn('Sheets API error occurred');
      }
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
      const gapiLib = (window as unknown as { gapi: typeof gapi }).gapi;
      const response = await gapiLib.client.sheets.spreadsheets.values.get({
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
      // S7: Only log in development
      if (import.meta.env.DEV) {
        console.warn('Sheets API error occurred');
      }
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
      const gapiLib = (window as unknown as { gapi: typeof gapi }).gapi;

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
      await gapiLib.client.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: 'Weight Data!A2:F',
      });

      // Write new data
      await gapiLib.client.sheets.spreadsheets.values.update({
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
      // S7: Only log in development
      if (import.meta.env.DEV) {
        console.warn('Sheets API error occurred');
      }
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
      const gapiLib = (window as unknown as { gapi: typeof gapi }).gapi;

      const row = [
        entry.date,
        entry.weekDay,
        entry.weight,
        entry.changePercent,
        entry.changeKg,
        entry.dailyChange,
      ];

      await gapiLib.client.sheets.spreadsheets.values.append({
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
      // S7: Only log in development
      if (import.meta.env.DEV) {
        console.warn('Sheets API error occurred');
      }
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
      const gapiLib = (window as unknown as { gapi: typeof gapi }).gapi;

      const values = [
        [targetData.startDate],
        [targetData.startWeight],
        [targetData.endDate],
        [targetData.endWeight],
        [targetData.totalDuration],
        [targetData.totalKg],
        [targetData.height],
      ];

      await gapiLib.client.sheets.spreadsheets.values.update({
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
      // S7: Only log in development
      if (import.meta.env.DEV) {
        console.warn('Sheets API error occurred');
      }
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
