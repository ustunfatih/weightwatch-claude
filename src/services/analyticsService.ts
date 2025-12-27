import { WeightEntry, TargetData } from '../types';
import { differenceInDays, format, parseISO, subDays, startOfWeek, endOfWeek } from 'date-fns';

export interface MovingAverageData {
  date: string;
  weight: number;
  ma7: number;
  ma14: number;
  ma30: number;
}

export interface TrendAnalysis {
  trend: 'accelerating' | 'steady' | 'slowing' | 'plateauing';
  confidence: number;
  message: string;
}

export interface DateRangeFilter {
  startDate: string;
  endDate: string;
}

export interface BodyComposition {
  date: string;
  weight: number;
  bodyFatPercentage?: number;
  muscleMass?: number;
  bmi: number;
}

export interface ComparisonMetric {
  name: string;
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  unit: string;
}

// Calculate moving averages
export function calculateMovingAverages(
  entries: WeightEntry[]
): MovingAverageData[] {
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return sortedEntries.map((entry, index) => {
    const result: MovingAverageData = {
      date: entry.date,
      weight: entry.weight,
      ma7: entry.weight,
      ma14: entry.weight,
      ma30: entry.weight,
    };

    // Calculate 7-day MA
    if (index >= 6) {
      const last7 = sortedEntries.slice(index - 6, index + 1);
      result.ma7 = last7.reduce((sum, e) => sum + e.weight, 0) / 7;
    }

    // Calculate 14-day MA
    if (index >= 13) {
      const last14 = sortedEntries.slice(index - 13, index + 1);
      result.ma14 = last14.reduce((sum, e) => sum + e.weight, 0) / 14;
    }

    // Calculate 30-day MA
    if (index >= 29) {
      const last30 = sortedEntries.slice(index - 29, index + 1);
      result.ma30 = last30.reduce((sum, e) => sum + e.weight, 0) / 30;
    }

    return result;
  });
}

// Analyze weight loss trend
export function analyzeTrend(entries: WeightEntry[]): TrendAnalysis {
  if (entries.length < 14) {
    return {
      trend: 'steady',
      confidence: 0.5,
      message: 'Not enough data to analyze trend. Keep tracking!',
    };
  }

  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Compare recent 7 days vs previous 7 days
  const recent7 = sortedEntries.slice(-7);
  const previous7 = sortedEntries.slice(-14, -7);

  const recentAvgLoss = calculateAverageDailyLoss(recent7);
  const previousAvgLoss = calculateAverageDailyLoss(previous7);

  const difference = recentAvgLoss - previousAvgLoss;

  if (Math.abs(difference) < 0.05) {
    return {
      trend: 'steady',
      confidence: 0.8,
      message: 'Your weight loss is steady and consistent. Great job maintaining your pace!',
    };
  } else if (difference < -0.1) {
    return {
      trend: 'accelerating',
      confidence: 0.85,
      message: `Your weight loss is accelerating! You're losing ${Math.abs(difference).toFixed(2)}kg more per day than last week.`,
    };
  } else if (difference > 0.1) {
    return {
      trend: 'slowing',
      confidence: 0.85,
      message: `Your weight loss is slowing down. Consider reviewing your diet and exercise routine.`,
    };
  } else {
    // Check for plateau (less than 0.5kg loss in 2 weeks)
    const twoWeekLoss = sortedEntries[sortedEntries.length - 14].weight - sortedEntries[sortedEntries.length - 1].weight;
    if (twoWeekLoss < 0.5) {
      return {
        trend: 'plateauing',
        confidence: 0.9,
        message: 'You may be hitting a plateau. Try mixing up your routine to break through!',
      };
    }

    return {
      trend: 'steady',
      confidence: 0.75,
      message: 'Your progress is stable. Keep up the good work!',
    };
  }
}

// Calculate average daily loss for a period
function calculateAverageDailyLoss(entries: WeightEntry[]): number {
  if (entries.length < 2) return 0;

  const startWeight = entries[0].weight;
  const endWeight = entries[entries.length - 1].weight;
  const weightChange = startWeight - endWeight;

  const days = differenceInDays(
    new Date(entries[entries.length - 1].date),
    new Date(entries[0].date)
  );

  return days > 0 ? weightChange / days : 0;
}

// Filter entries by date range
export function filterByDateRange(
  entries: WeightEntry[],
  range: DateRangeFilter
): WeightEntry[] {
  const startDate = new Date(range.startDate);
  const endDate = new Date(range.endDate);

  return entries.filter(entry => {
    const entryDate = new Date(entry.date);
    return entryDate >= startDate && entryDate <= endDate;
  });
}

