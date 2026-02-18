import { Entity } from '../entities/Entity';
import { screenShake } from '../systems/ScreenShake';

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
        this.ctx.save();

        // Apply screen shake
        const offset = screenShake.getOffset();
        this.ctx.translate(offset.x, offset.y);

        this.ctx.fillStyle = '#0a100f'; // Dark teal base
        this.ctx.fillRect(-10, -10, this.canvas.width + 20, this.canvas.height + 20);
        this.drawArena();

        this.ctx.restore();
    }

    private drawArena() {
        const { width, height } = this.canvas;
        const floorY = 350;
        const time = Date.now();

        // 1. Animated Background Gradient
        const bgGradient = this.ctx.createRadialGradient(
            width / 2, height / 2, 0,
            width / 2, height / 2, width
        );
        const pulse = Math.sin(time / 2000) * 0.05 + 0.95;
        bgGradient.addColorStop(0, `rgba(255, 210, 194, ${pulse * 0.15})`); // Peach center (#ffd2c2)
        bgGradient.addColorStop(1, '#050a09'); // Deeper teal edge
        this.ctx.fillStyle = bgGradient;
        this.ctx.fillRect(0, 0, width, height);

        // 2. Scanlines Effect
        this.ctx.globalAlpha = 0.04;
        this.ctx.fillStyle = '#789a99'; // Teal
        const scanlineY = (time / 10) % height;
        for (let i = 0; i < 3; i++) {
            const y = (scanlineY + i * 200) % height;
            this.ctx.fillRect(0, y, width, 1);
        }
        this.ctx.globalAlpha = 1.0;

        // 3. Pulsing Grid Floor
        const gridPulse = Math.sin(time / 1000) * 0.05 + 0.15;
        this.ctx.strokeStyle = `rgba(120, 154, 153, ${gridPulse})`; // Teal
        this.ctx.lineWidth = 1;

        // Horizontal grid lines
        for (let i = 0; i < 15; i++) {
            const y = floorY + (i * i * 2);
            if (y > height) break;
            const linePulse = Math.sin(time / 800 + i * 0.3) * 0.05 + gridPulse;
            this.ctx.strokeStyle = `rgba(120, 154, 153, ${linePulse})`;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }

        // Vertical perspective lines
        const centerX = width / 2;
        for (let i = -12; i <= 12; i++) {
            const linePulse = Math.sin(time / 600 + i * 0.2) * 0.05 + gridPulse;
            this.ctx.strokeStyle = `rgba(120, 154, 153, ${linePulse})`;
            this.ctx.beginPath();
            this.ctx.moveTo(centerX + (i * 30), floorY);
            this.ctx.lineTo(centerX + (i * 150), height);
            this.ctx.stroke();
        }

        // 4. Glowing Ground Line
        const glowPulse = Math.sin(time / 500) * 0.3 + 0.7;

        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = `rgba(255, 210, 194, ${glowPulse * 0.5})`; // Peach (#ffd2c2)
        this.ctx.strokeStyle = `rgba(255, 210, 194, ${glowPulse})`;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(0, floorY);
        this.ctx.lineTo(width, floorY);
        this.ctx.stroke();

        this.ctx.shadowBlur = 10;
        this.ctx.strokeStyle = '#ffd2c2';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, floorY);
        this.ctx.lineTo(width, floorY);
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;

        // 5. Arena Energy Walls (boundaries)
        this.drawEnergyWall(30, floorY, height, time, 'left');
        this.drawEnergyWall(width - 30, floorY, height, time, 'right');

        // 6. Corner Energy Decorations
        this.drawCornerEnergy(0, 0, time, false);
        this.drawCornerEnergy(width, 0, time, true);

        // 7. Floor Impact Points (ambient glow spots)
        this.drawFloorGlow(width * 0.25, floorY, time, 0);
        this.drawFloorGlow(width * 0.5, floorY, time, 1);
        this.drawFloorGlow(width * 0.75, floorY, time, 2);
    }

    private drawEnergyWall(x: number, floorY: number, _height: number, time: number, side: 'left' | 'right') {
        const wallPulse = Math.sin(time / 700 + (side === 'left' ? 0 : Math.PI)) * 0.3 + 0.5;
        const color = side === 'left' ? '120, 154, 153' : '255, 210, 194'; // Teal vs Peach

        // Glow
        this.ctx.shadowBlur = 25;
        this.ctx.shadowColor = `rgba(${color}, ${wallPulse})`;

        // Main line
        this.ctx.strokeStyle = `rgba(${color}, ${wallPulse * 0.8})`;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, floorY);
        this.ctx.stroke();

        // Energy nodes along the wall
        for (let i = 0; i < 5; i++) {
            const nodeY = (floorY / 5) * i + 30;
            const nodePulse = Math.sin(time / 400 + i * 1.2) * 0.3 + 0.7;
            this.ctx.fillStyle = `rgba(${color}, ${nodePulse})`;
            this.ctx.beginPath();
            this.ctx.arc(x, nodeY, 3 + Math.sin(time / 300 + i) * 1, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Gradient on floor near wall
        const gradient = this.ctx.createLinearGradient(
            side === 'left' ? x : x - 60, floorY,
            side === 'left' ? x + 60 : x, floorY
        );
        gradient.addColorStop(0, `rgba(${color}, ${wallPulse * 0.15})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(
            side === 'left' ? x : x - 60,
            floorY - 5, 60, 10
        );

        this.ctx.shadowBlur = 0;
    }

    private drawCornerEnergy(x: number, y: number, time: number, mirror: boolean) {
        const pulse = Math.sin(time / 600) * 0.3 + 0.5;
        const dir = mirror ? -1 : 1;

        this.ctx.strokeStyle = `rgba(120, 154, 153, ${pulse * 0.4})`; // Teal
        this.ctx.lineWidth = 1;

        // Diagonal lines
        for (let i = 0; i < 3; i++) {
            const offset = i * 15;
            this.ctx.beginPath();
            this.ctx.moveTo(x + dir * offset, y);
            this.ctx.lineTo(x, y + offset);
            this.ctx.stroke();
        }

        // Corner dot
        this.ctx.fillStyle = `rgba(120, 154, 153, ${pulse})`; // Teal
        this.ctx.beginPath();
        this.ctx.arc(x + dir * 8, y + 8, 3, 0, Math.PI * 2);
        this.ctx.fill();
    }

    private drawFloorGlow(x: number, floorY: number, time: number, offset: number) {
        const pulse = Math.sin(time / 1200 + offset * 2) * 0.3 + 0.3;
        const gradient = this.ctx.createRadialGradient(x, floorY, 0, x, floorY, 40);
        gradient.addColorStop(0, `rgba(255, 210, 194, ${pulse * 0.3})`); // Peach
        gradient.addColorStop(1, 'rgba(255, 210, 194, 0)');
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(x, floorY, 40, 0, Math.PI * 2);
        this.ctx.fill();
    }

    public drawEntity(entity: Entity, interpolation: number) {
        this.ctx.save();
        const offset = screenShake.getOffset();
        this.ctx.translate(offset.x, offset.y);
        entity.draw(this.ctx, interpolation);
        this.ctx.restore();
    }

    public drawFlash() {
        if (screenShake.isFlashing()) {
            this.ctx.save();
            this.ctx.fillStyle = `rgba(255, 255, 255, ${screenShake.getFlashAlpha()})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.restore();
        }
    }

    public drawDebugInfo(info: { state: string; fps: number }) {
        this.ctx.fillStyle = '#0f0';
        this.ctx.font = 'bold 16px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`STATE: ${info.state}`, 16, 55);
        this.ctx.fillText(`FPS:   ${info.fps}`, 16, 75);
    }

    public getContext(): CanvasRenderingContext2D {
        return this.ctx;
    }
}
