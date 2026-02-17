import { Stickman } from '../entities/Stickman';
import type { Vector2 } from '../entities/Entity';

export type AIState = 'IDLE' | 'CHASE' | 'ATTACK' | 'BLOCK' | 'RETREAT';

export class AISystem {
    private currentState: AIState = 'IDLE';
    private reactionTime: number = 500; // ms
    private lastUpdate: number = 0;

    public update(ai: Stickman, player: Stickman, _delta: number) {
        const now = performance.now();
        if (now - this.lastUpdate < this.reactionTime) return;
        this.lastUpdate = now;

        const dist = this.getDistance(ai.position, player.position);

        if (dist > 200) {
            this.currentState = 'CHASE';
        } else if (dist < 50) {
            this.currentState = 'RETREAT';
        } else {
            this.currentState = Math.random() > 0.5 ? 'ATTACK' : 'BLOCK';
        }

        this.executeState(ai, player);
    }

    private executeState(ai: Stickman, player: Stickman) {
        switch (this.currentState) {
            case 'CHASE':
                ai.velocity.x = ai.position.x < player.position.x ? 2 : -2;
                break;
            case 'RETREAT':
                ai.velocity.x = ai.position.x < player.position.x ? -2 : 2;
                break;
            case 'ATTACK':
                ai.velocity.x = 0;
                // logic for punch/kick
                break;
            case 'BLOCK':
                ai.velocity.x = 0;
                break;
            case 'IDLE':
            default:
                ai.velocity.x = 0;
                break;
        }
    }

    private getDistance(a: Vector2, b: Vector2): number {
        return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
    }
}

export const aiSystem = new AISystem();
