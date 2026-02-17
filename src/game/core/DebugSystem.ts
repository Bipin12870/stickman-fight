import type { GameState } from './StateManager';

interface DebugState {
    state: GameState;
    fps: number;
    lastFrameTime: number;
    inputSource: string;
}

export class DebugSystem {
    private static instance: DebugSystem;
    private debugState: DebugState = {
        state: 'BOOT',
        fps: 0,
        lastFrameTime: 0,
        inputSource: 'NONE'
    };

    private constructor() {
        // Expose to window
        (window as any).__DEBUG__ = this;
    }

    public static getInstance(): DebugSystem {
        if (!DebugSystem.instance) {
            DebugSystem.instance = new DebugSystem();
        }
        return DebugSystem.instance;
    }

    public updateState(state: GameState) {
        this.debugState.state = state;
    }

    public updateMetrics(fps: number, lastFrameTime: number) {
        this.debugState.fps = fps;
        this.debugState.lastFrameTime = lastFrameTime;
    }

    public updateInputSource(source: string) {
        this.debugState.inputSource = source;
    }

    // Debug Controls
    public setInput(source: string) {
        console.log(`[DEBUG] Forcing input source to: ${source}`);
        this.updateInputSource(source);
    }

    public pauseLoop() {
        console.log('[DEBUG] Pausing game loop');
        // This will need interaction with gameInstance
    }

    public getStatus(): DebugState {
        return { ...this.debugState };
    }
}

export const debugSystem = DebugSystem.getInstance();
