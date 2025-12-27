import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Calendar, TrendingDown, Check, X } from 'lucide-react';
import { TargetData } from '../types';
import { differenceInDays, parseISO, format } from 'date-fns';
import toast from 'react-hot-toast';
import { Modal } from './Modal';

interface GoalSimulatorProps {
  currentWeight: number;
  currentTargetData: TargetData;
  onUpdateTarget: (newTarget: Partial<TargetData>) => void;
}

export const GoalSimulator = ({
  currentWeight,
  currentTargetData,
  onUpdateTarget,
}: GoalSimulatorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [targetWeight, setTargetWeight] = useState(currentTargetData.endWeight);
  const [targetDate, setTargetDate] = useState(currentTargetData.endDate);

  // Calculate derived values
  const [calculations, setCalculations] = useState({
    totalToLose: 0,
    daysRemaining: 0,
    requiredDailyLoss: 0,
    requiredWeeklyLoss: 0,
    originalDailyLoss: 0,
    originalWeeklyLoss: 0,
  });

  useEffect(() => {
    // Calculate for new target
    const totalToLose = currentWeight - targetWeight;
    const daysRemaining = differenceInDays(parseISO(targetDate), new Date());
    const requiredDailyLoss = daysRemaining > 0 ? totalToLose / daysRemaining : 0;
    const requiredWeeklyLoss = requiredDailyLoss * 7;

    // Calculate for original target
    const originalTotalToLose = currentWeight - currentTargetData.endWeight;
    const originalDaysRemaining = differenceInDays(
      parseISO(currentTargetData.endDate),
      new Date()
    );
    const originalDailyLoss =
      originalDaysRemaining > 0 ? originalTotalToLose / originalDaysRemaining : 0;
    const originalWeeklyLoss = originalDailyLoss * 7;

    setCalculations({
      totalToLose,
      daysRemaining,
      requiredDailyLoss,
      requiredWeeklyLoss,
      originalDailyLoss,
      originalWeeklyLoss,
    });
  }, [targetWeight, targetDate, currentWeight, currentTargetData]);

  const handleApplyChanges = () => {
    // Validate inputs
    if (targetWeight >= currentWeight) {
      toast.error('Target weight must be less than current weight');
      return;
    }

    if (targetWeight < 40) {
      toast.error('Target weight seems too low. Please enter a realistic value.');
      return;
    }

    if (calculations.daysRemaining <= 0) {
      toast.error('Target date must be in the future');
      return;
    }

    // Update target data
    const newTarget: Partial<TargetData> = {
      endWeight: targetWeight,
      endDate: targetDate,
      totalDuration: differenceInDays(parseISO(targetDate), parseISO(currentTargetData.startDate)),
      totalKg: currentTargetData.startWeight - targetWeight,
    };

    onUpdateTarget(newTarget);
    toast.success('Goal updated successfully!');
    setIsOpen(false);
  };

  const getDifficultyLevel = (dailyLoss: number): { label: string; color: string } => {
    if (dailyLoss < 0.1) return { label: 'Very Easy', color: 'text-green-600 dark:text-green-400' };
    if (dailyLoss < 0.2) return { label: 'Easy', color: 'text-emerald-600 dark:text-emerald-400' };
    if (dailyLoss < 0.3) return { label: 'Moderate', color: 'text-yellow-600 dark:text-yellow-400' };
    if (dailyLoss < 0.5) return { label: 'Challenging', color: 'text-orange-600 dark:text-orange-400' };
    return { label: 'Very Difficult', color: 'text-red-600 dark:text-red-400' };
  };

  const currentDifficulty = getDifficultyLevel(calculations.originalDailyLoss);
  const newDifficulty = getDifficultyLevel(calculations.requiredDailyLoss);

  return (
    <>
      {/* Trigger Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-orange-500/50 transition-all"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Target className="w-5 h-5" />
        <span>Adjust Goal</span>
      </motion.button>

      {/* Simulator Modal */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Goal Simulator">
        <div className="space-y-6">
          {/* Current Progress Info */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-xl p-4 border border-emerald-100 dark:border-emerald-900/30">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Current Weight</div>
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {currentWeight.toFixed(1)} kg
            </div>
          </div>

          {/* Target Weight Slider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Target className="inline w-4 h-4 mr-2" />
              Target Weight
            </label>
            <div className="space-y-3">
              <input
                type="range"
                min={40}
                max={currentWeight - 1}
                step={0.1}
                value={targetWeight}
                onChange={e => setTargetWeight(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex items-center justify-between">
                <input
                  type="number"
                  value={targetWeight}
                  onChange={e => setTargetWeight(parseFloat(e.target.value))}
                  step={0.1}
                  className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-anthracite dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-2xl font-bold text-anthracite dark:text-white">
                  {targetWeight.toFixed(1)} kg
                </span>
              </div>
            </div>
          </div>

          {/* Target Date Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="inline w-4 h-4 mr-2" />
              Target Date
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-anthracite dark:text-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Comparison */}
          <div className="grid grid-cols-2 gap-4">
            {/* Current Plan */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
                Current Plan
              </div>
              <div className="space-y-2">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-500">Daily Loss</div>
                  <div className="text-lg font-bold text-gray-700 dark:text-gray-300">
                    {calculations.originalDailyLoss.toFixed(2)} kg
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-500">Weekly Loss</div>
                  <div className="text-lg font-bold text-gray-700 dark:text-gray-300">
                    {calculations.originalWeeklyLoss.toFixed(2)} kg
                  </div>
                </div>
                <div className={`text-sm font-semibold ${currentDifficulty.color}`}>
                  {currentDifficulty.label}
                </div>
              </div>
            </div>

            {/* New Plan */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-xl p-4 border-2 border-emerald-200 dark:border-emerald-800">
              <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-3">
                New Plan
              </div>
              <div className="space-y-2">
                <div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Daily Loss</div>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {calculations.requiredDailyLoss.toFixed(2)} kg
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Weekly Loss</div>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {calculations.requiredWeeklyLoss.toFixed(2)} kg
                  </div>
                </div>
                <div className={`text-sm font-semibold ${newDifficulty.color}`}>
                  {newDifficulty.label}
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-4 border border-blue-100 dark:border-blue-900/30">
            <div className="flex items-start gap-3">
              <TrendingDown className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                <p>
                  To reach <strong>{targetWeight.toFixed(1)} kg</strong> by{' '}
                  <strong>{format(parseISO(targetDate), 'MMM dd, yyyy')}</strong>, you need to lose{' '}
                  <strong>{calculations.totalToLose.toFixed(1)} kg</strong> over{' '}
                  <strong>{calculations.daysRemaining} days</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleApplyChanges}
              className="btn-primary flex-1 flex items-center justify-center gap-2.5"
            >
              <Check className="w-5 h-5" strokeWidth={2.5} />
              <span className="font-display font-black">Apply Changes</span>
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="btn-secondary px-5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
