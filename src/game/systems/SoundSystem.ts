export class SoundSystem {
    private audioCtx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private enabled: boolean = true;

    private getContext(): AudioContext {
        if (!this.audioCtx) {
            this.audioCtx = new AudioContext();
            this.masterGain = this.audioCtx.createGain();
            this.masterGain.gain.value = 0.3;
            this.masterGain.connect(this.audioCtx.destination);
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        return this.audioCtx;
    }

    public play(sound: 'punch' | 'kick' | 'block' | 'whoosh' | 'ko' | 'bell' | 'combo') {
        if (!this.enabled) return;

        const ctx = this.getContext();
        const now = ctx.currentTime;

        switch (sound) {
            case 'punch':
                this.playNoise(ctx, now, 0.08, 800, 0.25);
                this.playTone(ctx, now, 0.05, 150, 'square', 0.15);
                break;

            case 'kick':
                this.playNoise(ctx, now, 0.12, 400, 0.3);
                this.playTone(ctx, now, 0.08, 80, 'sawtooth', 0.2);
                break;

            case 'block':
                this.playTone(ctx, now, 0.1, 800, 'square', 0.15);
                this.playTone(ctx, now + 0.02, 0.08, 1200, 'square', 0.1);
                break;

            case 'whoosh':
                this.playFilteredNoise(ctx, now, 0.15, 2000, 200, 0.08);
                break;

            case 'ko':
                this.playTone(ctx, now, 0.3, 200, 'sawtooth', 0.4);
                this.playTone(ctx, now + 0.1, 0.3, 150, 'sawtooth', 0.3);
                this.playTone(ctx, now + 0.2, 0.5, 80, 'sawtooth', 0.5);
                this.playNoise(ctx, now, 0.5, 200, 0.3);
                break;

            case 'bell':
                this.playTone(ctx, now, 0.6, 800, 'sine', 0.3);
                this.playTone(ctx, now, 0.4, 1200, 'sine', 0.15);
                this.playTone(ctx, now, 0.3, 1600, 'sine', 0.1);
                break;

            case 'combo':
                this.playTone(ctx, now, 0.1, 600, 'sine', 0.2);
                this.playTone(ctx, now + 0.05, 0.1, 800, 'sine', 0.2);
                this.playTone(ctx, now + 0.1, 0.15, 1000, 'sine', 0.25);
                break;
        }
    }

    private playNoise(ctx: AudioContext, time: number, duration: number, filterFreq: number, volume: number) {
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(filterFreq, time);
        filter.frequency.exponentialRampToValueAtTime(200, time + duration);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(volume, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain!);

        source.start(time);
        source.stop(time + duration);
    }

    private playFilteredNoise(ctx: AudioContext, time: number, duration: number, startFreq: number, endFreq: number, volume: number) {
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(startFreq, time);
        filter.frequency.exponentialRampToValueAtTime(endFreq, time + duration);
        filter.Q.value = 2;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(volume, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain!);

        source.start(time);
        source.stop(time + duration);
    }

    private playTone(ctx: AudioContext, time: number, duration: number, freq: number, type: OscillatorType, volume: number) {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, time);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.5, time + duration);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(volume, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(time);
        osc.stop(time + duration);
    }

    public setEnabled(enabled: boolean) {
        this.enabled = enabled;
    }
}

export const soundSystem = new SoundSystem();
