import { Renderer } from '../renderer/Renderer';

interface Announcement {
    text: string;
    timer: number;
    duration: number;
    scale: number;
    color: string;
    subText?: string;
}

export class HUDSystem {
    public playerHealth: number = 100;
    public opponentHealth: number = 100;
    private playerDisplayHealth: number = 100; // Delayed drain
    private opponentDisplayHealth: number = 100;
    private playerDamageFlash: number = 0;
    private opponentDamageFlash: number = 0;

    // Combo
    public playerCombo: number = 0;
    public opponentCombo: number = 0;
    private comboDisplayTimer: number = 0;
    private comboScale: number = 1;

    // Round
    public round: number = 1;
    public maxRounds: number = 3;
    public playerWins: number = 0;
    public opponentWins: number = 0;

    // Timer
    public roundTimer: number = 60;

    // Announcements
    private announcement: Announcement | null = null;

    public update(delta: number) {
        // Smooth health drain
        const drainSpeed = 0.05;
        this.playerDisplayHealth += (this.playerHealth - this.playerDisplayHealth) * drainSpeed;
        this.opponentDisplayHealth += (this.opponentHealth - this.opponentDisplayHealth) * drainSpeed;

        // Damage flash
        this.playerDamageFlash = Math.max(0, this.playerDamageFlash - delta * 0.005);
        this.opponentDamageFlash = Math.max(0, this.opponentDamageFlash - delta * 0.005);

        // Combo display
        if (this.playerCombo > 1) {
            this.comboDisplayTimer = 2000;
            this.comboScale = 1.5;
        }
        if (this.comboDisplayTimer > 0) {
            this.comboDisplayTimer -= delta;
            this.comboScale = Math.max(1, this.comboScale - delta * 0.002);
        }

        // Announcement
        if (this.announcement) {
            this.announcement.timer -= delta;
            const progress = 1 - (this.announcement.timer / this.announcement.duration);
            // Scale in then out
            if (progress < 0.2) {
                this.announcement.scale = progress / 0.2;
            } else if (progress > 0.8) {
                this.announcement.scale = (1 - progress) / 0.2;
            } else {
                this.announcement.scale = 1;
            }
            if (this.announcement.timer <= 0) {
                this.announcement = null;
            }
        }
    }

    public flashPlayerDamage() { this.playerDamageFlash = 1; }
    public flashOpponentDamage() { this.opponentDamageFlash = 1; }

    public announce(text: string, duration: number = 2000, color: string = '#00ffff', subText?: string) {
        this.announcement = { text, timer: duration, duration, scale: 0, color, subText };
    }

