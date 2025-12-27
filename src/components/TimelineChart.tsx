import React, { useMemo, useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import { WeightEntry, TargetData } from '../types';
import { format, parseISO, startOfWeek, startOfMonth, differenceInDays, addDays } from 'date-fns';

interface TimelineChartProps {
  entries: WeightEntry[];
  targetData: TargetData;
}

interface ChartDataPoint {
  date: string;
  fullDate: string;
  weight: number | null;
  target: number;
}

type ViewMode = 'daily' | 'weekly' | 'monthly';

const STORAGE_KEY = 'weightwatch-timeline-view';

export const TimelineChart: React.FC<TimelineChartProps> = ({ entries, targetData }) => {
  // Load saved view preference from localStorage
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved as ViewMode) || 'daily';
  });

  // Save view preference when it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, viewMode);
  }, [viewMode]);

  // Memoize chart data generation based on view mode
  const chartData = useMemo<ChartDataPoint[]>(() => {
    const startDate = parseISO(targetData.startDate);
    const endDate = parseISO(targetData.endDate);
    const dailyTargetLoss = targetData.totalKg / targetData.totalDuration;

    // Sort entries by date
    const sortedEntries = [...entries].sort(
      (a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()
    );

    // Helper function to calculate target weight for any date
    const calculateTargetForDate = (date: Date): number => {
      const daysFromStart = differenceInDays(date, startDate);
      return targetData.startWeight - (dailyTargetLoss * daysFromStart);
    };

    let dataPoints: ChartDataPoint[] = [];

    if (viewMode === 'daily') {
      // Daily view: Need to merge actual data with evenly-spaced target points
      // Strategy: Create all necessary points to ensure both lines render properly

      const allPoints = new Map<string, ChartDataPoint>();

      // Add all actual weight entries
      sortedEntries.forEach(entry => {
        allPoints.set(entry.date, {
          date: format(parseISO(entry.date), 'MMM dd'),
          fullDate: entry.date,
          weight: entry.weight,
          target: calculateTargetForDate(parseISO(entry.date)),
        });
      });

      // Explicitly ensure start and end dates are included for straight target line
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      if (!allPoints.has(startDateStr)) {
        allPoints.set(startDateStr, {
          date: format(startDate, 'MMM dd'),
          fullDate: startDateStr,
          weight: null,
          target: calculateTargetForDate(startDate),
        });
      }

      if (!allPoints.has(endDateStr)) {
        allPoints.set(endDateStr, {
          date: format(endDate, 'MMM dd'),
          fullDate: endDateStr,
          weight: null,
          target: calculateTargetForDate(endDate),
        });
      }

      // Add evenly-spaced points for straight target line (every 3 days from start to end)
      let currentDate = startDate;
      while (currentDate <= endDate) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        if (!allPoints.has(dateStr)) {
          allPoints.set(dateStr, {
            date: format(currentDate, 'MMM dd'),
            fullDate: dateStr,
            weight: null,
            target: calculateTargetForDate(currentDate),
          });
        }
        currentDate = addDays(currentDate, 3);
      }

      // Convert to array and sort by date
      dataPoints = Array.from(allPoints.values()).sort((a, b) =>
        a.fullDate.localeCompare(b.fullDate)
      );

      // Ensure the very last point is exactly at endDate for perfect target line
      const lastPoint = dataPoints[dataPoints.length - 1];
      if (lastPoint && lastPoint.fullDate !== format(endDate, 'yyyy-MM-dd')) {
        dataPoints.push({
          date: format(endDate, 'MMM dd'),
          fullDate: format(endDate, 'yyyy-MM-dd'),
          weight: null,
          target: calculateTargetForDate(endDate),
        });
      }

    } else if (viewMode === 'weekly') {
      // Weekly view: Group by week, use last entry of each week
      const weekMap = new Map<string, WeightEntry>();

      sortedEntries.forEach((entry) => {
        const weekStart = startOfWeek(parseISO(entry.date), { weekStartsOn: 0 }); // Sunday
        const weekKey = format(weekStart, 'yyyy-MM-dd');
        weekMap.set(weekKey, entry); // Last entry wins
      });

      // Generate all weekly points from start to end for straight target line
      const allWeeks = new Set<string>();
      let currentWeek = startOfWeek(startDate, { weekStartsOn: 0 });
      const endWeek = startOfWeek(endDate, { weekStartsOn: 0 });

      // Include all weeks from start to the week containing the end date
      while (currentWeek <= endWeek) {
        allWeeks.add(format(currentWeek, 'yyyy-MM-dd'));
        currentWeek = addDays(currentWeek, 7);
      }

      // Create data points with explicit start and end dates
      const sortedWeeks = Array.from(allWeeks).sort();
      dataPoints = sortedWeeks.map((weekKey, index) => {
        const entry = weekMap.get(weekKey);
        const weekDate = parseISO(weekKey);

        // For first and last points, use exact start/end dates for target calculation
        let targetDate = weekDate;
        if (index === 0) targetDate = startDate;
        if (index === sortedWeeks.length - 1) targetDate = endDate;

        return {
          date: format(weekDate, 'MMM dd'),
          fullDate: entry?.date || weekKey,
          weight: entry?.weight || null,
          target: calculateTargetForDate(targetDate),
        };
      });

      // Explicitly add final point at exact endDate to ensure target line extends fully
      const endDateStr = format(endDate, 'yyyy-MM-dd');
      const lastWeekPoint = dataPoints[dataPoints.length - 1];
      if (lastWeekPoint && lastWeekPoint.fullDate !== endDateStr) {
        dataPoints.push({
          date: format(endDate, 'MMM dd'),
          fullDate: endDateStr,
          weight: null,
          target: calculateTargetForDate(endDate),
        });
      }

    } else {
      // Monthly view: Group by month, use last entry of each month
      const monthMap = new Map<string, WeightEntry>();

      sortedEntries.forEach((entry) => {
        const monthStart = startOfMonth(parseISO(entry.date));
        const monthKey = format(monthStart, 'yyyy-MM');
        monthMap.set(monthKey, entry); // Last entry wins
      });

      // Generate all monthly points from start to end for straight target line
      const allMonths = new Set<string>();
      let currentMonth = startOfMonth(startDate);
      const endMonth = startOfMonth(endDate);

      // Include all months from start to the month containing the end date
      while (currentMonth <= endMonth) {
        allMonths.add(format(currentMonth, 'yyyy-MM'));
        currentMonth = new Date(currentMonth);
        currentMonth.setMonth(currentMonth.getMonth() + 1);
      }

      // Create data points with explicit start and end dates
      const sortedMonths = Array.from(allMonths).sort();
      dataPoints = sortedMonths.map((monthKey, index) => {
        const entry = monthMap.get(monthKey);
        const monthDate = parseISO(monthKey + '-01');

        // For first and last points, use exact start/end dates for target calculation
        let targetDate = monthDate;
        if (index === 0) targetDate = startDate;
        if (index === sortedMonths.length - 1) targetDate = endDate;

        return {
          date: format(monthDate, 'MMM yyyy'),
          fullDate: entry?.date || format(monthDate, 'yyyy-MM-dd'),
          weight: entry?.weight || null,
          target: calculateTargetForDate(targetDate),
        };
      });

      // Explicitly add final point at exact endDate to ensure target line extends fully
      const endDateStr = format(endDate, 'yyyy-MM-dd');
      const lastMonthPoint = dataPoints[dataPoints.length - 1];
      if (lastMonthPoint && lastMonthPoint.fullDate !== endDateStr) {
        dataPoints.push({
          date: format(endDate, 'MMM dd, yyyy'),
          fullDate: endDateStr,
          weight: null,
          target: calculateTargetForDate(endDate),
        });
      }
    }

    return dataPoints;
  }, [entries, targetData, viewMode]);

  const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ChartDataPoint;

      // Find previous entry for change calculation
      const currentIndex = chartData.findIndex(d => d.fullDate === data.fullDate);
      const previousData = currentIndex > 0 ? chartData[currentIndex - 1] : null;

      // Calculate weight change
      const weightChange = data.weight && previousData?.weight
        ? data.weight - previousData.weight
        : null;

      // Calculate BMI if weight exists
      const bmi = data.weight ? (data.weight / ((targetData.height / 100) ** 2)) : null;

      // Calculate difference from target
      const targetDiff = data.weight ? data.weight - data.target : null;

      // Count days since start for this entry
      const daysSinceStart = data.weight
        ? differenceInDays(parseISO(data.fullDate), parseISO(targetData.startDate))
        : null;

      return (
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm p-4 rounded-2xl shadow-2xl border-2 border-emerald-200 dark:border-emerald-800 min-w-[220px] animate-in fade-in zoom-in duration-200">
          {/* Date Header */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {format(parseISO(data.fullDate), 'EEE, MMM dd, yyyy')}
            </p>
            {daysSinceStart !== null && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Day {daysSinceStart + 1}
              </p>
            )}
          </div>

          {/* Weight Info */}
          {data.weight ? (
            <div className="space-y-2">
              {/* Actual Weight with Trend */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-400">Actual:</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {data.weight.toFixed(1)} kg
                  </span>
                  {weightChange !== null && (
                    <span className={`text-xs font-semibold flex items-center ${weightChange < 0
                      ? 'text-green-600 dark:text-green-400'
                      : weightChange > 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-600'
                      }`}>
                      {weightChange < 0 ? '↓' : weightChange > 0 ? '↑' : '→'}
                      {Math.abs(weightChange).toFixed(2)} kg
                    </span>
                  )}
                </div>
              </div>

              {/* Target Weight */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-400">Target:</span>
                <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                  {data.target.toFixed(1)} kg
                </span>
              </div>

              {/* Difference from Target */}
              {targetDiff !== null && (
                <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-xs text-gray-600 dark:text-gray-400">vs Target:</span>
                  <span className={`text-xs font-semibold ${targetDiff < 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-orange-600 dark:text-orange-400'
                    }`}>
                    {targetDiff < 0 ? '✓ ' : ''}{Math.abs(targetDiff).toFixed(1)} kg {
                      targetDiff < 0 ? 'ahead' : 'behind'
                    }
                  </span>
                </div>
              )}

              {/* BMI */}
              {bmi !== null && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-gray-600 dark:text-gray-400">BMI:</span>
                  <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                    {bmi.toFixed(1)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* Target Line Only */
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">Target:</span>
              <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                {data.target.toFixed(1)} kg
              </span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const viewModes: { value: ViewMode; label: string }[] = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
  ];

  // Calculate x-axis tick interval based on data length
  const tickInterval = useMemo(() => {
    const dataLength = chartData.length;
    if (viewMode === 'daily') {
      // Show every 3rd or 4th tick in daily view
      return Math.ceil(dataLength / 10);
    } else if (viewMode === 'weekly') {
      // Show every 2nd tick in weekly view
      return Math.ceil(dataLength / 15);
    } else {
      // Show all ticks in monthly view
      return 1;
    }
  }, [chartData.length, viewMode]);

  // Calculate dynamic Y-axis domain based on data
  const yAxisDomain = useMemo(() => {
    const weights = chartData
      .map(d => d.weight)
      .filter((w): w is number => w !== null);

    const targets = chartData.map(d => d.target);
    const allValues = [...weights, ...targets];

    if (allValues.length === 0) {
      return [70, 120];
    }

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);

    // Add 5% padding above and below
    const padding = (max - min) * 0.1;
    const yMin = Math.floor(min - padding);
    const yMax = Math.ceil(max + padding);

    // Ensure minimum range of 20kg for better visualization
    const range = yMax - yMin;
    if (range < 20) {
      const midpoint = (yMin + yMax) / 2;
      return [Math.floor(midpoint - 10), Math.ceil(midpoint + 10)];
    }

    return [yMin, yMax];
  }, [chartData]);

  // Generate nice ticks for Y-axis
  const yAxisTicks = useMemo(() => {
    const [min, max] = yAxisDomain;
    const range = max - min;
    const step = range > 40 ? 10 : 5;

    const ticks: number[] = [];
    for (let i = Math.ceil(min / step) * step; i <= max; i += step) {
      ticks.push(i);
    }

    return ticks;
  }, [yAxisDomain]);

  return (
    <div className="card-elevated h-full p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl font-black text-anthracite dark:text-white">Weight Timeline</h2>

          {/* View Mode Selector */}
          <div className="flex gap-2 bg-gray-50 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
            {viewModes.map((mode) => (
              <button
                key={mode.value}
                onClick={() => setViewMode(mode.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === mode.value
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/30'
                  : 'text-gray-600 dark:text-gray-400 hover:text-anthracite dark:hover:text-white'
                  }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-emerald-600 rounded-full" />
            <span className="text-gray-600 dark:text-gray-400">Actual</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-orange-600 rounded-full border-2 border-orange-600 border-dashed" />
            <span className="text-gray-600 dark:text-gray-400">Target Pace</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="date"
            stroke="#9CA3AF"
            tick={{ fill: '#6B7280', fontSize: 12 }}
            tickLine={false}
            interval={tickInterval}
          />
          <YAxis
            stroke="#9CA3AF"
            tick={{ fill: '#6B7280', fontSize: 12 }}
            tickLine={false}
            domain={yAxisDomain}
            ticks={yAxisTicks}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Target trajectory line (dashed) - MUST be linear for straight line */}
          <Line
            type="linear"
            dataKey="target"
            stroke="#FB8C00"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            activeDot={{ r: 4, fill: '#FB8C00' }}
          />

          {/* Actual weight line - connects all actual data points */}
          <Line
            type="monotone"
            dataKey="weight"
            stroke="#43A047"
            strokeWidth={3}
            dot={{ fill: '#43A047', r: 4 }}
            activeDot={{ r: 6, fill: '#66BB6A' }}
            connectNulls={true}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Milestone markers */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-xl p-4 border border-emerald-100 dark:border-emerald-900/30">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Starting Weight</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{targetData.startWeight} kg</div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/30 rounded-xl p-4 border border-orange-100 dark:border-orange-900/30">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Weight</div>
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {entries[entries.length - 1].weight} kg
          </div>
        </div>
      </div>
    </div>
  );
};
