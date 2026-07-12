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

const ALEX_INTRO_1 =
  "Hi there, I'm Alex, and this is Jordan! We are AI powered virtual characters here to help you explore and understand clinical trial participation."
const ALEX_INTRO_2 =
  "I'll explain my role first. I'm a virtual assistant that can quickly search information across several trusted health resources to answer questions about clinical trial participation. I pull from sources recommended for understanding how clinical trials work, like the National Cancer Institute and Clinical Trials dot gov."
const ALEX_INTRO_3 =
  'These sources cover topics like how trials work, the different types and phases, how participants are protected, and how insurance and study costs are handled.'
const ALEX_INTRO_4 =
  "One important thing to know is that I don't have information on specific clinical trials, so I can't help you find a trial to join or answer questions about a particular study."
const ALEX_INTRO_5 =
  "Now, I'll hand it over to Jordan to quickly explain his role."

const JORDAN_INTRO_1 =
  "Thanks, Alex! So as Alex mentioned, I'm Jordan. I'm a virtual companion here to provide useful guidance during your search process."
const JORDAN_INTRO_2 =
  "As you explore, I'll help you build on your questions and discover new ways to learn about clinical trial participation."
const JORDAN_INTRO_3 =
  'Sometimes that might mean making a question more specific, looking at something from a different perspective, or exploring a related idea.'
const JORDAN_INTRO_4 =
  "Ultimately, you decide where the conversation goes. I'm just here to support your exploration."
const JORDAN_INTRO_5 =
  "Whenever you're ready, ask Alex anything you'd like to know about clinical trials!"

const res = await fetch(`${BASE_URL}/tts`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: ALEX_INTRO_2,
    character: 'doctor',
  }),
})

const { audio, timestamps } = await res.json()

fs.writeFileSync(
  'public/intro-voices/doctor-audio-ALEX_INTRO_2.mp3',
  Buffer.from(audio, 'base64'),
)
fs.writeFileSync(
  'public/intro-voices/doctor-timestamps-ALEX_INTRO_2.json',
  JSON.stringify(timestamps, null, 2),
)

console.log('Done! Files saved to public/')
