import { GameLoop } from './core/GameLoop';
import { StateManager } from './core/StateManager';
import { debugSystem } from './core/DebugSystem';
import { Renderer } from './renderer/Renderer';
import { Stickman } from './entities/Stickman';
import { InputManager } from './systems/InputManager';
import { poseService } from './systems/PoseService';
import { PoseStrategy } from './systems/PoseStrategy';
import { physicsSystem } from './systems/PhysicsSystem';
import { aiSystem } from './systems/AISystem';
import { hudSystem } from './systems/HUDSystem';
import { particleSystem } from './systems/ParticleSystem';
import { combatSystem } from './systems/CombatSystem';
import { screenShake } from './systems/ScreenShake';
import { soundSystem } from './systems/SoundSystem';

export class Game {
    private loop: GameLoop;
    private stateManager: StateManager;
    private renderer: Renderer | null = null;
    private input: InputManager;
    private player: Stickman;
    private opponent: Stickman;
    private roundTransitionTimer: number = 0;

    constructor() {
        this.stateManager = new StateManager();
        this.loop = new GameLoop(this.update, this.render);
        this.input = new InputManager();

        this.player = new Stickman('Player', 200, 300, '#00aaff');
        this.opponent = new Stickman('AI', 600, 300, '#ff4444');
        this.player.position.z = 100;
        this.opponent.position.z = 100;
        this.opponent.facingRight = false;

        this.stateManager.subscribe((newState) => {
            debugSystem.updateState(newState);
        });
    }

    public init(canvas: HTMLCanvasElement) {
        this.renderer = new Renderer(canvas);
        this.start();
    }

    private start() {
        this.loop.start();
        this.stateManager.setState('BOOT');

        poseService.init().then(() => {
            console.log('[Game] Pose system initialized, switching to PoseStrategy');
            this.input.setStrategy(new PoseStrategy());
        }).catch(err => {
            console.error('[Game] Pose initialization failed, staying on Keyboard:', err);
        });

        setTimeout(() => {
            this.startRound();
        }, 2000);
    }

    private startRound() {
        this.player.position = { x: 200, y: 300, z: 100 };
        this.opponent.position = { x: 600, y: 300, z: 100 };
        this.player.velocity = { x: 0, y: 0, z: 0 };
        this.opponent.velocity = { x: 0, y: 0, z: 0 };
        this.player.setState('idle');
        this.opponent.setState('idle');

        hudSystem.reset();
        combatSystem.reset();

        this.stateManager.setState('ROUND_START');
        hudSystem.announce(`ROUND ${hudSystem.round}`, 1500, '#00ffff');
        soundSystem.play('bell');

        setTimeout(() => {
            hudSystem.announce('FIGHT!', 1000, '#ffdd00');
            setTimeout(() => {
                this.stateManager.setState('FIGHTING');
            }, 500);
        }, 1500);
    }

    private endRound(winner: 'player' | 'opponent') {
        this.stateManager.setState('ROUND_END');

        if (winner === 'player') {
            hudSystem.playerWins++;
            this.opponent.setState('ko');
            hudSystem.announce('K.O.!', 2000, '#ff4444');
        } else {
            hudSystem.opponentWins++;
            this.player.setState('ko');
            hudSystem.announce('K.O.!', 2000, '#ff4444');
        }

        soundSystem.play('ko');
        screenShake.shake(12, 500);
        screenShake.slowMotion(0.3, 1000);

        setTimeout(() => {
            if (hudSystem.playerWins >= 2) {
                this.stateManager.setState('VICTORY');
                hudSystem.announce('YOU WIN!', 3000, '#00ff88', 'FLAWLESS VICTORY');
            } else if (hudSystem.opponentWins >= 2) {
                this.stateManager.setState('VICTORY');
                hudSystem.announce('DEFEAT', 3000, '#ff3333', 'TRY AGAIN');
            } else {
                hudSystem.round++;
                setTimeout(() => {
                    this.startRound();
                }, 1000);
            }
        }, 2500);
    }

