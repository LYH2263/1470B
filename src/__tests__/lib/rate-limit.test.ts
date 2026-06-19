import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { checkRateLimit } from '@/lib/rate-limit';

describe('Rate Limit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should allow requests within limit', () => {
    const result = checkRateLimit('test-key');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('should track remaining requests', () => {
    checkRateLimit('test-key-2');
    const result = checkRateLimit('test-key-2');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it('should block requests over limit', () => {
    checkRateLimit('test-key-3');
    checkRateLimit('test-key-3');
    checkRateLimit('test-key-3');
    const result = checkRateLimit('test-key-3');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should reset after time window', () => {
    checkRateLimit('test-key-4');
    checkRateLimit('test-key-4');
    checkRateLimit('test-key-4');
    
    vi.advanceTimersByTime(61 * 1000);
    
    const result = checkRateLimit('test-key-4');
    expect(result.allowed).toBe(true);
  });

  it('should track different keys independently', () => {
    checkRateLimit('key-a');
    checkRateLimit('key-a');
    checkRateLimit('key-a');

    const resultA = checkRateLimit('key-a');
    expect(resultA.allowed).toBe(false);

    const resultB = checkRateLimit('key-b');
    expect(resultB.allowed).toBe(true);
  });
});
