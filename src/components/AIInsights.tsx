import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, AlertTriangle, Info, CheckCircle2, Calendar, Target } from 'lucide-react';
import { WeightEntry, TargetData, Statistics } from '../types';
import {
    generatePredictiveAnalysis,
    identifyPatterns,
    detectAnomalies,
    generateWeeklySummary
} from '../services/aiAnalyticsService';
import { format, parseISO } from 'date-fns';

interface AIInsightsProps {
    entries: WeightEntry[];
    targetData: TargetData;
    stats: Statistics;
}

export function AIInsights({ entries, targetData }: AIInsightsProps) {
    const predictions = useMemo(() =>
        generatePredictiveAnalysis(entries, targetData),
        [entries, targetData]
    );

    const patterns = useMemo(() =>
        identifyPatterns(entries),
        [entries]
    );

    const anomalies = useMemo(() =>
        detectAnomalies(entries).slice(0, 3), // Show last 3
        [entries]
    );

    const weeklySummary = useMemo(() =>
        generateWeeklySummary(entries, targetData),
        [entries, targetData]
    );

    // Risk color coding
    const getRiskColor = (risk: string) => {
        switch (risk) {
            case 'healthy': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
            case 'moderate': return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
            case 'aggressive': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
            default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700';
        }
    };

    const getPerformanceColor = (perf: string) => {
        switch (perf) {
            case 'excellent': return 'from-green-500 to-emerald-500';
            case 'good': return 'from-blue-500 to-cyan-500';
            case 'needs_improvement': return 'from-orange-500 to-amber-500';
            default: return 'from-gray-500 to-gray-600';
        }
    };

    return (
        <div className="space-y-6">
            {/* Predictive Analysis */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-elevated p-6"
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <Target className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="font-display text-lg font-black text-anthracite dark:text-white">AI Goal Prediction</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Based on your current progress</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Main Prediction */}
                    <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                        <div className="flex items-start justify-between mb-2">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Projected Goal Date</p>
                                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                    {format(predictions.projectedGoalDate, 'MMM dd, yyyy')}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-600 dark:text-gray-400">Confidence</p>
                                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                    {predictions.confidenceLevel.toFixed(0)}%
                                </p>
                            </div>
                        </div>

                        {/* Confidence Bar */}
                        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-3">
                            <div
                                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-1000"
                                style={{ width: `${predictions.confidenceLevel}%` }}
                            />
                        </div>
                    </div>

                    {/* Risk Assessment */}
                    <div className={`p-4 rounded-xl border ${getRiskColor(predictions.riskAssessment)}`}>
                        <div className="flex items-center gap-2 mb-2">
                            {predictions.riskAssessment === 'healthy' && <CheckCircle2 className="w-5 h-5" />}
                            {predictions.riskAssessment === 'moderate' && <Info className="w-5 h-5" />}
                            {predictions.riskAssessment === 'aggressive' && <AlertTriangle className="w-5 h-5" />}
                            <span className="font-semibold text-sm">
                                {predictions.riskAssessment === 'healthy' && 'Healthy Pace'}
                                {predictions.riskAssessment === 'moderate' && 'Moderate Pace'}
                                {predictions.riskAssessment === 'aggressive' && 'Aggressive Pace'}
                            </span>
                        </div>
                        <p className="text-xs">
                            {predictions.riskAssessment === 'healthy' && 'Your current weight loss rate is sustainable and healthy.'}
                            {predictions.riskAssessment === 'moderate' && 'You\'re losing weight at a good pace. Monitor for any signs of fatigue.'}
                            {predictions.riskAssessment === 'aggressive' && 'You\'re losing weight quickly. Ensure you\'re eating enough and consult a healthcare professional if concerned.'}
                        </p>
                    </div>

                    {/* Alternative Scenarios */}
                    <div className="grid grid-cols-3 gap-2">
                        {Object.entries(predictions.alternativeScenarios).map(([key, scenario]) => (
                            <div
                                key={key}
                                className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-center"
                            >
                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 capitalize">{key}</p>
                                <p className="text-sm font-semibold text-anthracite dark:text-white">
                                    {format(scenario.date, 'MMM dd')}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {scenario.weeklyLoss} kg/wk
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* Weekly Summary */}
            {weeklySummary && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="card-elevated p-6"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`w-12 h-12 bg-gradient-to-br ${getPerformanceColor(weeklySummary.performance)} rounded-full flex items-center justify-center`}>
                            <Calendar className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="font-display text-lg font-black text-anthracite dark:text-white">This Week's Summary</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {format(parseISO(weeklySummary.weekStart), 'MMM dd')} - {format(parseISO(weeklySummary.weekEnd), 'MMM dd')}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {/* Performance Badge */}
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${getPerformanceColor(weeklySummary.performance)} text-white font-semibold text-sm`}>
                            {weeklySummary.performance === 'excellent' && <TrendingUp className="w-4 h-4" />}
                            {weeklySummary.performance === 'good' && <CheckCircle2 className="w-4 h-4" />}
                            {weeklySummary.performance === 'needs_improvement' && <TrendingDown className="w-4 h-4" />}
                            <span className="capitalize">{weeklySummary.performance.replace('_', ' ')}</span>
                        </div>

                        {/* Insights */}
                        <div className="space-y-2">
                            {weeklySummary.insights.map((insight, i) => (
                                <div key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                                    <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                                    <p>{insight}</p>
                                </div>
                            ))}
                        </div>

                        {/* Recommendations */}
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                            <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-2">Recommendations</p>
                            <ul className="space-y-1">
                                {weeklySummary.recommendations.map((rec, i) => (
                                    <li key={i} className="text-xs text-blue-700 dark:text-blue-400 flex items-start gap-2">
                                        <span className="text-blue-500">•</span>
                                        <span>{rec}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Pattern Insights */}
            {patterns.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="card-elevated p-6"
                >
                    <h3 className="font-display text-lg font-black text-anthracite dark:text-white mb-4">Pattern Analysis</h3>
                    <div className="space-y-3">
                        {patterns.map((pattern, i) => (
                            <div
                                key={i}
                                className={`p-4 rounded-xl border ${pattern.severity === 'success' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
                                    pattern.severity === 'warning' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' :
                                        'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${pattern.severity === 'success' ? 'bg-green-500' :
                                        pattern.severity === 'warning' ? 'bg-orange-500' :
                                            'bg-blue-500'
                                        }`}>
                                        {pattern.type === 'plateau' && <TrendingDown className="w-5 h-5 text-white" />}
                                        {pattern.type === 'acceleration' && <TrendingUp className="w-5 h-5 text-white" />}
                                        {pattern.type.includes('pattern') && <Info className="w-5 h-5 text-white" />}
                                        {pattern.type === 'volatility' && <AlertTriangle className="w-5 h-5 text-white" />}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-sm text-anthracite dark:text-white mb-1">
                                            {pattern.description}
                                        </p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                            {pattern.actionable}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                                                    style={{ width: `${pattern.confidence}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                {pattern.confidence}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Anomalies */}
            {anomalies.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="card-elevated p-6"
                >
                    <h3 className="font-display text-lg font-black text-anthracite dark:text-white mb-4">Recent Anomalies</h3>
                    <div className="space-y-3">
                        {anomalies.map((anomaly, i) => (
                            <div
                                key={i}
                                className={`p-4 rounded-xl border ${anomaly.severity === 'high' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
                                    anomaly.severity === 'medium' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' :
                                        'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${anomaly.severity === 'high' ? 'text-red-600' :
                                        anomaly.severity === 'medium' ? 'text-orange-600' :
                                            'text-yellow-600'
                                        }`} />
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="font-semibold text-sm text-anthracite dark:text-white">
                                                {format(parseISO(anomaly.date), 'MMM dd, yyyy')}
                                            </p>
                                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                {anomaly.weight.toFixed(1)} kg
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                            {anomaly.message}
                                        </p>
                                        {anomaly.likelyReason && (
                                            <p className="text-xs text-gray-500 dark:text-gray-500">
                                                Possible cause: {anomaly.likelyReason}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}
        </div>
    );
}
