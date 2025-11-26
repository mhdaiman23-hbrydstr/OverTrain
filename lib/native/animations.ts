/**
 * GPU-Accelerated Animation Utilities
 * 
 * Provides smooth 60fps animations by leveraging GPU acceleration.
 * Uses CSS transforms and will-change for optimal performance.
 */

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { isNative, isPluginAvailable } from './platform';

// ============================================================================
// ANIMATION CONSTANTS
// ============================================================================

/**
 * Standard animation durations (in ms)
 */
export const DURATIONS = {
  instant: 100,
  fast: 150,
  normal: 250,
  slow: 400,
  verySlow: 600,
} as const;

/**
 * Easing functions for smooth animations
 */
export const EASINGS = {
  // Standard easings
  linear: 'linear',
  ease: 'ease',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
  
  // Spring-like easings
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  springGentle: 'cubic-bezier(0.22, 1, 0.36, 1)',
  springBounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  
  // Smooth easings
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  smoothIn: 'cubic-bezier(0.4, 0, 1, 1)',
  smoothOut: 'cubic-bezier(0, 0, 0.2, 1)',
} as const;

// ============================================================================
// HAPTIC FEEDBACK
// ============================================================================

/**
 * Trigger haptic feedback (native only)
 */
export async function hapticFeedback(
  type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection'
): Promise<void> {
  if (!isNative() || !isPluginAvailable('Haptics')) {
    return;
  }

  try {
    switch (type) {
      case 'light':
        await Haptics.impact({ style: ImpactStyle.Light });
        break;
      case 'medium':
        await Haptics.impact({ style: ImpactStyle.Medium });
        break;
      case 'heavy':
        await Haptics.impact({ style: ImpactStyle.Heavy });
        break;
      case 'success':
        await Haptics.notification({ type: NotificationType.Success });
        break;
      case 'warning':
        await Haptics.notification({ type: NotificationType.Warning });
        break;
      case 'error':
        await Haptics.notification({ type: NotificationType.Error });
        break;
      case 'selection':
        await Haptics.selectionStart();
        await Haptics.selectionEnd();
        break;
    }
  } catch (error) {
    // Silently fail if haptics not available
  }
}

// ============================================================================
// CSS ANIMATION HELPERS
// ============================================================================

/**
 * Get GPU-accelerated transform styles
 */
export function getGPUStyles(): React.CSSProperties {
  return {
    transform: 'translate3d(0, 0, 0)',
    backfaceVisibility: 'hidden',
    perspective: 1000,
  };
}

/**
 * Get will-change hint for animation optimization
 */
export function getWillChangeStyles(properties: string[]): React.CSSProperties {
  return {
    willChange: properties.join(', '),
  };
}

/**
 * Create transition style
 */
export function createTransition(
  properties: string[],
  duration: keyof typeof DURATIONS = 'normal',
  easing: keyof typeof EASINGS = 'smooth'
): React.CSSProperties {
  const transitionValue = properties
    .map(prop => `${prop} ${DURATIONS[duration]}ms ${EASINGS[easing]}`)
    .join(', ');
  
  return {
    transition: transitionValue,
  };
}

// ============================================================================
// SET COMPLETION ANIMATION
// ============================================================================

/**
 * Generate CSS classes for set completion animation
 */
export const setCompletionAnimation = {
  /**
   * CSS keyframes for checkmark appearance
   */
  keyframes: `
    @keyframes checkmark-draw {
      0% {
        stroke-dashoffset: 24;
      }
      100% {
        stroke-dashoffset: 0;
      }
    }
    
    @keyframes checkmark-pop {
      0% {
        transform: scale(0);
        opacity: 0;
      }
      50% {
        transform: scale(1.2);
      }
      100% {
        transform: scale(1);
        opacity: 1;
      }
    }
    
    @keyframes set-complete-pulse {
      0% {
        box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4);
      }
      70% {
        box-shadow: 0 0 0 10px rgba(34, 197, 94, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
      }
    }
    
    @keyframes confetti-burst {
      0% {
        transform: scale(0) rotate(0deg);
        opacity: 1;
      }
      50% {
        opacity: 1;
      }
      100% {
        transform: scale(1) rotate(180deg);
        opacity: 0;
      }
    }
  `,
  
  /**
   * CSS classes
   */
  classes: {
    checkmark: 'animate-checkmark-pop',
    pulse: 'animate-set-complete-pulse',
    confetti: 'animate-confetti-burst',
  },
};

