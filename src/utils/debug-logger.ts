/**
 * Debug Logger
 * Collects console logs for error reporting
 */

const MAX_LOGS = 100; // Keep last 100 logs
const DEBUG_LOGS_KEY = 'debug_logs';

class DebugLogger {
  private logs: string[] = [];
  private originalConsole: any = {};
  
  constructor() {
    this.initializeLogger();
    this.loadLogsFromStorage();
  }
  
  private initializeLogger() {
    // Save original console methods
    this.originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info
    };
    
    // Override console methods
    console.log = (...args: any[]) => {
      this.addLog('[LOG]', args);
      this.originalConsole.log.apply(console, args);
    };
    
    console.error = (...args: any[]) => {
      this.addLog('[ERROR]', args);
      this.originalConsole.error.apply(console, args);
    };
    
    console.warn = (...args: any[]) => {
      this.addLog('[WARN]', args);
      this.originalConsole.warn.apply(console, args);
    };
    
    console.info = (...args: any[]) => {
      this.addLog('[INFO]', args);
      this.originalConsole.info.apply(console, args);
    };
  }
  
  private addLog(level: string, args: any[]) {
    try {
      const timestamp = new Date().toLocaleTimeString('ru-RU');
      const message = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');
      
      const logEntry = `${timestamp} ${level} ${message}`;
      this.logs.push(logEntry);
      
      // Keep only last MAX_LOGS entries
      if (this.logs.length > MAX_LOGS) {
        this.logs = this.logs.slice(-MAX_LOGS);
      }
      
      // Save to sessionStorage
      this.saveLogsToStorage();
    } catch (error) {
      // Fail silently to avoid infinite loops
    }
  }
  
  private saveLogsToStorage() {
    try {
      sessionStorage.setItem(DEBUG_LOGS_KEY, JSON.stringify(this.logs));
    } catch (e) {
      // Storage full or unavailable
    }
  }
  
  private loadLogsFromStorage() {
    try {
      const stored = sessionStorage.getItem(DEBUG_LOGS_KEY);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (e) {
      this.logs = [];
    }
  }
  
  public getLogs(): string[] {
    return [...this.logs];
  }
  
  public clearLogs() {
    this.logs = [];
    sessionStorage.removeItem(DEBUG_LOGS_KEY);
  }
}

// Create singleton instance
export const debugLogger = new DebugLogger();

// Export function to get logs
export function getDebugLogs(): string[] {
  return debugLogger.getLogs();
}

export function clearDebugLogs() {
  debugLogger.clearLogs();
}
