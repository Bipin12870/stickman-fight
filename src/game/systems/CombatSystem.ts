import { Stickman } from '../entities/Stickman';
import { particleSystem } from './ParticleSystem';
import { screenShake } from './ScreenShake';
import { soundSystem } from './SoundSystem';

export type AttackType = 'punch' | 'kick' | 'none';

interface CombatState {
    isAttacking: boolean;
    attackType: AttackType;
    attackCooldown: number;
    isBlocking: boolean;
    isHitStunned: boolean;
    hitStunTimer: number;
    comboCount: number;
    comboTimer: number;
    lastHitTime: number;
    knockbackVelocity: number;
    hitFlashTimer: number;
}

export class CombatSystem {
    private playerState: CombatState;
    private opponentState: CombatState;

    // Damage values
    private readonly PUNCH_DAMAGE = 10;
    private readonly KICK_DAMAGE = 15;
    private readonly AI_PUNCH_DAMAGE = 8;
    private readonly AI_KICK_DAMAGE = 12;
    private readonly BLOCK_REDUCTION = 0.8;

    // Cooldowns (ms)
    private readonly PUNCH_COOLDOWN = 300;
    private readonly KICK_COOLDOWN = 500;

    // Ranges
    private readonly PUNCH_RANGE = 80;
    private readonly KICK_RANGE = 100;
    private readonly DEPTH_TOLERANCE = 35;

    // Combo
    private readonly COMBO_WINDOW = 1500; // ms to chain hits
    private readonly COMBO_BONUS = 0.15; // 15% per combo hit

    constructor() {
        this.playerState = this.createCombatState();
        this.opponentState = this.createCombatState();
    }

    private createCombatState(): CombatState {
        return {
            isAttacking: false,
            attackType: 'none',
            attackCooldown: 0,
            isBlocking: false,
            isHitStunned: false,
            hitStunTimer: 0,
            comboCount: 0,
            comboTimer: 0,
            lastHitTime: 0,
            knockbackVelocity: 0,
            hitFlashTimer: 0
        };
    }

