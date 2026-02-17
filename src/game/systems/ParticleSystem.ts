import type { Vector2 } from '../entities/Entity';

export interface Particle {
    position: Vector2;
    velocity: Vector2;
    life: number;
    color: string;
}

export class ParticleSystem {
    private particles: Particle[] = [];

    public emit(x: number, y: number, color: string, count: number = 10) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                position: { x, y },
                velocity: {
                    x: (Math.random() - 0.5) * 10,
                    y: (Math.random() - 0.5) * 10
                },
                life: 1.0,
                color
            });
        }
    }

    public update(delta: number) {
        const lifeLoss = (delta / 1000) * 2;
        this.particles = this.particles.filter(p => {
            p.life -= lifeLoss;
            p.position.x += p.velocity.x;
            p.position.y += p.velocity.y;
            return p.life > 0;
        });
    }

    public draw(ctx: CanvasRenderingContext2D) {
        this.particles.forEach(p => {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.position.x, p.position.y, 2, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1.0;
    }
}

export const particleSystem = new ParticleSystem();
