import { Stickman } from '../entities/Stickman';
import type { Vector2 } from '../entities/Entity';

export type AIState = 'IDLE' | 'WANDER' | 'CHASE' | 'ATTACK' | 'BLOCK' | 'RETREAT';

export class AISystem {
    private currentState: AIState = 'WANDER';
    private reactionTime: number = 400; // ms
    private lastUpdate: number = 0;
    private wanderTimer: number = 0;
    private wanderDirectionX: number = 1;
    private wanderDuration: number = 2000;
    private _isAttacking: boolean = false;
    private _isBlocking: boolean = false;
    private attackTimer: number = 0;

    public update(ai: Stickman, player: Stickman, delta: number) {
        const now = performance.now();

        // Update attack timer
        if (this.attackTimer > 0) {
            this.attackTimer -= delta;
            if (this.attackTimer <= 0) {
                this._isAttacking = false;
            }
        }

        if (now - this.lastUpdate < this.reactionTime) {
            this.executeState(ai, player, delta);
            return;
        }
        this.lastUpdate = now;

        const dist = this.getDistance(ai.position, player.position);

        // Face the player
        ai.facingRight = ai.position.x < player.position.x;

        // Smarter state decisions based on distance + health
        const healthRatio = 1; // Could be passed in for smarter AI
        if (dist > 300) {
            this.currentState = 'WANDER';
        } else if (dist > 150) {
            this.currentState = 'CHASE';
        } else if (dist < 60) {
            // Very close — prefer attack or retreat
            if (Math.random() > 0.3) {
                this.currentState = 'ATTACK';
            } else {
                this.currentState = 'RETREAT';
            }
        } else {
            // Combat range
            const roll = Math.random();
            if (roll < 0.45) {
                this.currentState = 'ATTACK';
            } else if (roll < 0.7) {
                this.currentState = 'CHASE';
            } else if (roll < 0.85) {
                this.currentState = 'BLOCK';
            } else {
                this.currentState = 'RETREAT';
            }
        }

        // Keep linter happy
        void healthRatio;

        this.executeState(ai, player, delta);
    }

    private executeState(ai: Stickman, player: Stickman, delta: number) {
        const isGrounded = ai.position.y >= 300;
        this._isBlocking = false;

        switch (this.currentState) {
            case 'WANDER':
                this.wanderTimer += delta;
                if (this.wanderTimer > this.wanderDuration) {
                    this.wanderTimer = 0;
                    this.wanderDirectionX = (Math.random() - 0.5) * 2;
                    this.wanderDuration = 1000 + Math.random() * 2000;
                }
                ai.velocity.x = this.wanderDirectionX * 2;

                if (isGrounded && Math.random() < 0.01) {
                    ai.velocity.y = -12;
                }

                if (ai.position.x < 80) this.wanderDirectionX = Math.abs(this.wanderDirectionX);
                if (ai.position.x > 700) this.wanderDirectionX = -Math.abs(this.wanderDirectionX);

                ai.setState('idle');
                break;

            case 'CHASE':
                ai.velocity.x = ai.position.x < player.position.x ? 3.5 : -3.5;

                if (isGrounded && player.position.y < ai.position.y - 50) {
                    ai.velocity.y = -12;
                }
                ai.setState('idle');
                break;

            case 'RETREAT':
                ai.velocity.x = ai.position.x < player.position.x ? -3.5 : 3.5;

                if (isGrounded && Math.random() < 0.05) {
                    ai.velocity.y = -12;
                }
                ai.setState('idle');
                break;

            case 'ATTACK':
                ai.velocity.x = 0;

                // Attack with cooldown
                if (this.attackTimer <= 0) {
                    this._isAttacking = true;
                    const attackType = Math.random() > 0.6 ? 'kicking' : 'punching';
                    ai.setState(attackType, 300);
                    this.attackTimer = 600 + Math.random() * 400; // 600-1000ms between attacks
                }
                break;

            case 'BLOCK':
                ai.velocity.x = 0;
                this._isBlocking = true;
                ai.setState('blocking', 100);
                break;

            case 'IDLE':
            default:
                ai.velocity.x = 0;
                ai.setState('idle');
                break;
        }
    }

    private getDistance(a: Vector2, b: Vector2): number {
        return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
    }

    public getCurrentState(): AIState {
        return this.currentState;
    }

    public isAttacking(): boolean {
        return this._isAttacking;
    }

    public isBlocking(): boolean {
        return this._isBlocking;
    }
}

export const aiSystem = new AISystem();
