import { Pose } from '@mediapipe/pose';
import { cameraService } from './CameraService';
import { debugSystem } from '../core/DebugSystem';

export interface PoseLandmark {
    x: number;
    y: number;
    z: number;
    visibility?: number;
}

export class PoseService {
    private pose: Pose | null = null;
    private landmarks: PoseLandmark[] = [];
    private isReady: boolean = false;
    private isModelLoading: boolean = false;

    public async init(): Promise<void> {
        if (this.isReady || this.isModelLoading) return;
        this.isModelLoading = true;

        try {
            // Load MediaPipe Pose (using CDN resources as common for this library)
            this.pose = new Pose({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
                }
            });

            this.pose.setOptions({
                modelComplexity: 1,
                smoothLandmarks: true,
                enableSegmentation: false,
                smoothSegmentation: false,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            this.pose.onResults(this.onResults);

            await this.pose.initialize();

            const video = await cameraService.init();
            this.isReady = true;
            this.isModelLoading = false;
            console.log('[PoseService] Ready');

            // Start processing loop
            this.processVideo(video);
        } catch (error) {
            console.error('[PoseService] Failed to initialize:', error);
            this.isModelLoading = false;
            throw error;
        }
    }

    private onResults = (results: any) => {
        if (results.poseLandmarks) {
            this.landmarks = results.poseLandmarks;
            debugSystem.updateInputSource('POSE');
        }
    };

    private async processVideo(video: HTMLVideoElement) {
        if (!this.isReady || !this.pose) return;

        const run = async () => {
            if (!this.isReady || !this.pose) return;
            try {
                await this.pose.send({ image: video });
            } catch (err) {
                console.error('[PoseService] Error processing frame:', err);
            }
            requestAnimationFrame(run);
        };

        run();
    }

    public getLandmarks(): PoseLandmark[] {
        return this.landmarks;
    }

    public getIsReady(): boolean {
        return this.isReady;
    }
}

export const poseService = new PoseService();
