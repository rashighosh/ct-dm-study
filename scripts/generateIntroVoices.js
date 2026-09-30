// scripts/generateJordanIntro.js
import fs from 'fs'

const BASE_URL = 'http://127.0.0.1:8000'

const ALEX_INTRO_1_SINGLE_INFO =
  'Hi there, I’m Alex. I’m an AI-powered virtual character here to help you explore what it means to participate in a clinical trial. You can ask me questions or bring up anything you’re curious or unsure about.'

const ALEX_INTRO_2_SINGLE_INFO =
  'I’ll use information from trusted health resources, such as the National Cancer Institute, to help you learn more about clinical trial participation.'

const ALEX_INTRO_3_SINGLE_INFO =
  'Before we get started, please remember that I don’t have access to specific clinical trials, so I can’t search for or answer questions about specific trials or treatments. I also can’t provide medical advice.'

const ALEX_INTRO_4_SINGLE_INFO =
  'Whenever you’re ready, what would you like to talk about?'

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
      name: 'ALEX_INTRO_1_SINGLE_INFO',
      text: ALEX_INTRO_1_SINGLE_INFO,
      character: 'doctor',
    },
    {
      name: 'ALEX_INTRO_2_SINGLE_INFO',
      text: ALEX_INTRO_2_SINGLE_INFO,
      character: 'doctor',
    },
    {
      name: 'ALEX_INTRO_3_SINGLE_INFO',
      text: ALEX_INTRO_3_SINGLE_INFO,
      character: 'doctor',
    },
    {
      name: 'ALEX_INTRO_4_SINGLE_INFO',
      text: ALEX_INTRO_4_SINGLE_INFO,
      character: 'doctor',
    },
  ]

  for (const intro of intros) {
    await generateOneIntro(intro.name, intro.text, intro.character)
  }

  console.log('🎉 Done! Baseline intro files saved!')
}

// --------------------------------------------------------------------------
// Choose what to run
// --------------------------------------------------------------------------

generateAllIntros()

// generateOneIntro('ALEX_INTRO_1_SINGLE_INFO', ALEX_INTRO_1_SINGLE_INFO, 'doctor')
