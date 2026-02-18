import { Hands } from '@mediapipe/hands';
import { cameraService } from './CameraService';

export interface HandLandmark {
    x: number;
    y: number;
    z: number;
}

export interface HandData {
    landmarks: HandLandmark[];
    handedness: 'Left' | 'Right';
}

export class HandService {
    private hands: Hands | null = null;
    private leftHand: HandLandmark[] = [];
    private rightHand: HandLandmark[] = [];
    private isReady: boolean = false;
    private isModelLoading: boolean = false;

    public async init(): Promise<void> {
        if (this.isReady || this.isModelLoading) return;
        this.isModelLoading = true;

        try {
            // Wait a bit to avoid WASM conflicts with PoseService
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Load MediaPipe Hands
            this.hands = new Hands({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
                }
            });

            this.hands.setOptions({
                maxNumHands: 2,
                modelComplexity: 1,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            this.hands.onResults(this.onResults);

            await this.hands.initialize();

            this.isReady = true;
            this.isModelLoading = false;
            console.log('[HandService] Ready');

            // Start processing with camera if available
            const video = cameraService.getVideo();
            if (video) {
                this.processVideo(video);
            } else {
                console.warn('[HandService] Camera not available yet');
            }
        } catch (error) {
            console.error('[HandService] Failed to initialize:', error);
            this.isModelLoading = false;
            throw error;
        }
    }

    private onResults = (results: any) => {
        // Clear previous hands
        this.leftHand = [];
        this.rightHand = [];

        if (results.multiHandLandmarks && results.multiHandedness) {
            for (let i = 0; i < results.multiHandLandmarks.length; i++) {
                const landmarks = results.multiHandLandmarks[i];
                const handedness = results.multiHandedness[i].label; // 'Left' or 'Right'

                if (handedness === 'Left') {
                    this.leftHand = landmarks;
                } else if (handedness === 'Right') {
                    this.rightHand = landmarks;
                }
            }
        }
    };

    private async processVideo(video: HTMLVideoElement) {
        if (!this.isReady || !this.hands) return;

        const run = async () => {
            if (!this.isReady || !this.hands) return;
            try {
                await this.hands.send({ image: video });
            } catch (err) {
                console.error('[HandService] Error processing frame:', err);
            }
            requestAnimationFrame(run);
        };

        run();
    }

    public getLeftHand(): HandLandmark[] {
        return this.leftHand;
    }

    public getRightHand(): HandLandmark[] {
        return this.rightHand;
    }

    public isInitialized(): boolean {
        return this.isReady;
    }
}

export const handService = new HandService();
