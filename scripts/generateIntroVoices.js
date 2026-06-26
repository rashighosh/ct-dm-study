// scripts/generateJordanIntro.js
import fs from 'fs'

const BASE_URL = 'http://127.0.0.1:8000'

const SHARED_JORDAN_OPENING = `Hi, I’m Jordan, a virtual companion. In this activity, you’ll talk with Doctor Alex, a virtual doctor, about clinical trials. I’ll help you get ready by setting goals for the conversation, and I’ll help keep track of useful notes as you go. This activity will not search for specific clinical trials or tell you whether a trial is right for you. Instead, it’s meant to help you think through what people may want to understand, ask, and consider before deciding whether to participate.`
const JORDAN_INTRO_SCRIPTS = {
  passive: `First, I’ll help set up some goals for your conversation. I’ve suggested a few common topics to start with here next to me. Feel free to change them, or click the continue button below me to meet Doctor Alex.`,

  collaborative: `First, we’ll set up some goals for your conversation together. Here next to me, I've shown a few suggestions you can choose from, or you enter your own goals. When you feel good about them, click the continue button below me to meet Doctor Alex.`,

  active: `First, you’ll set up your own goals for the conversation. Here next to me, you can add whatever goals you have in mind. You can also ask me for suggestions if you'd like. When you feel good about them, click the continue button below me to meet Doctor Alex.`,
}

const res = await fetch(`${BASE_URL}/tts`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: SHARED_JORDAN_OPENING,
    character: 'companion',
  }),
})

const { audio, timestamps } = await res.json()

fs.writeFileSync(
  'public/intro-voices/companion-shared-intro.mp3',
  Buffer.from(audio, 'base64'),
)
fs.writeFileSync(
  'public/intro-voices/companion-shared-intro-timestamps.json',
  JSON.stringify(timestamps, null, 2),
)

console.log('Done! Files saved to public/')
