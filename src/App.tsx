import { useEffect, useState, useMemo, lazy, Suspense, useRef, useCallback } from 'react';
import { Scale, Plus, TrendingUp, Heart, Dumbbell, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { WeightEntry, TargetData, Statistics } from './types';
import { fetchWeightData, fetchTargetData, addWeightEntry, updateWeightEntry, deleteWeightEntry, updateTargetData } from './services/dataService';
import { calculateStatistics } from './utils/calculations';
import { BMIGauge } from './components/BMIGauge';
import { ProgressOverview } from './components/ProgressOverview';
import { TimelineChart } from './components/TimelineChart';
import { StatisticsPanel } from './components/StatisticsPanel';
import { ThemeToggle } from './components/ThemeToggle';
import { SkeletonDashboard } from './components/SkeletonLoaders';
import { Modal } from './components/Modal';
import { WeightEntryForm } from './components/WeightEntryForm';
import { SkipToContent } from './components/SkipToContent';
import { LoadingFallback } from './components/LoadingFallback';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { staggerContainer, staggerItem } from './utils/animations';
import { Achievement } from './types/achievements';
import { checkAchievements, loadAchievements } from './services/achievementService';

// Lazy load heavy components that aren't immediately visible
const HeatMapCalendar = lazy(() => import('./components/HeatMapCalendar').then(m => ({ default: m.HeatMapCalendar })));
const Settings = lazy(() => import('./components/Settings').then(m => ({ default: m.Settings })));
const AchievementsGallery = lazy(() => import('./components/AchievementsGallery').then(m => ({ default: m.AchievementsGallery })));
const CelebrationModal = lazy(() => import('./components/CelebrationModal').then(m => ({ default: m.CelebrationModal })));
const ExportMenu = lazy(() => import('./components/ExportMenu').then(m => ({ default: m.ExportMenu })));
const GoalSimulator = lazy(() => import('./components/GoalSimulator').then(m => ({ default: m.GoalSimulator })));
const TrendsPage = lazy(() => import('./components/TrendsPage').then(m => ({ default: m.TrendsPage })));
const OnboardingModal = lazy(() => import('./components/OnboardingModal').then(m => ({ default: m.OnboardingModal })));
const SmartTips = lazy(() => import('./components/SmartTips').then(m => ({ default: m.SmartTips })));
const AIInsights = lazy(() => import('./components/AIInsights').then(m => ({ default: m.AIInsights })));

// V2: Better loading component for lazy-loaded items
function IconButtonSkeleton() {
  return (
    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse flex items-center justify-center">
      <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
    </div>
  );
}

// P4: Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [targetData, setTargetData] = useState<TargetData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WeightEntry | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [celebrationAchievement, setCelebrationAchievement] = useState<Achievement | null>(null);
  const [showTrendsPage, setShowTrendsPage] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // P4: Track if we've done initial achievement check
  const initialCheckDoneRef = useRef(false);

  // Memoize statistics calculation - only recalculate when entries or targetData change
  const stats = useMemo<Statistics | null>(() => {
    if (entries.length === 0 || !targetData) return null;
    return calculateStatistics(entries, targetData);
  }, [entries, targetData]);

  // P4: Debounce entries for achievement checking (300ms delay)
  const debouncedEntries = useDebounce(entries, 300);

  // Load data function - can be called on mount and after sync
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [weightEntries, target] = await Promise.all([
        fetchWeightData(),
        fetchTargetData(),
      ]);

      setEntries(weightEntries);
      setTargetData(target);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError(`Failed to load your weight data: ${errorMessage}. Please try again.`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Load achievements on mount
    setAchievements(loadAchievements());

    // Check if onboarding should be shown
    const onboardingCompleted = localStorage.getItem('weightwatch-onboarding-completed');
    if (!onboardingCompleted) {
      setShowOnboarding(true);
    }
  }, [loadData]);

  // P4: Check for new achievements with debouncing
  useEffect(() => {
    if (debouncedEntries.length > 0 && targetData && stats) {
      // Skip the initial check on mount to avoid duplicate celebration
      if (!initialCheckDoneRef.current) {
        initialCheckDoneRef.current = true;
        // Just load achievements without showing celebration on initial load
        const { achievements: updatedAchievements } = checkAchievements(
          debouncedEntries,
          targetData,
          stats
        );
        setAchievements(updatedAchievements);
        return;
      }

      const { achievements: updatedAchievements, newlyUnlocked } = checkAchievements(
        debouncedEntries,
        targetData,
        stats
      );
      setAchievements(updatedAchievements);

      // Show celebration modal for newly unlocked achievements
      if (newlyUnlocked.length > 0) {
        // Show the first newly unlocked achievement
        setCelebrationAchievement(newlyUnlocked[0]);
      }
    }
  }, [debouncedEntries, stats, targetData]);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    window.location.reload();
  };

  const handleAddEntry = () => {
    setEditingEntry(null);
    setIsModalOpen(true);
  };

  const handleSubmitEntry = async (entry: Partial<WeightEntry>) => {
    try {
      let updatedEntries: WeightEntry[];

      if (editingEntry) {
        // Update existing entry
        updatedEntries = await updateWeightEntry(editingEntry.date, entry);
        toast.success('Weight entry updated successfully!');
      } else {
        // Add new entry
        updatedEntries = await addWeightEntry(entry);
        toast.success('Weight entry added successfully!');
      }

      setEntries(updatedEntries);
      setIsModalOpen(false);
      setEditingEntry(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save entry';
      toast.error(message);
    }
  };

  const handleDeleteEntry = async (date: string) => {
    try {
      const updatedEntries = await deleteWeightEntry(date);
      setEntries(updatedEntries);
      setIsModalOpen(false);
      setEditingEntry(null);
      toast.success('Weight entry deleted successfully!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete entry';
      toast.error(message);
    }
  };

  const handleUpdateTarget = async (updates: Partial<TargetData>) => {
    try {
      const updatedTarget = await updateTargetData(updates);
      setTargetData(updatedTarget);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update target';
      toast.error(message);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEntry(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/20 to-teal-50/20 dark:from-gray-900 dark:via-emerald-950/20 dark:to-teal-950/20 relative">

        {/* Header Skeleton */}
        <header className="relative z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Scale className="w-8 h-8 text-emerald-500 animate-pulse" strokeWidth={2.5} />
                <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
              <div className="flex items-center gap-4">
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Skeleton */}
        <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <SkeletonDashboard />
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-emerald-50/20 to-teal-50/20 dark:from-gray-900 dark:via-emerald-950/20 dark:to-teal-950/20">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">!</span>
          </div>
          <h2 className="text-2xl font-bold text-anthracite dark:text-gray-100 mb-3">Oops! Something went wrong</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={handleRetry}
            className="px-6 py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-all hover:shadow-lg hover:shadow-emerald-500/50"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!stats || !targetData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-emerald-50/20 to-teal-50/20 dark:from-gray-900 dark:via-emerald-950/20 dark:to-teal-950/20">
        <div className="text-center">
          <p className="text-anthracite dark:text-gray-100 font-medium">No data available</p>
        </div>
      </div>
    );
  }

  return (
    // V3: Added pb-24 for FAB safe area on mobile
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/20 to-teal-50/20 dark:from-gray-900 dark:via-emerald-950/20 dark:to-teal-950/20 relative pb-24 md:pb-8">
      <SkipToContent />

      {/* Header - Redesigned with compact height and refined styling */}
      <header className="sticky top-0 z-50 glass border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <h1 className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-sm">
                <Scale className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-display text-2xl text-anthracite dark:text-white">
                Weightwatch
              </span>
            </h1>

            {/* Actions */}
            <div className="flex items-center gap-1.5 md:gap-2">
              {/* Last updated - hidden on mobile */}
              <div className="hidden sm:flex items-center px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-500 dark:text-gray-400">
                Updated {new Date(entries[entries.length - 1].date).toLocaleDateString()}
              </div>

              {/* Divider */}
              <div className="hidden sm:block w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

              {/* Goal Simulator - hidden on smaller screens */}
              <div className="hidden lg:block">
                <Suspense fallback={<IconButtonSkeleton />}>
                  <GoalSimulator
                    currentWeight={stats.current.weight}
                    currentTargetData={targetData}
                    onUpdateTarget={handleUpdateTarget}
                  />
                </Suspense>
              </div>

              {/* Export - hidden on mobile */}
              <div className="hidden md:block">
                <Suspense fallback={<IconButtonSkeleton />}>
                  <ExportMenu entries={entries} targetData={targetData} stats={stats} />
                </Suspense>
              </div>

              {/* Achievements */}
              <Suspense fallback={<IconButtonSkeleton />}>
                <AchievementsGallery achievements={achievements} />
              </Suspense>

              {/* Trends */}
              <button
                onClick={() => setShowTrendsPage(true)}
                className="icon-btn"
                title="View detailed analytics"
                aria-label="View detailed analytics"
              >
                <TrendingUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>

              {/* Settings */}
              <Suspense fallback={<IconButtonSkeleton />}>
                <Settings
                  onSyncComplete={loadData}
                  entries={entries}
                  targetData={targetData}
                  onDataRestore={(newEntries, newTarget) => {
                    setEntries(newEntries);
                    setTargetData(newTarget);
                  }}
                />
              </Suspense>

              {/* Theme Toggle */}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <motion.main
        id="main-content"
        role="main"
        aria-label="Dashboard content"
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {/* Smart Tips */}
        <motion.section className="mb-8" variants={staggerItem}>
          <Suspense fallback={null}>
            <SmartTips entries={entries} stats={stats} />
          </Suspense>
        </motion.section>

        {/* Progress Overview */}
        <motion.section
          className="mb-8"
          variants={staggerItem}
          aria-label="Progress overview"
        >
          <ProgressOverview stats={stats} targetWeight={targetData.endWeight} />
        </motion.section>

        {/* Two Column Layout - Equal Height Cards */}
        <motion.div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 items-stretch" variants={staggerItem}>
          {/* BMI Gauge */}
          <section className="lg:col-span-1 h-full" aria-label="BMI gauge">
            <BMIGauge weight={stats.current.weight} height={targetData.height} />
          </section>

          {/* Timeline Chart */}
          <section className="lg:col-span-2 h-full" aria-label="Weight timeline chart">
            <TimelineChart entries={entries} targetData={targetData} />
          </section>
        </motion.div>

        {/* Statistics Panel */}
        <motion.section
          className="mb-8"
          variants={staggerItem}
          aria-label="Weight loss statistics"
        >
          <StatisticsPanel stats={stats} />
        </motion.section>

        {/* AI Insights */}
        <motion.section
          className="mb-8"
          variants={staggerItem}
          aria-label="AI-powered insights"
        >
          <Suspense fallback={<LoadingFallback />}>
            <AIInsights entries={entries} targetData={targetData} stats={stats} />
          </Suspense>
        </motion.section>

        {/* Heat Map Calendar */}
        <motion.section
          className="mb-8"
          variants={staggerItem}
          aria-label="Tracking consistency calendar"
        >
          <Suspense fallback={<LoadingFallback />}>
            <HeatMapCalendar entries={entries} startDate={targetData.startDate} />
          </Suspense>
        </motion.section>

        {/* V7: Footer with SVG icons instead of emojis */}
        <motion.footer className="text-center text-gray-500 dark:text-gray-400 text-sm py-8" variants={staggerItem}>
          <p className="flex items-center justify-center gap-1.5">
            Built with <Heart className="w-4 h-4 text-red-500 fill-red-500" /> using React & TypeScript
          </p>
          <p className="mt-2 flex items-center justify-center gap-1.5">
            Keep pushing towards your goals! <Dumbbell className="w-4 h-4 text-emerald-500" />
          </p>
        </motion.footer>
      </motion.main>

      {/* V3: FAB with safe positioning */}
      <motion.button
        onClick={handleAddEntry}
        className="fab"
        whileHover={{ scale: 1.08, boxShadow: '0 8px 32px rgba(16, 185, 129, 0.5)' }}
        whileTap={{ scale: 0.95 }}
        aria-label="Add weight entry"
      >
        <Plus className="w-7 h-7" strokeWidth={2.5} />
      </motion.button>

      {/* Entry Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingEntry ? 'Edit Weight Entry' : 'Add Weight Entry'}
      >
        <WeightEntryForm
          entry={editingEntry || undefined}
          onSubmit={handleSubmitEntry}
          onDelete={editingEntry ? handleDeleteEntry : undefined}
          onCancel={handleCloseModal}
        />
      </Modal>

      {/* Achievement Celebration Modal */}
      <Suspense fallback={null}>
        <CelebrationModal
          achievement={celebrationAchievement}
          onClose={() => setCelebrationAchievement(null)}
        />
      </Suspense>

      {/* Trends Page Modal */}
      {showTrendsPage && (
        <Suspense fallback={null}>
          <TrendsPage
            entries={entries}
            targetData={targetData}
            stats={stats}
            onClose={() => setShowTrendsPage(false)}
          />
        </Suspense>
      )}

      {/* Onboarding Modal */}
      {showOnboarding && (
        <Suspense fallback={null}>
          <OnboardingModal onComplete={() => setShowOnboarding(false)} />
        </Suspense>
      )}

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </div>
  );
}

export default App;
