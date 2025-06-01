/**
 * @file timing.test.ts
 * @description Basic Jest tests to verify testing infrastructure and time measurement capabilities
 */

describe('Basic timing tests', () => {
  // Test that Jest's fake timers work
  it('should work with Jest timers', () => {
    jest.useFakeTimers();
    const start = Date.now();
    
    jest.advanceTimersByTime(1000); // Advance 1 second
    const end = Date.now();
    
    expect(end - start).toBe(1000);
    jest.useRealTimers();
  });

  // Test that we can measure real time intervals
  it('should measure real time intervals', async () => {
    const start = performance.now();
    await new Promise(resolve => setTimeout(resolve, 10)); // Wait 10ms
    const end = performance.now();

    // Allow small timing variations in CI environments
    expect(end - start).toBeGreaterThanOrEqual(5);
  });

  // Test that we can create timestamps and compare them
  it('should handle timestamp comparisons', () => {
    jest.useFakeTimers();
    const timestamps: number[] = [];
    const baseTime = Date.now();
    
    // Create 5 timestamps with 100ms intervals
    for (let i = 0; i < 5; i++) {
      jest.setSystemTime(baseTime + i * 100);
      timestamps.push(Date.now());
    }
    
    // Verify intervals
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i] - timestamps[i-1]).toBe(100);
    }
    jest.useRealTimers();
  });

  // Test performance.now() precision
  it('should provide high-resolution timestamps', () => {
    // Create timestamps in a tight loop to ensure different values
    const timestamps: number[] = [];
    for (let i = 0; i < 1000; i++) {
      timestamps.push(performance.now());
    }
    const uniqueTimestamps = new Set(timestamps.map(t => Math.floor(t * 1000))); // Convert to microseconds
    
    // Verify we get different values (high precision)
    expect(uniqueTimestamps.size).toBeGreaterThan(1);
  });
}); 