import { Entity } from './Entity';

export interface Landmark {
    x: number;
    y: number;
    z: number;
    visibility?: number;
}

export type StickmanState = 'idle' | 'punching' | 'kicking' | 'blocking' | 'hit' | 'ko';

export class Stickman extends Entity {
    public name: string;
    public landmarks: Landmark[] = [];
    public state: StickmanState = 'idle';
    public hitFlash: boolean = false;
    public facingRight: boolean = true;
    private avatarImage: HTMLImageElement | null = null;
    private imageLoaded: boolean = false;

    // Animation timers
    private stateTimer: number = 0;
    private koAngle: number = 0;

    constructor(name: string, x: number, y: number, color: string) {
        super();
        this.name = name;
        this.position = { x, y, z: 0 };
        this.color = color;

        if (name === 'Player') {
            this.loadAvatarImage();
        }
    }

    private loadAvatarImage() {
        this.avatarImage = new Image();
        this.avatarImage.onload = () => {
            this.imageLoaded = true;
        };
        this.avatarImage.src = '/avatar.png';
    }

    update(delta: number) {
        // Update state timer
        if (this.stateTimer > 0) {
            this.stateTimer -= delta;
            if (this.stateTimer <= 0 && this.state !== 'ko') {
                this.state = 'idle';
            }
        }

        // KO fall animation
        if (this.state === 'ko') {
            this.koAngle = Math.min(this.koAngle + delta * 0.005, Math.PI / 2);
        }
    }

    public setState(state: StickmanState, duration: number = 200) {
        this.state = state;
        this.stateTimer = duration;
        if (state === 'ko') {
            this.koAngle = 0;
        }
    }

    /**
     * Returns a scale factor based on the Z-depth.
     * Scale 1.0 is the "neutral" depth. 
     * Higher Z = closer to camera = larger scale.
     */
    public getDepthScale(): number {
        // Map Z [0, 200] to Scale [0.5, 1.5]
        return 0.5 + (this.position.z / 200);
    }

    /**
     * Vertical offset to simulate perspective.
     * Higher Z (closer) looks "lower" on the horizon.
     */
    public getPerspectiveOffsetY(): number {
        // Map Z [0, 200] to Y offset [0, 50]
        return (this.position.z / 200) * 50;
    }

    /**
     * Returns the effective visual center of the stickman.
     * If landmarks are available, computes position from hip midpoint using
     * the same coordinate transform as the rendering code.
     * Otherwise falls back to the raw position.
     */
    public getEffectiveCenter(): { x: number; y: number; z: number } {
        const baseZ = this.position.z;
        if (this.landmarks.length > 0) {
            const SCALE = 300 * this.getDepthScale();
            const centerX = 0.5;
            const centerY = 0.5;
            const leftHip = this.landmarks[23];
            const rightHip = this.landmarks[24];
            if (leftHip && rightHip) {
                const midLmX = (leftHip.x + rightHip.x) / 2;
                const midLmY = (leftHip.y + rightHip.y) / 2;
                return {
                    x: this.position.x + (1 - midLmX - centerX) * SCALE,
                    y: this.position.y + (midLmY - centerY) * SCALE + this.getPerspectiveOffsetY(),
                    z: baseZ
                };
            }
        }
        return {
            x: this.position.x,
            y: this.position.y + this.getPerspectiveOffsetY(),
            z: baseZ
        };
    }

    draw(ctx: CanvasRenderingContext2D, _interpolation: number) {
        if (this.name === 'Player' && this.landmarks.length > 0 && this.imageLoaded && this.avatarImage) {
            this.drawAvatarWithPose(ctx);
        } else if (this.landmarks.length > 0) {
            this.drawFullSkeleton(ctx);
        } else {
            this.drawBasicStick(ctx);
        }
    }

