// scripts/generateJordanIntro.js
import fs from 'fs'

const BASE_URL = 'http://127.0.0.1:8000'

const SHARED_JORDAN_OPENING = `Hi, I'm Jordan, a virtual companion created for this health information seeking tool. During this activity, you'll meet Alex, a virtual health assistant who'll help you explore and understand clinical trial participation. Alex and I are A.I. powered virtual characters, not real people, and we may use your pre survey responses to help tailor the experience. Before you meet Alex, I'll help you get ready by setting goals for the conversation. Now, keep in mind that this activity won't search for specific clinical trials or tell you whether a trial is right for you. Instead, it's meant to help you think through what people may want to understand, ask, and consider before deciding whether to participate.`

const JORDAN_INTRO_SCRIPTS = {
  passive: `First I'll help set up some goals for your conversation with Alex. Next to me, I've suggested a few goals based on your pre survey responses that you can choose from. Once you feel good about them, click the continue button below me to meet Alex.`,
  collaborative: `First let's set up some goals for your conversation together. Next to me, I've suggested a few goals based on your pre survey responses. You can choose from these or add your own. Once you feel good about them, click the continue button below me to meet Alex.`,
  active: `First you'll set up your own goals for the conversation with Alex. Next to me, you can add any goals you have in mind that you'd like to discuss. Once you feel good about them, click the continue button below me to meet Alex.`,
}

const alexIntro1 = `Hi there, I'm Alex, your virtual assistant for learning about clinical trials. As a reminder, I won't be suggesting specific trials or decide if one is right for you, since those choices are best discussed with your loved ones and health care provider. Instead, I will help you find, summarize, and organize information from trusted sources.`
const alexIntro2 = `Now, let me take a quick look at the goals that you set earlier with Jordan.`

const alexEnding = `Thanks for chatting with me about clinical trial participation today. I hope it was helpful! Before you leave, I have some resources I'd like to share to help you get started searching for clinical trials if you're interested.`
const jordanEnding = `And I have the sources Doctor Alex used earlier in your conversation. You can choose what resources you'd like to receive and they'll be shared with you securely when you finish the post survey.`

const res = await fetch(`${BASE_URL}/tts`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: alexIntro2,
    character: 'doctor',
  }),
})

const { audio, timestamps } = await res.json()

fs.writeFileSync(
  'public/intro-voices/doctor-alexIntro2-intro.mp3',
  Buffer.from(audio, 'base64'),
)
fs.writeFileSync(
  'public/intro-voices/doctor-alexIntro2-intro-timestamps.json',
  JSON.stringify(timestamps, null, 2),
)

console.log('Done! Files saved to public/')
