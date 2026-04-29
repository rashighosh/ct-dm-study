import { TalkingHead } from './talkinghead-files/talkinghead.mjs';

// const BASE_URL = 'https://fastapi-rashi.onrender.com';
// const BASE_URL = 'http://127.0.0.1:8000';
const BASE_URL = 'https://brcco3c42yqwcnqmvj4h2k2igu0fysxd.lambda-url.us-east-1.on.aws'
let head = null;
let head1 = null;
let onSubtitleCallback = null;

document.addEventListener('click', () => {
  if (head?.audioCtx?.state === 'suspended') {
    head.audioCtx.resume();
  }
  if (head1?.audioCtx?.state === 'suspended') {
    head1.audioCtx.resume();
  }
}, { once: true });

export async function initDoctorCharacter(containerNode, view = 'mid') {
  head = new TalkingHead(containerNode, {
    lipsyncModules: ['en'],
    cameraView: view, // full, mid, upper, head,
    cameraRotateEnable: false,
    cameraPanEnable: false,
    cameraZoomEnable: false,
    avatarSpeakingEyeContact: 1,
    avatarIdleEyeContact: 1,
    cameraDistance: -1,
    avatarIdleHeadMove: 1
  });

  await head.showAvatar({
    url: '/character-models/doctor.glb',
    body: 'F',
    avatarMood: 'neutral',
    ttsLang: 'en-GB',
    ttsVoice: 'en-GB-Standard-A',
    lipsyncLang: 'en',
  });
  
  // focusCharacter(2)

  return head;
}

export async function initCompanionCharacter(containerNode) {
  head1 = new TalkingHead(containerNode, {
    lipsyncModules: ['en'],
    cameraView: 'mid', // full, mid, upper, head,
    avatarSpeakingHeadMove: 1,
    cameraRotateEnable: false,
    cameraPanEnable: false,
    cameraZoomEnable: false
  });

  await head1.showAvatar({
    url: '/character-models/male.glb',
    body: 'M',
    avatarMood: 'neutral',
    ttsLang: 'en-GB',
    ttsVoice: 'en-GB-Standard-A',
    lipsyncLang: 'en',
  });
  
  return head1;
}

export function stopCharacter() {
  head?.stop();
}

export function speakText(text) {
  head?.speakText(text);
}

export async function shrug() {
  head1?.stopGesture(3000);
  head1?.playGesture('shrug');
}

export async function thinking() {
  head1?.stopGesture(1500);
  head1?.playGesture('think', Infinity, false, 1500);
}

export async function thumbsup() {
  head1?.stopGesture(3000);
  head1?.playGesture('thumbup', Infinity, false, 1500);
}

export async function wave() {
  head1?.playGesture('handup');
}

export async function ready() {
  head1?.stopGesture(3000);
  head1?.playGesture('ok');
}

async function playSmoothSequence(head, sequence) {
  for (const item of sequence) {
    head.playGesture(item.name, item.dur, item.mirror, item.ms);
    
    // Overlap by 20ms to keep the engine's "exponential smoothing" active
    const overlap = 20; 
    const waitTime = (item.dur * 1000) - overlap;
    
    await new Promise(resolve => setTimeout(resolve, Math.max(0, waitTime)));
  }
}

let isSwiping = false; // Our "Kill Switch"

export async function startSwiping() {
  if (isSwiping) return; // Prevent multiple loops starting at once
  isSwiping = true;

  // 1. Initial lift (only happens ONCE at the start)
  await playSmoothSequence(head, [{ name: 'swipeReady', dur: 1, ms: 1000 }]);

  // 2. The Repeat Loop
  const loopMoves = [
    { name: 'swipeDone',  dur: 0.9, ms: 2000 },
    { name: 'swipeReady', dur: 0.9, ms: 2000 }
  ];

  while (isSwiping) {
    await playSmoothSequence(head, loopMoves);
  }

  // 3. Final Drop (only happens ONCE when isSwiping becomes false)
  await playSmoothSequence(head, [{ name: null, dur: 0, ms: 200 }]);
}

export function stopSwiping() {
  isSwiping = false;
}

export async function lookup() {
  head1?.stopGesture(3000);
  head1?.playGesture('lookup');
}

