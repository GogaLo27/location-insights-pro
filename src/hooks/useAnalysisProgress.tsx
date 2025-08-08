import { useState, useEffect } from 'react';

interface AnalysisProgress {
  isAnalyzing: boolean;
  progress: number;
  total: number;
  completed: number;
  startProgress: () => void;
  updateProgress: (completed: number, total: number) => void;
  finishProgress: () => void;
}

export const useAnalysisProgress = (): AnalysisProgress => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [completed, setCompleted] = useState(0);

  // Persist progress in localStorage
  useEffect(() => {
    const savedProgress = localStorage.getItem('analysis_progress');
    if (savedProgress) {
      const { isAnalyzing: savedAnalyzing, completed: savedCompleted, total: savedTotal } = JSON.parse(savedProgress);
      setIsAnalyzing(savedAnalyzing);
      setCompleted(savedCompleted);
      setTotal(savedTotal);
      
      if (savedTotal > 0) {
        setProgress((savedCompleted / savedTotal) * 100);
      }
    }
  }, []);

  const startProgress = () => {
    setIsAnalyzing(true);
    setProgress(0);
    setCompleted(0);
    setTotal(0);
    
    localStorage.setItem('analysis_progress', JSON.stringify({
      isAnalyzing: true,
      completed: 0,
      total: 0
    }));
  };

  const updateProgress = (newCompleted: number, newTotal: number) => {
    setCompleted(newCompleted);
    setTotal(newTotal);
    
    const newProgress = newTotal > 0 ? (newCompleted / newTotal) * 100 : 0;
    setProgress(newProgress);
    
    localStorage.setItem('analysis_progress', JSON.stringify({
      isAnalyzing: true,
      completed: newCompleted,
      total: newTotal
    }));
  };

  const finishProgress = () => {
    setIsAnalyzing(false);
    setProgress(100);
    
    setTimeout(() => {
      setProgress(0);
      setCompleted(0);
      setTotal(0);
      localStorage.removeItem('analysis_progress');
    }, 2000);
  };

  return {
    isAnalyzing,
    progress,
    total,
    completed,
    startProgress,
    updateProgress,
    finishProgress
  };
};