/**
 * Monitoring and Error Tracking Utilities
 *
 * This module provides:
 * - Error tracking integration (Sentry-compatible)
 * - Performance monitoring
 * - Custom event logging
 * - Health check utilities
 *
 * Configuration: Set SENTRY_DSN in environment variables
 */

// ============================================
// Types
// ============================================

interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  extra?: Record<string, unknown>;
}

interface PerformanceEntry {
  name: string;
  duration: number;
  startTime: number;
  metadata?: Record<string, unknown>;
}

interface EventProperties {
  [key: string]: string | number | boolean | undefined;
}

// ============================================
// Error Tracking
// ============================================

let isInitialized = false;
let errorQueue: Array<{ error: Error; context?: ErrorContext }> = [];

/**
 * Initialize monitoring (call once on app load)
 */
export function initMonitoring(options: {
  dsn?: string;
  environment?: string;
  release?: string;
}) {
  if (typeof window === 'undefined') return;
  if (isInitialized) return;

  const { dsn, environment = 'production', release } = options;

  // Set up global error handler
  window.addEventListener('error', (event) => {
    captureError(event.error, { component: 'global' });
  });

  window.addEventListener('unhandledrejection', (event) => {
    captureError(new Error(String(event.reason)), { component: 'promise' });
  });

  // If Sentry DSN is provided, initialize Sentry
  if (dsn && window.Sentry) {
    window.Sentry.init({
      dsn,
      environment,
      release,
      tracesSampleRate: 0.1, // 10% of transactions
      beforeSend: (event: unknown) => {
        // Filter out known non-issues
        return event;
      },
    });
  }

  // Flush queued errors
  errorQueue.forEach(({ error, context }) => {
    captureError(error, context);
  });
  errorQueue = [];

  isInitialized = true;
  console.log('[Monitoring] Initialized');
}

/**
 * Capture and report an error
 */
export function captureError(error: Error, context?: ErrorContext): void {
  // Queue if not initialized yet
  if (!isInitialized && typeof window !== 'undefined') {
    errorQueue.push({ error, context });
    return;
  }

  // Console log for development
  console.error('[Error]', error.message, context);

  // Send to Sentry if available
  if (typeof window !== 'undefined' && window.Sentry) {
    window.Sentry.withScope((scope: SentryScope) => {
      if (context?.component) scope.setTag('component', context.component);
      if (context?.action) scope.setTag('action', context.action);
      if (context?.userId) scope.setUser({ id: context.userId });
      if (context?.extra) scope.setExtras(context.extra);
      window.Sentry.captureException(error);
    });
  }

  // Log to local storage for debug
  logErrorLocally(error, context);
}

/**
 * Log error to local storage for debugging
 */
function logErrorLocally(error: Error, context?: ErrorContext): void {
  if (typeof localStorage === 'undefined') return;

  const errors = JSON.parse(localStorage.getItem('rop_errors') || '[]');
  errors.unshift({
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    url: window.location.href,
  });

  // Keep last 50 errors
  if (errors.length > 50) errors.length = 50;

  localStorage.setItem('rop_errors', JSON.stringify(errors));
}

/**
 * Get locally stored errors (for debugging)
 */
export function getLocalErrors(): Array<{
  message: string;
  stack?: string;
  context?: ErrorContext;
  timestamp: string;
  url: string;
}> {
  if (typeof localStorage === 'undefined') return [];
  return JSON.parse(localStorage.getItem('rop_errors') || '[]');
}

/**
 * Clear local error log
 */
export function clearLocalErrors(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem('rop_errors');
}

// ============================================
// Performance Monitoring
// ============================================

const performanceMarks: Map<string, number> = new Map();

/**
 * Start a performance measurement
 */
export function startMeasure(name: string): void {
  performanceMarks.set(name, performance.now());

  if (typeof window !== 'undefined' && window.performance?.mark) {
    window.performance.mark(`${name}-start`);
  }
}

/**
 * End a performance measurement and return duration
 */
export function endMeasure(name: string, metadata?: Record<string, unknown>): number {
  const startTime = performanceMarks.get(name);
  if (!startTime) {
    console.warn(`[Performance] No start mark for: ${name}`);
    return 0;
  }

  const duration = performance.now() - startTime;
  performanceMarks.delete(name);

  if (typeof window !== 'undefined' && window.performance?.mark) {
    window.performance.mark(`${name}-end`);
    window.performance.measure(name, `${name}-start`, `${name}-end`);
  }

  // Log slow operations
  if (duration > 1000) {
    console.warn(`[Performance] Slow operation: ${name} took ${duration.toFixed(0)}ms`, metadata);
  }

  // Log to local storage
  logPerformanceLocally({ name, duration, startTime, metadata });

  return duration;
}

/**
 * Log performance entry locally
 */
