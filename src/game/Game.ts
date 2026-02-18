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

        // Async initialize PoseService (non-blocking)
        poseService.init().then(() => {
            console.log('[Game] Pose system initialized, switching to PoseStrategy');
            this.input.setStrategy(new PoseStrategy());
        }).catch(err => {
            console.error('[Game] Pose initialization failed, staying on Keyboard:', err);
        });

        // Boot → Round Start
        setTimeout(() => {
            this.startRound();
        }, 2000);
    }

    private startRound() {
        // Reset positions
        this.player.position = { x: 200, y: 300 };
        this.opponent.position = { x: 600, y: 300 };
        this.player.velocity = { x: 0, y: 0 };
        this.opponent.velocity = { x: 0, y: 0 };
        this.player.setState('idle');
        this.opponent.setState('idle');

        // Reset health
        hudSystem.reset();
        combatSystem.reset();

        // Announce round
        this.stateManager.setState('ROUND_START');
        hudSystem.announce(`ROUND ${hudSystem.round}`, 1500, '#00ffff');
        soundSystem.play('bell');

        // After announcement, start fighting
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

        // Check for match winner
        setTimeout(() => {
            if (hudSystem.playerWins >= 2) {
                this.stateManager.setState('VICTORY');
                hudSystem.announce('YOU WIN!', 3000, '#00ff88', 'FLAWLESS VICTORY');
            } else if (hudSystem.opponentWins >= 2) {
                this.stateManager.setState('VICTORY');
                hudSystem.announce('DEFEAT', 3000, '#ff3333', 'TRY AGAIN');
            } else {
                // Next round
                hudSystem.round++;
                setTimeout(() => {
                    this.startRound();
                }, 1000);
            }
        }, 2500);
    }

    private update = (delta: number) => {
        const state = this.stateManager.getState();

        // Screen shake update (may signal freeze)
        const shouldUpdate = screenShake.update(delta);
        if (!shouldUpdate) return; // Hit freeze — skip game update

        // Apply time scale
        const scaledDelta = delta * screenShake.getTimeScale();

        this.input.update();

        // HUD always updates (for animations)
        hudSystem.update(scaledDelta);

        if (state === 'FIGHTING') {
            const inputState = this.input.getState();

            // Sync landmarks if pose system is ready
            if (poseService.getIsReady()) {
                this.player.landmarks = poseService.getLandmarks();
            }

            // Player facing
            this.player.facingRight = this.player.position.x < this.opponent.position.x;

            // Set player visual state from input
            if (inputState.actions.block) {
                this.player.setState('blocking', 100);
            } else if (inputState.actions.punch) {
                this.player.setState('punching', 200);
            } else if (inputState.actions.kick) {
                this.player.setState('kicking', 250);
            }

            // Apply input to player velocity
            this.player.velocity.x = inputState.move.x * 5;
            if (inputState.actions.jump && this.player.velocity.y === 0) {
                this.player.velocity.y = -12;
            }

            // AI Logic
            aiSystem.update(this.opponent, this.player, scaledDelta);

            // Combat System
            const damage = combatSystem.update(
                this.player,
                this.opponent,
                inputState.actions,
                aiSystem.isAttacking(),
                scaledDelta
            );

            // Apply damage
            if (damage.opponentDamage > 0) {
                hudSystem.opponentHealth -= damage.opponentDamage;
                hudSystem.flashOpponentDamage();
                this.opponent.hitFlash = true;
                setTimeout(() => { this.opponent.hitFlash = false; }, 100);

                if (damage.opponentDamage > 12) {
                    soundSystem.play('combo');
                }
            }
            if (damage.playerDamage > 0) {
                hudSystem.playerHealth -= damage.playerDamage;
                hudSystem.flashPlayerDamage();
                this.player.hitFlash = true;
                setTimeout(() => { this.player.hitFlash = false; }, 100);
            }

            // Combo display
            hudSystem.playerCombo = combatSystem.getPlayerCombo();
            hudSystem.opponentCombo = combatSystem.getOpponentCombo();

            // Clamp health
            hudSystem.playerHealth = Math.max(0, hudSystem.playerHealth);
            hudSystem.opponentHealth = Math.max(0, hudSystem.opponentHealth);

            // Physics Update
            physicsSystem.update([this.player, this.opponent], scaledDelta);

            // Arena boundary enforcement
            this.player.position.x = Math.max(50, Math.min(750, this.player.position.x));
            this.opponent.position.x = Math.max(50, Math.min(750, this.opponent.position.x));

            // Update characters
            this.player.update(scaledDelta);
            this.opponent.update(scaledDelta);

            // Update atmospheric particles
            particleSystem.update(scaledDelta, this.renderer?.getContext().canvas.width, this.renderer?.getContext().canvas.height);

            // Round timer
            hudSystem.roundTimer -= scaledDelta / 1000;
            if (hudSystem.roundTimer <= 0) {
                hudSystem.roundTimer = 0;
                // Time up — whoever has more health wins
                if (hudSystem.playerHealth >= hudSystem.opponentHealth) {
                    this.endRound('player');
                } else {
                    this.endRound('opponent');
                }
            }

            // KO check
            if (hudSystem.opponentHealth <= 0) {
                this.endRound('player');
            } else if (hudSystem.playerHealth <= 0) {
                this.endRound('opponent');
            }

        } else if (state === 'ROUND_START' || state === 'ROUND_END' || state === 'KO') {
            // Keep updating physics/particles during transitions
            physicsSystem.update([this.player, this.opponent], scaledDelta);
            this.player.update(scaledDelta);
            this.opponent.update(scaledDelta);
            particleSystem.update(scaledDelta, this.renderer?.getContext().canvas.width, this.renderer?.getContext().canvas.height);
        } else if (state === 'VICTORY') {
            particleSystem.update(scaledDelta, this.renderer?.getContext().canvas.width, this.renderer?.getContext().canvas.height);
            this.roundTransitionTimer += scaledDelta;

            // Emit celebration particles
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

        // Keep linter happy for now
        (window as any)._lastDelta = delta;
    };

    private render = (interpolation: number) => {
        if (!this.renderer) return;

        // Basic FPS calculation for debug
        const now = performance.now();
        const fps = Math.round(1000 / (now - ((window as any)._lastRender || (now - 16))));
        (window as any)._lastRender = now;
        debugSystem.updateMetrics(fps, now);

        this.renderer.clear();

        // Draw character shadows
        const ctx = this.renderer.getContext();
        const offset = screenShake.getOffset();
        ctx.save();
        ctx.translate(offset.x, offset.y);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(this.player.position.x + 25, 350, 20, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(this.opponent.position.x + 25, 350, 20, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        this.renderer.drawEntity(this.player, interpolation);
        this.renderer.drawEntity(this.opponent, interpolation);

        particleSystem.draw(this.renderer.getContext());

        // Hit flash overlay
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
