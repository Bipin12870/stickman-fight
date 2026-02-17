import { Renderer } from '../renderer/Renderer';

export class HUDSystem {
    public playerHealth: number = 100;
    public opponentHealth: number = 100;

    public draw(renderer: Renderer) {
        const ctx = renderer.getContext();
        const canvas = ctx.canvas;

        // Player Health Bar
        this.drawHealthBar(ctx, 20, 20, this.playerHealth, '#00f', 'PLAYER');

        // Opponent Health Bar
        this.drawHealthBar(ctx, canvas.width - 220, 20, this.opponentHealth, '#f00', 'OPPONENT');
    }

    private drawHealthBar(ctx: CanvasRenderingContext2D, x: number, y: number, health: number, color: string, label: string) {
        // Background
        ctx.fillStyle = '#333';
        ctx.fillRect(x, y, 200, 20);

        // Fill
        ctx.fillStyle = color;
        ctx.fillRect(x, y, (health / 100) * 200, 20);

        // Border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, 200, 20);

        // Label
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(label, x, y - 5);
    }
}

export const hudSystem = new HUDSystem();