    public update(
        player: Stickman,
        opponent: Stickman,
        playerActions: { punch: boolean; kick: boolean; block: boolean },
        aiAttacking: boolean,
        delta: number
    ): { playerDamage: number; opponentDamage: number } {
        let playerDamage = 0;
        let opponentDamage = 0;

        // Update cooldowns
        this.playerState.attackCooldown = Math.max(0, this.playerState.attackCooldown - delta);
        this.opponentState.attackCooldown = Math.max(0, this.opponentState.attackCooldown - delta);

        // Update hit stun
        if (this.playerState.isHitStunned) {
            this.playerState.hitStunTimer -= delta;
            if (this.playerState.hitStunTimer <= 0) this.playerState.isHitStunned = false;
        }
        if (this.opponentState.isHitStunned) {
            this.opponentState.hitStunTimer -= delta;
            if (this.opponentState.hitStunTimer <= 0) this.opponentState.isHitStunned = false;
        }

        // Update combo timers
        this.playerState.comboTimer -= delta;
        if (this.playerState.comboTimer <= 0) this.playerState.comboCount = 0;
        this.opponentState.comboTimer -= delta;
        if (this.opponentState.comboTimer <= 0) this.opponentState.comboCount = 0;

        // Update hit flash
        this.playerState.hitFlashTimer = Math.max(0, this.playerState.hitFlashTimer - delta);
        this.opponentState.hitFlashTimer = Math.max(0, this.opponentState.hitFlashTimer - delta);

        // Apply knockback
        if (this.playerState.knockbackVelocity !== 0) {
            player.velocity.x += this.playerState.knockbackVelocity;
            this.playerState.knockbackVelocity *= 0.85;
            if (Math.abs(this.playerState.knockbackVelocity) < 0.1) this.playerState.knockbackVelocity = 0;
        }
        if (this.opponentState.knockbackVelocity !== 0) {
            opponent.velocity.x += this.opponentState.knockbackVelocity;
            this.opponentState.knockbackVelocity *= 0.85;
            if (Math.abs(this.opponentState.knockbackVelocity) < 0.1) this.opponentState.knockbackVelocity = 0;
        }

        // Player blocking
        this.playerState.isBlocking = playerActions.block;

        // Distance check using effective visual positions
        const playerCenter = player.getEffectiveCenter();
        const opponentCenter = opponent.getEffectiveCenter();

        // Horizontal distance
        const dx = Math.abs(playerCenter.x - opponentCenter.x);
        // Depth distance
        const dz = Math.abs(playerCenter.z - opponentCenter.z);

        const depthThreshold = this.DEPTH_TOLERANCE;

        // --- Player attacks ---
        if (!this.playerState.isHitStunned && this.playerState.attackCooldown <= 0) {
            if (playerActions.punch) {
                this.playerState.attackType = 'punch';
                this.playerState.isAttacking = true;
                this.playerState.attackCooldown = this.PUNCH_COOLDOWN;

                if (dx < this.PUNCH_RANGE && dz < depthThreshold) {
                    let dmg = this.PUNCH_DAMAGE;
                    // Combo bonus
                    dmg += dmg * this.COMBO_BONUS * this.playerState.comboCount;
                    // Block reduction
                    if (this.opponentState.isBlocking) {
                        dmg *= (1 - this.BLOCK_REDUCTION);
                        soundSystem.play('block');
                    } else {
                        soundSystem.play('punch');
                    }

                    opponentDamage = dmg;
                    this.playerState.comboCount++;
                    this.playerState.comboTimer = this.COMBO_WINDOW;

                    // Hit effects
                    this.applyHitEffects(opponent, player, dmg, 'punch');
                } else {
                    soundSystem.play('whoosh');
                }
            } else if (playerActions.kick) {
                this.playerState.attackType = 'kick';
                this.playerState.isAttacking = true;
                this.playerState.attackCooldown = this.KICK_COOLDOWN;

                if (dx < this.KICK_RANGE && dz < depthThreshold) {
                    let dmg = this.KICK_DAMAGE;
                    dmg += dmg * this.COMBO_BONUS * this.playerState.comboCount;
                    if (this.opponentState.isBlocking) {
                        dmg *= (1 - this.BLOCK_REDUCTION);
                        soundSystem.play('block');
                    } else {
                        soundSystem.play('kick');
                    }

                    opponentDamage = dmg;
                    this.playerState.comboCount++;
                    this.playerState.comboTimer = this.COMBO_WINDOW;

                    this.applyHitEffects(opponent, player, dmg, 'kick');
                } else {
                    soundSystem.play('whoosh');
                }
            } else {
                this.playerState.isAttacking = false;
                this.playerState.attackType = 'none';
            }
        }

        // --- AI attacks ---
        if (aiAttacking && !this.opponentState.isHitStunned && this.opponentState.attackCooldown <= 0) {
            const aiAttackType: AttackType = Math.random() > 0.6 ? 'kick' : 'punch';
            const range = aiAttackType === 'punch' ? this.PUNCH_RANGE : this.KICK_RANGE;

            this.opponentState.attackType = aiAttackType;
            this.opponentState.isAttacking = true;
            this.opponentState.attackCooldown = aiAttackType === 'punch' ? this.PUNCH_COOLDOWN : this.KICK_COOLDOWN;

            if (dx < range && dz < depthThreshold) {
                let dmg = aiAttackType === 'punch' ? this.AI_PUNCH_DAMAGE : this.AI_KICK_DAMAGE;
                if (this.playerState.isBlocking) {
                    dmg *= (1 - this.BLOCK_REDUCTION);
                    soundSystem.play('block');
                } else {
                    soundSystem.play(aiAttackType);
                }

                playerDamage = dmg;
                this.opponentState.comboCount++;
                this.opponentState.comboTimer = this.COMBO_WINDOW;

                this.applyHitEffects(player, opponent, dmg, aiAttackType);
            }
        } else if (!aiAttacking) {
            this.opponentState.isAttacking = false;
            this.opponentState.attackType = 'none';
        }

        return { playerDamage, opponentDamage };
    }

    private applyHitEffects(target: Stickman, attacker: Stickman, damage: number, type: AttackType) {
        // Find correct target state
        const targetState = target.name === 'Player' ? this.playerState : this.opponentState;

        targetState.isHitStunned = true;
        targetState.hitStunTimer = 80;
        targetState.hitFlashTimer = 150;

        // Knockback — use effective center for direction
        const targetCenter = target.getEffectiveCenter();
        const attackerCenter = attacker.getEffectiveCenter();
        const direction = targetCenter.x > attackerCenter.x ? 1 : -1;
        const knockback = type === 'kick' ? 6 : 3;
        targetState.knockbackVelocity = direction * knockback;

        // Screen shake
        const intensity = Math.min(damage / 5, 8);
        screenShake.shake(intensity, 150);

        // Hit freeze
        screenShake.freeze(3);

        // Particles — use effective center for hit position
        const hitX = (targetCenter.x + attackerCenter.x) / 2;
        const hitY = targetCenter.y - 30;
        const color = type === 'kick' ? '#ffaa00' : '#ff4444';
        particleSystem.emit(hitX, hitY, color, 15, targetCenter.z);

        // Flash on big damage
        if (damage > 12) {
            screenShake.flash(100);
        }
    }

    public getPlayerState(): CombatState { return this.playerState; }
    public getOpponentState(): CombatState { return this.opponentState; }

    public getPlayerCombo(): number { return this.playerState.comboCount; }
    public getOpponentCombo(): number { return this.opponentState.comboCount; }

    public isPlayerFlashing(): boolean { return this.playerState.hitFlashTimer > 0; }
    public isOpponentFlashing(): boolean { return this.opponentState.hitFlashTimer > 0; }

    public reset() {
        this.playerState = this.createCombatState();
        this.opponentState = this.createCombatState();
    }
}

export const combatSystem = new CombatSystem();
