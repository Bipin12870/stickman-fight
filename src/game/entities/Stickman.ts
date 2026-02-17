import { Entity } from './Entity';

export interface Landmark {
    x: number;
    y: number;
    z: number;
    visibility?: number;
}

export class Stickman extends Entity {
    public name: string;
    public landmarks: Landmark[] = [];
    private avatarImage: HTMLImageElement | null = null;
    private imageLoaded: boolean = false;

    constructor(name: string, x: number, y: number, color: string) {
        super();
        this.name = name;
        this.position = { x, y };
        this.color = color;

        // Load avatar image for player
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
        (window as any)._lastStickmanDelta = delta;
    }

    draw(ctx: CanvasRenderingContext2D, _interpolation: number) {
        // If this is the player and we have landmarks, draw avatar with pose tracking
        if (this.name === 'Player' && this.landmarks.length > 0 && this.imageLoaded && this.avatarImage) {
            this.drawAvatarWithPose(ctx);
        } else if (this.landmarks.length > 0) {
            this.drawFullSkeleton(ctx);
        } else {
            this.drawBasicStick(ctx);
        }
    }

    private drawAvatarWithPose(ctx: CanvasRenderingContext2D) {
        if (!this.avatarImage) return;

        const { width, height } = ctx.canvas;

        // Get key landmarks and convert to screen coordinates
        // Mirror horizontally (1 - x) so movements feel natural (like looking in a mirror)
        const getPoint = (idx: number) => {
            const lm = this.landmarks[idx];
            return {
                x: (1 - lm.x) * width,  // Mirror horizontally
                y: lm.y * height
            };
        };

        // Key body points
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
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;

        // Calculate body dimensions based on pose
        const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
        const bodyHeight = Math.abs(leftHip.y - leftShoulder.y);

        // Draw head (using a circular crop from the top of the avatar image)
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

        // Draw torso (middle section of avatar)
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

        // Draw arms
        const armWidth = shoulderWidth * 0.2;
        this.drawLimb(ctx, leftShoulder, leftElbow, armWidth, '#4DB8E8');
        this.drawLimb(ctx, leftElbow, leftWrist, armWidth * 0.9, '#4DB8E8');
        this.drawLimb(ctx, rightShoulder, rightElbow, armWidth, '#4DB8E8');
        this.drawLimb(ctx, rightElbow, rightWrist, armWidth * 0.9, '#4DB8E8');

        // Draw legs
        const legWidth = shoulderWidth * 0.25;
        this.drawLimb(ctx, leftHip, leftKnee, legWidth, '#3A9FD5');
        this.drawLimb(ctx, leftKnee, leftAnkle, legWidth * 0.9, '#3A9FD5');
        this.drawLimb(ctx, rightHip, rightKnee, legWidth, '#3A9FD5');
        this.drawLimb(ctx, rightKnee, rightAnkle, legWidth * 0.9, '#3A9FD5');

        // Draw hands
        ctx.fillStyle = '#F4C2A0';
        ctx.beginPath();
        ctx.arc(leftWrist.x, leftWrist.y, armWidth * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rightWrist.x, rightWrist.y, armWidth * 0.8, 0, Math.PI * 2);
        ctx.fill();

        // Draw feet
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
        const { width, height } = ctx.canvas;

        ctx.strokeStyle = this.color;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;

        const getPoint = (idx: number) => {
            const lm = this.landmarks[idx];
            return {
                x: lm.x * width,
                y: lm.y * height
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
    }

    private drawBasicStick(ctx: CanvasRenderingContext2D) {
        const { x, y } = this.position;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;

        ctx.beginPath();
        ctx.arc(x, y - 60, 15, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x, y - 45);
        ctx.lineTo(x, y + 20);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x - 30, y - 20);
        ctx.lineTo(x + 30, y - 20);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x, y + 20);
        ctx.lineTo(x - 20, y + 60);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x, y + 20);
        ctx.lineTo(x + 20, y + 60);
        ctx.stroke();

        ctx.shadowBlur = 0;
    }
}