export async function lookdown() {
  head1?.stopGesture(1500);
  head1?.playGesture('lookdown', Infinity, false, 1500);
}

export async function indexFingerRaise() {
  head1?.stopGesture(1500);
  head1?.playGesture('indexFingerRaise', Infinity, false, 1500);
}

export async function rightGesture() {
  head1?.playGesture('rightGesture');
}


export async function headNod() {
  head.playGesture('yes', 5, false, 1500);
  // head.playAnimation('/animations/Looking Around.fbx')
}

export async function stopCompanionGesture() {
  head1?.stopGesture(3000);
}

export function setSubtitleCallback(fn) {
  onSubtitleCallback = fn;
}

export async function speakWithLipsync(text, character = 'doctor', onStart = null) {
  const activeHead = character === 'companion' ? head1 : head;
  console.log("IN SPEAK W LIPSYNC")
  const ttsRes = await fetch(`${BASE_URL}/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, character })
  });
  
  const { audio, timestamps } = await ttsRes.json();
  console.log("GOT TTS RESPONSE")
  const lastWord = timestamps[timestamps.length - 1];

  const audioBytes = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
  const audioBuffer = await activeHead.audioCtx.decodeAudioData(audioBytes.buffer);

  const words = timestamps.map(t => t.word.trim().replace(/[.,!?;:]/g, ''));
  const wtimes = timestamps.map(t => t.start * 1000);
  const wdurations = timestamps.map(t => (t.end - t.start) * 1000);
  const subtitleWords = timestamps.map(t => t.word.trim());

  if (onSubtitleCallback) {
    const chunkSize = 8;
    for (let i = 0; i < subtitleWords.length; i += chunkSize) {
      const chunk = subtitleWords.slice(i, i + chunkSize).join(' ');
      const triggerTime = wtimes[i];
      setTimeout(() => onSubtitleCallback(chunk), triggerTime);
    }
  }
  activeHead.stopGesture();
  // fire onStart right before audio plays
  activeHead.speakAudio(
    {
      audio: audioBuffer,
      words: words,
      wtimes: wtimes,
      wdurations: wdurations
    }, 
    { isRaw: true },
    null
  );

  if (onStart) onStart();
  return new Promise(resolve => {
    setTimeout(resolve, audioBuffer.duration * 1000);
  });
}

export async function speakWithLipsyncStatic(audioPath, timestampsPath, character = 'doctor', gestures = true) {
  console.log(audioPath)
  const activeHead = character === 'companion' ? head1 : head;
  const [audioRes, tsRes] = await Promise.all([
    fetch(audioPath),
    fetch(timestampsPath)
  ]);

  const audioBuffer = await activeHead.audioCtx.decodeAudioData(
    await audioRes.arrayBuffer()
  );
  const timestamps = await tsRes.json();

  const words = timestamps.map(t => t.word.trim().replace(/[.,!?;:]/g, ''));
  const wtimes = timestamps.map(t => t.start * 1000);
  const wdurations = timestamps.map(t => (t.end - t.start) * 1000);
  const subtitleWords = timestamps.map(t => t.word.trim());

  if (onSubtitleCallback) {
    const chunkSize = 8;
    for (let i = 0; i < subtitleWords.length; i += chunkSize) {
      const chunk = subtitleWords.slice(i, i + chunkSize).join(' ');
      const triggerTime = wtimes[i];
      setTimeout(() => onSubtitleCallback(chunk), triggerTime);
    }
  }
  
  const markers = [];
  const mtimes = [];

  if (audioPath === "/intro-voices/companion-intro1.mp3" && gestures) {
    // define word -> gesture mappings here
    const wordGestures = [
      { word: 'hi', gesture: 'handup',   dur: 2, transition: 1500 },
      { word: 'not', gesture: 'shrug',   dur: 2, transition: 2000 },
      { word: 'where', gesture: 'chest',   dur: 1, transition: 1500 },
      { word: 'let', gesture: 'talkopen',   dur: 2, transition: 1500 },
      { word: 'share', gesture: 'oneQuestion',   dur: 2, transition: 1500 },
      { word: 'type', gesture: 'talkopen',   dur: 2, transition: 1500 }
    ];

    wordGestures.forEach(({ word, gesture, dur, transition }) => {
      const idx = timestamps.findIndex(
        t => t.word.trim().toLowerCase().replace(/[.,!?;:]/g, '') === word
      );
      if (idx !== -1) {
        markers.push(() => activeHead.playGesture(gesture, dur, false, transition));
        mtimes.push(wtimes[idx]);
      }
    });
  }

  if (audioPath === "/intro-voices/doctor-intro1.mp3" && gestures) {
    // define word -> gesture mappings here
    const wordGestures = [
      { word: 'hi', gesture: 'handup',   dur: 2, transition: 1500 },
      { word: 'lot', gesture: 'talkopen',   dur: 2, transition: 1500 },
      { word: 'hard', gesture: 'shrug',   dur: 2, transition: 1500 },
      { word: "that's", gesture: 'chest',   dur: 2, transition: 1500 },
      { word: "trusted", gesture: 'talkopen',   dur: 2, transition: 1500 },
      { word: "whenever", gesture: 'rightGesture',   dur: 2, transition: 1500 },
    ];

    wordGestures.forEach(({ word, gesture, dur, transition }) => {
      const idx = timestamps.findIndex(
        t => t.word.trim().toLowerCase().replace(/[.,!?;:]/g, '') === word
      );
      if (idx !== -1) {
        markers.push(() => activeHead.playGesture(gesture, dur, false, transition));
        mtimes.push(wtimes[idx]);
      }
    });
  }

  if (audioPath === "/intro-voices/companion-intro2.mp3" && gestures) {
    // define word -> gesture mappings here
    const wordGestures = [
      { word: 'hey', gesture: 'handup',   dur: 1.5, transition: 1500 },
      { word: 'type', gesture: 'talkopen',   dur: 1.5, transition: 1500 },
      { word: 'if', gesture: 'oneQuestion',   dur: 2, transition: 1500 },
      { word: 'silently', gesture: 'chest',   dur: 2, transition: 1500 },
      { word: 'hover', gesture: 'talkopen',   dur: 2, transition: 1500 },
      { word: 'it', gesture: 'chest',   dur: 2, transition: 1500 },
      { word: 'based', gesture: 'rightGesture',   dur: 2, transition: 1500 },
      { word: 'hovering', gesture: 'chest',   dur: 2, transition: 1500 },
      { word: 'ahead', gesture: 'talkopen',   dur: 1, transition: 1500 },
    ];

    wordGestures.forEach(({ word, gesture, dur, transition }) => {
      const idx = timestamps.findIndex(
        t => t.word.trim().toLowerCase().replace(/[.,!?;:]/g, '') === word
      );
      if (idx !== -1) {
        markers.push(() => activeHead.playGesture(gesture, dur, false, transition));
        mtimes.push(wtimes[idx]);
      }
    });
  }

  activeHead.stopGesture();
  activeHead.speakAudio(
    { audio: audioBuffer, words, wtimes, wdurations, markers, mtimes },
    { isRaw: true },
    null
  );

  return new Promise(resolve => {
    setTimeout(resolve, audioBuffer.duration * 1000);
  });
}


export async function focusCharacter(character) {
  if (character === 1) {
      head.setLighting({
        lightDirectIntensity: 45,   // Dim directional light,
        lightSpotIntensity: 45,
      })
      head1.setLighting({
        lightDirectIntensity: 0,   // Dim directional light
      })
      document.querySelector("#virtualcompanion > canvas").classList.add("dim")
      
      document.querySelector("#virtualdoctor > canvas").classList.remove("dim")
  } else if (character===2) {
    head.setLighting({
      lightDirectIntensity: 0,   // Dim directional light
    })
    head1.setLighting({
      lightDirectIntensity: 45,   // Dim directional light
      lightSpotIntensity: 45,
    })
    document.querySelector("#virtualcompanion > canvas").classList.remove("dim")
    document.querySelector("#virtualdoctor > canvas").classList.add("dim")
  }
}

// map gesture names to functions
export const gestures = {
  shrug,
  thumbsup,
  thinking,
  ready,
  lookup,
  lookdown,
  indexFingerRaise,
  headNod,
  startSwiping,
  stopSwiping,
  wave,
  rightGesture
  // add more here
};

export function playGesture(name) {
  console.log("GESTURE TRIGGERED", name)
  gestures[name]?.();
}