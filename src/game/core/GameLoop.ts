export class GameLoop {
  private lastFrameTime: number = 0;
  private accumulatedTime: number = 0;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private frameId: number | null = null;
  private readonly timeStep: number = 1000 / 60; // ~16.67ms

  private update: (delta: number) => void;
  private render: (interpolation: number) => void;

  constructor(update: (delta: number) => void, render: (interpolation: number) => void) {
    this.update = update;
    this.render = render;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;
    this.lastFrameTime = performance.now();
    this.frameId = requestAnimationFrame(this.loop);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    if (!this.isRunning) return;
    this.isPaused = false;
    this.lastFrameTime = performance.now(); // Reset time to avoid huge delta
  }

  private loop = (timestamp: number): void => {
    if (!this.isRunning) return;

    this.frameId = requestAnimationFrame(this.loop);

    if (this.isPaused) return;

    const deltaTime = timestamp - this.lastFrameTime;
    this.lastFrameTime = timestamp;

    this.accumulatedTime += deltaTime;

    // Panic check: if implicit pause (tab switch) causes huge delta, cap it
    if (this.accumulatedTime > 1000) {
      this.accumulatedTime = 1000;
    }

    try {
      while (this.accumulatedTime >= this.timeStep) {
        this.update(this.timeStep);
        this.accumulatedTime -= this.timeStep;
      }

      const interpolation = this.accumulatedTime / this.timeStep;
      this.render(interpolation);

    } catch (error) {
      console.error('GameLoop Critical Error:', error);
      // Decide whether to stop or try to continue
      // For resilience, we log and continue, but maybe pause if consistent
    }
  };
}
