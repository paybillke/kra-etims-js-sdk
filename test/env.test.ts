import { describe, it, expect } from 'vitest';

describe('env loading', () => {
  it('loads .env.test', () => {
    expect(process.env.KRA_CONSUMER_KEY).toBeDefined();
    expect(process.env.KRA_TIN).toBe('A123456789Z');
  });
});
