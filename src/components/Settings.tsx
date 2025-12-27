import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Link as LinkIcon, Unlink, RefreshCw, Check, AlertCircle, Bell, Database } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { googleSheetsService, SyncStatus } from '../services/GoogleSheetsService';
import { Modal } from './Modal';
import { DailyReminder } from './DailyReminder';
import { DataBackup } from './DataBackup';
import { WeightEntry, TargetData } from '../types';

interface SettingsProps {
  onSyncComplete?: () => void;
  entries?: WeightEntry[];
  targetData?: TargetData | null;
  onDataRestore?: (entries: WeightEntry[], targetData: TargetData | null) => void;
}

export const Settings = ({ onSyncComplete, entries = [], targetData = null, onDataRestore }: SettingsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'sync' | 'reminders' | 'backup'>('sync');
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [sheetId, setSheetId] = useState('');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  type TabConfig = {
    id: 'sync' | 'reminders' | 'backup';
    label: string;
    icon: typeof LinkIcon;
  };

  const tabs: TabConfig[] = [
    { id: 'sync', label: 'Sync', icon: LinkIcon },
    { id: 'reminders', label: 'Reminders', icon: Bell },
    { id: 'backup', label: 'Backup', icon: Database },
  ];

  useEffect(() => {
    // Load saved sheet ID from env or localStorage
    const envSheetId = import.meta.env.VITE_GOOGLE_SHEET_ID;
    const savedSheetId = localStorage.getItem('google-sheet-id') || envSheetId || '';
    setSheetId(savedSheetId);
    googleSheetsService.setSpreadsheetId(savedSheetId);

    // Initialize Google Sheets service
    googleSheetsService.initClient().catch(err => {
      console.error('Failed to initialize Google Sheets:', err);
    });

    // Subscribe to sync status changes
    const unsubscribe = googleSheetsService.onStatusChange((status) => {
      setSyncStatus(status);
      setLastSyncTime(googleSheetsService.getLastSyncTime());
    });

    return unsubscribe;
  }, []);

  const handleConnect = async () => {
    try {
      await googleSheetsService.signIn();
      setIsSignedIn(true);
      toast.success('Connected to Google Sheets!');
    } catch (err) {
      console.error('Sign in error:', err);
      toast.error('Failed to connect to Google Sheets');
    }
  };

  const handleDisconnect = () => {
    googleSheetsService.signOut();
    setIsSignedIn(false);
    toast.success('Disconnected from Google Sheets');
  };

  const handleSync = async () => {
    if (!isSignedIn) {
      toast.error('Please connect to Google Sheets first');
      return;
    }

    try {
      const data = await googleSheetsService.syncFromSheets();

      // Save to localStorage
      localStorage.setItem('weightwatch-entries', JSON.stringify(data.entries));
      localStorage.setItem('weightwatch-target', JSON.stringify(data.targetData));

      toast.success('Data synced successfully!');

      // Notify parent component to reload data
      if (onSyncComplete) {
        onSyncComplete();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sync data';
      toast.error(message);
    }
  };

  const handleSheetIdChange = (value: string) => {
    setSheetId(value);
    localStorage.setItem('google-sheet-id', value);
    googleSheetsService.setSpreadsheetId(value);
  };

  const getSyncStatusDisplay = () => {
    switch (syncStatus) {
      case 'syncing':
        return (
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm">Syncing...</span>
          </div>
        );
      case 'success':
        return (
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <Check className="w-4 h-4" />
            <span className="text-sm">
              Last synced: {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : 'Never'}
            </span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">Sync failed</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <span className="text-sm">Not synced</span>
          </div>
        );
    }
  };

  return (
    <>
      <motion.button
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Settings"
      >
        <SettingsIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      </motion.button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Settings">
        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="flex gap-2 bg-gray-50 dark:bg-gray-800 p-1 rounded-2xl border border-gray-200 dark:border-gray-700">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/30'
                      : 'text-gray-600 dark:text-gray-400 hover:text-anthracite dark:hover:text-white'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          {activeTab === 'sync' && (
            <div>
              <h3 className="text-lg font-semibold text-anthracite dark:text-white mb-4">
                Google Sheets Integration
              </h3>

              {/* Sheet ID Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Google Sheet ID
                </label>
                <input
                  type="text"
                  value={sheetId}
                  onChange={(e) => handleSheetIdChange(e.target.value)}
                  placeholder="Enter your Google Sheet ID"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-anthracite dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Find this in your Google Sheet URL between /d/ and /edit
                </p>
              </div>

              {/* Connection Status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl mb-4">
                <div className="flex items-center gap-3">
                  {isSignedIn ? (
                    <>
                      <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-sm font-medium text-anthracite dark:text-white">
                        Connected
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-3 h-3 bg-gray-400 rounded-full" />
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Not Connected
                      </span>
                    </>
                  )}
                </div>
                {getSyncStatusDisplay()}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                {!isSignedIn ? (
                  <motion.button
                    onClick={handleConnect}
                    disabled={!sheetId}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-emerald-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <LinkIcon className="w-5 h-5" />
                    Connect to Google Sheets
                  </motion.button>
                ) : (
                  <>
                    <motion.button
                      onClick={handleSync}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-emerald-500/50 transition-all"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <RefreshCw className="w-5 h-5" />
                      Sync Now
                    </motion.button>
                    <motion.button
                      onClick={handleDisconnect}
                      className="px-4 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-all"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Unlink className="w-5 h-5" />
                    </motion.button>
                  </>
                )}
              </div>

              {/* Help Text */}
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/30">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Need help?</strong> Check the{' '}
                  <a
                    href="/GOOGLE_SHEETS_SETUP.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-blue-600 dark:hover:text-blue-200"
                  >
                    setup guide
                  </a>{' '}
                  for step-by-step instructions.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'reminders' && <DailyReminder />}

          {activeTab === 'backup' && onDataRestore && (
            <DataBackup
              entries={entries}
              targetData={targetData}
              onRestore={onDataRestore}
            />
          )}

          {/* Close Button */}
          <motion.button
            onClick={() => setIsOpen(false)}
            className="w-full px-4 py-3 bg-gray-200 dark:bg-gray-700 text-anthracite dark:text-white font-semibold rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Close
          </motion.button>
        </div>
      </Modal>
    </>
  );
};
