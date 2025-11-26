/**
 * Animation Hooks for Workout Logger
 * 
 * Provides React hooks for GPU-accelerated animations and haptic feedback.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { 
  hapticFeedback, 
  springAnimate, 
  DURATIONS, 
  EASINGS,
  getGPUStyles,
  createTransition,
} from '@/lib/native/animations';

/**
 * Hook for set completion animation with haptic feedback
 */
export function useSetCompletionAnimation() {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  
  const triggerAnimation = useCallback(async (isPersonalRecord = false) => {
    setIsAnimating(true);
    
    // Haptic feedback
    await hapticFeedback(isPersonalRecord ? 'success' : 'medium');
    
    // Show confetti for PRs
    if (isPersonalRecord) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 1000);
    }
    
    // Reset animation state
    setTimeout(() => setIsAnimating(false), DURATIONS.normal);
  }, []);
  
  return {
    isAnimating,
    showConfetti,
    triggerAnimation,
    animationClass: isAnimating ? 'animate-set-complete' : '',
    confettiClass: showConfetti ? 'animate-confetti' : '',
  };
}

/**
 * Hook for exercise card expand/collapse animation
 */
export function useExpandAnimation(initialExpanded = false) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number>(0);
  
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [isExpanded]);
  
  const toggle = useCallback(() => {
    hapticFeedback('light');
    setIsExpanded(prev => !prev);
  }, []);
  
  const expand = useCallback(() => {
    hapticFeedback('light');
    setIsExpanded(true);
  }, []);
  
  const collapse = useCallback(() => {
    hapticFeedback('light');
    setIsExpanded(false);
  }, []);
  
  const containerStyle: React.CSSProperties = {
    maxHeight: isExpanded ? `${contentHeight}px` : '0px',
    overflow: 'hidden',
    transition: `max-height ${DURATIONS.normal}ms ${EASINGS.smooth}`,
    ...getGPUStyles(),
  };
  
  return {
    isExpanded,
    toggle,
    expand,
    collapse,
    containerStyle,
    contentRef,
  };
}

/**
 * Hook for input focus animation
 */
export function useInputAnimation() {
  const [isFocused, setIsFocused] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  const onFocus = useCallback(() => {
    setIsFocused(true);
    hapticFeedback('selection');
  }, []);
  
  const onBlur = useCallback(() => {
    setIsFocused(false);
  }, []);
  
  const triggerError = useCallback(() => {
    setHasError(true);
    hapticFeedback('error');
    setTimeout(() => setHasError(false), 500);
  }, []);
  
  const inputStyle: React.CSSProperties = {
    ...createTransition(['border-color', 'box-shadow'], 'fast'),
    borderColor: isFocused ? 'rgb(59, 130, 246)' : undefined,
    boxShadow: isFocused ? '0 0 0 3px rgba(59, 130, 246, 0.2)' : undefined,
    ...getGPUStyles(),
  };
  
  return {
    isFocused,
    hasError,
    onFocus,
    onBlur,
    triggerError,
    inputStyle,
    errorClass: hasError ? 'animate-shake' : '',
  };
}

/**
 * Hook for staggered list animation
 */
export function useStaggerAnimation(itemCount: number, baseDelay = 50) {
  const getItemStyle = useCallback((index: number): React.CSSProperties => ({
    opacity: 0,
    animation: `slide-up ${DURATIONS.normal}ms ${EASINGS.smooth} forwards`,
    animationDelay: `${Math.min(index * baseDelay, 500)}ms`,
    ...getGPUStyles(),
  }), [baseDelay]);
  
  const getItemClass = useCallback((index: number): string => {
    return 'animate-stagger-item';
  }, []);
  
  return {
    getItemStyle,
    getItemClass,
  };
}

/**
 * Hook for spring-animated value
 */
export function useSpringValue(
  targetValue: number,
  config?: {
    stiffness?: number;
    damping?: number;
    mass?: number;
  }
) {
  const [value, setValue] = useState(targetValue);
  const cleanupRef = useRef<(() => void) | null>(null);
  
  useEffect(() => {
    // Cleanup previous animation
    if (cleanupRef.current) {
      cleanupRef.current();
    }
    
    // Start new animation
    cleanupRef.current = springAnimate(value, targetValue, {
      ...config,
      onUpdate: setValue,
    });
    
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [targetValue]);
  
  return value;
}

/**
 * Hook for rest timer animation
 */
export function useRestTimerAnimation(
  totalSeconds: number,
  remainingSeconds: number
) {
  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  const circumference = 2 * Math.PI * 45; // radius = 45
  const offset = circumference * (1 - progress);
  
  const isUrgent = remainingSeconds <= 10 && remainingSeconds > 0;
  const isComplete = remainingSeconds === 0;
  
  useEffect(() => {
    if (isComplete) {
      hapticFeedback('success');
    } else if (remainingSeconds === 10) {
      hapticFeedback('warning');
    }
  }, [remainingSeconds, isComplete]);
  
  const arcStyle: React.CSSProperties = {
    strokeDasharray: circumference,
    strokeDashoffset: offset,
    transition: 'stroke-dashoffset 1s linear',
    transform: 'rotate(-90deg)',
    transformOrigin: '50% 50%',
  };
  
  return {
    progress,
    arcStyle,
    isUrgent,
    isComplete,
    urgentClass: isUrgent ? 'animate-timer-pulse' : '',
  };
}

/**
 * Hook for button press animation
 */
export function useButtonPressAnimation() {
  const [isPressed, setIsPressed] = useState(false);
  
  const onPressStart = useCallback(() => {
    setIsPressed(true);
    hapticFeedback('light');
  }, []);
  
  const onPressEnd = useCallback(() => {
    setIsPressed(false);
  }, []);
  
  const buttonStyle: React.CSSProperties = {
    transform: isPressed ? 'scale(0.97)' : 'scale(1)',
    ...createTransition(['transform'], 'instant'),
    ...getGPUStyles(),
  };
  
  return {
    isPressed,
    onPressStart,
    onPressEnd,
    buttonStyle,
    handlers: {
      onMouseDown: onPressStart,
      onMouseUp: onPressEnd,
      onMouseLeave: onPressEnd,
      onTouchStart: onPressStart,
      onTouchEnd: onPressEnd,
    },
  };
}

/**
 * Hook for workout completion celebration
 */
export function useWorkoutCompletionAnimation() {
  const [isShowing, setIsShowing] = useState(false);
  
  const trigger = useCallback(async () => {
    setIsShowing(true);
    await hapticFeedback('success');
    
    // Auto-hide after animation
    setTimeout(() => setIsShowing(false), 3000);
  }, []);
  
  return {
    isShowing,
    trigger,
    hide: () => setIsShowing(false),
  };
}

