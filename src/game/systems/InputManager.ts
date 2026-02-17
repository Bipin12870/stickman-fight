export type InputState = {
    move: { x: number; y: number };
    actions: {
        punch: boolean;
        kick: boolean;
        block: boolean;
        jump: boolean;
    };
};

export interface InputStrategy {
    update(): void;
    getState(): InputState;
}

export class KeyboardStrategy implements InputStrategy {
    private keys: Record<string, boolean> = {};
    private state: InputState = {
        move: { x: 0, y: 0 },
        actions: { punch: false, kick: false, block: false, jump: false }
    };

    constructor() {
        window.addEventListener('keydown', (e) => this.keys[e.code] = true);
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);
    }

    update() {
        this.state.move.x = (this.keys['ArrowRight'] ? 1 : 0) - (this.keys['ArrowLeft'] ? 1 : 0);
        this.state.move.y = (this.keys['ArrowDown'] ? 1 : 0) - (this.keys['ArrowUp'] ? 1 : 0);

        this.state.actions.punch = !!this.keys['KeyZ'];
        this.state.actions.kick = !!this.keys['KeyX'];
        this.state.actions.block = !!this.keys['KeyC'];
        this.state.actions.jump = !!this.keys['Space'];
    }

    getState() {
        return this.state;
    }
}

export class InputManager {
    private strategy: InputStrategy;

    constructor(strategy: InputStrategy = new KeyboardStrategy()) {
        this.strategy = strategy;
    }

    public setStrategy(strategy: InputStrategy) {
        this.strategy = strategy;
    }

    public getStrategy() {
        return this.strategy;
    }

    public update() {
        this.strategy.update();
    }

    public getState() {
        return this.strategy.getState();
    }
}
