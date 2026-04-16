/**
 * Metronome Service for CPR Compression Rhythm
 * Uses Web Audio API for precise timing at 110 BPM
 */

const BPM = 110;
const FREQUENCY = 880; // A5 note in Hz
const BEAT_DURATION = 0.1; // Duration of each beep in seconds

export class MetronomeService {
  private audioContext: AudioContext | null = null;
  private intervalId: number | null = null;
  private beatCallback: (() => void) | null = null;
  private isPlaying = false;

  /**
   * Initialize the audio context
   */
  private initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  /**
   * Play a single beep sound
   */
  private playBeep() {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = FREQUENCY;
    oscillator.type = 'sine';

    // Envelope for smooth sound
    const now = this.audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + BEAT_DURATION);

    oscillator.start(now);
    oscillator.stop(now + BEAT_DURATION);

    // Trigger callback for visual sync
    if (this.beatCallback) {
      this.beatCallback();
    }
  }

  /**
   * Start the metronome
   * @param onBeat Callback function called on each beat
   */
  start(onBeat?: () => void) {
    if (this.isPlaying) return;

    this.initAudioContext();
    this.beatCallback = onBeat || null;
    this.isPlaying = true;

    // Calculate interval in milliseconds
    const interval = (60 / BPM) * 1000;

    // Play first beat immediately
    this.playBeep();

    // Set up interval for subsequent beats
    this.intervalId = window.setInterval(() => {
      this.playBeep();
    }, interval);
  }

  /**
   * Stop the metronome
   */
  stop() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isPlaying = false;
    this.beatCallback = null;
  }

  /**
   * Check if metronome is currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Get the current BPM
   */
  getBPM(): number {
    return BPM;
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Singleton instance
let metronomeInstance: MetronomeService | null = null;

export function getMetronomeService(): MetronomeService {
  if (!metronomeInstance) {
    metronomeInstance = new MetronomeService();
  }
  return metronomeInstance;
}
