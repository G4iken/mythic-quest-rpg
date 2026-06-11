type MusicMood = 'title' | 'village' | 'battle' | 'silent';
type SfxName = 'click' | 'attack' | 'skill' | 'enemyAttack' | 'defend' | 'heal' | 'kill' | 'victory' | 'defeat' | 'coin' | 'levelUp' | 'save';

let context: AudioContext | null = null;
let master: GainNode | null = null;
let musicGain: GainNode | null = null;
let enabled = true;
let unlocked = false;
let musicTimer: number | null = null;
let currentMood: MusicMood = 'silent';
let stepIndex = 0;

const melodies: Record<Exclude<MusicMood, 'silent'>, number[]> = {
  title: [196, 246.94, 293.66, 392, 293.66, 246.94, 220, 246.94],
  village: [261.63, 329.63, 392, 523.25, 392, 329.63, 293.66, 329.63],
  battle: [146.83, 196, 220, 246.94, 261.63, 246.94, 220, 196]
};

function getContext() {
  if (!context) {
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = 0.56;
    master.connect(context.destination);

    musicGain = context.createGain();
    musicGain.gain.value = 0.12;
    musicGain.connect(master);
  }
  return context;
}

function connectMaster() {
  const ctx = getContext();
  if (!master || !musicGain) throw new Error('Audio nodes failed to initialize.');
  return { ctx, master, musicGain };
}

function scheduleTone(frequency: number, start: number, duration: number, volume: number, type: OscillatorType = 'sine', destination?: AudioNode) {
  if (!enabled || !unlocked) return;
  const { ctx, master } = connectMaster();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(destination ?? master);
  osc.start(start);
  osc.stop(start + duration + 0.03);
}

function scheduleNoise(start: number, duration: number, volume: number) {
  if (!enabled || !unlocked) return;
  const { ctx, master } = connectMaster();
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  source.buffer = buffer;
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(gain);
  gain.connect(master);
  source.start(start);
  source.stop(start + duration);
}

function stopMusic() {
  if (musicTimer) window.clearInterval(musicTimer);
  musicTimer = null;
  stepIndex = 0;
}

function playMusicStep() {
  if (!enabled || !unlocked || currentMood === 'silent') return;
  const { ctx, musicGain } = connectMaster();
  const notes = melodies[currentMood];
  const note = notes[stepIndex % notes.length];
  const now = ctx.currentTime;
  const moodVolume = currentMood === 'battle' ? 0.105 : 0.075;
  const oscType: OscillatorType = currentMood === 'battle' ? 'sawtooth' : 'triangle';

  scheduleTone(note, now, 0.34, moodVolume, oscType, musicGain);
  scheduleTone(note / 2, now, 0.46, moodVolume * 0.55, 'sine', musicGain);
  if (stepIndex % 4 === 0) scheduleTone(note * 1.5, now + 0.02, 0.18, moodVolume * 0.35, 'sine', musicGain);
  stepIndex += 1;
}

function startBackgroundMusic(mood: MusicMood) {
  currentMood = mood;
  if (!enabled || !unlocked || mood === 'silent') {
    if (mood === 'silent') stopMusic();
    return;
  }
  if (musicTimer) window.clearInterval(musicTimer);
  stepIndex = 0;
  playMusicStep();
  musicTimer = window.setInterval(playMusicStep, mood === 'battle' ? 360 : 560);
}

export const audio = {
  async unlock() {
    if (!enabled) return;
    const ctx = getContext();
    try {
      if (ctx.state !== 'running') await ctx.resume();
      unlocked = true;
      if (currentMood !== 'silent' && !musicTimer) startBackgroundMusic(currentMood);
    } catch {
      // Browser can deny audio until a tap/click. The next user action retries.
    }
  },

  setEnabled(value: boolean) {
    enabled = value;
    if (!enabled) stopMusic();
    if (master) master.gain.value = value ? 0.56 : 0.0001;
  },

  startMusic(mood: MusicMood) {
    startBackgroundMusic(mood);
  },

  stopMusic,

  playSfx(name: SfxName) {
    if (!enabled) return;
    void audio.unlock();
    if (!unlocked || !context) return;
    const now = context.currentTime;
    switch (name) {
      case 'click':
        scheduleTone(720, now, 0.045, 0.045, 'triangle');
        break;
      case 'attack':
        scheduleTone(220, now, 0.055, 0.12, 'sawtooth');
        scheduleTone(120, now + 0.04, 0.075, 0.09, 'square');
        scheduleNoise(now, 0.08, 0.08);
        break;
      case 'skill':
        scheduleTone(440, now, 0.09, 0.09, 'triangle');
        scheduleTone(660, now + 0.06, 0.12, 0.09, 'sine');
        scheduleTone(880, now + 0.12, 0.14, 0.08, 'sine');
        break;
      case 'enemyAttack':
        scheduleTone(155, now, 0.11, 0.12, 'sawtooth');
        scheduleNoise(now + 0.02, 0.13, 0.07);
        break;
      case 'defend':
        scheduleTone(196, now, 0.08, 0.08, 'square');
        scheduleTone(246.94, now + 0.05, 0.12, 0.07, 'square');
        break;
      case 'heal':
        scheduleTone(523.25, now, 0.08, 0.07, 'sine');
        scheduleTone(659.25, now + 0.08, 0.1, 0.07, 'sine');
        scheduleTone(783.99, now + 0.16, 0.16, 0.06, 'sine');
        break;
      case 'kill':
        scheduleTone(130.81, now, 0.12, 0.12, 'sawtooth');
        scheduleTone(98, now + 0.09, 0.18, 0.1, 'triangle');
        scheduleNoise(now, 0.18, 0.1);
        break;
      case 'victory':
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => scheduleTone(freq, now + i * 0.095, 0.18, 0.09, 'triangle'));
        break;
      case 'defeat':
        [246.94, 196, 164.81, 130.81].forEach((freq, i) => scheduleTone(freq, now + i * 0.11, 0.22, 0.08, 'sine'));
        break;
      case 'coin':
        scheduleTone(987.77, now, 0.07, 0.08, 'triangle');
        scheduleTone(1318.51, now + 0.055, 0.11, 0.07, 'triangle');
        break;
      case 'levelUp':
        [392, 523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => scheduleTone(freq, now + i * 0.075, 0.2, 0.085, 'triangle'));
        break;
      case 'save':
        scheduleTone(349.23, now, 0.08, 0.065, 'sine');
        scheduleTone(523.25, now + 0.08, 0.1, 0.065, 'sine');
        break;
      default:
        break;
    }
  }
};
