
import React, { useState, useEffect, useRef } from 'react';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  details?: any;
}

const DebugConsole: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Override console methods to capture logs
    const originalConsoleLog = console.log;
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;

    const addLog = (level: 'info' | 'warn' | 'error', ...args: any[]) => {
      const message = args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ');
      setLogs(prev => [...prev.slice(-49), { // Keep last 50 logs
        timestamp: new Date().toLocaleTimeString(),
        level,
        message,
        details: args.length > 1 ? args : undefined
      }]);
    };

    console.log = (...args) => {
      originalConsoleLog(...args);
      addLog('info', ...args);
    };

    console.warn = (...args) => {
      originalConsoleWarn(...args);
      addLog('warn', ...args);
    };

    console.error = (...args) => {
      originalConsoleError(...args);
      addLog('error', ...args);
    };

    // Capture global errors
    const handleError = (event: ErrorEvent) => {
      addLog('error', 'Uncaught Exception:', event.message);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      addLog('error', 'Unhandled Promise Rejection:', event.reason);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      console.log = originalConsoleLog;
      console.warn = originalConsoleWarn;
      console.error = originalConsoleError;
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    if (isVisible && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isVisible]);

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ${isVisible ? 'h-64' : 'h-8'} bg-black/90 text-green-400 font-mono text-xs border-t border-brand-accent`}>
      <div 
        className="h-8 flex items-center justify-between px-4 cursor-pointer hover:bg-white/5 select-none"
        onClick={() => setIsVisible(!isVisible)}
      >
        <span className="font-bold flex items-center gap-2">
           <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
           System Monitor & Debugger
           {logs.filter(l => l.level === 'error').length > 0 && (
             <span className="bg-red-500 text-white px-1.5 rounded-full text-[10px] ml-2 animate-pulse">
               {logs.filter(l => l.level === 'error').length} Errors
             </span>
           )}
        </span>
        <span>{isVisible ? '▼' : '▲'}</span>
      </div>
      
      {isVisible && (
        <div className="h-56 overflow-y-auto p-2 space-y-1">
          {logs.length === 0 && <p className="text-gray-500 italic">System ready. No logs yet.</p>}
          {logs.map((log, index) => (
            <div key={index} className={`flex gap-2 ${log.level === 'error' ? 'text-red-400 bg-red-900/20' : log.level === 'warn' ? 'text-yellow-400' : 'text-gray-300'} border-b border-white/5 pb-0.5`}>
              <span className="text-gray-500 shrink-0">[{log.timestamp}]</span>
              <span className="font-bold uppercase shrink-0 w-12">{log.level}</span>
              <span className="break-all">{log.message}</span>
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      )}
    </div>
  );
};

export default DebugConsole;