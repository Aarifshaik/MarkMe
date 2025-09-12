'use client';

import { useEffect } from 'react';

interface KeyboardHandlers {
  onEnter?: () => void;
  onShift?: () => void;
  onEscape?: () => void;
  onSpace?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
}

export const useKeyboard = (handlers: KeyboardHandlers, enabled = true) => {
  useEffect(() => {
    if (!enabled) return;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Enter':
          event.preventDefault();
          handlers.onEnter?.();
          break;
        case 'Shift':
          event.preventDefault();
          handlers.onShift?.();
          break;
        case 'Escape':
          event.preventDefault();
          handlers.onEscape?.();
          break;
        case ' ':
          event.preventDefault();
          handlers.onSpace?.();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          handlers.onArrowLeft?.();
          break;
        case 'ArrowRight':
          event.preventDefault();
          handlers.onArrowRight?.();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers, enabled]);
};