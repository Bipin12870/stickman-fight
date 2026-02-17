import { Entity } from '../entities/Entity';

export class Renderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas 2D context not supported');
        this.ctx = context;
    }

    public clear() {
        this.ctx.fillStyle = '#050505';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawArena();
    }

    private drawArena() {
        const { width, height } = this.canvas;
        const floorY = 350;

        // 1. Background Gradient
        const bgGradient = this.ctx.createRadialGradient(
            width / 2, height / 2, 0,
            width / 2, height / 2, width
        );
        bgGradient.addColorStop(0, '#0a0a1a');
        bgGradient.addColorStop(1, '#000000');
        this.ctx.fillStyle = bgGradient;
        this.ctx.fillRect(0, 0, width, height);

        // 2. Grid Floor
        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;

        for (let i = 0; i < 15; i++) {
            const y = floorY + (i * i * 2);
            if (y > height) break;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }

        const centerX = width / 2;
        for (let i = -12; i <= 12; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(centerX + (i * 30), floorY);
            this.ctx.lineTo(centerX + (i * 150), height);
            this.ctx.stroke();
        }

        // 3. Ground Line
        this.ctx.strokeStyle = '#00ffff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, floorY);
        this.ctx.lineTo(width, floorY);
        this.ctx.stroke();
    }

    public drawEntity(entity: Entity, interpolation: number) {
        entity.draw(this.ctx, interpolation);
    }

    public drawDebugInfo(info: { state: string; fps: number }) {
        this.ctx.fillStyle = '#0f0';
        this.ctx.font = 'bold 16px monospace';
        this.ctx.fillText(`STATE: ${info.state}`, 16, 30);
        this.ctx.fillText(`FPS:   ${info.fps}`, 16, 50);
    }

    public getContext(): CanvasRenderingContext2D {
        return this.ctx;
    }
}
