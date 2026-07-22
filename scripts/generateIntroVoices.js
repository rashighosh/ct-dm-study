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
const ALEX_INTRO_1_FORAGING_COMBINED =
  "Hi there, I'm Alex! I am an AI powered virtual character here to help you explore and understand clinical trial participation."
const ALEX_INTRO_2 =
  "I'll explain my role first. I'm a virtual assistant that can quickly search information across several trusted health resources to answer questions about clinical trial participation. I pull from reputable sources like the National Cancer Institute."
const ALEX_INTRO_3 =
  'These sources cover information such as the purpose and importance of clinical trials, and topics such as safety and costs. As I answer your questions, I will also share the sources I use that you can save to read later if you want.'
const ALEX_INTRO_4 =
  "One important thing to note is that I don't have information on specific clinical trials, so I can't help you find a trial to join or answer questions about a particular study."
const ALEX_INTRO_4_1_FORAGING =
  "As you explore, I'll also keep track of the information you discover and try to connect related ideas. I'll also suggest directions to explore to continue building your understanding."
const ALEX_INTRO_4_2_FORAGING =
  "In between me answering your questions, you can click on me to hear my thoughts and revisit what you've learned so far."
const ALEX_INTRO_5 = "Now, I'll hand it over to Jordan."
const ALEX_INTRO_5_FORAGING_COMBINED =
  "Alright, whenever you're ready, ask me anything you'd like to know about clinical trials!"

const JORDAN_INTRO_1 =
  "Thanks, Alex! As Alex mentioned, I'm Jordan. I'm a virtual companion here to provide useful guidance during your search process."
const JORDAN_INTRO_2 =
  "As you explore, I'll keep track of the information you discover and try to connect related ideas. I'll also suggest directions to explore to continue building your understanding."
const JORDAN_INTRO_2_V2 =
  "As you explore, I'll keep track of the information you discover and try to connect related ideas on this white board behind me."
const JORDAN_INTRO_3 =
  "In between Alex answering your questions, you can click on me to hear my thoughts and revisit what you've learned so far."
const JORDAN_INTRO_3_V3 =
  'In between Alex answering your questions, you can open the board to edit any notes I take.'
const JORDAN_INTRO_4 =
  "Whenever you're ready, ask Alex anything you'd like to know about clinical trials!"

const ALEX_INSTRUCTION_FORAGING =
  "Here are the sources I used. Remember, you can save any of them to read later, and I'll keep sharing my sources throughout our conversation."

const JORDAN_INSTRUCTION =
  "This is where I'll keep track of important ideas and how they fit together as you chat with Alex. Remember, you can click on me at any time to take a look!"

const ALEX_INSTRUCTION_SENSEMAKING =
  "This is where I'll keep track of important ideas and how they fit together as you chat with me. Remember, you can click on me at any time to take a look!"

const res = await fetch(`${BASE_URL}/tts`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: JORDAN_INTRO_3_V3,
    character: 'companion',
  }),
})

const { audio, timestamps } = await res.json()

fs.writeFileSync(
  'public/intro-voices/companion-audio-JORDAN_INTRO_3_V3.mp3',
  Buffer.from(audio, 'base64'),
)
fs.writeFileSync(
  'public/intro-voices/companion-timestamps-JORDAN_INTRO_3_V3.json',
  JSON.stringify(timestamps, null, 2),
)

console.log('Done! Files saved to public/')
