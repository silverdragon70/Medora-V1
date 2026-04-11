// ══════════════════════════════════════════════════════════════════════════════
// aiRateLimiter.ts — In-memory rate limiter (resets on app restart)
// ══════════════════════════════════════════════════════════════════════════════

class RateLimiter {
  private requests: number[] = [];
  private limit: number = 3;
  private windowMs: number = 60000;

  check(): boolean {
    const now = Date.now();
    this.requests = this.requests.filter(ts => now - ts < this.windowMs);
    if (this.requests.length >= this.limit) return false;
    this.requests.push(now);
    return true;
  }

  getRemaining(): number {
    const now = Date.now();
    this.requests = this.requests.filter(ts => now - ts < this.windowMs);
    return Math.max(0, this.limit - this.requests.length);
  }

  getResetTime(): number {
    if (this.requests.length === 0) return 0;
    const oldest = Math.min(...this.requests);
    return Math.max(0, oldest + this.windowMs - Date.now());
  }

  reset(): void { this.requests = []; }

  setLimit(newLimit: number): void { this.limit = newLimit; }

  getLimit(): number { return this.limit; }
}

export const rateLimiter = new RateLimiter();
export default rateLimiter;
