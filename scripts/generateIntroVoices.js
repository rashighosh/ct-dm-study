// scripts/generateJordanIntro.js
import fs from 'fs'

const BASE_URL = 'http://127.0.0.1:8000'

const ALEX_INTRO_1_MULTIPLE =
  'Hi there, I’m Alex, and this is Jordan. We are AI-powered virtual characters here to help you understand clinical trial participation. We’ll go through the topics you chose earlier one at a time. My role is to provide information about each topic from trusted health resources, such as the National Cancer Institute.'

const ALEX_INTRO_1_SINGLE =
  'Hi there, I’m Alex. I am an AI-powered virtual character here to help you understand clinical trial participation. We’ll go through the topics you chose earlier one at a time. My role is to provide information about each topic from trusted health resources, such as the National Cancer Institute.'

const JORDAN_INTRO_1_MULTIPLE = `And my role is to help you think about how each topic relates to what matters to you. As we explore each topic, I'll help keep track of questions or concerns you might want to discuss with a healthcare provider or clinical trial team if you ever consider a clinical trial. You can see these anytime by clicking on the question list next to me. We can spend as much time as you’d like on each topic, and when you’re ready to move on, just let us know by saying something like, ‘Let’s move on’ or ‘Continue.’`

const ALEX_INTRO_2_SINGLE_COMBINED =
  "I'll also help you think about how each topic relates to what matters to you. As we explore each topic, I'll help keep track of questions or concerns you might want to discuss with a healthcare provider or clinical trial team if you ever consider a clinical trial. You can see these anytime by clicking on the question list next to me. We can spend as much time as you’d like on each topic, and when you’re ready to move on, just let me know by saying something like, ‘Let’s move on’ or ‘Continue.’"

const ALEX_INTRO_2_SINGLE_INFO =
  'We can spend as much time as you’d like on each topic, and when you’re ready to move on, just let me know by saying something like, ‘Let’s move on’ or ‘Continue.’'

const ALEX_INTRO_2_MULTIPLE =
  'Before we get started, please remember that we don’t have access to specific clinical trials, so we can’t search for or answer questions about specific trials or treatments. We also can’t provide medical advice.'

const ALEX_INTRO_3_SINGLE =
  'Before we get started, please remember that I don’t have access to specific clinical trials, so I can’t search for or answer questions about specific trials or treatments. I also can’t provide medical advice.'

const JORDAN_INTRO_2_MULTIPLE = 'Alright, with that, let’s get started!'

const ALEX_INTRO_4_SINGLE = 'Alright, with that, let’s get started!'

// --------------------------------------------------------------------------
// Generate one intro function
// --------------------------------------------------------------------------

async function generateOneIntro(name, text, character) {
  console.log(`Generating ${name}...`)

  const res = await fetch(`${BASE_URL}/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      character,
    }),
  })

  if (!res.ok) {
    throw new Error(`Failed ${name}: ${res.status}`)
  }

  const { audio, timestamps } = await res.json()

  const prefix = character === 'doctor' ? 'doctor' : 'companion'

  fs.writeFileSync(
    `public/intro-voices/${prefix}-audio-${name}.mp3`,
    Buffer.from(audio, 'base64'),
  )

  fs.writeFileSync(
    `public/intro-voices/${prefix}-timestamps-${name}.json`,
    JSON.stringify(timestamps, null, 2),
  )

  console.log(`✅ ${name}`)
}

// --------------------------------------------------------------------------
// Generate all intros function
// --------------------------------------------------------------------------

async function generateAllIntros() {
  const intros = [
    {
      name: 'ALEX_INTRO_1_MULTIPLE',
      text: ALEX_INTRO_1_MULTIPLE,
      character: 'doctor',
    },
    {
      name: 'ALEX_INTRO_1_SINGLE',
      text: ALEX_INTRO_1_SINGLE,
      character: 'doctor',
    },
    {
      name: 'ALEX_INTRO_2_SINGLE_INFO',
      text: ALEX_INTRO_2_SINGLE_INFO,
      character: 'doctor',
    },
    {
      name: 'JORDAN_INTRO_1_MULTIPLE',
      text: JORDAN_INTRO_1_MULTIPLE,
      character: 'companion',
    },
    {
      name: 'ALEX_INTRO_2_SINGLE_COMBINED',
      text: ALEX_INTRO_2_SINGLE_COMBINED,
      character: 'doctor',
    },
    {
      name: 'ALEX_INTRO_2_MULTIPLE',
      text: ALEX_INTRO_2_MULTIPLE,
      character: 'doctor',
    },
    {
      name: 'ALEX_INTRO_3_SINGLE',
      text: ALEX_INTRO_3_SINGLE,
      character: 'doctor',
    },
    {
      name: 'JORDAN_INTRO_2_MULTIPLE',
      text: JORDAN_INTRO_2_MULTIPLE,
      character: 'companion',
    },
    {
      name: 'ALEX_INTRO_4_SINGLE',
      text: ALEX_INTRO_4_SINGLE,
      character: 'doctor',
    },
  ]

  for (const intro of intros) {
    await generateOneIntro(intro.name, intro.text, intro.character)
  }

  console.log('🎉 Done! All intro files saved!')
}

// --------------------------------------------------------------------------
// Choose what to run
// --------------------------------------------------------------------------

// generateAllIntros()

generateOneIntro(
  'JORDAN_INTRO_1_MULTIPLE',
  JORDAN_INTRO_1_MULTIPLE,
  'companion',
)
generateOneIntro(
  'ALEX_INTRO_2_SINGLE_COMBINED',
  ALEX_INTRO_2_SINGLE_COMBINED,
  'doctor',
)
