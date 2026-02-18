export class ScreenShake {
    private shakeIntensity: number = 0;
    private shakeDuration: number = 0;
    private shakeTimer: number = 0;
    private offsetX: number = 0;
    private offsetY: number = 0;

    // Hit freeze
    private freezeFrames: number = 0;
    private isFrozen: boolean = false;

    // Flash
    private flashDuration: number = 0;
    private flashTimer: number = 0;

    // Slow motion
    private slowMoScale: number = 1;
    private slowMoTimer: number = 0;

    public shake(intensity: number, duration: number) {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
        this.shakeDuration = duration;
        this.shakeTimer = duration;
    }

    public freeze(frames: number) {
        this.freezeFrames = frames;
        this.isFrozen = true;
    }

    public flash(duration: number) {
        this.flashDuration = duration;
        this.flashTimer = duration;
    }

    public slowMotion(scale: number, duration: number) {
        this.slowMoScale = scale;
        this.slowMoTimer = duration;
    }

    public update(delta: number): boolean {
        // Hit freeze check
        if (this.isFrozen) {
            this.freezeFrames--;
            if (this.freezeFrames <= 0) {
                this.isFrozen = false;
            }
            return false; // Signal to skip game update
        }

        // Shake
        if (this.shakeTimer > 0) {
            this.shakeTimer -= delta;
            const progress = this.shakeTimer / this.shakeDuration;
            const currentIntensity = this.shakeIntensity * progress;
            this.offsetX = (Math.random() - 0.5) * currentIntensity * 2;
            this.offsetY = (Math.random() - 0.5) * currentIntensity * 2;

            if (this.shakeTimer <= 0) {
                this.shakeIntensity = 0;
                this.offsetX = 0;
                this.offsetY = 0;
            }
        }

        // Flash
        if (this.flashTimer > 0) {
            this.flashTimer -= delta;
        }

        // Slow motion
        if (this.slowMoTimer > 0) {
            this.slowMoTimer -= delta;
            if (this.slowMoTimer <= 0) {
                this.slowMoScale = 1;
            }
        }

        return true; // Normal update
    }

    public getOffset(): { x: number; y: number } {
        return { x: this.offsetX, y: this.offsetY };
    }

    public isFlashing(): boolean {
        return this.flashTimer > 0;
    }

    public getFlashAlpha(): number {
        if (this.flashTimer <= 0) return 0;
        return (this.flashTimer / this.flashDuration) * 0.4;
    }

    public getTimeScale(): number {
        return this.slowMoScale;
    }

    public isFreezing(): boolean {
        return this.isFrozen;
    }
}

export const screenShake = new ScreenShake();
