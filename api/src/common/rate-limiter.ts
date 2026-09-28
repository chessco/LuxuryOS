interface Entry {
    count: number;
    resetAt: number;
}

export class RateLimiter {
    private entries = new Map<string, Entry>();

    constructor(private readonly max: number, private readonly windowMs: number) {
        const timer = setInterval(() => this.sweep(), Math.max(windowMs, 60_000));
        timer.unref?.();
    }

    isBlocked(key: string): boolean {
        const entry = this.entries.get(key);
        if (!entry) return false;
        if (entry.resetAt <= Date.now()) {
            this.entries.delete(key);
            return false;
        }
        return entry.count >= this.max;
    }

    hit(key: string): void {
        const now = Date.now();
        const entry = this.entries.get(key);
        if (!entry || entry.resetAt <= now) {
            this.entries.set(key, { count: 1, resetAt: now + this.windowMs });
        } else {
            entry.count += 1;
        }
    }

    consume(key: string): boolean {
        if (this.isBlocked(key)) return false;
        this.hit(key);
        return true;
    }

    reset(key: string): void {
        this.entries.delete(key);
    }

    private sweep() {
        const now = Date.now();
        for (const [key, entry] of this.entries) {
            if (entry.resetAt <= now) this.entries.delete(key);
        }
    }
}
