export class CameraService {
    private videoElement: HTMLVideoElement | null = null;
    private stream: MediaStream | null = null;
    private isInitialized: boolean = false;

    public async init(): Promise<HTMLVideoElement> {
        if (this.isInitialized && this.videoElement) return this.videoElement;

        this.videoElement = document.createElement('video');
        this.videoElement.setAttribute('autoplay', '');
        this.videoElement.setAttribute('muted', '');
        this.videoElement.setAttribute('playsinline', '');
        this.videoElement.style.display = 'none';
        document.body.appendChild(this.videoElement);

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480 },
                audio: false
            });
            this.videoElement.srcObject = this.stream;

            return new Promise((resolve) => {
                if (!this.videoElement) return;
                this.videoElement.onloadedmetadata = () => {
                    this.videoElement?.play();
                    this.isInitialized = true;
                    resolve(this.videoElement!);
                };
            });
        } catch (error) {
            console.error('[CameraService] Failed to initialize camera:', error);
            this.isInitialized = false;
            throw error;
        }
    }

    public stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.videoElement) {
            this.videoElement.pause();
            this.videoElement.srcObject = null;
            document.body.removeChild(this.videoElement);
            this.videoElement = null;
        }
        this.isInitialized = false;
    }

    public getIsInitialized(): boolean {
        return this.isInitialized;
    }
}

export const cameraService = new CameraService();
