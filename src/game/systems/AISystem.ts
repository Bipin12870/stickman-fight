import { Stickman } from '../entities/Stickman';

export type AIState = 'IDLE' | 'CHASE' | 'ATTACK' | 'RETREAT';

export class AISystem {
    private currentState: AIState = 'CHASE';
    private _isAttacking: boolean = false;
    private _isBlocking: boolean = false;
    private attackTimer: number = 0;

    public update(ai: Stickman, player: Stickman, delta: number) {
        if (ai.state === 'ko' || player.state === 'ko') return;

        this.attackTimer -= delta;
        if (this.attackTimer <= 0) {
            this._isAttacking = false;
        }

        // ── 3D distance: X and Z only (Y is jump, handled separately below)
        const aiCenter = ai.getEffectiveCenter();
        const playerCenter = player.getEffectiveCenter();
        const dx = playerCenter.x - aiCenter.x;
        const dz = player.position.z - ai.position.z; // ✅ use raw Z, not center

        // Horizontal plane distance (X + Z) — for state decisions and combat range
        const distXZ = Math.sqrt(dx * dx + dz * dz);

        // Face player on X axis
        ai.facingRight = dx > 0;

        // ── State decision
        if (distXZ < 55) {
            this.currentState = 'IDLE';
        } else if (distXZ > 440) {
            this.currentState = 'CHASE';
        } else {
            this.currentState = 'CHASE';
        }

        // Attack override when close
        if (distXZ < 80 && this.attackTimer <= 0) {
            this.currentState = 'ATTACK';
        }

        this.executeState(ai, player, delta, distXZ, dx, dz);
    }

    private executeState(
        ai: Stickman,
        player: Stickman,
        delta: number,
        dist: number,
        dx: number,
        dz: number
    ) {
        const dt = delta / 16.67;

        // ── Y / Jump following
        // BUG WAS: player.position.y < 250 — ground IS 300, so jumping goes BELOW 300
        // which means the old condition (< 250) only fired very deep into a jump,
        // and isGrounded (>= 300) was false at that point anyway → jump never triggered.
        //
        // FIX: detect player is off ground (y < 300 means they jumped UP in your coord system
        // where Y decreases upward). Match their jump.
        const GROUND_Y = 300;
        const aiGrounded = ai.position.y >= GROUND_Y - 2; // small tolerance

        // Player is in the air if their Y is meaningfully above ground
        // (in your system, y=300 is floor, jumping moves y DOWN toward 0)
        const playerInAir = player.position.y < GROUND_Y - 20;

        if (playerInAir && aiGrounded && dist < 350) {
            // ✅ Mirror player jump — give AI same upward impulse
            ai.velocity.y = -12;
        }

        // ── Z depth following — how fast AI closes Z gap
        // Used in all states below. Separated so each state can tune it.
        const zSpeed = (dz: number, baseSpd: number) => {
            if (Math.abs(dz) < 5) return 0; // dead zone — stop jitter
            return Math.sign(dz) * Math.min(Math.abs(dz) * 0.08, baseSpd);
        };

        switch (this.currentState) {
            case 'CHASE': {
                const isCatchingUp = dist > 440;
                const spd = (isCatchingUp ? 6.6 : 3.6) * dt;

                if (dist > 0.1) {
                    const nx = dx / dist;
                    const nz = dz / dist; // ✅ normalized Z direction

                    ai.position.x += nx * spd;

                    // ✅ Z follows player depth — was missing proportional Z speed
                    // Use normalized nz so diagonal movement doesn't overshoot
                    ai.position.z += nz * spd;
                }
                ai.setState('idle');
                break;
            }

            case 'IDLE': {
                // Gentle micro-correction to stay level with player in all axes
                if (Math.abs(dx) > 50) {
                    ai.position.x += Math.sign(dx) * 1 * dt;
                }
                // ✅ BUG WAS: nz * 0.5 — but nz wasn't normalized here, and 0.5 was far too slow
                // FIX: smooth Z approach with proportional speed
                ai.position.z += zSpeed(dz, 1.5 * dt);
                ai.setState('idle');
                break;
            }

            case 'ATTACK': {
                // Stay in X/Z range
                if (dist > 30) {
                    const nx = dx / dist;
                    const nz = dz / dist;
                    ai.position.x += nx * 2 * dt;
                    // ✅ Z was: nz * 1.5 * dt — fine, but only if dist > 30
                    // Added same guard already above, this is correct
                    ai.position.z += nz * 1.5 * dt;
                }

                if (this.attackTimer <= 0) {
                    this._isAttacking = true;
                    const attackType = Math.random() > 0.6 ? 'kicking' : 'punching';
                    ai.setState(attackType, 300);
                    this.attackTimer = 800 + Math.random() * 800;
                }
                break;
            }

            case 'RETREAT': {
                const nx = dx / dist;
                const nz = dz / dist;
                ai.position.x -= nx * 4 * dt;
                // ✅ Z retreat — mirror retreat in depth too
                ai.position.z -= nz * 4 * dt;
                ai.setState('idle');
                break;
            }
        }

        // Clamp to arena bounds
        ai.position.x = Math.max(50, Math.min(750, ai.position.x));
        ai.position.z = Math.max(0, Math.min(200, ai.position.z)); // match player Z range
    }

    public isAttacking(): boolean { return this._isAttacking; }
    public isBlocking(): boolean { return this._isBlocking; }
    public getCurrentState(): AIState { return this.currentState; }
}

export const aiSystem = new AISystem();