// Get predefined date ranges
export function getDateRangePresets(latestDate: string): Record<string, DateRangeFilter> {
  const latest = parseISO(latestDate);

  return {
    'Last 7 Days': {
      startDate: format(subDays(latest, 7), 'yyyy-MM-dd'),
      endDate: latestDate,
    },
    'Last 30 Days': {
      startDate: format(subDays(latest, 30), 'yyyy-MM-dd'),
      endDate: latestDate,
    },
    'Last 90 Days': {
      startDate: format(subDays(latest, 90), 'yyyy-MM-dd'),
      endDate: latestDate,
    },
    'This Week': {
      startDate: format(startOfWeek(latest), 'yyyy-MM-dd'),
      endDate: format(endOfWeek(latest), 'yyyy-MM-dd'),
    },
  };
}

// Compare two periods
export function comparePerformance(
  currentPeriod: WeightEntry[],
  previousPeriod: WeightEntry[]
): ComparisonMetric[] {
  const metrics: ComparisonMetric[] = [];

  // Average daily loss
  const currentDailyLoss = calculateAverageDailyLoss(currentPeriod);
  const previousDailyLoss = calculateAverageDailyLoss(previousPeriod);
  const dailyLossChange = currentDailyLoss - previousDailyLoss;

  metrics.push({
    name: 'Daily Loss Rate',
    current: Math.abs(currentDailyLoss),
    previous: Math.abs(previousDailyLoss),
    change: dailyLossChange,
    changePercent: previousDailyLoss !== 0 ? (dailyLossChange / Math.abs(previousDailyLoss)) * 100 : 0,
    unit: 'kg/day',
  });

  // Total weight lost
  const currentTotalLoss = currentPeriod.length > 0
    ? currentPeriod[0].weight - currentPeriod[currentPeriod.length - 1].weight
    : 0;
  const previousTotalLoss = previousPeriod.length > 0
    ? previousPeriod[0].weight - previousPeriod[previousPeriod.length - 1].weight
    : 0;

  metrics.push({
    name: 'Total Weight Lost',
    current: currentTotalLoss,
    previous: previousTotalLoss,
    change: currentTotalLoss - previousTotalLoss,
    changePercent: previousTotalLoss !== 0 ? ((currentTotalLoss - previousTotalLoss) / Math.abs(previousTotalLoss)) * 100 : 0,
    unit: 'kg',
  });

  // Consistency (number of entries)
  const currentConsistency = currentPeriod.length;
  const previousConsistency = previousPeriod.length;

  metrics.push({
    name: 'Tracking Consistency',
    current: currentConsistency,
    previous: previousConsistency,
    change: currentConsistency - previousConsistency,
    changePercent: previousConsistency !== 0 ? ((currentConsistency - previousConsistency) / previousConsistency) * 100 : 0,
    unit: 'entries',
  });

  return metrics;
}

// Generate insights based on data
export function generateInsights(
  entries: WeightEntry[],
  targetData: TargetData
): string[] {
  const insights: string[] = [];

  if (entries.length < 7) {
    insights.push('🎯 Keep logging your weight daily for more accurate insights!');
    return insights;
  }

  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Trend analysis
  const trend = analyzeTrend(sortedEntries);
  insights.push(`📈 ${trend.message}`);

  // Check for consistency
  const recent30Days = sortedEntries.slice(-30);
  if (recent30Days.length >= 20) {
    insights.push('✅ Excellent tracking consistency! This leads to better results.');
  } else if (recent30Days.length >= 10) {
    insights.push('👍 Good tracking consistency. Try logging more often for better insights.');
  } else {
    insights.push('📅 Track more regularly to unlock detailed insights and patterns.');
  }

  // Weekend vs weekday performance
  const weekdayEntries = sortedEntries.filter(e => {
    const day = new Date(e.date).getDay();
    return day !== 0 && day !== 6;
  });
  const weekendEntries = sortedEntries.filter(e => {
    const day = new Date(e.date).getDay();
    return day === 0 || day === 6;
  });

  if (weekdayEntries.length >= 5 && weekendEntries.length >= 2) {
    const weekdayLoss = calculateAverageDailyLoss(weekdayEntries);
    const weekendLoss = calculateAverageDailyLoss(weekendEntries);

    if (Math.abs(weekendLoss) < Math.abs(weekdayLoss) * 0.5) {
      insights.push('🎮 Weekend progress is slower. Consider planning weekend activities!');
    } else if (Math.abs(weekendLoss) > Math.abs(weekdayLoss) * 1.5) {
      insights.push('💪 Great weekend discipline! Your weekend routine is working well.');
    }
  }

  // Progress pace
  const currentWeight = sortedEntries[sortedEntries.length - 1].weight;
  const remaining = currentWeight - targetData.endWeight;
  const avgLoss = calculateAverageDailyLoss(sortedEntries);

  if (avgLoss > 0) {
    const daysToGoal = remaining / avgLoss;
    if (daysToGoal < differenceInDays(new Date(targetData.endDate), new Date())) {
      insights.push('🚀 You\'re ahead of schedule! At this pace, you\'ll reach your goal early.');
    } else if (daysToGoal > differenceInDays(new Date(targetData.endDate), new Date()) * 1.2) {
      insights.push('⚡ Consider increasing your efforts to stay on track with your goal date.');
    }
  }

  return insights;
}
