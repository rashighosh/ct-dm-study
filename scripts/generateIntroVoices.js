// scripts/generateJordanIntro.js
import fs from 'fs'

const BASE_URL = 'http://127.0.0.1:8000'

const alexEnding = `Thanks for chatting with me about clinical trial participation today. I hope it was helpful! Before you leave, I have some resources I'd like to share to help you get started searching for clinical trials if you're interested.`
const jordanEnding = `And I have the sources Doctor Alex used earlier in your conversation. You can choose what resources you'd like to receive and they'll be shared with you securely when you finish the post survey.`

const ALEX_INTRO_1 =
  "Hi there, I'm Alex, and this is Jordan! We are AI powered virtual characters here to help you explore and understand clinical trial participation."
const ALEX_INTRO_2 =
  "I'll explain my role first. I'm a virtual assistant that can quickly search information across several trusted health resources to answer questions about clinical trial participation. I pull from reputable sources like the National Cancer Institute."
const ALEX_INTRO_3 =
  'These sources cover information such as the purpose and importance of clinical trials, and topics such as safety and costs. As I answer your questions, I will also share the sources I use that you can save to read later if you want.'
const ALEX_INTRO_4 =
  "One important thing to note is that I don't have information on specific clinical trials, so I can't help you find a trial to join or answer questions about a particular study."
const ALEX_INTRO_5 = "Now, I'll hand it over to Jordan."

const JORDAN_INTRO_1 =
  "Thanks! As Alex mentioned, I'm Jordan. I'm a virtual companion here to help make sure the information Alex gives you is communicated in a way that works for you."
const JORDAN_INTRO_2 =
  "If I notice you sharing something with Alex that might be useful to keep in mind when answering your questions, I'll ask you about it after Alex answers."
const JORDAN_INTRO_3 =
  "You can also talk with me anytime about yourself or how you like information explained, and I'll help Alex keep that in mind."
const JORDAN_INTRO_4 =
  "I can't answer questions about clinical trials myself. My role is to talk with you about what Alex should keep in mind when answering your questions."
const JORDAN_INTRO_5 =
  "Whenever you're ready, ask Alex anything you'd like to know about clinical trials!"

const res = await fetch(`${BASE_URL}/tts`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: JORDAN_INTRO_5,
    character: 'companion',
  }),
})

const { audio, timestamps } = await res.json()

fs.writeFileSync(
  'public/intro-voices/companion-audio-JORDAN_INTRO_5.mp3',
  Buffer.from(audio, 'base64'),
)
fs.writeFileSync(
  'public/intro-voices/companion-timestamps-JORDAN_INTRO_5.json',
  JSON.stringify(timestamps, null, 2),
)

console.log('Done! Files saved to public/')
