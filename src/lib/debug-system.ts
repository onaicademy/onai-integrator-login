/**
 * Debug & Health Check System
 * Self-Validating UI Architecture
 * 
 * "If it's not tested and logged, it doesn't exist."
 */

export type SystemStatus = 'operational' | 'degraded' | 'down' | 'unknown';
export type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'action';

export interface SystemModule {
  id: string;
  name: string;
  status: SystemStatus;
  lastCheck: Date;
  message?: string;
  details?: Record<string, any>;
}

export interface ActionLog {
  id: string;
  timestamp: Date;
  level: LogLevel;
  action: string;
  target: string;
  request?: {
    method: string;
    url: string;
    payload?: any;
  };
  response?: {
    status: number;
    data?: any;
    error?: string;
  };
  duration?: number;
  metadata?: Record<string, any>;
}

export interface HealthCheckResult {
  overall: SystemStatus;
  modules: SystemModule[];
  lastUpdate: Date;
  uptime: number;
}

class DebugSystem {
  private static instance: DebugSystem;
  private modules: Map<string, SystemModule> = new Map();
  private actionLogs: ActionLog[] = [];
  private maxLogs = 500;
  private listeners: Set<() => void> = new Set();
  private startTime: number = Date.now();

  private constructor() {
    this.initializeModules();
    this.startHealthChecks();
  }

  static getInstance(): DebugSystem {
    if (!DebugSystem.instance) {
      DebugSystem.instance = new DebugSystem();
    }
    return DebugSystem.instance;
  }

  private initializeModules() {
    const modules: SystemModule[] = [
      {
        id: 'auth',
        name: 'Authentication',
        status: 'unknown',
        lastCheck: new Date(),
      },
      {
        id: 'api',
        name: 'API Connection',
        status: 'unknown',
        lastCheck: new Date(),
      },
      {
        id: 'database',
        name: 'Database',
        status: 'unknown',
        lastCheck: new Date(),
      },
      {
        id: 'fb-ads',
        name: 'Facebook Ads API',
        status: 'unknown',
        lastCheck: new Date(),
      },
      {
        id: 'data-fetch',
        name: 'Data Fetching',
        status: 'unknown',
        lastCheck: new Date(),
      },
      {
        id: 'storage',
        name: 'Local Storage',
        status: 'unknown',
        lastCheck: new Date(),
      },
    ];

    modules.forEach(module => {
      this.modules.set(module.id, module);
    });
  }

  private startHealthChecks() {
    // Run health checks every 30 seconds
    setInterval(() => {
      this.runHealthChecks();
    }, 30000);

    // Initial check
    setTimeout(() => this.runHealthChecks(), 1000);
  }

  private async runHealthChecks() {
    // Auth check
    try {
      const token = localStorage.getItem('traffic_token');
      this.updateModule('auth', {
        status: token ? 'operational' : 'down',
        message: token ? 'Token present' : 'No token found',
      });
    } catch (error) {
      this.updateModule('auth', {
        status: 'down',
        message: 'Auth check failed',
      });
    }

    // Storage check
    try {
      localStorage.setItem('_health_check', 'ok');
      const check = localStorage.getItem('_health_check');
      this.updateModule('storage', {
        status: check === 'ok' ? 'operational' : 'down',
        message: check === 'ok' ? 'Storage accessible' : 'Storage error',
      });
      localStorage.removeItem('_health_check');
    } catch (error) {
      this.updateModule('storage', {
        status: 'down',
        message: 'Storage not accessible',
      });
    }

    // API check (based on last successful request)
    const apiModule = this.modules.get('api');
    if (apiModule) {
      const timeSinceLastCheck = Date.now() - apiModule.lastCheck.getTime();
      if (timeSinceLastCheck > 60000) {
        this.updateModule('api', {
          status: 'unknown',
          message: 'No recent API activity',
        });
      }
    }

    this.notifyListeners();
  }

  updateModule(moduleId: string, updates: Partial<SystemModule>) {
    const module = this.modules.get(moduleId);
    if (module) {
      this.modules.set(moduleId, {
        ...module,
        ...updates,
        lastCheck: new Date(),
      });
      this.notifyListeners();
    }
  }

  logAction(log: Omit<ActionLog, 'id' | 'timestamp'>): void {
    const newLog: ActionLog = {
      ...log,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    this.actionLogs.unshift(newLog);

    // Trim logs if exceeds max
    if (this.actionLogs.length > this.maxLogs) {
      this.actionLogs = this.actionLogs.slice(0, this.maxLogs);
    }

    // Update relevant module status based on log
    if (log.request) {
      if (log.response) {
        const status = log.response.status;
        if (status >= 200 && status < 300) {
          // Determine module based on URL
          let moduleId = 'api';
          if (log.request.url.includes('facebook') || log.request.url.includes('fb')) {
            moduleId = 'fb-ads';
          } else if (log.request.url.includes('supabase')) {
            moduleId = 'database';
          }

          this.updateModule(moduleId, {
            status: 'operational',
            message: `${log.request.method} ${log.request.url} - ${status}`,
          });
        } else if (status >= 400) {
          let moduleId = 'api';
          if (log.request.url.includes('facebook') || log.request.url.includes('fb')) {
            moduleId = 'fb-ads';
          } else if (log.request.url.includes('supabase')) {
            moduleId = 'database';
          }

          this.updateModule(moduleId, {
            status: status >= 500 ? 'down' : 'degraded',
            message: `Error ${status}: ${log.response.error || 'Request failed'}`,
          });
        }
      }
    }

    this.notifyListeners();
  }

  getHealthReport(): HealthCheckResult {
    const modules = Array.from(this.modules.values());
    
    // Determine overall status
    let overall: SystemStatus = 'operational';
    const downModules = modules.filter(m => m.status === 'down');
    const degradedModules = modules.filter(m => m.status === 'degraded');
    
    if (downModules.length > 0) {
      overall = 'down';
    } else if (degradedModules.length > 0) {
      overall = 'degraded';
    } else if (modules.some(m => m.status === 'unknown')) {
      overall = 'unknown';
    }

    return {
      overall,
      modules,
      lastUpdate: new Date(),
      uptime: Date.now() - this.startTime,
    };
  }

  getActionLogs(limit?: number): ActionLog[] {
    return limit ? this.actionLogs.slice(0, limit) : this.actionLogs;
  }

  clearLogs(): void {
    this.actionLogs = [];
    this.notifyListeners();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  exportHealthReport(): string {
    const report = this.getHealthReport();
    const logs = this.getActionLogs(50);
    
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      overall_status: report.overall,
      uptime_ms: report.uptime,
      modules: report.modules.map(m => ({
        id: m.id,
        name: m.name,
        status: m.status,
        last_check: m.lastCheck.toISOString(),
        message: m.message,
      })),
      recent_logs: logs.map(l => ({
        timestamp: l.timestamp.toISOString(),
        level: l.level,
        action: l.action,
        target: l.target,
        request: l.request ? {
          method: l.request.method,
          url: l.request.url,
        } : undefined,
        response: l.response ? {
          status: l.response.status,
          error: l.response.error,
        } : undefined,
        duration_ms: l.duration,
      })),
    }, null, 2);
  }
}

export const debugSystem = DebugSystem.getInstance();
