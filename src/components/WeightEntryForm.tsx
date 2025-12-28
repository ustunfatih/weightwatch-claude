import { useState, FormEvent } from 'react';
import { format } from 'date-fns';
import { Save, Trash2 } from 'lucide-react';
import { WeightEntry } from '../types';
import { VoiceInput } from './VoiceInput';
import { ConfirmModal } from './ConfirmModal';

interface WeightEntryFormProps {
  entry?: WeightEntry;
  onSubmit: (entry: Partial<WeightEntry>) => void;
  onDelete?: (date: string) => void;
  onCancel: () => void;
}

export const WeightEntryForm = ({ entry, onSubmit, onDelete, onCancel }: WeightEntryFormProps) => {
  const [date, setDate] = useState(entry?.date || format(new Date(), 'yyyy-MM-dd'));
  const [weight, setWeight] = useState(entry?.weight?.toString() || '');
  const [errors, setErrors] = useState<{ date?: string; weight?: string }>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const validate = (): boolean => {
    const newErrors: { date?: string; weight?: string } = {};

    // Validate date
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (!date) {
      newErrors.date = 'Date is required';
    } else if (selectedDate > today) {
      newErrors.date = 'Date cannot be in the future';
    }

    // Validate weight
    const weightNum = parseFloat(weight);
    if (!weight) {
      newErrors.weight = 'Weight is required';
    } else if (isNaN(weightNum)) {
      newErrors.weight = 'Weight must be a number';
    } else if (weightNum < 40 || weightNum > 200) {
      newErrors.weight = 'Weight must be between 40 and 200 kg';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const weightNum = parseFloat(weight);

    onSubmit({
      date,
      weight: weightNum,
      weekDay: format(new Date(date), 'EEEE'),
    });
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    if (entry && onDelete) {
      onDelete(entry.date);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date Input */}
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Date
          </label>
          <input
            type="date"
            id="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={format(new Date(), 'yyyy-MM-dd')}
            className={`w-full px-4 py-3 rounded-xl border ${errors.date
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 dark:border-gray-600 focus:ring-emerald-500'
              } bg-white dark:bg-gray-800 text-anthracite dark:text-white focus:outline-none focus:ring-2 transition-all`}
          />
          {errors.date && (
            <p className="mt-1 text-sm text-red-500">{errors.date}</p>
          )}
        </div>

        {/* Weight Input */}
        <div>
          <label htmlFor="weight" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Weight (kg)
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              id="weight"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              step="0.1"
              min="40"
              max="200"
              placeholder="e.g., 75.5"
              className={`flex-1 px-4 py-3 rounded-xl border ${errors.weight
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 dark:border-gray-600 focus:ring-emerald-500'
                } bg-white dark:bg-gray-800 text-anthracite dark:text-white focus:outline-none focus:ring-2 transition-all`}
            />
            <VoiceInput onWeightDetected={(detectedWeight) => setWeight(detectedWeight.toString())} />
          </div>
          {errors.weight && (
            <p className="mt-1 text-sm text-red-500">{errors.weight}</p>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Enter your weight between 40 and 200 kg
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          {entry && onDelete && (
            <button
              type="button"
              onClick={handleDeleteClick}
              className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span className="font-bold">{entry ? 'Update' : 'Add Entry'}</span>
          </button>
        </div>
      </form>

      {/* S9/V1: Accessible delete confirmation modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Entry"
        message="Are you sure you want to delete this weight entry? This action cannot be undone."
        confirmText="Delete"
        cancelText="Keep"
        variant="danger"
      />
    </>
  );
};