    private drawAvatarWithPose(ctx: CanvasRenderingContext2D) {
        if (!this.avatarImage || this.landmarks.length === 0) return;

        const SCALE = 300 * this.getDepthScale();
        const centerX = 0.5;
        const centerY = 0.5;
        const perspectiveY = this.getPerspectiveOffsetY();

        // Helper to get scaled point
        const getPoint = (idx: number) => {
            const lm = this.landmarks[idx];
            return {
                x: this.position.x + (1 - lm.x - centerX) * SCALE,
                y: this.position.y + (lm.y - centerY) * SCALE + perspectiveY
            };
        };

        const nose = getPoint(0);
        const leftShoulder = getPoint(11);
        const rightShoulder = getPoint(12);
        const leftElbow = getPoint(13);
        const rightElbow = getPoint(14);
        const leftWrist = getPoint(15);
        const rightWrist = getPoint(16);
        const leftHip = getPoint(23);
        const rightHip = getPoint(24);
        const leftKnee = getPoint(25);
        const rightKnee = getPoint(26);
        const leftAnkle = getPoint(27);
        const rightAnkle = getPoint(28);

        ctx.save();

        // Hit flash effect
        if (this.hitFlash) {
            ctx.filter = 'brightness(3)';
        }

        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;

        const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
        const bodyHeight = Math.abs(leftHip.y - leftShoulder.y);

        // Head
        const headSize = shoulderWidth * 1.5;
        ctx.save();
        ctx.beginPath();
        ctx.arc(nose.x, nose.y, headSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(
            this.avatarImage,
            0, 0, this.avatarImage.width, this.avatarImage.height * 0.35,
            nose.x - headSize / 2,
            nose.y - headSize / 2,
            headSize,
            headSize
        );
        ctx.restore();

        // Torso
        const torsoWidth = shoulderWidth * 1.4;
        const torsoHeight = bodyHeight * 1.3;
        const torsoX = (leftShoulder.x + rightShoulder.x) / 2;
        const torsoY = (leftShoulder.y + leftHip.y) / 2;

        ctx.save();
        ctx.drawImage(
            this.avatarImage,
            this.avatarImage.width * 0.15, this.avatarImage.height * 0.32,
            this.avatarImage.width * 0.7, this.avatarImage.height * 0.35,
            torsoX - torsoWidth / 2,
            torsoY - torsoHeight / 2,
            torsoWidth,
            torsoHeight
        );
        ctx.restore();

        // Arms
        const armWidth = shoulderWidth * 0.2;
        this.drawLimb(ctx, leftShoulder, leftElbow, armWidth, '#4DB8E8');
        this.drawLimb(ctx, leftElbow, leftWrist, armWidth * 0.9, '#4DB8E8');
        this.drawLimb(ctx, rightShoulder, rightElbow, armWidth, '#4DB8E8');
        this.drawLimb(ctx, rightElbow, rightWrist, armWidth * 0.9, '#4DB8E8');

        // Legs
        const legWidth = shoulderWidth * 0.25;
        this.drawLimb(ctx, leftHip, leftKnee, legWidth, '#3A9FD5');
        this.drawLimb(ctx, leftKnee, leftAnkle, legWidth * 0.9, '#3A9FD5');
        this.drawLimb(ctx, rightHip, rightKnee, legWidth, '#3A9FD5');
        this.drawLimb(ctx, rightKnee, rightAnkle, legWidth * 0.9, '#3A9FD5');

        // Hands
        ctx.fillStyle = '#F4C2A0';
        ctx.beginPath();
        ctx.arc(leftWrist.x, leftWrist.y, armWidth * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rightWrist.x, rightWrist.y, armWidth * 0.8, 0, Math.PI * 2);
        ctx.fill();

        // Feet
        ctx.fillStyle = '#2E7FB8';
        const footWidth = legWidth * 1.3;
        const footHeight = legWidth * 0.7;

        ctx.beginPath();
        ctx.roundRect(leftAnkle.x - footWidth / 2, leftAnkle.y - footHeight / 2, footWidth, footHeight, footHeight / 2);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(rightAnkle.x - footWidth / 2, rightAnkle.y - footHeight / 2, footWidth, footHeight, footHeight / 2);
        ctx.fill();

        ctx.restore();
    }

    private drawLimb(ctx: CanvasRenderingContext2D, start: { x: number, y: number }, end: { x: number, y: number }, width: number, color: string) {
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const length = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));

        ctx.save();
        ctx.translate(start.x, start.y);
        ctx.rotate(angle);

        ctx.fillStyle = color;
        ctx.strokeStyle = '#2C5F8D';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.roundRect(0, -width / 2, length, width, width / 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }

