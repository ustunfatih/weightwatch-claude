import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff } from 'lucide-react';
import toast from 'react-hot-toast';

interface VoiceInputProps {
    onWeightDetected: (weight: number) => void;
}

// S8: Rate limiting - minimum time between voice input attempts (ms)
const RATE_LIMIT_MS = 1000;

export function VoiceInput({ onWeightDetected }: VoiceInputProps) {
    const [isListening, setIsListening] = useState(false);
    const [isSupported, setIsSupported] = useState(false);

    // P7: Use ref to store recognition instance to avoid memory leak
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    // S8: Rate limiting ref
    const lastAttemptRef = useRef<number>(0);
    const isInitializedRef = useRef(false);

    // Memoize the weight detection callback
    const handleWeightDetected = useCallback((weight: number) => {
        onWeightDetected(weight);
    }, [onWeightDetected]);

    useEffect(() => {
        // Prevent double initialization in strict mode
        if (isInitializedRef.current) return;
        isInitializedRef.current = true;

        // Check if browser supports Web Speech API
        const SpeechRecognition = (window as typeof window & {
            SpeechRecognition?: typeof window.SpeechRecognition;
            webkitSpeechRecognition?: typeof window.SpeechRecognition;
        }).SpeechRecognition || (window as typeof window & {
            webkitSpeechRecognition?: typeof window.SpeechRecognition;
        }).webkitSpeechRecognition;

        if (SpeechRecognition) {
            setIsSupported(true);

            const recognitionInstance = new SpeechRecognition();
            recognitionInstance.continuous = false;
            recognitionInstance.interimResults = false;
            recognitionInstance.lang = 'en-US';

            recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
                const transcript = event.results[0][0].transcript.toLowerCase();

                // S7: Removed console.log for sensitive voice data

                // Try to extract weight from transcript
                const weight = extractWeight(transcript);

                if (weight) {
                    handleWeightDetected(weight);
                    toast.success(`Weight detected: ${weight} kg`);
                } else {
                    toast.error('Could not understand weight. Please try again.');
                }

                setIsListening(false);
            };

            recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
                // S7: Only log non-sensitive error types in development
                if (process.env.NODE_ENV === 'development') {
                    // Avoid logging the full event which may contain sensitive data
                    console.warn('Speech recognition error type:', event.error);
                }

                setIsListening(false);

                if (event.error === 'no-speech') {
                    toast.error('No speech detected. Please try again.');
                } else if (event.error === 'not-allowed') {
                    toast.error('Microphone access denied. Please enable it in your browser settings.');
                } else if (event.error === 'aborted') {
                    // User cancelled, no need to show error
                } else {
                    toast.error('Voice input error. Please try again.');
                }
            };

            recognitionInstance.onend = () => {
                setIsListening(false);
            };

            // P7: Store in ref instead of state
            recognitionRef.current = recognitionInstance;
        } else {
            setIsSupported(false);
        }

        // P7: Proper cleanup using ref
        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.abort();
                } catch {
                    // Ignore errors during cleanup
                }
                recognitionRef.current = null;
            }
            isInitializedRef.current = false;
        };
    }, [handleWeightDetected]);

    const startListening = useCallback(() => {
        const recognition = recognitionRef.current;

        // S8: Rate limiting check
        const now = Date.now();
        if (now - lastAttemptRef.current < RATE_LIMIT_MS) {
            toast.error('Please wait a moment before trying again.');
            return;
        }
        lastAttemptRef.current = now;

        if (recognition && !isListening) {
            try {
                recognition.start();
                setIsListening(true);
                toast('Listening... Say your weight (e.g., "95.5 kilograms")', {
                    icon: '🎤',
                    duration: 3000,
                });
            } catch {
                // S7: Removed error logging
                toast.error('Could not start voice input. Please try again.');
            }
        }
    }, [isListening]);

    const stopListening = useCallback(() => {
        const recognition = recognitionRef.current;
        if (recognition && isListening) {
            try {
                recognition.stop();
            } catch {
                // Ignore errors when stopping
            }
            setIsListening(false);
        }
    }, [isListening]);

    if (!isSupported) {
        return null; // Don't render if not supported
    }

    return (
        <motion.button
            type="button"
            onClick={isListening ? stopListening : startListening}
            className={`p-3 rounded-xl transition-all ${isListening
                    ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
            title={isListening ? 'Stop listening' : 'Use voice to enter weight'}
        >
            {isListening ? (
                <MicOff className="w-5 h-5" />
            ) : (
                <Mic className="w-5 h-5" />
            )}
        </motion.button>
    );
}

// Extract weight from voice transcript
function extractWeight(transcript: string): number | null {
    // Remove common words
    let cleaned = transcript
        .replace(/kilograms?|kgs?|pounds?|lbs?/gi, '')
        .replace(/point/gi, '.')
        .replace(/my weight is|i weigh|weight|is/gi, '')
        .trim();

    // Try to find a number
    const matches = cleaned.match(/(\d+\.?\d*)/);

    if (matches && matches[1]) {
        const weight = parseFloat(matches[1]);

        // Validate weight range (40-200 kg is reasonable)
        if (weight >= 40 && weight <= 200) {
            return weight;
        }
    }

    return null;
}
