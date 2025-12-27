import { useState, useEffect } from 'react';
import { Bell, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

interface ReminderSettings {
    enabled: boolean;
    time: string; // H H:MM format (24hr)
    skipWeekends: boolean;
}

const STORAGE_KEY = 'weightwatch-reminder-settings';

export function DailyReminder() {
    const [settings, setSettings] = useState<ReminderSettings>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : {
            enabled: false,
            time: '09:00',
            skipWeekends: false,
        };
    });

    const [permission, setPermission] = useState<NotificationPermission>('default');

    useEffect(() => {
        // Check notification permission
        if ('Notification' in window) {
            setPermission(Notification.permission);
        }
    }, []);

    useEffect(() => {
        // Save settings
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }, [settings]);

    useEffect(() => {
        if (!settings.enabled || permission !== 'granted') return;

        // Schedule daily reminder check
        const checkReminder = () => {
            const now = new Date();
            const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday

            // Skip weekends if set
            if (settings.skipWeekends && (currentDay === 0 || currentDay === 6)) {
                return;
            }

            const [hours, minutes] = settings.time.split(':').map(Number);
            const reminderTime = new Date();
            reminderTime.setHours(hours, minutes, 0, 0);

            // Check if it's within 1 minute of reminder time
            const timeDiff = Math.abs(now.getTime() - reminderTime.getTime());

            if (timeDiff < 60000) { // Within 1 minute
                // Check if already logged today
                const lastEntry = localStorage.getItem('weightwatch-last-entry-date');
                const today = now.toISOString().split('T')[0];

                if (lastEntry !== today) {
                    showNotification();
                }
            }
        };

        // Check every minute
        const interval = setInterval(checkReminder, 60000);
        checkReminder(); // Check immediately

        return () => clearInterval(interval);
    }, [settings, permission]);

    const showNotification = () => {
        if (permission === 'granted') {
            new Notification('Time to weigh in! ⚖️', {
                body: 'Track your progress by recording today\'s weight.',
                icon: '/logo.png',
                badge: '/logo.png',
                tag: 'daily-reminder',
            });
        }
    };

    const requestPermission = async () => {
        if (!('Notification' in window)) {
            toast.error('Notifications not supported in this browser');
            return;
        }

        const result = await Notification.requestPermission();
        setPermission(result);

        if (result === 'granted') {
            toast.success('Notifications enabled!');
            setSettings(prev => ({ ...prev, enabled: true }));
        } else {
            toast.error('Notification permission denied');
        }
    };

    const toggleReminder = async () => {
        if (!settings.enabled && permission !== 'granted') {
            await requestPermission();
        } else {
            setSettings(prev => ({ ...prev, enabled: !prev.enabled }));
            toast.success(settings.enabled ? 'Reminders disabled' : 'Reminders enabled');
        }
    };

    return (
        <div className="backdrop-blur-md bg-white/90 dark:bg-gray-800/90 rounded-3xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                        <Bell className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-anthracite dark:text-white">Daily Reminder</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Never miss a weigh-in</p>
                    </div>
                </div>

                <button
                    onClick={toggleReminder}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${settings.enabled && permission === 'granted'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                        : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                >
                    <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${settings.enabled && permission === 'granted' ? 'translate-x-7' : 'translate-x-1'
                            }`}
                    />
                </button>
            </div>

            {settings.enabled && permission === 'granted' && (
                <div className="space-y-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    {/* Time Selector */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">Reminder Time</span>
                        </div>
                        <input
                            type="time"
                            value={settings.time}
                            onChange={(e) => setSettings(prev => ({ ...prev, time: e.target.value }))}
                            className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    {/* Skip Weekends */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Skip weekends</span>
                        <button
                            onClick={() => setSettings(prev => ({ ...prev, skipWeekends: !prev.skipWeekends }))}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.skipWeekends
                                ? 'bg-emerald-500'
                                : 'bg-gray-300 dark:bg-gray-600'
                                }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.skipWeekends ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>
                </div>
            )}

            {permission === 'denied' && (
                <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                    <p className="text-sm text-orange-700 dark:text-orange-400">
                        Notifications are blocked. Please enable them in your browser settings.
                    </p>
                </div>
            )}

            {!('Notification' in window) && (
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/20 rounded-xl border border-gray-200 dark:border-gray-600">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Notifications are not supported in this browser.
                    </p>
                </div>
            )}
        </div>
    );
}
