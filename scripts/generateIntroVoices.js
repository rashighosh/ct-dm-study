// scripts/generateJordanIntro.js
import fs from 'fs'

const BASE_URL = 'http://127.0.0.1:8000'

const SHARED_JORDAN_OPENING = `Hi, I’m Jordan, a virtual companion created for this activity. Later on, you’ll meet Doctor Alex, a virtual doctor, who'll help you explore and understand clinical trial participation. Doctor Alex and I are AI-powered virtual characters, not real people, and we may use your pre-survey responses to help tailor the experience. Before meeting Doctor Alex, I'll help you get ready by setting goals for the conversation. Then, during your conversation with Doctor Alex, I’ll help keep track of useful notes as you go. Remember, this activity will not search for specific clinical trials or tell you whether a trial is right for you. Instead, it’s meant to help you think through what people may want to understand, ask, and consider before deciding whether to participate.`
const JORDAN_INTRO_SCRIPTS = {
  passive: `First, I’ll help set up some goals for your conversation. Here next to me, I’ve suggested a few topics based on your pre survey responses. Feel free to change them, or click the continue button below me to meet Doctor Alex.`,
  collaborative: `First, we’ll set up some goals for your conversation together. Here next to me, I've shown a few suggestions based on your pre survey responses you can choose from, or you can enter your own goals. You can also ask me for more suggestions. When you feel good about them, click the continue button below me to meet Doctor Alex.`,
  active: `First, you’ll set up your own goals for the conversation. Here next to me, you can add whatever goals you have in mind. You can also ask me for suggestions if you'd like. When you feel good about them, click the continue button below me to meet Doctor Alex.`,
}
const thinking = `Sure, give me a moment.`
const doneThinking = `I've added a few suggestions.`
const alexIntro = `Hello, I am Doctor Alex, your virtual assistant for learning about clinical trials. I will not suggest specific trials or decide if one is right for you, since those choices are best discussed with your loved ones and health care provider, but I will help you find, summarize, and organize information from trusted sources.`

const alexEnding = `Thanks for chatting with me about clinical trial participation today. I hope it was helpful! Before you leave, Jordan has some notes from our conversation to share with you.`
const jordanEnding = `Yes, I've pulled up any notes I took below. Would you like me to send them to the post-survey so you can download it safely from there?`

const res = await fetch(`${BASE_URL}/tts`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: jordanEnding,
    character: 'companion',
  }),
})

const { audio, timestamps } = await res.json()

fs.writeFileSync(
  'public/intro-voices/companion-jordanEnding.mp3',
  Buffer.from(audio, 'base64'),
)
fs.writeFileSync(
  'public/intro-voices/companion-jordanEnding-timestamps.json',
  JSON.stringify(timestamps, null, 2),
)

console.log('Done! Files saved to public/')
