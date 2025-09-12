export class TTSManager {
  private synthesis: SpeechSynthesis;
  private voice: SpeechSynthesisVoice | null = null;
  
  constructor() {
    if (typeof window === 'undefined') {
      throw new Error('TTSManager can only be used in browser environment');
    }
    this.synthesis = window.speechSynthesis;
    this.loadVoices();
  }
  
  private loadVoices() {
    const voices = this.synthesis.getVoices();
    // Prefer English voices
    this.voice = voices.find(voice => voice.lang.startsWith('en')) || voices[0] || null;
    
    // Handle case where voices load asynchronously
    if (voices.length === 0) {
      this.synthesis.addEventListener('voiceschanged', () => {
        const newVoices = this.synthesis.getVoices();
        this.voice = newVoices.find(voice => voice.lang.startsWith('en')) || newVoices[0] || null;
      });
    }
  }
  
  speak(text: string, options: {
    rate?: number;
    pitch?: number;
    volume?: number;
  } = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      // Cancel any ongoing speech
      this.synthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      if (this.voice) {
        utterance.voice = this.voice;
      }
      
      utterance.rate = options.rate || 1.0;
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = options.volume || 1.0;
      
      utterance.onend = () => resolve();
      utterance.onerror = (error) => reject(error);
      
      this.synthesis.speak(utterance);
    });
  }
  
  stop() {
    this.synthesis.cancel();
  }
  
  pause() {
    this.synthesis.pause();
  }
  
  resume() {
    this.synthesis.resume();
  }
  
  getVoices() {
    return this.synthesis.getVoices();
  }
  
  setVoice(voice: SpeechSynthesisVoice) {
    this.voice = voice;
  }
}
