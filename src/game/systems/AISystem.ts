import { Stickman } from '../entities/Stickman';
import type { Vector2 } from '../entities/Entity';

export type AIState = 'IDLE' | 'WANDER' | 'CHASE' | 'ATTACK' | 'BLOCK' | 'RETREAT';

export class AISystem {
    private currentState: AIState = 'WANDER';
    private reactionTime: number = 500; // ms
    private lastUpdate: number = 0;
    private wanderTimer: number = 0;
    private wanderDirectionX: number = 1;
    private wanderDirectionY: number = 0;
    private wanderDuration: number = 2000; // Change direction every 2 seconds

    public update(ai: Stickman, player: Stickman, delta: number) {
        const now = performance.now();
        if (now - this.lastUpdate < this.reactionTime) {
            // Still execute current state even if not changing state
            this.executeState(ai, player, delta);
            return;
        }
        this.lastUpdate = now;

        const dist = this.getDistance(ai.position, player.position);

        // State decision logic
        if (dist > 300) {
            this.currentState = 'WANDER'; // Too far, just wander
        } else if (dist > 150) {
            this.currentState = 'CHASE'; // Close enough to chase
        } else if (dist < 60) {
            this.currentState = 'RETREAT'; // Too close, back off
        } else {
            // In combat range - randomly attack or block
            this.currentState = Math.random() > 0.5 ? 'ATTACK' : 'BLOCK';
        }

        this.executeState(ai, player, delta);
    }

    private executeState(ai: Stickman, player: Stickman, delta: number) {
        switch (this.currentState) {
            case 'WANDER':
                // Wander around the arena in all directions
                this.wanderTimer += delta;
                if (this.wanderTimer > this.wanderDuration) {
                    this.wanderTimer = 0;
                    // Random direction in 2D space
                    this.wanderDirectionX = (Math.random() - 0.5) * 2; // -1 to 1
                    this.wanderDirectionY = (Math.random() - 0.5) * 2; // -1 to 1
                    this.wanderDuration = 1000 + Math.random() * 2000; // 1-3 seconds
                }
                ai.velocity.x = this.wanderDirectionX * 2;
                ai.velocity.y = this.wanderDirectionY * 2;

                // Keep AI in bounds (roughly)
                if (ai.position.x < 100) this.wanderDirectionX = Math.abs(this.wanderDirectionX);
                if (ai.position.x > 700) this.wanderDirectionX = -Math.abs(this.wanderDirectionX);
                if (ai.position.y < 100) this.wanderDirectionY = Math.abs(this.wanderDirectionY);
                if (ai.position.y > 400) this.wanderDirectionY = -Math.abs(this.wanderDirectionY);
                break;

            case 'CHASE':
                // Chase player in both X and Y
                ai.velocity.x = ai.position.x < player.position.x ? 3 : -3;
                ai.velocity.y = ai.position.y < player.position.y ? 3 : -3;
                break;

            case 'RETREAT':
                // Retreat from player in both X and Y
                ai.velocity.x = ai.position.x < player.position.x ? -3 : 3;
                ai.velocity.y = ai.position.y < player.position.y ? -3 : 3;
                break;

            case 'ATTACK':
                ai.velocity.x = 0;
                ai.velocity.y = 0;
                // Attack logic would go here
                break;

            case 'BLOCK':
                ai.velocity.x = 0;
                ai.velocity.y = 0;
                break;

            case 'IDLE':
            default:
                ai.velocity.x = 0;
                ai.velocity.y = 0;
                break;
        }
    }

    private getDistance(a: Vector2, b: Vector2): number {
        return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
    }

    public getCurrentState(): AIState {
        return this.currentState;
    }
}

export const aiSystem = new AISystem();
