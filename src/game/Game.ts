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

export class Game {
    private loop: GameLoop;
    private stateManager: StateManager;
    private renderer: Renderer | null = null;
    private input: InputManager;
    private player: Stickman;
    private opponent: Stickman;

    constructor() {
        this.stateManager = new StateManager();
        this.loop = new GameLoop(this.update, this.render);
        this.input = new InputManager();

        this.player = new Stickman('Player', 200, 300, '#00f');
        this.opponent = new Stickman('AI', 600, 300, '#f00');

        // Subscribe to state changes for debug visibility
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

        // Simulate boot sequence for now
        setTimeout(() => {
            this.stateManager.setState('ATTACK');
        }, 2000);
    }

    private update = (delta: number) => {
        const state = this.stateManager.getState();

        this.input.update();

        if (state === 'PLAY' || state === 'ATTACK') {
            const inputState = this.input.getState();

            // Sync landmarks if pose system is ready
            if (poseService.getIsReady()) {
                this.player.landmarks = poseService.getLandmarks();
            }

            // Apply input to player velocity
            this.player.velocity.x = inputState.move.x * 5;
            if (inputState.actions.jump && this.player.velocity.y === 0) {
                this.player.velocity.y = -12;
            }

            // AI Logic
            aiSystem.update(this.opponent, this.player, delta);

            // Physics Update
            physicsSystem.update([this.player, this.opponent], delta);

            this.player.update(delta);
            this.opponent.update(delta);

            // Simple collision
            if (physicsSystem.checkCollision(this.player, this.opponent)) {
                if (inputState.actions.punch) {
                    hudSystem.opponentHealth -= 0.5;
                    particleSystem.emit(this.opponent.position.x, this.opponent.position.y, '#f00');
                    if (hudSystem.opponentHealth < 0) hudSystem.opponentHealth = 0;
                }
            }

            particleSystem.update(delta);
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

        this.renderer.drawEntity(this.player, interpolation);
        this.renderer.drawEntity(this.opponent, interpolation);

        particleSystem.draw(this.renderer.getContext());

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
