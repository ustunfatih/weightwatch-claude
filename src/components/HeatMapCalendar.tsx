import { useMemo } from 'react';
import { format, eachDayOfInterval, startOfWeek, isSameDay, parseISO, differenceInDays } from 'date-fns';
import { WeightEntry } from '../types';

interface HeatMapCalendarProps {
  entries: WeightEntry[];
  startDate: string;
}

export const HeatMapCalendar = ({ entries, startDate }: HeatMapCalendarProps) => {
  // Generate calendar data
  const calendarData = useMemo(() => {
    const start = parseISO(startDate);
    const today = new Date();

    // Start from the beginning of the week containing startDate
    const calendarStart = startOfWeek(start, { weekStartsOn: 0 }); // Sunday
    const calendarEnd = today;

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    // Group by week
    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];

    days.forEach((day, index) => {
      currentWeek.push(day);

      if (currentWeek.length === 7 || index === days.length - 1) {
        weeks.push([...currentWeek]);
        currentWeek = [];
      }
    });

    return { weeks, days };
  }, [startDate]);

  // Get entry for a specific day
  const getEntryForDay = (day: Date): WeightEntry | null => {
    return entries.find(entry => isSameDay(parseISO(entry.date), day)) || null;
  };

  // Get color for a day based on whether it has an entry
  const getDayColor = (day: Date): string => {
    const entry = getEntryForDay(day);
    const today = new Date();
    const isPast = day < today;
    const isToday = isSameDay(day, today);
    const start = parseISO(startDate);
    const isBeforeStart = day < start;

    if (isBeforeStart) {
      return 'bg-transparent'; // Days before journey started
    }

    if (entry) {
      // Has entry - show in emerald
      return 'bg-emerald-500 dark:bg-emerald-600 hover:bg-emerald-600 dark:hover:bg-emerald-700';
    }

    if (isToday) {
      return 'bg-orange-300 dark:bg-orange-700 hover:bg-orange-400 dark:hover:bg-orange-800';
    }

    if (isPast) {
      // Missing entry - show in red
      return 'bg-red-200 dark:bg-red-900/50 hover:bg-red-300 dark:hover:bg-red-800';
    }

    // Future day - show in gray
    return 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600';
  };

  // Get tooltip for a day
  const getTooltip = (day: Date): string => {
    const entry = getEntryForDay(day);
    const dateStr = format(day, 'MMM dd, yyyy');

    if (entry) {
      return `${dateStr}: ${entry.weight.toFixed(1)} kg`;
    }

    const today = new Date();
    const isPast = day < today;
    const isToday = isSameDay(day, today);
    const start = parseISO(startDate);
    const isBeforeStart = day < start;

    if (isBeforeStart) {
      return `${dateStr}: Before start date`;
    }

    if (isToday) {
      return `${dateStr}: Today - No entry yet`;
    }

    if (isPast) {
      return `${dateStr}: No entry`;
    }

    return `${dateStr}: Future`;
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const start = parseISO(startDate);
    const today = new Date();
    const totalDays = differenceInDays(today, start) + 1;
    const trackedDays = entries.filter(entry => {
      const entryDate = parseISO(entry.date);
      return entryDate >= start && entryDate <= today;
    }).length;

    const consistencyPercent = totalDays > 0 ? (trackedDays / totalDays) * 100 : 0;

    return {
      totalDays,
      trackedDays,
      missedDays: Math.max(0, totalDays - trackedDays),
      consistencyPercent,
    };
  }, [entries, startDate]);

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="card-elevated p-6">
      <h2 className="font-display text-2xl font-black text-anthracite dark:text-white mb-6">Tracking Consistency</h2>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-4 text-center border border-emerald-100 dark:border-emerald-900/30">
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.trackedDays}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Days Tracked</div>
        </div>
        <div className="bg-red-50 dark:bg-red-950/30 rounded-xl p-4 text-center border border-red-100 dark:border-red-900/30">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.missedDays}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Days Missed</div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-4 text-center border border-blue-100 dark:border-blue-900/30">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {stats.consistencyPercent.toFixed(0)}%
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Consistency</div>
        </div>
      </div>

      {/* Calendar */}
      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-1 min-w-full">
          {/* Week day labels */}
          <div className="flex gap-1 mb-2">
            <div className="w-6" /> {/* Spacer for alignment */}
            {weekDays.map((day, i) => (
              <div key={i} className="w-3 text-xs text-gray-500 dark:text-gray-400 text-center">
                {day}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {calendarData.weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex gap-1">
              {week.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  className={`w-3 h-3 rounded-sm cursor-pointer transition-all ${getDayColor(day)}`}
                  title={getTooltip(day)}
                />
              ))}
              {/* Fill remaining days of incomplete week */}
              {week.length < 7 &&
                Array.from({ length: 7 - week.length }).map((_, i) => (
                  <div key={`empty-${i}`} className="w-3 h-3" />
                ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-6 text-xs text-gray-600 dark:text-gray-400">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 bg-gray-200 dark:bg-gray-700 rounded-sm" title="Future" />
          <div className="w-3 h-3 bg-red-200 dark:bg-red-900/50 rounded-sm" title="Missed" />
          <div className="w-3 h-3 bg-emerald-500 dark:bg-emerald-600 rounded-sm" title="Tracked" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
};
