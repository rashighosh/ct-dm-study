// scripts/generateJordanIntro.js
import fs from 'fs'

const BASE_URL = 'http://127.0.0.1:8000'

const alexEnding = `Thanks for chatting with me about clinical trial participation today. I hope it was helpful! Before you leave, I have some resources I'd like to share to help you get started searching for clinical trials if you're interested.`
const jordanEnding = `And I have the sources Doctor Alex used earlier in your conversation. You can choose what resources you'd like to receive and they'll be shared with you securely when you finish the post survey.`

const ALEX_INTRO_1 =
  'And my role is to provide information. I can quickly access information from trusted health resources, such as the National Cancer Institute. When questions come up or more information might help, I’ll step in with information to help you better understand the topic.'

const JORDAN_INTRO_1 =
  'Hi there, I’m Jordan, and this is Alex. We are AI-powered virtual characters here to help you explore and understand clinical trial participation. My role is to guide our conversation through a few topics chosen based on your earlier survey responses and ask about what you think or feel about each one.'

const JORDAN_INTRO_2 =
  'We’ll take the topics one at a time, and you can ask questions or share whatever comes to mind along the way. Let’s get started!'

const res = await fetch(`${BASE_URL}/tts`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: ALEX_INTRO_1,
    character: 'doctor',
  }),
})

const { audio, timestamps } = await res.json()

fs.writeFileSync(
  'public/intro-voices/doctor-audio-ALEX_INTRO_1.mp3',
  Buffer.from(audio, 'base64'),
)
fs.writeFileSync(
  'public/intro-voices/doctor-timestamps-ALEX_INTRO_1.json',
  JSON.stringify(timestamps, null, 2),
)

console.log('Done! Files saved to public/')
