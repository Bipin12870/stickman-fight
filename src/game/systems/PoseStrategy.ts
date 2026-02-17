import type { InputStrategy, InputState } from './InputManager';
import { poseService } from './PoseService';

export class PoseStrategy implements InputStrategy {
    private state: InputState = {
        move: { x: 0, y: 0 },
        actions: { punch: false, kick: false, block: false, jump: false }
    };

    update() {
        if (!poseService.getIsReady()) return;

        const landmarks = poseService.getLandmarks();
        if (landmarks.length === 0) return;

        // Map landmarks to InputState
        // Using nose (idx 0) for movement for now
        const nose = landmarks[0];

        // Normalize nose position to move (-1 to 1)
        // Assuming camera is 640x480, Mediapipe gives 0-1
        this.state.move.x = (nose.x - 0.5) * 2;
        this.state.move.y = (nose.y - 0.5) * 2;

        // Basic gesture detection
        // Hands above shoulders for something?
        const leftWrist = landmarks[15];
        const rightWrist = landmarks[16];
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];

        this.state.actions.punch = leftWrist.y < leftShoulder.y || rightWrist.y < rightShoulder.y;
        this.state.actions.block = Math.abs(leftWrist.x - rightWrist.x) < 0.1; // Hands close together
        this.state.actions.jump = nose.y < 0.3; // High nose position
    }

    getState() {
        return this.state;
    }
}
