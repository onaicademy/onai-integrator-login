/**
 * Action Logger Middleware
 * Tracks user interactions and UI events
 * 
 * "The Mirror Rule": Every UI action must be logged
 */

import { debugSystem } from './debug-system';

export type ActionType = 
  | 'click'
  | 'input'
  | 'submit'
  | 'navigation'
  | 'modal_open'
  | 'modal_close'
  | 'api_trigger'
  | 'form_submit'
  | 'toggle'
  | 'select'
  | 'upload';

interface LogActionParams {
  type: ActionType;
  target: string;
  label?: string;
  value?: any;
  metadata?: Record<string, any>;
}

class ActionLogger {
  private static instance: ActionLogger;
  private isEnabled: boolean = true;

  private constructor() {
    this.setupGlobalListeners();
  }

  static getInstance(): ActionLogger {
    if (!ActionLogger.instance) {
      ActionLogger.instance = new ActionLogger();
    }
    return ActionLogger.instance;
  }

  /**
   * Log a user action
   */
  log(params: LogActionParams): void {
    if (!this.isEnabled) return;

    const { type, target, label, value, metadata } = params;

    debugSystem.logAction({
      level: 'action',
      action: `User ${type}`,
      target: label || target,
      metadata: {
        actionType: type,
        element: target,
        value: this.sanitizeValue(value),
        ...metadata,
      },
    });
  }

  /**
   * Log a click event
   */
  logClick(target: string, label?: string, metadata?: Record<string, any>): void {
    this.log({
      type: 'click',
      target,
      label,
      metadata,
    });
  }

  /**
   * Log form submission
   */
  logFormSubmit(formName: string, data?: any): void {
    this.log({
      type: 'form_submit',
      target: formName,
      label: `Form: ${formName}`,
      value: data,
    });
  }

  /**
   * Log navigation
   */
  logNavigation(from: string, to: string): void {
    this.log({
      type: 'navigation',
      target: to,
      label: `Navigate: ${from} → ${to}`,
      metadata: { from, to },
    });
  }

  /**
   * Log modal interactions
   */
  logModal(action: 'open' | 'close', modalName: string): void {
    this.log({
      type: action === 'open' ? 'modal_open' : 'modal_close',
      target: modalName,
      label: `Modal ${action}: ${modalName}`,
    });
  }

  /**
   * Log toggle actions
   */
  logToggle(target: string, state: boolean, label?: string): void {
    this.log({
      type: 'toggle',
      target,
      label: label || target,
      value: state,
    });
  }

  /**
   * Log select/dropdown changes
   */
  logSelect(target: string, value: any, label?: string): void {
    this.log({
      type: 'select',
      target,
      label: label || target,
      value,
    });
  }

  /**
   * Log file upload
   */
  logUpload(target: string, fileName: string, fileSize?: number): void {
    this.log({
      type: 'upload',
      target,
      label: `Upload: ${fileName}`,
      metadata: {
        fileName,
        fileSize,
      },
    });
  }

  /**
   * Enable/disable logging
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  private setupGlobalListeners(): void {
    // Track route changes
    if (typeof window !== 'undefined') {
      let lastPath = window.location.pathname;
      
      // Intercept pushState and replaceState
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;

      history.pushState = (...args) => {
        const newPath = args[2]?.toString() || '';
        if (newPath !== lastPath) {
          this.logNavigation(lastPath, newPath);
          lastPath = newPath;
        }
        return originalPushState.apply(history, args);
      };

      history.replaceState = (...args) => {
        const newPath = args[2]?.toString() || '';
        if (newPath !== lastPath) {
          this.logNavigation(lastPath, newPath);
          lastPath = newPath;
        }
        return originalReplaceState.apply(history, args);
      };

      // Listen to popstate (back/forward)
      window.addEventListener('popstate', () => {
        const newPath = window.location.pathname;
        if (newPath !== lastPath) {
          this.logNavigation(lastPath, newPath);
          lastPath = newPath;
        }
      });
    }
  }

  private sanitizeValue(value: any): any {
    // Don't log sensitive data
    if (typeof value === 'object' && value !== null) {
      const sanitized: any = {};
      Object.keys(value).forEach(key => {
        if (/password|token|secret|key|auth/i.test(key)) {
          sanitized[key] = '***REDACTED***';
        } else {
          sanitized[key] = value[key];
        }
      });
      return sanitized;
    }
    return value;
  }
}

export const actionLogger = ActionLogger.getInstance();

/**
 * React Hook for logging actions
 */
export function useActionLogger() {
  return {
    logClick: (target: string, label?: string, metadata?: Record<string, any>) => 
      actionLogger.logClick(target, label, metadata),
    logFormSubmit: (formName: string, data?: any) => 
      actionLogger.logFormSubmit(formName, data),
    logNavigation: (from: string, to: string) => 
      actionLogger.logNavigation(from, to),
    logModal: (action: 'open' | 'close', modalName: string) => 
      actionLogger.logModal(action, modalName),
    logToggle: (target: string, state: boolean, label?: string) => 
      actionLogger.logToggle(target, state, label),
    logSelect: (target: string, value: any, label?: string) => 
      actionLogger.logSelect(target, value, label),
    logUpload: (target: string, fileName: string, fileSize?: number) => 
      actionLogger.logUpload(target, fileName, fileSize),
  };
}

/**
 * Higher-Order Component to wrap buttons with logging
 */
export function withActionLogging<P extends { onClick?: (...args: any[]) => void }>(
  Component: React.ComponentType<P>,
  actionLabel: string
) {
  return (props: P) => {
    const { onClick, ...rest } = props;
    
    const handleClick = (...args: any[]) => {
      actionLogger.logClick(actionLabel, actionLabel);
      onClick?.(...args);
    };

    const componentProps = { ...rest, onClick: handleClick } as P;
    return React.createElement(Component, componentProps);
  };
}
