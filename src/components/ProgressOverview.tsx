import React from 'react';
import { Target, Rocket, TrendingDown, Trophy } from 'lucide-react';
import { Statistics } from '../types';
import { formatWeight, formatWeightLoss, formatPercentage } from '../utils/calculations';

interface ProgressOverviewProps {
  stats: Statistics;
  targetWeight: number;
}

const ProgressOverviewComponent: React.FC<ProgressOverviewProps> = ({ stats, targetWeight }) => {
  return (
    <div className="space-y-6">
      {/* Hero Stats */}
      <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 dark:from-emerald-600 dark:via-teal-600 dark:to-cyan-600 rounded-3xl p-8 text-white shadow-floating hover:shadow-prominent transition-all duration-300">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-black mb-2">Your Journey</h1>
            <p className="text-green-100 text-lg">
              {stats.progress.daysRemaining} days to go
            </p>
          </div>
          {stats.target.onTrack && (
            <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium">
              ✨ On Track!
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-white/80 text-xs uppercase tracking-wider font-semibold mb-1">Current</div>
            <div className="font-display text-4xl font-black">{formatWeight(stats.current.weight)}</div>
          </div>
          <div>
            <div className="text-white/80 text-xs uppercase tracking-wider font-semibold mb-1">Goal</div>
            <div className="font-display text-4xl font-black">{formatWeight(targetWeight)}</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-8">
          <div className="flex justify-between text-sm mb-2.5">
            <span className="text-white/80 font-medium">Progress</span>
            <span className="font-black font-display text-lg">{formatPercentage(stats.progress.percentageComplete)}</span>
          </div>
          <div className="h-3 bg-white/20 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-white rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(255,255,255,0.5)]"
              style={{ width: `${Math.min(stats.progress.percentageComplete, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Lost */}
        <div className="card-elevated p-6 group">
          <div className="flex items-center justify-between mb-4">
            <div className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider font-bold">Weight Lost</div>
            <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-pink-500/20 group-hover:scale-110 transition-transform">
              <Target className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
          </div>
          <div className="font-display text-3xl font-black text-anthracite dark:text-white mb-1">
            {formatWeight(stats.progress.totalLost)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {formatPercentage(stats.progress.percentageComplete)} complete
          </div>
        </div>

        {/* Remaining */}
        <div className="card-elevated p-6 group">
          <div className="flex items-center justify-between mb-4">
            <div className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider font-bold">To Go</div>
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-110 transition-transform">
              <Rocket className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
          </div>
          <div className="font-display text-3xl font-black text-anthracite dark:text-white mb-1">
            {formatWeight(stats.progress.remaining)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {stats.progress.daysRemaining} days remaining
          </div>
        </div>

        {/* Avg Loss Rate */}
        <div className="card-elevated p-6 group">
          <div className="flex items-center justify-between mb-4">
            <div className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider font-bold">Weekly Avg</div>
            <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-600/20 group-hover:scale-110 transition-transform">
              <TrendingDown className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
          </div>
          <div className="font-display text-3xl font-black text-anthracite dark:text-white mb-1">
            {formatWeightLoss(stats.averages.weekly)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {formatWeightLoss(stats.averages.daily)}/day
          </div>
        </div>
      </div>

      {/* Projection Card */}
      <div className="bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-500 dark:from-cyan-600 dark:via-blue-600 dark:to-purple-600 rounded-3xl p-6 shadow-floating hover:shadow-prominent text-white transition-all duration-300">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-display text-xl mb-3 flex items-center gap-2.5">
              {stats.target.onTrack ? (
                <>
                  <Trophy className="w-6 h-6 text-yellow-300" strokeWidth={2.5} />
                  <span>You're ahead of schedule!</span>
                </>
              ) : (
                <>
                  <Rocket className="w-6 h-6 text-white" strokeWidth={2.5} />
                  <span>Time to push harder!</span>
                </>
              )}
            </h3>
            <p className="text-white/90 mb-4 text-base">
              At your current pace, you'll reach your goal on{' '}
              <span className="font-black font-display text-white text-lg">{stats.target.projectedEndDate}</span>
            </p>
            <div className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-sm font-medium">
              {stats.target.onTrack
                ? `🚀 ${Math.abs(Math.round(stats.target.daysAheadBehind))} days ahead of target!`
                : `⚡ Increase pace by ${formatWeightLoss(
                  Math.abs(stats.target.requiredWeeklyLoss - stats.averages.weekly)
                )}/week`}
            </div>
          </div>
          <div className="hidden sm:flex w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl items-center justify-center ml-4 shadow-xl border border-white/20">
            {stats.target.onTrack ? (
              <Trophy className="w-10 h-10 text-white" strokeWidth={2} />
            ) : (
              <Rocket className="w-10 h-10 text-white" strokeWidth={2} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export const ProgressOverview = React.memo(ProgressOverviewComponent);
