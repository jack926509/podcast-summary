/**
 * Simple in-memory semaphore for limiting concurrent episode processing.
 * Prevents OOM when many episodes are submitted simultaneously.
 *
 * Usage:
 *   await processingLimiter.acquire();
 *   try { ... } finally { processingLimiter.release(); }
 */
class Semaphore {
  private running = 0;
  private readonly waiters: Array<() => void> = [];

  constructor(private readonly max: number) {}

  acquire(): Promise<void> {
    if (this.running < this.max) {
      this.running++;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.waiters.push(resolve);
    });
  }

  release(): void {
    this.running--;
    const next = this.waiters.shift();
    if (next) {
      this.running++;
      next();
    }
  }

  get active(): number { return this.running; }
  get queued(): number { return this.waiters.length; }
}

/** Max 2 episodes processed concurrently to prevent OOM on Zeabur */
export const processingLimiter = new Semaphore(2);
