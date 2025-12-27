import { useState } from 'react';
import { Download, Upload, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { WeightEntry, TargetData } from '../types';
import { Achievement } from '../types/achievements';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

interface BackupData {
    version: string;
    exportDate: string;
    entries: WeightEntry[];
    targetData: TargetData | null;
    achievements: Achievement[];
    settings: {
        theme?: string;
        timelineView?: string;
        reminder?: any;
    };
}

interface DataBackupProps {
    entries: WeightEntry[];
    targetData: TargetData | null;
    onRestore: (entries: WeightEntry[], targetData: TargetData | null) => void;
}

export function DataBackup({ entries, targetData, onRestore }: DataBackupProps) {
    const [isProcessing, setIsProcessing] = useState(false);

    const createBackup = () => {
        setIsProcessing(true);

        try {
            // Gather all data
            const achievementsData = localStorage.getItem('weightwatch-achievements');
            const achievements: Achievement[] = achievementsData ? JSON.parse(achievementsData) : [];

            const backupData: BackupData = {
                version: '1.0.0',
                exportDate: new Date().toISOString(),
                entries,
                targetData,
                achievements,
                settings: {
                    theme: localStorage.getItem('weightwatch-theme') || undefined,
                    timelineView: localStorage.getItem('weightwatch-timeline-view') || undefined,
                    reminder: localStorage.getItem('weightwatch-reminder-settings') || undefined,
                },
            };

            // Create downloadable file
            const dataStr = JSON.stringify(backupData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);

            // Create download link
            const link = document.createElement('a');
            link.href = url;
            link.download = `weightwatch-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success('Backup created successfully!');
        } catch (error) {
            console.error('Backup error:', error);
            toast.error('Failed to create backup');
        } finally {
            setIsProcessing(false);
        }
    };

    const restoreBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const backupData: BackupData = JSON.parse(content);

                // Validate backup data
                if (!backupData.version || !backupData.entries) {
                    throw new Error('Invalid backup file format');
                }

                // Restore data
                onRestore(backupData.entries, backupData.targetData);

                // Restore achievements
                if (backupData.achievements) {
                    localStorage.setItem('weightwatch-achievements', JSON.stringify(backupData.achievements));
                }

                // Restore settings
                if (backupData.settings.theme) {
                    localStorage.setItem('weightwatch-theme', backupData.settings.theme);
                }
                if (backupData.settings.timelineView) {
                    localStorage.setItem('weightwatch-timeline-view', backupData.settings.timelineView);
                }
                if (backupData.settings.reminder) {
                    localStorage.setItem('weightwatch-reminder-settings', backupData.settings.reminder);
                }

                toast.success('Data restored successfully! Reloading...');

                // Reload page to apply all changes
                setTimeout(() => {
                    window.location.reload();
                }, 1500);

            } catch (error) {
                console.error('Restore error:', error);
                toast.error('Failed to restore backup. Please check the file.');
            } finally {
                setIsProcessing(false);
            }
        };

        reader.readAsText(file);
        // Reset input
        event.target.value = '';
    };

    return (
        <div className="backdrop-blur-md bg-white/90 dark:bg-gray-800/90 rounded-3xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-anthracite dark:text-white">Backup & Restore</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Protect your data</p>
                </div>
            </div>

            <div className="space-y-3">
                {/* Backup Button */}
                <motion.button
                    onClick={createBackup}
                    disabled={isProcessing || entries.length === 0}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-emerald-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={{ scale: entries.length > 0 ? 1.02 : 1 }}
                    whileTap={{ scale: entries.length > 0 ? 0.98 : 1 }}
                >
                    <Download className="w-5 h-5" />
                    <span>Create Backup</span>
                </motion.button>

                {/* Restore Button */}
                <div className="relative">
                    <input
                        id="restore-file"
                        type="file"
                        accept=".json"
                        onChange={restoreBackup}
                        disabled={isProcessing}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <motion.button
                        disabled={isProcessing}
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all disabled:opacity-50"
                        whileHover={{ scale: !isProcessing ? 1.02 : 1 }}
                        whileTap={{ scale: !isProcessing ? 0.98 : 1 }}
                    >
                        <Upload className="w-5 h-5" />
                        <span>Restore from Backup</span>
                    </motion.button>
                </div>
            </div>

            {/* Info Cards */}
            <div className="mt-6 space-y-3">
                <div className="flex items-start gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">What's included</p>
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                            All weight entries, goals, achievements, and settings
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                    <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">Important</p>
                        <p className="text-xs text-orange-700 dark:text-orange-400 mt-1">
                            Restoring will replace all current data. Make sure to backup first!
                        </p>
                    </div>
                </div>
            </div>

            {isProcessing && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <span>Processing...</span>
                </div>
            )}
        </div>
    );
}
