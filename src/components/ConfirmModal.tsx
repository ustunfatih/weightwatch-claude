import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

/**
 * V1/S9: Accessible confirmation modal to replace native confirm()
 * Features:
 * - Focus trap
 * - Keyboard navigation (Escape to close)
 * - ARIA labels for screen readers
 * - Animated transitions
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
}: ConfirmModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // Save current focus
      const previousActiveElement = document.activeElement as HTMLElement;

      // Focus the cancel button by default (safer action)
      setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 100);

      // Restore focus when closing
      return () => {
        previousActiveElement?.focus();
      };
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }

      // Trap focus within modal
      if (e.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button:not([disabled])'
        ) as NodeListOf<HTMLElement>;

        if (!focusableElements || focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  const variantStyles = {
    danger: {
      icon: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
      button: 'bg-red-500 hover:bg-red-600 focus:ring-red-500',
    },
    warning: {
      icon: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
      button: 'bg-orange-500 hover:bg-orange-600 focus:ring-orange-500',
    },
    info: {
      icon: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
      button: 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500',
    },
  };

  const styles = variantStyles[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            aria-describedby="confirm-modal-description"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 relative">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Icon */}
              <div className={`w-12 h-12 rounded-full ${styles.icon} flex items-center justify-center mx-auto mb-4`}>
                <AlertTriangle className="w-6 h-6" />
              </div>

              {/* Title */}
              <h2
                id="confirm-modal-title"
                className="text-xl font-bold text-center text-anthracite dark:text-white mb-2"
              >
                {title}
              </h2>

              {/* Message */}
              <p
                id="confirm-modal-description"
                className="text-center text-gray-600 dark:text-gray-400 mb-6"
              >
                {message}
              </p>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  ref={cancelButtonRef}
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                >
                  {cancelText}
                </button>
                <button
                  ref={confirmButtonRef}
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className={`flex-1 px-4 py-3 ${styles.button} text-white font-semibold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800`}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
