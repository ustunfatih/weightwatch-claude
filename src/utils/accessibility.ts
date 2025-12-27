/**
 * Accessibility Utilities
 * WCAG 2.1 AA compliance helpers
 */

/**
 * Announce to screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    // Remove after announcement
    setTimeout(() => {
        document.body.removeChild(announcement);
    }, 1000);
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get accessible color contrast ratio
 */
export function getContrastRatio(foreground: string, background: string): number {
    const getLuminance = (color: string): number => {
        // Simple luminance calculation (RGB assumed)
        const rgb = color.match(/\d+/g);
        if (!rgb || rgb.length < 3) return 0;

        const [r, g, b] = rgb.map(val => {
            const v = parseInt(val) / 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });

        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const l1 = getLuminance(foreground);
    const l2 = getLuminance(background);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Focus trap for modals
 */
export function createFocusTrap(element: HTMLElement): () => void {
    const focusableSelectors = [
        'button:not([disabled])',
        '[href]',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    const focusableElements = element.querySelectorAll<HTMLElement>(focusableSelectors);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                lastElement?.focus();
                e.preventDefault();
            }
        } else {
            if (document.activeElement === lastElement) {
                firstElement?.focus();
                e.preventDefault();
            }
        }
    };

    element.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => {
        element.removeEventListener('keydown', handleTabKey);
    };
}

/**
 * Format number for screen readers
 */
export function formatNumberForScreenReader(num: number, decimals = 1): string {
    const formatted = num.toFixed(decimals);
    return formatted.replace('.', ' point ');
}

/**
 * Get readable date for screen readers
 */
export function getReadableDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

/**
 * Keyboard navigation helper
 */
export function handleArrowKeyNavigation(
    event: React.KeyboardEvent,
    items: HTMLElement[],
    currentIndex: number,
    onIndexChange: (index: number) => void
) {
    const { key } = event;

    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) {
        return;
    }

    event.preventDefault();

    let newIndex = currentIndex;

    switch (key) {
        case 'ArrowUp':
        case 'ArrowLeft':
            newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
            break;
        case 'ArrowDown':
        case 'ArrowRight':
            newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
            break;
        case 'Home':
            newIndex = 0;
            break;
        case 'End':
            newIndex = items.length - 1;
            break;
    }

    onIndexChange(newIndex);
    items[newIndex]?.focus();
}

/**
 * Generate unique ID for ARIA attributes
 */
let idCounter = 0;
export function generateAriaId(prefix = 'aria'): string {
    return `${prefix}-${Date.now()}-${++idCounter}`;
}
