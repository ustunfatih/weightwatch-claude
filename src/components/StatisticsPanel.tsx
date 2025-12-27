import React, { useState } from 'react';
import { format } from 'date-fns';
import { Trophy, Flame, Star, CheckCircle, Zap } from 'lucide-react';
import { Statistics } from '../types';
import { formatWeightLoss } from '../utils/calculations';

interface StatisticsPanelProps {
  stats: Statistics;
}

type TimeFrame = 'daily' | 'weekly' | 'monthly';

const StatisticsPanelComponent: React.FC<StatisticsPanelProps> = ({ stats }) => {
  const [selectedFrame, setSelectedFrame] = useState<TimeFrame>('weekly');

  const timeFrames: { value: TimeFrame; label: string }[] = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
  ];

  const getCurrentValue = () => {
    switch (selectedFrame) {
      case 'daily':
        return stats.averages.daily;
      case 'weekly':
        return stats.averages.weekly;
      case 'monthly':
        return stats.averages.monthly;
    }
  };

  const getRequiredValue = () => {
    switch (selectedFrame) {
      case 'daily':
        return stats.target.requiredDailyLoss;
      case 'weekly':
        return stats.target.requiredWeeklyLoss;
      case 'monthly':
        return stats.target.requiredWeeklyLoss * 4;
    }
  };

  const currentValue = getCurrentValue();
  const requiredValue = getRequiredValue();
  const isAhead = Math.abs(currentValue) >= Math.abs(requiredValue);

  return (
    <div className="card-elevated p-6">
      <h2 className="font-display text-2xl font-black text-anthracite dark:text-white mb-6">Performance Breakdown</h2>

      {/* Time Frame Selector */}
      <div className="flex gap-2 mb-6 bg-gray-50 dark:bg-gray-800 p-1 rounded-2xl border border-gray-200 dark:border-gray-700">
        {timeFrames.map((frame) => (
          <button
            key={frame.value}
            onClick={() => setSelectedFrame(frame.value)}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${selectedFrame === frame.value
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/30'
              : 'text-gray-600 dark:text-gray-400 hover:text-anthracite dark:hover:text-white'
              }`}
          >
            {frame.label}
          </button>
        ))}
      </div>

      {/* Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-2xl p-5 border border-emerald-100 dark:border-emerald-900/30">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Your Actual</div>
          <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">{formatWeightLoss(currentValue)}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Average per {selectedFrame.slice(0, -2)}</div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/30 rounded-2xl p-5 border border-orange-100 dark:border-orange-900/30">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Target Required</div>
          <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-2">
            {formatWeightLoss(requiredValue)}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Needed per {selectedFrame.slice(0, -2)}</div>
        </div>
      </div>

      {/* Status Indicator */}
      <div
        className={`rounded-2xl p-5 transition-all ${isAhead
          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-400 dark:border-emerald-600'
          : 'bg-orange-50 dark:bg-orange-950/30 border-2 border-orange-400 dark:border-orange-600'
          }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${isAhead
              ? 'bg-gradient-to-br from-emerald-500 to-teal-500'
              : 'bg-gradient-to-br from-orange-500 to-orange-600'
              }`}
          >
            {isAhead ? (
              <CheckCircle className="w-6 h-6 text-white" strokeWidth={2.5} />
            ) : (
              <Zap className="w-6 h-6 text-white" strokeWidth={2.5} />
            )}
          </div>
          <div className="flex-1">
            <div className="font-bold text-anthracite dark:text-white">
              {isAhead ? 'Exceeding Target!' : 'Below Target Pace'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {isAhead
                ? `You're losing ${formatWeightLoss(Math.abs(currentValue) - Math.abs(requiredValue))} more than needed`
                : `Need to increase by ${formatWeightLoss(Math.abs(requiredValue) - Math.abs(currentValue))}`}
            </div>
          </div>
        </div>
      </div>

      {/* Performance Highlights */}
      <div className="mt-6 space-y-3">
        <h3 className="font-bold text-anthracite dark:text-white">Performance Highlights</h3>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 rounded-xl p-4 flex items-center gap-3 border border-purple-100 dark:border-purple-900/30 hover:shadow-md transition-all">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
            <Trophy className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div className="flex-1">
            <div className="text-sm text-gray-600 dark:text-gray-400">Best Single Drop</div>
            <div className="font-bold text-anthracite dark:text-white">
              {formatWeightLoss(Math.abs(stats.performance.bestDay.loss))} on{' '}
              {format(new Date(stats.performance.bestDay.date), 'MMM dd')}
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-xl p-4 flex items-center gap-3 border border-cyan-100 dark:border-cyan-900/30 hover:shadow-md transition-all">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-full flex items-center justify-center shadow-lg">
            <Flame className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div className="flex-1">
            <div className="text-sm text-gray-600 dark:text-gray-400">Longest Streak</div>
            <div className="font-bold text-anthracite dark:text-white">{stats.performance.longestStreak} days</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 rounded-xl p-4 flex items-center gap-3 border border-yellow-100 dark:border-yellow-900/30 hover:shadow-md transition-all">
          <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
            <Star className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div className="flex-1">
            <div className="text-sm text-gray-600 dark:text-gray-400">Best Week</div>
            <div className="font-bold text-anthracite dark:text-white">
              {formatWeightLoss(Math.abs(stats.performance.bestWeek.loss))} (Week of{' '}
              {format(new Date(stats.performance.bestWeek.weekStart), 'MMM dd')})
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export const StatisticsPanel = React.memo(StatisticsPanelComponent);
