/**
 * Analytics Module
 *
 * Privacy-first analytics using Plausible + internal D1 storage.
 * Tracks funnel events for conversion optimization.
 *
 * Setup: Plausible script already in BaseLayout.astro
 * Internal: Events logged to D1 via /api/analytics endpoint
 */

// ============================================
// Types
// ============================================

export type FunnelEvent =
  | 'page_view'
  | 'seo_landing'
  | 'quiz_start'
  | 'quiz_complete'
  | 'forecast_view'
  | 'email_capture'
  | 'checkin_start'
  | 'checkin_complete'
  | 'upgrade_trigger_view'
  | 'checkout_start'
  | 'subscription_complete'
  | 'share_click'
  | 'mode_switch';

export interface EventProperties {
  // Common
  page?: string;
  referrer?: string;
  mode?: 'kasra' | 'river' | 'sol';

  // Quiz
  quiz_step?: number;
  quiz_answers?: string;

  // Subscription
  plan?: 'witness' | 'keeper' | 'circle' | 'enterprise';
  revenue?: number;

  // Check-in
  kappa?: number;
  streak?: number;

  // Content
  content_type?: string;
  content_id?: string;

  // UTM
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;

  // Custom
  [key: string]: string | number | boolean | undefined;
}

interface PlausibleWindow extends Window {
  plausible?: (event: string, options?: { props?: Record<string, string | number | boolean>; callback?: () => void }) => void;
}

// ============================================
// Analytics Client
// ============================================

class Analytics {
  private queue: Array<{ event: FunnelEvent; props: EventProperties; timestamp: number }> = [];
  private flushTimeout: ReturnType<typeof setTimeout> | null = null;
  private sessionId: string;
  private userId: string | null = null;

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
    this.userId = this.getUserId();

