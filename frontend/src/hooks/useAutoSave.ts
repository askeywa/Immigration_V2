// frontend/src/hooks/useAutoSave.ts
import { useEffect, useRef, useCallback } from 'react';
import { setAutoSaveData } from '@/store/authStore';

interface UseAutoSaveOptions {
  type: 'tenant' | 'user' | 'super-admin';
  data: any;
  saveInterval?: number; // in milliseconds
  enabled?: boolean;
}

export const useAutoSave = ({ 
  type, 
  data, 
  saveInterval = 30000, // 30 seconds
  enabled = true 
}: UseAutoSaveOptions) => {
  const dataRef = useRef(data);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update data ref when data changes
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Auto-save function
  const autoSave = useCallback(() => {
    if (!enabled || !dataRef.current) return;
    
    try {
      setAutoSaveData(type, dataRef.current);
      console.log(`💾 Auto-saved ${type} data`);
    } catch (error) {
      console.error(`Error auto-saving ${type} data:`, error);
    }
  }, [type, enabled]);

  // Set up auto-save interval
  useEffect(() => {
    if (!enabled) return;

    intervalRef.current = setInterval(autoSave, saveInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoSave, saveInterval, enabled]);

  // Auto-save on data changes (debounced)
  useEffect(() => {
    if (!enabled) return;

    const timeoutId = setTimeout(() => {
      autoSave();
    }, 2000); // 2 second debounce

    return () => clearTimeout(timeoutId);
  }, [data, autoSave, enabled]);

  return {
    autoSave,
    clearAutoSave: () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  };
};

export default useAutoSave;
