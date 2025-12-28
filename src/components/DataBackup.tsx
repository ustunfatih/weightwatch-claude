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
        reminder?: string;
    };
}

interface DataBackupProps {
    entries: WeightEntry[];
    targetData: TargetData | null;
    onRestore: (entries: WeightEntry[], targetData: TargetData | null) => void;
}

/**
 * Sanitize a string to prevent XSS and other injection attacks
 */
function sanitizeString(value: unknown): string {
    if (typeof value !== 'string') return '';
    // Remove potentially dangerous characters and HTML tags
    return value
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/[<>'"]/g, '') // Remove dangerous chars
        .trim()
        .slice(0, 1000); // Limit length
}

/**
 * Validate and sanitize a WeightEntry
 */
function validateWeightEntry(entry: unknown): WeightEntry | null {
    if (!entry || typeof entry !== 'object') return null;

    const e = entry as Record<string, unknown>;

    // Validate required fields
    if (typeof e.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(e.date)) return null;
    if (typeof e.weight !== 'number' || e.weight < 20 || e.weight > 500) return null;

    // Validate date is reasonable (not too far in past or future)
    const date = new Date(e.date);
    const minDate = new Date('2000-01-01');
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    if (date < minDate || date > maxDate) return null;

    return {
        date: e.date,
        weekDay: sanitizeString(e.weekDay) || 'Unknown',
        weight: Math.round(e.weight * 100) / 100, // Round to 2 decimals
        changePercent: typeof e.changePercent === 'number' ? Math.round(e.changePercent * 100) / 100 : 0,
        changeKg: typeof e.changeKg === 'number' ? Math.round(e.changeKg * 100) / 100 : 0,
        dailyChange: typeof e.dailyChange === 'number' ? Math.round(e.dailyChange * 100) / 100 : 0,
    };
}

/**
 * Validate and sanitize TargetData
 */
function validateTargetData(target: unknown): TargetData | null {
    if (!target || typeof target !== 'object') return null;

    const t = target as Record<string, unknown>;

    // Validate required fields
    if (typeof t.startDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(t.startDate)) return null;
    if (typeof t.endDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(t.endDate)) return null;
    if (typeof t.startWeight !== 'number' || t.startWeight < 20 || t.startWeight > 500) return null;
    if (typeof t.endWeight !== 'number' || t.endWeight < 20 || t.endWeight > 500) return null;
    if (typeof t.height !== 'number' || t.height < 50 || t.height > 300) return null;

    return {
        startDate: t.startDate,
        endDate: t.endDate,
        startWeight: Math.round(t.startWeight * 100) / 100,
        endWeight: Math.round(t.endWeight * 100) / 100,
        totalDuration: typeof t.totalDuration === 'number' ? Math.max(0, Math.round(t.totalDuration)) : 0,
        totalKg: typeof t.totalKg === 'number' ? Math.round(t.totalKg * 100) / 100 : 0,
        height: Math.round(t.height * 10) / 10,
    };
}

/**
 * Validate an Achievement
 */
function validateAchievement(achievement: unknown): Achievement | null {
    if (!achievement || typeof achievement !== 'object') return null;

    const a = achievement as Record<string, unknown>;

    if (typeof a.id !== 'string' || a.id.length === 0 || a.id.length > 50) return null;
    if (typeof a.name !== 'string') return null;
    if (typeof a.description !== 'string') return null;
    if (typeof a.icon !== 'string') return null;
    if (!['milestone', 'consistency', 'progress', 'special'].includes(a.category as string)) return null;
    if (typeof a.unlocked !== 'boolean') return null;

    return {
        id: sanitizeString(a.id) as Achievement['id'],
        name: sanitizeString(a.name),
        description: sanitizeString(a.description),
        icon: sanitizeString(a.icon),
        category: a.category as Achievement['category'],
        unlocked: a.unlocked,
        unlockedAt: typeof a.unlockedAt === 'string' ? sanitizeString(a.unlockedAt) : undefined,
    };
}

/**
 * Validate the entire backup data structure
 */
function validateBackupData(data: unknown): { isValid: boolean; errors: string[]; data?: BackupData } {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
        return { isValid: false, errors: ['Invalid backup file: not a valid JSON object'] };
    }

    const d = data as Record<string, unknown>;

    // Validate version
    if (typeof d.version !== 'string' || !d.version.match(/^\d+\.\d+\.\d+$/)) {
        errors.push('Invalid or missing version number');
    }

    // Validate export date
    if (typeof d.exportDate !== 'string') {
        errors.push('Missing export date');
    }

    // Validate entries
    if (!Array.isArray(d.entries)) {
        return { isValid: false, errors: ['Invalid backup file: entries must be an array'] };
    }

    if (d.entries.length > 10000) {
        return { isValid: false, errors: ['Too many entries in backup file (max 10000)'] };
    }

    const validatedEntries: WeightEntry[] = [];
    for (let i = 0; i < d.entries.length; i++) {
        const validEntry = validateWeightEntry(d.entries[i]);
        if (validEntry) {
            validatedEntries.push(validEntry);
        } else {
            errors.push(`Invalid entry at index ${i}`);
        }
    }

    if (validatedEntries.length === 0 && d.entries.length > 0) {
        return { isValid: false, errors: ['No valid entries found in backup'] };
    }

    // Validate target data
    let validatedTarget: TargetData | null = null;
    if (d.targetData !== null && d.targetData !== undefined) {
        validatedTarget = validateTargetData(d.targetData);
        if (!validatedTarget) {
            errors.push('Invalid target data - will use defaults');
        }
    }

    // Validate achievements
    const validatedAchievements: Achievement[] = [];
    if (Array.isArray(d.achievements)) {
        for (const achievement of d.achievements) {
            const validAchievement = validateAchievement(achievement);
            if (validAchievement) {
                validatedAchievements.push(validAchievement);
            }
        }
    }

    // Validate settings
    const settings: BackupData['settings'] = {};
    if (d.settings && typeof d.settings === 'object') {
        const s = d.settings as Record<string, unknown>;
        if (typeof s.theme === 'string' && ['light', 'dark'].includes(s.theme)) {
            settings.theme = s.theme;
        }
        if (typeof s.timelineView === 'string' && ['daily', 'weekly', 'monthly'].includes(s.timelineView)) {
            settings.timelineView = s.timelineView;
        }
        if (typeof s.reminder === 'string') {
            settings.reminder = sanitizeString(s.reminder);
        }
    }

    return {
        isValid: errors.length === 0 || validatedEntries.length > 0,
        errors,
        data: {
            version: typeof d.version === 'string' ? d.version : '1.0.0',
            exportDate: typeof d.exportDate === 'string' ? d.exportDate : new Date().toISOString(),
            entries: validatedEntries,
            targetData: validatedTarget,
            achievements: validatedAchievements,
            settings,
        },
    };
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

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            toast.error('Backup file is too large (max 10MB)');
            event.target.value = '';
            return;
        }

        // Validate file type
        if (!file.name.endsWith('.json')) {
            toast.error('Invalid file type. Please select a JSON backup file.');
            event.target.value = '';
            return;
        }

        setIsProcessing(true);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;

                // Parse JSON safely
                let parsedData: unknown;
                try {
                    parsedData = JSON.parse(content);
                } catch {
                    throw new Error('Invalid JSON format');
                }

                // Validate and sanitize backup data
                const validation = validateBackupData(parsedData);

                if (!validation.isValid || !validation.data) {
                    throw new Error(validation.errors.join(', '));
                }

                // Show warnings if any
                if (validation.errors.length > 0) {
                    toast(`Warning: ${validation.errors.length} issues found, some data may be skipped`, {
                        icon: '⚠️',
                        duration: 5000,
                    });
                }

                const backupData = validation.data;

                // Restore data
                onRestore(backupData.entries, backupData.targetData);

                // Restore achievements
                if (backupData.achievements.length > 0) {
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

                toast.success(`Data restored successfully! ${backupData.entries.length} entries loaded.`);

                // Reload page to apply all changes
                setTimeout(() => {
                    window.location.reload();
                }, 1500);

            } catch (error) {
                console.error('Restore error:', error);
                const message = error instanceof Error ? error.message : 'Unknown error';
                toast.error(`Failed to restore backup: ${message}`);
            } finally {
                setIsProcessing(false);
            }
        };

        reader.onerror = () => {
            toast.error('Failed to read backup file');
            setIsProcessing(false);
        };

        reader.readAsText(file);
        // Reset input
        event.target.value = '';
    };

    return (
        <div className="backdrop-blur-md bg-white/90 dark:bg-gray-800/90 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
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
