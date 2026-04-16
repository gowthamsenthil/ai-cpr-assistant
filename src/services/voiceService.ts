/**
 * Voice Synthesis Service using Web Speech API
 * Provides calm, clear voice guidance during CPR
 */

export class VoiceService {
  private synth: SpeechSynthesis;
  private voice: SpeechSynthesisVoice | null = null;

  constructor() {
    this.synth = window.speechSynthesis;
    this.initVoice();
  }

  /**
   * Initialize and select the best available voice
   */
  private initVoice() {
    const loadVoices = () => {
      const voices = this.synth.getVoices();
      
      // Prefer en-US voices, especially neural/enhanced ones
      this.voice = voices.find(v => 
        v.lang.startsWith('en-US') && (v.name.includes('Google') || v.name.includes('Enhanced'))
      ) || voices.find(v => v.lang.startsWith('en-US'))
        || voices.find(v => v.lang.startsWith('en'))
        || voices[0]
        || null;
    };

    loadVoices();
    
    // Some browsers load voices asynchronously
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices;
    }
  }

  /**
   * Speak text with configured voice settings
   * @param text Text to speak
   * @param priority If true, cancels current speech
   */
  speak(text: string, priority: boolean = false) {
    if (priority) {
      this.synth.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    if (this.voice) {
      utterance.voice = this.voice;
    }
    
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.lang = 'en-US';

    this.synth.speak(utterance);
  }

  /**
   * Stop all current speech
   */
  stop() {
    this.synth.cancel();
  }

  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean {
    return this.synth.speaking;
  }

  /**
   * Speak initial CPR instructions
   */
  speakInitialInstructions() {
    this.speak(
      "Position your hands in the center of the chest. Press hard and fast. I'll guide you through this.",
      true
    );
  }

  /**
   * Announce rescue breath prompt
   */
  speakRescueBreathPrompt() {
    this.speak(
      "Give two rescue breaths now. Then continue compressions.",
      true
    );
  }

  /**
   * Announce EMS arrival update
   * @param minutesRemaining Minutes until estimated EMS arrival
   */
  speakEMSUpdate(minutesRemaining: number) {
    if (minutesRemaining > 0) {
      this.speak(
        `Emergency services estimated in ${minutesRemaining} ${minutesRemaining === 1 ? 'minute' : 'minutes'}. Keep going.`,
        false
      );
    } else {
      this.speak(
        "Emergency services should arrive soon. Continue compressions.",
        false
      );
    }
  }

  /**
   * Speak Gemini-generated encouragement
   * @param encouragement Encouragement text from Gemini
   */
  speakEncouragement(encouragement: string) {
    this.speak(encouragement, false);
  }
}

// Singleton instance
let voiceInstance: VoiceService | null = null;

export function getVoiceService(): VoiceService {
  if (!voiceInstance) {
    voiceInstance = new VoiceService();
  }
  return voiceInstance;
}