// ============================================================================
// EXERCISE CARD ANIMATIONS
// ============================================================================

/**
 * Exercise card expand/collapse animation configuration
 */
export const exerciseCardAnimation = {
  /**
   * CSS keyframes
   */
  keyframes: `
    @keyframes card-expand {
      0% {
        max-height: 0;
        opacity: 0;
        transform: translateY(-10px);
      }
      100% {
        max-height: 1000px;
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes card-collapse {
      0% {
        max-height: 1000px;
        opacity: 1;
        transform: translateY(0);
      }
      100% {
        max-height: 0;
        opacity: 0;
        transform: translateY(-10px);
      }
    }
    
    @keyframes card-slide-in {
      0% {
        transform: translateX(-100%);
        opacity: 0;
      }
      100% {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes card-slide-out {
      0% {
        transform: translateX(0);
        opacity: 1;
      }
      100% {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `,
  
  /**
   * Get expand styles
   */
  getExpandStyles: (isExpanded: boolean): React.CSSProperties => ({
    overflow: 'hidden',
    transition: `max-height ${DURATIONS.normal}ms ${EASINGS.smooth}, 
                 opacity ${DURATIONS.fast}ms ${EASINGS.smooth}`,
    maxHeight: isExpanded ? '1000px' : '0px',
    opacity: isExpanded ? 1 : 0,
    ...getGPUStyles(),
  }),
};

// ============================================================================
// REST TIMER ANIMATION
// ============================================================================

/**
 * Rest timer arc animation configuration
 */
export const restTimerAnimation = {
  /**
   * Get arc style for SVG circle
   */
  getArcStyles: (progress: number): React.CSSProperties => {
    const circumference = 2 * Math.PI * 45; // radius = 45
    const offset = circumference * (1 - progress);
    
    return {
      strokeDasharray: circumference,
      strokeDashoffset: offset,
      transition: 'stroke-dashoffset 1s linear',
      transform: 'rotate(-90deg)',
      transformOrigin: '50% 50%',
    };
  },
  
  /**
   * CSS keyframes for pulsing when timer is low
   */
  keyframes: `
    @keyframes timer-pulse {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.05);
      }
    }
    
    @keyframes timer-urgent {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.7;
      }
    }
  `,
};

// ============================================================================
// WEIGHT INPUT ANIMATION
// ============================================================================

/**
 * Weight input animation (on focus/blur)
 */
export const weightInputAnimation = {
  /**
   * CSS keyframes
   */
  keyframes: `
    @keyframes input-focus {
      0% {
        border-color: transparent;
        box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
      }
      100% {
        border-color: rgb(59, 130, 246);
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
      }
    }
    
    @keyframes input-shake {
      0%, 100% {
        transform: translateX(0);
      }
      25% {
        transform: translateX(-4px);
      }
      75% {
        transform: translateX(4px);
      }
    }
    
    @keyframes weight-update {
      0% {
        background-color: rgba(34, 197, 94, 0.2);
      }
      100% {
        background-color: transparent;
      }
    }
  `,
  
  /**
   * Get focus styles
   */
  getFocusStyles: (isFocused: boolean): React.CSSProperties => ({
    transition: `border-color ${DURATIONS.fast}ms ${EASINGS.smooth}, 
                 box-shadow ${DURATIONS.fast}ms ${EASINGS.smooth}`,
    borderColor: isFocused ? 'rgb(59, 130, 246)' : 'transparent',
    boxShadow: isFocused ? '0 0 0 3px rgba(59, 130, 246, 0.2)' : 'none',
    ...getGPUStyles(),
  }),
};