    private drawFullSkeleton(ctx: CanvasRenderingContext2D) {
        const SCALE = 300;

        ctx.save();

        if (this.hitFlash) {
            ctx.filter = 'brightness(3)';
        }

        ctx.strokeStyle = this.color;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;

        const getPoint = (idx: number) => {
            const lm = this.landmarks[idx];
            const centerX = 0.5;
            const centerY = 0.5;
            return {
                x: this.position.x + (1 - lm.x - centerX) * SCALE,
                y: this.position.y + (lm.y - centerY) * SCALE
            };
        };

        const connections = [
            [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
            [11, 23], [12, 24], [23, 24],
            [23, 25], [25, 27], [12, 24], [24, 26], [26, 28]
        ];

        connections.forEach(([s, e]) => {
            const start = getPoint(s);
            const end = getPoint(e);
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
        });

        const nose = getPoint(0);
        ctx.beginPath();
        ctx.arc(nose.x, nose.y, 15, 0, Math.PI * 2);
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.restore();
    }

    private drawBasicStick(ctx: CanvasRenderingContext2D) {
        const { x, y } = this.position;
        const dir = this.facingRight ? 1 : -1;
        const scale = this.getDepthScale();
        const perspectiveY = this.getPerspectiveOffsetY();

        ctx.save();

        // Perspective shift and scaling
        ctx.translate(x, y + perspectiveY);
        ctx.scale(scale, scale);
        ctx.translate(-x, -y);

        // Hit flash
        if (this.hitFlash) {
            ctx.filter = 'brightness(3)';
        }

        // KO rotation
        if (this.state === 'ko') {
            ctx.translate(x, y + 20);
            ctx.rotate(this.koAngle * dir);
            ctx.translate(-x, -(y + 20));
        }

        ctx.strokeStyle = this.color;
        ctx.fillStyle = this.color;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;

        // Head
        ctx.beginPath();
        ctx.arc(x, y - 60, 15, 0, Math.PI * 2);
        ctx.stroke();

        // Body
        ctx.beginPath();
        ctx.moveTo(x, y - 45);
        ctx.lineTo(x, y + 20);
        ctx.stroke();

        // Arms based on state
        if (this.state === 'punching') {
            // Punch — one arm forward, one back
            ctx.beginPath();
            ctx.moveTo(x, y - 30);
            ctx.lineTo(x + dir * 50, y - 30); // Extended punch arm
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, y - 25);
            ctx.lineTo(x - dir * 20, y - 15); // Back arm
            ctx.stroke();

            // Fist glow
            ctx.fillStyle = '#ffaa00';
            ctx.shadowColor = '#ffaa00';
            ctx.beginPath();
            ctx.arc(x + dir * 52, y - 30, 6, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.state === 'kicking') {
            // Normal arms
            ctx.beginPath();
            ctx.moveTo(x - 25, y - 25);
            ctx.lineTo(x + 25, y - 25);
            ctx.stroke();

            // Kick leg extends differently - drawn in legs section
        } else if (this.state === 'blocking') {
            // Arms crossed in front
            ctx.lineWidth = 7;
            ctx.beginPath();
            ctx.moveTo(x - 15, y - 40);
            ctx.lineTo(x + 10, y - 15);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + 15, y - 40);
            ctx.lineTo(x - 10, y - 15);
            ctx.stroke();
            ctx.lineWidth = 5;

            // Shield glow
            ctx.strokeStyle = 'rgba(0, 200, 255, 0.4)';
            ctx.shadowColor = '#00ccff';
            ctx.shadowBlur = 20;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y - 25, 25, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            // Normal arms
            ctx.beginPath();
            ctx.moveTo(x - 30, y - 20);
            ctx.lineTo(x + 30, y - 20);
            ctx.stroke();
        }

        // Reset
        ctx.strokeStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.lineWidth = 5;

        // Legs based on state
        if (this.state === 'kicking') {
            // One leg forward, one normal
            ctx.beginPath();
            ctx.moveTo(x, y + 20);
            ctx.lineTo(x - dir * 20, y + 60);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(x, y + 20);
            ctx.lineTo(x + dir * 45, y + 15); // Kick leg extended
            ctx.stroke();

            // Kick glow
            ctx.fillStyle = '#ffaa00';
            ctx.shadowColor = '#ffaa00';
            ctx.beginPath();
            ctx.arc(x + dir * 47, y + 15, 6, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.moveTo(x, y + 20);
            ctx.lineTo(x - 20, y + 60);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(x, y + 20);
            ctx.lineTo(x + 20, y + 60);
            ctx.stroke();
        }

        ctx.shadowBlur = 0;
        ctx.restore();
    }
}
