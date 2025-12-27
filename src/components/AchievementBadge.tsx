import { motion } from 'framer-motion';
import {
  Rocket,
  Flame,
  Award,
  Star,
  Crown,
  TrendingDown,
  Trophy,
  Zap,
  Sparkles,
  Target,
  PartyPopper,
  Sun,
  Badge,
  Lock,
} from 'lucide-react';
import { Achievement } from '../types/achievements';
import { format, parseISO } from 'date-fns';

interface AchievementBadgeProps {
  achievement: Achievement;
  size?: 'small' | 'medium' | 'large';
  showDetails?: boolean;
}

const iconMap: Record<string, any> = {
  Rocket,
  Flame,
  Award,
  Star,
  Crown,
  TrendingDown,
  Trophy,
  Zap,
  Sparkles,
  Target,
  PartyPopper,
  Sun,
  Badge,
};

const categoryColors = {
  milestone: 'from-purple-500 to-pink-500',
  consistency: 'from-orange-500 to-red-500',
  progress: 'from-emerald-500 to-teal-500',
  special: 'from-blue-500 to-cyan-500',
};

export const AchievementBadge = ({
  achievement,
  size = 'medium',
  showDetails = false,
}: AchievementBadgeProps) => {
  const Icon = iconMap[achievement.icon] || Badge;
  const isLocked = !achievement.isUnlocked;

  const sizeClasses = {
    small: 'w-12 h-12',
    medium: 'w-16 h-16',
    large: 'w-24 h-24',
  };

  const iconSizes = {
    small: 'w-6 h-6',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
  };

  return (
    <motion.div
      className={`flex flex-col items-center gap-2 ${showDetails ? 'p-4' : ''}`}
      whileHover={{ scale: 1.05 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      {/* Badge Circle */}
      <div className="relative">
        <motion.div
          className={`${sizeClasses[size]} rounded-full flex items-center justify-center ${
            isLocked
              ? 'bg-gray-200 dark:bg-gray-700'
              : `bg-gradient-to-br ${categoryColors[achievement.category]} shadow-lg`
          }`}
          animate={
            !isLocked
              ? {
                  boxShadow: [
                    '0 0 0 0 rgba(16, 185, 129, 0)',
                    '0 0 0 10px rgba(16, 185, 129, 0)',
                  ],
                }
              : {}
          }
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: 'loop',
          }}
        >
          {isLocked ? (
            <Lock className={`${iconSizes[size]} text-gray-400 dark:text-gray-500`} />
          ) : (
            <Icon className={`${iconSizes[size]} text-white`} strokeWidth={2.5} />
          )}
        </motion.div>

        {/* Unlock Date Badge */}
        {!isLocked && achievement.unlockedAt && showDetails && (
          <div className="absolute -bottom-2 -right-2 bg-white dark:bg-gray-800 rounded-full px-2 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border-2 border-emerald-500 shadow-md">
            {format(parseISO(achievement.unlockedAt), 'MMM dd')}
          </div>
        )}
      </div>

      {/* Details */}
      {showDetails && (
        <div className="text-center">
          <h3
            className={`font-bold text-sm ${
              isLocked
                ? 'text-gray-400 dark:text-gray-500'
                : 'text-anthracite dark:text-white'
            }`}
          >
            {achievement.title}
          </h3>
          <p
            className={`text-xs mt-1 ${
              isLocked
                ? 'text-gray-400 dark:text-gray-600'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {achievement.description}
          </p>
          {isLocked && (
            <div className="mt-2 text-xs font-semibold text-gray-500 dark:text-gray-500">
              🔒 Locked
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};