// ============================================================================
// STAGGER ANIMATION HELPER
// ============================================================================

/**
 * Get stagger delay for list items
 */
export function getStaggerDelay(
  index: number, 
  baseDelay: number = 50,
  maxDelay: number = 500
): number {
  return Math.min(index * baseDelay, maxDelay);
}

/**
 * Get stagger animation styles
 */
export function getStaggerStyles(
  index: number,
  baseDelay: number = 50
): React.CSSProperties {
  return {
    animationDelay: `${getStaggerDelay(index, baseDelay)}ms`,
    animationFillMode: 'both',
  };
}

// ============================================================================
// COMBINED ANIMATION STYLES
// ============================================================================

/**
 * All animation keyframes combined
 */
export const ALL_KEYFRAMES = `
${setCompletionAnimation.keyframes}
${exerciseCardAnimation.keyframes}
${restTimerAnimation.keyframes}
${weightInputAnimation.keyframes}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes slide-up {
  from { 
    transform: translateY(20px); 
    opacity: 0; 
  }
  to { 
    transform: translateY(0); 
    opacity: 1; 
  }
}

@keyframes slide-down {
  from { 
    transform: translateY(-20px); 
    opacity: 0; 
  }
  to { 
    transform: translateY(0); 
    opacity: 1; 
  }
}

@keyframes scale-in {
  from { 
    transform: scale(0.9); 
    opacity: 0; 
  }
  to { 
    transform: scale(1); 
    opacity: 1; 
  }
}

@keyframes bounce-in {
  0% { 
    transform: scale(0);
  }
  50% { 
    transform: scale(1.1);
  }
  100% { 
    transform: scale(1);
  }
}
`;

// ============================================================================
// ANIMATION HOOK HELPERS
// ============================================================================

/**
 * Request animation frame with cleanup
 */
export function requestAnimationFrameWithCleanup(
  callback: () => void
): () => void {
  let frameId: number | null = null;
  
  const animate = () => {
    callback();
    frameId = requestAnimationFrame(animate);
  };
  
  frameId = requestAnimationFrame(animate);
  
  return () => {
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
    }
  };
}

/**
 * Animate a value with spring physics
 */
export function springAnimate(
  from: number,
  to: number,
  config: {
    stiffness?: number;
    damping?: number;
    mass?: number;
    onUpdate: (value: number) => void;
    onComplete?: () => void;
  }
): () => void {
  const { 
    stiffness = 170, 
    damping = 26, 
    mass = 1,
    onUpdate,
    onComplete,
  } = config;
  
  let position = from;
  let velocity = 0;
  let lastTime = performance.now();
  let frameId: number | null = null;
  
  const animate = (currentTime: number) => {
    const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.064); // Cap at ~15fps minimum
    lastTime = currentTime;
    
    // Spring physics
    const displacement = position - to;
    const springForce = -stiffness * displacement;
    const dampingForce = -damping * velocity;
    const acceleration = (springForce + dampingForce) / mass;
    
    velocity += acceleration * deltaTime;
    position += velocity * deltaTime;
    
    onUpdate(position);
    
    // Check if animation should stop
    const isAtRest = Math.abs(velocity) < 0.01 && Math.abs(displacement) < 0.01;
    
    if (isAtRest) {
      onUpdate(to);
      onComplete?.();
    } else {
      frameId = requestAnimationFrame(animate);
    }
  };
  
  frameId = requestAnimationFrame(animate);
  
  return () => {
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
    }
  };
}

// Development logging
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).AnimationUtils = {
    hapticFeedback,
    springAnimate,
    DURATIONS,
    EASINGS,
  };
}