    // Flush queue on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flush(true));
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flush(true);
        }
      });
    }
  }

  /**
   * Track a funnel event
   */
  track(event: FunnelEvent, properties: EventProperties = {}): void {
    if (typeof window === 'undefined') return;

    // Enrich with default properties
    const enrichedProps: EventProperties = {
      page: window.location.pathname,
      referrer: document.referrer || undefined,
      mode: this.getCurrentMode(),
      ...this.getUTMParams(),
      ...properties,
    };

    // Send to Plausible
    this.trackPlausible(event, enrichedProps);

    // Queue for internal storage
    this.queue.push({
      event,
      props: enrichedProps,
      timestamp: Date.now(),
    });

    // Debounced flush
    this.scheduleFlush();
  }

  /**
   * Track page view (called automatically on route change)
   */
  pageView(properties: EventProperties = {}): void {
    this.track('page_view', properties);
  }

  /**
   * Track SEO landing (first visit from organic search)
   */
  seoLanding(): void {
    const referrer = document.referrer;
    const isOrganic = referrer && (
      referrer.includes('google.') ||
      referrer.includes('bing.') ||
      referrer.includes('duckduckgo.') ||
      referrer.includes('yahoo.')
    );

    if (isOrganic && !sessionStorage.getItem('rop_seo_tracked')) {
      this.track('seo_landing', {
        referrer,
        search_engine: this.getSearchEngine(referrer),
      });
      sessionStorage.setItem('rop_seo_tracked', '1');
    }
  }

  /**
   * Quiz tracking
   */
  quizStart(): void {
    this.track('quiz_start');
  }

  quizComplete(answers?: Record<string, unknown>): void {
    this.track('quiz_complete', {
      quiz_answers: answers ? JSON.stringify(answers) : undefined,
    });
  }

  /**
   * Forecast tracking
   */
  forecastView(kappa?: number): void {
    this.track('forecast_view', { kappa });
  }

  /**
   * Email capture
   */
  emailCapture(source?: string): void {
    this.track('email_capture', { content_type: source });
  }

  /**
   * Check-in tracking
   */
  checkinStart(): void {
    this.track('checkin_start');
  }

  checkinComplete(kappa: number, streak?: number): void {
    this.track('checkin_complete', { kappa, streak });
  }

  /**
   * Upgrade funnel
   */
  upgradePromptView(location: string): void {
    this.track('upgrade_trigger_view', { content_id: location });
  }

  checkoutStart(plan: string): void {
    this.track('checkout_start', {
      plan: plan as EventProperties['plan'],
    });
  }

  subscriptionComplete(plan: string, revenue: number): void {
    this.track('subscription_complete', {
      plan: plan as EventProperties['plan'],
      revenue,
    });
  }

  /**
   * Social sharing
   */
  shareClick(platform: string, contentType?: string): void {
    this.track('share_click', {
      content_type: platform,
      content_id: contentType,
    });
  }

  /**
   * Mode switching
   */
  modeSwitch(fromMode: string, toMode: string): void {
    this.track('mode_switch', {
      content_type: fromMode,
      content_id: toMode,
    });
  }

  /**
   * Set user ID (after authentication)
   */
  setUserId(userId: string): void {
    this.userId = userId;
    localStorage.setItem('rop_user_id', userId);
  }

  // ============================================
  // Private Methods
  // ============================================

  private trackPlausible(event: FunnelEvent, props: EventProperties): void {
    const win = window as PlausibleWindow;
    if (win.plausible) {
      // Convert props to Plausible format (strings only)
      const plausibleProps: Record<string, string | number | boolean> = {};
      for (const [key, value] of Object.entries(props)) {
        if (value !== undefined) {
          plausibleProps[key] = value;
        }
      }

      win.plausible(event, { props: plausibleProps });
    }
  }

  private scheduleFlush(): void {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
    }

    this.flushTimeout = setTimeout(() => {
      this.flush();
    }, 2000); // Batch events for 2 seconds
  }

  private async flush(sync = false): Promise<void> {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    const payload = {
      session_id: this.sessionId,
      user_id: this.userId,
      events,
    };

    if (sync && navigator.sendBeacon) {
      // Use sendBeacon for reliable delivery on page unload
      navigator.sendBeacon('/api/analytics', JSON.stringify(payload));
    } else {
      // Regular fetch
      try {
        await fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        });
      } catch (error) {
        // Re-queue on failure
        this.queue.unshift(...events);
        console.warn('[Analytics] Flush failed, re-queued events');
      }
    }
  }

  private getOrCreateSessionId(): string {
    if (typeof window === 'undefined') return 'ssr';

    let sessionId = sessionStorage.getItem('rop_session_id');
    if (!sessionId) {
      sessionId = `s_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('rop_session_id', sessionId);
    }
    return sessionId;
  }

  private getUserId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('rop_user_id');
  }

  private getCurrentMode(): 'kasra' | 'river' | 'sol' {
    if (typeof window === 'undefined') return 'sol';
    return (localStorage.getItem('rop_mode') || 'sol') as 'kasra' | 'river' | 'sol';
  }

  private getUTMParams(): Partial<EventProperties> {
    if (typeof window === 'undefined') return {};

    const params = new URLSearchParams(window.location.search);
    const utm: Partial<EventProperties> = {};

    const utmSource = params.get('utm_source');
    const utmMedium = params.get('utm_medium');
    const utmCampaign = params.get('utm_campaign');

    if (utmSource) utm.utm_source = utmSource;
    if (utmMedium) utm.utm_medium = utmMedium;
    if (utmCampaign) utm.utm_campaign = utmCampaign;

    return utm;
  }

  private getSearchEngine(referrer: string): string {
    if (referrer.includes('google.')) return 'google';
    if (referrer.includes('bing.')) return 'bing';
    if (referrer.includes('duckduckgo.')) return 'duckduckgo';
    if (referrer.includes('yahoo.')) return 'yahoo';
    return 'other';
  }
}

// ============================================
// Singleton Export
// ============================================

export const analytics = typeof window !== 'undefined' ? new Analytics() : null;

/**
 * Track event (safe for SSR)
 */
export function track(event: FunnelEvent, properties?: EventProperties): void {
  analytics?.track(event, properties);
}

/**
 * Initialize analytics on page load
 */
export function initAnalytics(): void {
  if (typeof window === 'undefined') return;

  // Track page view
  analytics?.pageView();

  // Track SEO landing if from search
  analytics?.seoLanding();

  // Listen for route changes (SPA navigation)
  window.addEventListener('popstate', () => {
    analytics?.pageView();
  });
}

// Auto-initialize in browser
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnalytics);
  } else {
    initAnalytics();
  }
}
