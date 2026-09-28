import { RateLimiter } from './rate-limiter';

describe('RateLimiter', () => {
    afterEach(() => jest.useRealTimers());

    it('bloquea al llegar al maximo y libera al vencer la ventana', () => {
        jest.useFakeTimers();
        const limiter = new RateLimiter(3, 1000);
        limiter.hit('a'); limiter.hit('a');
        expect(limiter.isBlocked('a')).toBe(false);
        limiter.hit('a');
        expect(limiter.isBlocked('a')).toBe(true);
        jest.advanceTimersByTime(1001);
        expect(limiter.isBlocked('a')).toBe(false);
    });

    it('consume rechaza despues del maximo y reset limpia', () => {
        const limiter = new RateLimiter(2, 60_000);
        expect(limiter.consume('k')).toBe(true);
        expect(limiter.consume('k')).toBe(true);
        expect(limiter.consume('k')).toBe(false);
        limiter.reset('k');
        expect(limiter.consume('k')).toBe(true);
    });

    it('cuenta cada llave por separado', () => {
        const limiter = new RateLimiter(1, 60_000);
        limiter.hit('x');
        expect(limiter.isBlocked('x')).toBe(true);
        expect(limiter.isBlocked('y')).toBe(false);
    });
});