function logPerformanceLocally(entry: PerformanceEntry): void {
  if (typeof localStorage === 'undefined') return;

  const entries = JSON.parse(localStorage.getItem('rop_perf') || '[]');
  entries.unshift({
    ...entry,
    timestamp: new Date().toISOString(),
  });

  // Keep last 100 entries
  if (entries.length > 100) entries.length = 100;

  localStorage.setItem('rop_perf', JSON.stringify(entries));
}

/**
 * Get performance entries
 */
export function getPerformanceEntries(): PerformanceEntry[] {
  if (typeof localStorage === 'undefined') return [];
  return JSON.parse(localStorage.getItem('rop_perf') || '[]');
}

// ============================================
// Event Tracking
// ============================================

/**
 * Track a custom event
 */
export function trackEvent(
  name: string,
  properties?: EventProperties
): void {
  // Console log
  console.log(`[Event] ${name}`, properties);

  // Send to analytics
  if (typeof window !== 'undefined') {
    // Google Analytics 4
    if (window.gtag) {
      window.gtag('event', name, properties);
    }

    // Sentry breadcrumb
    if (window.Sentry) {
      window.Sentry.addBreadcrumb({
        category: 'event',
        message: name,
        data: properties,
        level: 'info',
      });
    }
  }

  // Log locally
  logEventLocally(name, properties);
}

/**
 * Log event locally
 */
function logEventLocally(name: string, properties?: EventProperties): void {
  if (typeof localStorage === 'undefined') return;

  const events = JSON.parse(localStorage.getItem('rop_events') || '[]');
  events.unshift({
    name,
    properties,
    timestamp: new Date().toISOString(),
  });

  // Keep last 200 events
  if (events.length > 200) events.length = 200;

  localStorage.setItem('rop_events', JSON.stringify(events));
}

/**
 * Get tracked events
 */
export function getTrackedEvents(): Array<{
  name: string;
  properties?: EventProperties;
  timestamp: string;
}> {
  if (typeof localStorage === 'undefined') return [];
  return JSON.parse(localStorage.getItem('rop_events') || '[]');
}

// ============================================
// Health Check
// ============================================

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    name: string;
    status: 'pass' | 'fail';
    duration: number;
    message?: string;
  }[];
  timestamp: string;
}

/**
 * Run health checks
 */
export async function runHealthChecks(): Promise<HealthStatus> {
  const checks: HealthStatus['checks'] = [];

  // Check localStorage
  const localStorageCheck = await checkLocalStorage();
  checks.push(localStorageCheck);

  // Check API
  const apiCheck = await checkAPI();
  checks.push(apiCheck);

  // Check network
  const networkCheck = await checkNetwork();
  checks.push(networkCheck);

  // Determine overall status
  const failedChecks = checks.filter(c => c.status === 'fail');
  let status: HealthStatus['status'] = 'healthy';
  if (failedChecks.length > 0) {
    status = failedChecks.length === checks.length ? 'unhealthy' : 'degraded';
  }

  return {
    status,
    checks,
    timestamp: new Date().toISOString(),
  };
}

async function checkLocalStorage(): Promise<HealthStatus['checks'][0]> {
  const start = performance.now();
  try {
    localStorage.setItem('health_check', 'ok');
    localStorage.removeItem('health_check');
    return {
      name: 'localStorage',
      status: 'pass',
      duration: performance.now() - start,
    };
  } catch (error) {
    return {
      name: 'localStorage',
      status: 'fail',
      duration: performance.now() - start,
      message: (error as Error).message,
    };
  }
}

async function checkAPI(): Promise<HealthStatus['checks'][0]> {
  const start = performance.now();
  try {
    const response = await fetch('/api/health', { method: 'HEAD' });
    return {
      name: 'api',
      status: response.ok ? 'pass' : 'fail',
      duration: performance.now() - start,
      message: response.ok ? undefined : `Status: ${response.status}`,
    };
  } catch (error) {
    return {
      name: 'api',
      status: 'fail',
      duration: performance.now() - start,
      message: (error as Error).message,
    };
  }
}

async function checkNetwork(): Promise<HealthStatus['checks'][0]> {
  const start = performance.now();
  const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
  return {
    name: 'network',
    status: online ? 'pass' : 'fail',
    duration: performance.now() - start,
    message: online ? undefined : 'Offline',
  };
}

// ============================================
// Type Declarations
// ============================================

interface SentryScope {
  setTag(key: string, value: string): void;
  setUser(user: { id: string }): void;
  setExtras(extras: Record<string, unknown>): void;
}

declare global {
  interface Window {
    Sentry?: {
      init(options: unknown): void;
      captureException(error: Error): void;
      withScope(callback: (scope: SentryScope) => void): void;
      addBreadcrumb(breadcrumb: {
        category: string;
        message: string;
        data?: EventProperties;
        level: string;
      }): void;
    };
    gtag?: (...args: unknown[]) => void;
  }
}