    private update = (delta: number) => {
        const state = this.stateManager.getState();

        const shouldUpdate = screenShake.update(delta);
        if (!shouldUpdate) return;

        const scaledDelta = delta * screenShake.getTimeScale();

        this.input.update();
        hudSystem.update(scaledDelta);

        if (state === 'FIGHTING') {
            const inputState = this.input.getState();

            // ── Pose landmark sync ──────────────────────────────────────
            if (poseService.getIsReady()) {
                const lms = poseService.getLandmarks();
                this.player.landmarks = lms;

                // FIXED: sync player Z from hips (same as before)
                const hipL = lms[23];
                const hipR = lms[24];
                if (hipL && hipR) {
                    const avgZ = (hipL.z + hipR.z) / 2;
                    const depthZ = Math.max(0, Math.min(200, 100 - (avgZ * 300)));
                    this.player.position.z = depthZ;
                }

                // FIXED: sync player Y from shoulders so jumps are real
                // MediaPipe landmark 11 = left shoulder, 12 = right shoulder
                // Camera Y is 0 (top) → 1 (bottom).
                // In your game, y=300 is ground, smaller y = higher up.
                // When player physically jumps, their shoulders rise → avgShoulderY decreases.
                const shoulderL = lms[11];
                const shoulderR = lms[12];
                if (shoulderL && shoulderR) {
                    const avgShoulderY = (shoulderL.y + shoulderR.y) / 2;
                    // Map: 0.3 (high jump) → y=150,  0.6 (standing) → y=300
                    const mappedY = Math.max(100, Math.min(300, avgShoulderY * 500));
                    this.player.position.y = mappedY;

                    // Give physics a nudge upward when player is clearly in the air
                    // so the arc feels natural instead of teleporting
                    if (mappedY < 260 && this.player.velocity.y >= 0) {
                        this.player.velocity.y = -8;
                    }
                }
            }

            // ── Player facing ───────────────────────────────────────────
            const playerCenter = this.player.getEffectiveCenter();
            const opponentCenter = this.opponent.getEffectiveCenter();
            this.player.facingRight = playerCenter.x < opponentCenter.x;

            // ── Player actions from input ───────────────────────────────
            if (inputState.actions.block) {
                this.player.setState('blocking', 100);
            } else if (inputState.actions.punch) {
                this.player.setState('punching', 200);
            } else if (inputState.actions.kick) {
                this.player.setState('kicking', 250);
            }

            // ── Player X movement ───────────────────────────────────────
            if (!inputState.actions.block) {
                this.player.velocity.x = inputState.move.x * 5;
            } else {
                this.player.velocity.x = 0;
            }

            // ── AI update ───────────────────────────────────────────────
            // AI now receives the fully-synced player position (X, Y, Z all correct)
            // before this call, so it chases in all 3 axes correctly.
            aiSystem.update(this.opponent, this.player, scaledDelta);

            // ── Debug Z/Y tracking ──────────────────────────────────────
            if ((window as any)._showDebug) {
                (window as any)._debugZ = {
                    playerZ: this.player.position.z.toFixed(1),
                    aiZ: this.opponent.position.z.toFixed(1),
                    playerY: this.player.position.y.toFixed(1),
                    aiY: this.opponent.position.y.toFixed(1),
                    aiState: aiSystem.getCurrentState(),
                };
            }

            // ── Combat ──────────────────────────────────────────────────
            const damage = combatSystem.update(
                this.player,
                this.opponent,
                inputState.actions,
                aiSystem.isAttacking(),
                scaledDelta
            );

            if (damage.opponentDamage > 0) {
                hudSystem.opponentHealth -= damage.opponentDamage;
                hudSystem.flashOpponentDamage();
                this.opponent.hitFlash = true;
                setTimeout(() => { this.opponent.hitFlash = false; }, 100);
                if (damage.opponentDamage > 12) soundSystem.play('combo');
            }
            if (damage.playerDamage > 0) {
                hudSystem.playerHealth -= damage.playerDamage;
                hudSystem.flashPlayerDamage();
                this.player.hitFlash = true;
                setTimeout(() => { this.player.hitFlash = false; }, 100);
            }

            hudSystem.playerCombo = combatSystem.getPlayerCombo();
            hudSystem.opponentCombo = combatSystem.getOpponentCombo();

            // ── Physics ─────────────────────────────────────────────────
            physicsSystem.update([this.player, this.opponent], scaledDelta);

            // ── Arena bounds ─────────────────────────────────────────────
            this.player.position.x = Math.max(50, Math.min(750, this.player.position.x));
            this.player.position.z = Math.max(0, Math.min(200, this.player.position.z));
            this.opponent.position.x = Math.max(50, Math.min(750, this.opponent.position.x));
            this.opponent.position.z = Math.max(0, Math.min(200, this.opponent.position.z));

            // ── Entity update ────────────────────────────────────────────
            this.player.update(scaledDelta);
            this.opponent.update(scaledDelta);

            particleSystem.update(scaledDelta, this.renderer?.getContext().canvas.width, this.renderer?.getContext().canvas.height);

            // ── Round timer ──────────────────────────────────────────────
            hudSystem.roundTimer -= scaledDelta / 1000;
            if (hudSystem.roundTimer <= 0) {
                hudSystem.roundTimer = 0;
                if (hudSystem.playerHealth >= hudSystem.opponentHealth) {
                    this.endRound('player');
                } else {
                    this.endRound('opponent');
                }
            }

            // ── KO check ─────────────────────────────────────────────────
            if (hudSystem.opponentHealth <= 0) {
                this.endRound('player');
            } else if (hudSystem.playerHealth <= 0) {
                this.endRound('opponent');
            }

        } else if (state === 'ROUND_START' || state === 'ROUND_END' || state === 'KO') {
            physicsSystem.update([this.player, this.opponent], scaledDelta);
            this.player.update(scaledDelta);
            this.opponent.update(scaledDelta);
            particleSystem.update(scaledDelta, this.renderer?.getContext().canvas.width, this.renderer?.getContext().canvas.height);

        } else if (state === 'VICTORY') {
            particleSystem.update(scaledDelta, this.renderer?.getContext().canvas.width, this.renderer?.getContext().canvas.height);
            this.roundTransitionTimer += scaledDelta;

            if (this.roundTransitionTimer > 200) {
                this.roundTransitionTimer = 0;
                const canvasW = this.renderer?.getContext().canvas.width || 800;
                particleSystem.emit(
                    Math.random() * canvasW,
                    50 + Math.random() * 100,
                    `hsl(${Math.random() * 360}, 100%, 60%)`,
                    5
                );
            }
        }

        (window as any)._lastDelta = delta;
    };

