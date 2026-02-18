import type { Vector3 } from '../entities/Entity';

export interface Particle {
    position: Vector3;
    velocity: Vector3;
    life: number;
    maxLife: number;
    color: string;
    size: number;
    type: 'impact' | 'dust' | 'orb' | 'sparkle';
    hue?: number;
}

export class ParticleSystem {
    private particles: Particle[] = [];
    private atmosphericTimer: number = 0;
    private maxAtmospheric: number = 60;

    // Emit impact particles
    public emit(x: number, y: number, color: string, count: number = 10, z: number = 100) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                position: { x, y, z },
                velocity: {
                    x: (Math.random() - 0.5) * 10,
                    y: (Math.random() - 0.5) * 10,
                    z: 0
                },
                life: 1.0,
                maxLife: 1.0,
                color,
                size: 2,
                type: 'impact'
            });
        }
    }

    public update(delta: number, canvasWidth: number = 800, canvasHeight: number = 600) {
        const lifeLoss = (delta / 1000) * 2;

        // Update existing particles
        this.particles = this.particles.filter(p => {
            p.life -= lifeLoss;
            const dtScale = delta / 16.67;
            p.position.x += p.velocity.x * dtScale;
            p.position.y += p.velocity.y * dtScale;
            p.position.z += p.velocity.z * dtScale;

            if (p.type === 'orb') {
                p.size = 2 + Math.sin(Date.now() / 500 + p.position.x) * 0.5;
            }

            return p.life > 0 && p.position.y > -50 && p.position.y < canvasHeight + 50;
        });

        // Spawn atmospheric particles
        this.atmosphericTimer += delta;
        const atmosphericCount = this.particles.filter(p => p.type !== 'impact').length;

        if (this.atmosphericTimer > 100 && atmosphericCount < this.maxAtmospheric) {
            this.atmosphericTimer = 0;
            this.spawnAtmospheric(canvasWidth, canvasHeight);
        }
    }

    private spawnAtmospheric(canvasWidth: number, canvasHeight: number) {
        const rand = Math.random();
        let particle: Particle;

        if (rand < 0.6) {
            // Dust particle
            particle = {
                position: { x: Math.random() * canvasWidth, y: canvasHeight + 10, z: Math.random() * 200 },
                velocity: { x: (Math.random() - 0.5) * 0.3, y: -0.2 - Math.random() * 0.3, z: 0 },
                life: 5 + Math.random() * 5,
                maxLife: 10,
                color: '#ffffff',
                size: 1 + Math.random() * 2,
                type: 'dust'
            };
        } else if (rand < 0.9) {
            // Energy orb
            particle = {
                position: { x: Math.random() * canvasWidth, y: canvasHeight + 10, z: Math.random() * 200 },
                velocity: { x: (Math.random() - 0.5) * 0.5, y: -0.5 - Math.random() * 0.5, z: 0 },
                life: 8 + Math.random() * 4,
                maxLife: 12,
                color: '#00ffff',
                size: 2,
                type: 'orb',
                hue: 180 + Math.random() * 40
            };
        } else {
            // Sparkle
            particle = {
                position: { x: Math.random() * canvasWidth, y: Math.random() * canvasHeight, z: Math.random() * 200 },
                velocity: { x: 0, y: 0, z: 0 },
                life: 0.5 + Math.random() * 0.5,
                maxLife: 1,
                color: '#00ffff',
                size: 2 + Math.random() * 2,
                type: 'sparkle'
            };
        }

        this.particles.push(particle);
    }

    public draw(ctx: CanvasRenderingContext2D) {
        const originalComposite = ctx.globalCompositeOperation;

        this.particles.forEach(p => {
            ctx.save();
            const alpha = p.life / p.maxLife;
            ctx.globalAlpha = alpha;

            if (p.type === 'impact' || p.type === 'dust') {
                ctx.fillStyle = p.color;
                ctx.fillRect(p.position.x, p.position.y, p.size, p.size);
            } else if (p.type === 'orb') {
                const gradient = ctx.createRadialGradient(
                    p.position.x, p.position.y, 0,
                    p.position.x, p.position.y, p.size * 3
                );
                gradient.addColorStop(0, `hsla(${p.hue}, 100%, 70%, ${alpha})`);
                gradient.addColorStop(0.5, `hsla(${p.hue}, 100%, 50%, ${alpha * 0.5})`);
                gradient.addColorStop(1, `hsla(${p.hue}, 100%, 30%, 0)`);

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(p.position.x, p.position.y, p.size * 3, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'sparkle') {
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = p.color;
                ctx.shadowBlur = 10;
                ctx.shadowColor = p.color;
                ctx.beginPath();
                ctx.arc(p.position.x, p.position.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            ctx.restore();
        });

        ctx.globalCompositeOperation = originalComposite;
        ctx.globalAlpha = 1.0;
    }
}

export const particleSystem = new ParticleSystem();
