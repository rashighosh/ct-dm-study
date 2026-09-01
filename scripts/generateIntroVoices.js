// scripts/generateJordanIntro.js
import fs from 'fs'

const BASE_URL = 'http://127.0.0.1:8000'

const alexEnding = `Thanks for chatting with me about clinical trial participation today. I hope it was helpful! Before you leave, I have some resources I'd like to share to help you get started searching for clinical trials if you're interested.`
const jordanEnding = `And I have the sources Doctor Alex used earlier in your conversation. You can choose what resources you'd like to receive and they'll be shared with you securely when you finish the post survey.`

const ALEX_INTRO_1 =
  'Hi there, I’m Alex, and this is Jordan. We are AI-powered virtual characters here to help you understand clinical trial participation. We’ll go through the topics you chose earlier one at a time. My role is to provide information about each topic from trusted health resources, such as the National Cancer Institute.'

const JORDAN_INTRO_1 =
  'And my role is to help you talk through what you think and feel about each topic. This helps us understand what’s important to you so Alex can share information based on what matters to you. We can spend as much time as you’d like on each topic, and when you’re ready to move on, just let us know by saying something like, ‘Let’s move on’ or ‘Continue.’'

const ALEX_INTRO_2 =
  'Before we get started, please remember that we don’t have access to specific clinical trials, so we can’t search for or answer questions about specific trials or treatments. We also can’t provide medical advice.'

const JORDAN_INTRO_2 = 'Alright, with that, let’s get started!'

const res = await fetch(`${BASE_URL}/tts`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: JORDAN_INTRO_2,
    character: 'companion',
  }),
})

const { audio, timestamps } = await res.json()

fs.writeFileSync(
  'public/intro-voices/companion-audio-JORDAN_INTRO_2.mp3',
  Buffer.from(audio, 'base64'),
)
fs.writeFileSync(
  'public/intro-voices/companion-timestamps-JORDAN_INTRO_2.json',
  JSON.stringify(timestamps, null, 2),
)

console.log('Done! Files saved to public/')
