/**
 * Centralized debouncing for pattern matching
 */
export class PatternDebouncer {
  private timers: Map<string, NodeJS.Timeout> = new Map()
  private readonly delays: Map<string, number> = new Map()

  constructor() {
    // Default delays for different pattern types
    this.delays.set('prompt', 100)
    this.delays.set('completion', 50)
    this.delays.set('default', 75)
  }

  /**
   * Debounce a function call
   */
  debounce<T extends (...args: any[]) => any>(
    key: string,
    fn: T,
    customDelay?: number,
  ): (...args: Parameters<T>) => void {
    return (...args: Parameters<T>) => {
      // Clear existing timer
      const existingTimer = this.timers.get(key)
      if (existingTimer) {
        clearTimeout(existingTimer)
      }

      // Get delay based on key pattern
      const delay = customDelay || this.getDelay(key)

      // Set new timer
      const timer = setTimeout(() => {
        this.timers.delete(key)
        fn(...args)
      }, delay)

      this.timers.set(key, timer)
    }
  }

  /**
   * Cancel a pending debounced call
   */
  cancel(key: string): void {
    const timer = this.timers.get(key)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(key)
    }
  }

  /**
   * Cancel all pending debounced calls
   */
  cancelAll(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer)
    }
    this.timers.clear()
  }

  /**
   * Set custom delay for a pattern type
   */
  setDelay(type: string, delay: number): void {
    this.delays.set(type, delay)
  }

  /**
   * Get delay for a key
   */
  private getDelay(key: string): number {
    // Check if key matches a known pattern type
    for (const [type, delay] of this.delays.entries()) {
      if (key.includes(type)) {
        return delay
      }
    }
    return this.delays.get('default') || 75
  }

  /**
   * Check if a key has a pending debounced call
   */
  isPending(key: string): boolean {
    return this.timers.has(key)
  }
}
