import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Calendar, BarChart3, Lightbulb, ArrowLeft } from 'lucide-react';
import { WeightEntry, TargetData, Statistics } from '../types';
import {
    calculateMovingAverages,
    analyzeTrend,
    filterByDateRange,
    getDateRangePresets,
    comparePerformance,
    generateInsights,
    DateRangeFilter,
} from '../services/analyticsService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { staggerContainer, staggerItem } from '../utils/animations';

interface TrendsPageProps {
    entries: WeightEntry[];
    targetData: TargetData;
    stats: Statistics;
    onClose: () => void;
}

export function TrendsPage({ entries, targetData, onClose }: TrendsPageProps) {
    const latestDate = entries.length > 0 ? entries[entries.length - 1].date : new Date().toISOString().split('T')[0];
    const presets = getDateRangePresets(latestDate);

    const [selectedRange, setSelectedRange] = useState<string>('Last 30 Days');
    const [customRange, setCustomRange] = useState<DateRangeFilter>(presets['Last 30 Days']);

    const filteredEntries = useMemo(() => {
        return filterByDateRange(entries, customRange);
    }, [entries, customRange]);

    const movingAverages = useMemo(() => {
        return calculateMovingAverages(filteredEntries);
    }, [filteredEntries]);

    const trendAnalysis = useMemo(() => {
        return analyzeTrend(entries);
    }, [entries]);

    const insights = useMemo(() => {
        return generateInsights(entries, targetData);
    }, [entries, targetData]);

    const handleRangeChange = (preset: string) => {
        setSelectedRange(preset);
        setCustomRange(presets[preset]);
    };

    // Prepare data for comparison
    const comparisonData = useMemo(() => {
        const currentPeriodDays = 30;
        const currentPeriod = entries.slice(-currentPeriodDays);
        const previousPeriod = entries.slice(-currentPeriodDays * 2, -currentPeriodDays);

        if (previousPeriod.length === 0) return null;

        return comparePerformance(currentPeriod, previousPeriod);
    }, [entries]);

    // Format chart data
    const chartData = movingAverages.map(item => ({
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        'Actual Weight': parseFloat(item.weight.toFixed(1)),
        '7-Day Average': parseFloat(item.ma7.toFixed(1)),
        '14-Day Average': parseFloat(item.ma14.toFixed(1)),
        '30-Day Average': parseFloat(item.ma30.toFixed(1)),
    }));

    return (
        <motion.div
            className="fixed inset-0 z-[70] bg-gray-50 dark:bg-gray-900 overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                aria-label="Go back"
                            >
                                <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                            </button>
                            <h1 className="text-2xl font-bold text-anthracite dark:text-white flex items-center gap-2">
                                <TrendingUp className="w-7 h-7 text-emerald-500" />
                                Advanced Analytics
                            </h1>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <motion.main
                className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
            >
                {/* Date Range Selector */}
                <motion.section variants={staggerItem} className="mb-8">
                    <div className="backdrop-blur-md bg-white/90 dark:bg-gray-800/90 rounded-3xl p-6 shadow-lg border border-gray-200/50 dark:border-gray-700/50">
                        <div className="flex items-center gap-2 mb-4">
                            <Calendar className="w-5 h-5 text-emerald-500" />
                            <h2 className="text-lg font-semibold text-anthracite dark:text-white">Date Range</h2>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {Object.keys(presets).map((preset) => (
                                <button
                                    key={preset}
                                    onClick={() => handleRangeChange(preset)}
                                    className={`px-4 py-2 rounded-xl font-medium transition-all ${selectedRange === preset
                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                        }`}
                                >
                                    {preset}
                                </button>
                            ))}
                        </div>
                    </div>
                </motion.section>

                {/* Trend Analysis Card */}
                <motion.section variants={staggerItem} className="mb-8">
                    <div className="card-elevated p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-emerald-500" />
                            </div>
                            <h2 className="font-display text-xl font-black text-anthracite dark:text-white uppercase tracking-tight">Trend Analysis</h2>
                        </div>
                        <div className="flex items-start gap-6">
                            <div className={`p-5 rounded-3xl transform rotate-3 shadow-lg ${trendAnalysis.trend === 'accelerating' ? 'bg-gradient-to-br from-green-400 to-emerald-500 shadow-emerald-500/20' :
                                trendAnalysis.trend === 'steady' ? 'bg-gradient-to-br from-blue-400 to-cyan-500 shadow-blue-500/20' :
                                    trendAnalysis.trend === 'slowing' ? 'bg-gradient-to-br from-yellow-400 to-amber-500 shadow-yellow-500/20' :
                                        'bg-gradient-to-br from-orange-400 to-red-500 shadow-orange-500/20'
                                }`}>
                                <div className="text-4xl filter drop-shadow-md">
                                    {trendAnalysis.trend === 'accelerating' ? '🚀' :
                                        trendAnalysis.trend === 'steady' ? '📊' :
                                            trendAnalysis.trend === 'slowing' ? '⚠️' : '🎯'}
                                </div>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-anthracite dark:text-white capitalize mb-1">
                                    {trendAnalysis.trend}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">
                                    {trendAnalysis.message}
                                </p>
                                <div className="mt-2">
                                    <div className="flex items-center gap-2">
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Confidence</div>
                                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
                                                style={{ width: `${trendAnalysis.confidence * 100}%` }}
                                            />
                                        </div>
                                        <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                            {(trendAnalysis.confidence * 100).toFixed(0)}%
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.section>

                {/* Moving Averages Chart */}
                <motion.section variants={staggerItem} className="mb-8">
                    <div className="backdrop-blur-md bg-white/90 dark:bg-gray-800/90 rounded-3xl p-6 shadow-lg border border-gray-200/50 dark:border-gray-700/50">
                        <div className="flex items-center gap-2 mb-4">
                            <BarChart3 className="w-5 h-5 text-emerald-500" />
                            <h2 className="text-lg font-semibold text-anthracite dark:text-white">Moving Averages</h2>
                        </div>
                        <ResponsiveContainer width="100%" height={350}>
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                                <XAxis
                                    dataKey="date"
                                    stroke="#6B7280"
                                    style={{ fontSize: '12px' }}
                                />
                                <YAxis
                                    stroke="#6B7280"
                                    style={{ fontSize: '12px' }}
                                    domain={['dataMin - 2', 'dataMax + 2']}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(31, 41, 55, 0.95)',
                                        border: 'none',
                                        borderRadius: '12px',
                                        color: '#fff',
                                    }}
                                />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="Actual Weight"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    dot={{ fill: '#10b981', r: 3 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="7-Day Average"
                                    stroke="#14b8a6"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    dot={false}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="14-Day Average"
                                    stroke="#06b6d4"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    dot={false}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="30-Day Average"
                                    stroke="#f97316"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    dot={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </motion.section>

                {/* Performance Comparison */}
                {comparisonData && (
                    <motion.section variants={staggerItem} className="mb-8">
                        <div className="backdrop-blur-md bg-white/90 dark:bg-gray-800/90 rounded-3xl p-6 shadow-lg border border-gray-200/50 dark:border-gray-700/50">
                            <div className="flex items-center gap-2 mb-4">
                                <BarChart3 className="w-5 h-5 text-emerald-500" />
                                <h2 className="text-lg font-semibold text-anthracite dark:text-white">Performance Comparison</h2>
                                <span className="text-sm text-gray-500 dark:text-gray-400">(Last 30 days vs Previous 30 days)</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {comparisonData.map((metric) => (
                                    <div
                                        key={metric.name}
                                        className="p-4 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50"
                                    >
                                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">{metric.name}</div>
                                        <div className="flex items-baseline gap-2 mb-2">
                                            <div className="text-2xl font-bold text-anthracite dark:text-white">
                                                {metric.current.toFixed(2)}
                                            </div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">{metric.unit}</div>
                                        </div>
                                        <div className={`flex items-center gap-1 text-sm ${metric.changePercent > 0 ? 'text-green-600 dark:text-green-400' :
                                            metric.changePercent < 0 ? 'text-red-600 dark:text-red-400' :
                                                'text-gray-600 dark:text-gray-400'
                                            }`}>
                                            <span>{metric.changePercent > 0 ? '↑' : metric.changePercent < 0 ? '↓' : '→'}</span>
                                            <span>{Math.abs(metric.changePercent).toFixed(1)}% vs previous period</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.section>
                )}

                {/* AI-Powered Insights */}
                <motion.section variants={staggerItem} className="mb-8">
                    <div className="backdrop-blur-md bg-white/90 dark:bg-gray-800/90 rounded-3xl p-6 shadow-lg border border-gray-200/50 dark:border-gray-700/50">
                        <div className="flex items-center gap-2 mb-4">
                            <Lightbulb className="w-5 h-5 text-emerald-500" />
                            <h2 className="text-lg font-semibold text-anthracite dark:text-white">Insights & Recommendations</h2>
                        </div>
                        <div className="space-y-3">
                            {insights.map((insight, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="p-4 rounded-xl bg-gradient-to-r from-emerald-50/50 to-teal-50/50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200/50 dark:border-emerald-700/50"
                                >
                                    <p className="text-gray-700 dark:text-gray-300">{insight}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </motion.section>
            </motion.main>
        </motion.div>
    );
}
