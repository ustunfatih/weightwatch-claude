import { useState } from 'react';
import { motion } from 'framer-motion';
import { Award } from 'lucide-react';
import { Achievement } from '../types/achievements';
import { AchievementBadge } from './AchievementBadge';
import { getAchievementStats } from '../services/achievementService';
import { Modal } from './Modal';

interface AchievementsGalleryProps {
  achievements: Achievement[];
}

export const AchievementsGallery = ({ achievements }: AchievementsGalleryProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const stats = getAchievementStats(achievements);

  const filteredAchievements = achievements.filter(achievement => {
    if (filter === 'unlocked' && !achievement.isUnlocked) return false;
    if (filter === 'locked' && achievement.isUnlocked) return false;
    if (categoryFilter !== 'all' && achievement.category !== categoryFilter) return false;
    return true;
  });

  return (
    <>
      {/* Trigger Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Award className="w-5 h-5" />
        <span>Achievements</span>
        <div className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
          {stats.unlocked}/{stats.total}
        </div>
      </motion.button>

      {/* Gallery Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Your Achievements"
      >
        <div className="space-y-6">
          {/* Stats Overview */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-xl p-4 border border-purple-100 dark:border-purple-900/30">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-bold text-anthracite dark:text-white">
                  Progress Overview
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {stats.unlocked} of {stats.total} achievements unlocked
                </p>
              </div>
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {stats.percentComplete.toFixed(0)}%
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                initial={{ width: 0 }}
                animate={{ width: `${stats.percentComplete}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-3">
            {/* Status Filter */}
            <div className="flex gap-2">
              {['all', 'unlocked', 'locked'].map(option => (
                <button
                  key={option}
                  onClick={() => setFilter(option as any)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    filter === option
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </button>
              ))}
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 flex-wrap">
              {['all', 'milestone', 'consistency', 'progress', 'special'].map(category => (
                <button
                  key={category}
                  onClick={() => setCategoryFilter(category)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    categoryFilter === category
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                  {category !== 'all' && (
                    <span className="ml-1 opacity-70">
                      ({stats.byCategory[category]?.unlocked || 0}/
                      {stats.byCategory[category]?.total || 0})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Achievements Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
            {filteredAchievements.map((achievement, index) => (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3"
              >
                <AchievementBadge
                  achievement={achievement}
                  size="medium"
                  showDetails={true}
                />
              </motion.div>
            ))}
          </div>

          {/* Empty State */}
          {filteredAchievements.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Award className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No achievements found with current filters</p>
            </div>
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
