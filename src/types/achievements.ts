export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string; // Lucide icon name
  category: 'milestone' | 'consistency' | 'progress' | 'special';
  requirement: number; // Value needed to unlock
  unlockedAt?: string; // ISO date string when unlocked
  isUnlocked: boolean;
}

export type AchievementId =
  | 'first_entry'
  | 'week_streak'
  | 'month_streak'
  | 'perfect_week'
  | 'lost_1kg'
  | 'lost_5kg'
  | 'lost_10kg'
  | 'lost_20kg'
  | 'halfway_there'
  | 'goal_achieved'
  | 'consistency_champion'
  | 'early_bird'
  | 'hundred_club';

export const ACHIEVEMENTS: Record<AchievementId, Omit<Achievement, 'isUnlocked' | 'unlockedAt'>> = {
  // First Steps
  first_entry: {
    id: 'first_entry',
    title: 'Getting Started',
    description: 'Log your first weight entry',
    icon: 'Rocket',
    category: 'milestone',
    requirement: 1,
  },

  // Consistency Achievements
  week_streak: {
    id: 'week_streak',
    title: '7 Day Streak',
    description: 'Track your weight for 7 consecutive days',
    icon: 'Flame',
    category: 'consistency',
    requirement: 7,
  },
  month_streak: {
    id: 'month_streak',
    title: '30 Day Warrior',
    description: 'Track your weight for 30 consecutive days',
    icon: 'Award',
    category: 'consistency',
    requirement: 30,
  },
  perfect_week: {
    id: 'perfect_week',
    title: 'Perfect Week',
    description: 'Log every day this week',
    icon: 'Star',
    category: 'consistency',
    requirement: 7,
  },
  consistency_champion: {
    id: 'consistency_champion',
    title: 'Consistency Champion',
    description: 'Achieve 90% tracking consistency',
    icon: 'Crown',
    category: 'consistency',
    requirement: 90,
  },

  // Weight Loss Milestones
  lost_1kg: {
    id: 'lost_1kg',
    title: 'First Kilo',
    description: 'Lose your first kilogram',
    icon: 'TrendingDown',
    category: 'progress',
    requirement: 1,
  },
  lost_5kg: {
    id: 'lost_5kg',
    title: '5kg Champion',
    description: 'Lose 5 kilograms',
    icon: 'Trophy',
    category: 'progress',
    requirement: 5,
  },
  lost_10kg: {
    id: 'lost_10kg',
    title: 'Double Digits',
    description: 'Lose 10 kilograms',
    icon: 'Zap',
    category: 'progress',
    requirement: 10,
  },
  lost_20kg: {
    id: 'lost_20kg',
    title: 'Transformation Master',
    description: 'Lose 20 kilograms',
    icon: 'Sparkles',
    category: 'progress',
    requirement: 20,
  },
  halfway_there: {
    id: 'halfway_there',
    title: 'Halfway Hero',
    description: 'Reach 50% of your weight loss goal',
    icon: 'Target',
    category: 'milestone',
    requirement: 50,
  },
  goal_achieved: {
    id: 'goal_achieved',
    title: 'Goal Crusher',
    description: 'Reach your target weight',
    icon: 'PartyPopper',
    category: 'milestone',
    requirement: 100,
  },

  // Special Achievements
  early_bird: {
    id: 'early_bird',
    title: 'Early Bird',
    description: 'Log 10 entries before 9 AM',
    icon: 'Sun',
    category: 'special',
    requirement: 10,
  },
  hundred_club: {
    id: 'hundred_club',
    title: '100 Club',
    description: 'Log 100 weight entries',
    icon: 'Badge',
    category: 'special',
    requirement: 100,
  },
};