    public draw(renderer: Renderer) {
        const ctx = renderer.getContext();
        const canvas = ctx.canvas;
        const centerX = canvas.width / 2;

        ctx.save();

        // === HEALTH BARS ===
        this.drawStyledHealthBar(ctx, 20, 15, this.playerHealth, this.playerDisplayHealth, '#0066ff', '#0044aa', 'PLAYER', this.playerDamageFlash, false);
        this.drawStyledHealthBar(ctx, canvas.width - 320, 15, this.opponentHealth, this.opponentDisplayHealth, '#ff3333', '#aa2222', 'OPPONENT', this.opponentDamageFlash, true);

        // === ROUND INDICATOR ===
        ctx.textAlign = 'center';
        ctx.font = 'bold 14px "Courier New", monospace';
        ctx.fillStyle = '#00ffff';
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#00ffff';
        ctx.fillText(`ROUND ${this.round}`, centerX, 18);

        // Round wins dots
        for (let i = 0; i < this.maxRounds; i++) {
            const dotX = centerX - 20 + (i * 20);
            ctx.beginPath();
            ctx.arc(dotX, 32, 5, 0, Math.PI * 2);
            if (i < this.playerWins) {
                ctx.fillStyle = '#0066ff';
            } else if (i < this.opponentWins) {
                ctx.fillStyle = '#ff3333';
            } else {
                ctx.fillStyle = '#333';
            }
            ctx.fill();
            ctx.strokeStyle = '#666';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // === TIMER ===
        const timerStr = Math.ceil(this.roundTimer).toString();
        ctx.font = 'bold 28px "Courier New", monospace';
        ctx.fillStyle = this.roundTimer <= 10 ? '#ff4444' : '#ffffff';
        ctx.shadowBlur = this.roundTimer <= 10 ? 10 : 5;
        ctx.shadowColor = this.roundTimer <= 10 ? '#ff0000' : '#ffffff';
        ctx.fillText(timerStr, centerX, 60);

        ctx.shadowBlur = 0;

        // === COMBO COUNTER ===
        if (this.comboDisplayTimer > 0 && this.playerCombo > 1) {
            const comboAlpha = Math.min(1, this.comboDisplayTimer / 500);
            ctx.globalAlpha = comboAlpha;
            ctx.font = `bold ${Math.floor(24 * this.comboScale)}px "Courier New", monospace`;
            ctx.fillStyle = '#ffdd00';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ffaa00';
            ctx.textAlign = 'left';
            ctx.fillText(`${this.playerCombo} HIT COMBO!`, 25, canvas.height - 30);
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
        }

        // === ANNOUNCEMENT ===
        if (this.announcement && this.announcement.scale > 0) {
            ctx.save();
            ctx.translate(centerX, canvas.height * 0.4);
            ctx.scale(this.announcement.scale, this.announcement.scale);

            ctx.font = 'bold 64px "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = this.announcement.color;
            ctx.shadowBlur = 30;
            ctx.shadowColor = this.announcement.color;
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 4;
            ctx.strokeText(this.announcement.text, 0, 0);
            ctx.fillText(this.announcement.text, 0, 0);

            if (this.announcement.subText) {
                ctx.font = 'bold 24px "Courier New", monospace';
                ctx.fillStyle = '#ffffff';
                ctx.shadowBlur = 10;
                ctx.fillText(this.announcement.subText, 0, 40);
            }

            ctx.restore();
        }

        ctx.restore();
    }

    private drawStyledHealthBar(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        health: number, displayHealth: number,
        color: string, darkColor: string,
        label: string,
        damageFlash: number,
        mirror: boolean
    ) {
        const barWidth = 300;
        const barHeight = 22;

        // Label
        ctx.font = 'bold 13px "Courier New", monospace';
        ctx.textAlign = mirror ? 'right' : 'left';
        ctx.fillStyle = color;
        ctx.shadowBlur = 5;
        ctx.shadowColor = color;
        ctx.fillText(label, mirror ? x + barWidth : x, y);
        ctx.shadowBlur = 0;

        const barY = y + 5;

        // Background
        ctx.fillStyle = '#1a1a2e';
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x, barY, barWidth, barHeight, 4);
        ctx.fill();
        ctx.stroke();

        // Delayed drain bar (white)
        if (displayHealth > health) {
            const drainWidth = (displayHealth / 100) * (barWidth - 4);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            if (mirror) {
                ctx.fillRect(x + barWidth - 2 - drainWidth, barY + 2, drainWidth, barHeight - 4);
            } else {
                ctx.fillRect(x + 2, barY + 2, drainWidth, barHeight - 4);
            }
        }

        // Health fill with gradient
        const healthWidth = (health / 100) * (barWidth - 4);
        const gradient = ctx.createLinearGradient(x, barY, x, barY + barHeight);
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.5, darkColor);
        gradient.addColorStop(1, color);
        ctx.fillStyle = gradient;

        if (mirror) {
            ctx.fillRect(x + barWidth - 2 - healthWidth, barY + 2, healthWidth, barHeight - 4);
        } else {
            ctx.fillRect(x + 2, barY + 2, healthWidth, barHeight - 4);
        }

        // Damage flash
        if (damageFlash > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${damageFlash * 0.6})`;
            ctx.fillRect(x + 2, barY + 2, barWidth - 4, barHeight - 4);
        }

        // Shine line
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(x + 2, barY + 2, barWidth - 4, (barHeight - 4) / 3);

        // Health percentage
        ctx.font = 'bold 11px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.fillText(`${Math.ceil(health)}%`, x + barWidth / 2, barY + barHeight - 6);
    }

    public reset() {
        this.playerHealth = 100;
        this.opponentHealth = 100;
        this.playerDisplayHealth = 100;
        this.opponentDisplayHealth = 100;
        this.playerCombo = 0;
        this.opponentCombo = 0;
        this.roundTimer = 60;
    }

    public fullReset() {
        this.reset();
        this.round = 1;
        this.playerWins = 0;
        this.opponentWins = 0;
    }
}

export const hudSystem = new HUDSystem();
