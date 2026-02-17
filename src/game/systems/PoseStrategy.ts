import type { InputStrategy, InputState } from './InputManager';
import { poseService } from './PoseService';

export class PoseStrategy implements InputStrategy {
    private state: InputState = {
        move: { x: 0, y: 0 },  // Keep at 0 - player position is controlled by pose landmarks, not velocity
        actions: { punch: false, kick: false, block: false, jump: false }
    };

    update() {
        if (!poseService.getIsReady()) return;

        const landmarks = poseService.getLandmarks();
        if (landmarks.length === 0) return;

        // DON'T apply movement based on pose - the avatar position is already controlled by landmarks
        // Only detect gestures for actions

        const leftWrist = landmarks[15];
        const rightWrist = landmarks[16];
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];

        // Gesture detection for combat actions
        this.state.actions.punch = leftWrist.y < leftShoulder.y || rightWrist.y < rightShoulder.y;
        this.state.actions.block = Math.abs(leftWrist.x - rightWrist.x) < 0.1; // Hands close together

        // Keep move at 0 - player doesn't move via velocity, only via pose tracking
        this.state.move.x = 0;
        this.state.move.y = 0;
    }

    getState() {
        return this.state;
    }
}
