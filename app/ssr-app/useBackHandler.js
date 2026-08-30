'use client';

import { useEffect, useRef } from 'react';
import { useApp } from './AppContext';

export function useBackHandler(active, onBack) {
  const { registerBackHandler } = useApp();
  const callbackRef = useRef(onBack);

  useEffect(() => {
    callbackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    if (!active) return undefined;
    return registerBackHandler(() => callbackRef.current?.());
  }, [active, registerBackHandler]);
}
