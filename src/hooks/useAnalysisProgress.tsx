import { useState, useEffect } from 'react';

interface AnalysisProgress {
  isAnalyzing: boolean;
  progress: number;
  total: number;
  completed: number;
  startProgress: () => void;
  updateProgress: (completed: number, total: number) => void;
  finishProgress: () => void;
  resetProgress: () => void;
}

export const useAnalysisProgress = (namespace: string = 'default'): AnalysisProgress => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [completed, setCompleted] = useState(0);
  const storageKey = `analysis_progress_${namespace}`;

// Persist progress in localStorage, scoped by namespace
useEffect(() => {
  const savedProgress = localStorage.getItem(storageKey);
  if (savedProgress) {
    const { isAnalyzing: savedAnalyzing, completed: savedCompleted, total: savedTotal, timestamp } = JSON.parse(savedProgress);
    
    // Auto-clear stuck progress (older than 10 minutes)
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;
    if (timestamp && (now - timestamp) > tenMinutes) {
      console.log('🧹 Auto-clearing stuck analysis progress (older than 10 minutes)');
      localStorage.removeItem(storageKey);
      return;
    }
    
    setIsAnalyzing(savedAnalyzing);
    setCompleted(savedCompleted);
    setTotal(savedTotal);

    if (savedTotal > 0) {
      setProgress((savedCompleted / savedTotal) * 100);
    }
  }
}, [storageKey]);

  const startProgress = () => {
    setIsAnalyzing(true);
    setProgress(0);
    setCompleted(0);
    setTotal(0);
    localStorage.setItem(storageKey, JSON.stringify({
      isAnalyzing: true,
      completed: 0,
      total: 0,
      timestamp: Date.now()
    }));
  };

  const resetProgress = () => {
    setIsAnalyzing(false);
    setProgress(0);
    setCompleted(0);
    setTotal(0);
    localStorage.removeItem(storageKey);
  };

  const updateProgress = (newCompleted: number, newTotal: number) => {
    setCompleted(newCompleted);
    setTotal(newTotal);

    const newProgress = newTotal > 0 ? (newCompleted / newTotal) * 100 : 0;
    setProgress(newProgress);

  localStorage.setItem(storageKey, JSON.stringify({
    isAnalyzing: true,
    completed: newCompleted,
    total: newTotal,
    timestamp: Date.now()
  }));
  };

  const finishProgress = () => {
    setIsAnalyzing(false);
    setProgress(100);

    // Clear localStorage immediately to prevent state restoration issues
    localStorage.removeItem(storageKey);

    setTimeout(() => {
      setProgress(0);
      setCompleted(0);
      setTotal(0);
    }, 2000);
  };

  return {
    isAnalyzing,
    progress,
    total,
    completed,
    startProgress,
    updateProgress,
    finishProgress,
    resetProgress
  };
};