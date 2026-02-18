export type GameState = 'BOOT' | 'ROUND_START' | 'FIGHTING' | 'ROUND_END' | 'KO' | 'VICTORY' | 'PLAY' | 'PAUSE' | 'GAME_OVER' | 'ATTACK';

type StateChangeListener = (newState: GameState, oldState: GameState) => void;

export class StateManager {
    private currentState: GameState = 'BOOT';
    private listeners: StateChangeListener[] = [];

    public getState(): GameState {
        return this.currentState;
    }

    public setState(newState: GameState): void {
        if (this.currentState === newState) return;

        const oldState = this.currentState;
        this.currentState = newState;

        console.log(`[StateManager] Transition: ${oldState} -> ${newState}`);
        this.notifyListeners(newState, oldState);
    }

    public subscribe(listener: StateChangeListener): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners(newState: GameState, oldState: GameState): void {
        this.listeners.forEach(listener => listener(newState, oldState));
    }
}