    private render = (interpolation: number) => {
        if (!this.renderer) return;

        const now = performance.now();
        const fps = Math.round(1000 / (now - ((window as any)._lastRender || (now - 16))));
        (window as any)._lastRender = now;
        debugSystem.updateMetrics(fps, now);

        this.renderer.clear();

        const ctx = this.renderer.getContext();
        const offset = screenShake.getOffset();
        ctx.save();
        ctx.translate(offset.x, offset.y);

        const playerShadowCenter = this.player.getEffectiveCenter();
        const opponentShadowCenter = this.opponent.getEffectiveCenter();
        const playerScale = this.player.getDepthScale();
        const opponentScale = this.opponent.getDepthScale();

        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(playerShadowCenter.x, playerShadowCenter.y + 60 * playerScale, 20 * playerScale, 5 * playerScale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(opponentShadowCenter.x, opponentShadowCenter.y + 60 * opponentScale, 20 * opponentScale, 5 * opponentScale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        this.renderer.drawEntity(this.player, interpolation);
        this.renderer.drawEntity(this.opponent, interpolation);

        particleSystem.draw(this.renderer.getContext());
        this.renderer.drawFlash();
        hudSystem.draw(this.renderer);
        this.renderer.drawDebugInfo({
            state: this.stateManager.getState(),
            fps: fps
        });
    };

    public destroy() {
        this.loop.stop();
    }
}

export const gameInstance = new Game();