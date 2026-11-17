// node scripts/generateIntroVoices.js
import fs from 'fs'

const BASE_URL = 'http://127.0.0.1:8000'

const ALEX_INTRO_1_MULTIPLE_1 = `Hi there, I am Doctor Alex, and this is Jordan. We are AI-powered virtual characters here to help you understand clinical trial participation so you can evaluate whether participating in one might be right for you.`

const ALEX_INTRO_1_MULTIPLE_2 = `When considering a clinical trial, having accurate, reliable information is essential. However, there is a great deal of information available, and it can be challenging to know where to look or how to make sense of it all.`

const ALEX_INTRO_1_MULTIPLE_3 = `My role is to help you navigate that information. I draw on a large collection of trusted medical resources curated by human health communication experts, such as the National Cancer Institute. I identify relevant information to provide clear, evidence-based answers to your questions.`

const JORDAN_INTRO_1_MULTIPLE_1 = `But even the most reliable information is most useful when it addresses what's important to you! Everyone has different experiences, needs, and concerns, so what matters most can be different for each person. We want to make sure the information you get matches your individual needs.`

const JORDAN_INTRO_1_MULTIPLE_2 = `That's where I come in! My role is to support you in expressing your own needs and concerns. Throughout the conversation, I'll invite you to share your perspectives and help you think through what's important to you, so your voice can guide the information Dr. Alex finds and shares with you.`

const JORDAN_INTRO_1_MULTIPLE_3 = `So, let’s start by learning a little bit about what matters to you so Doctor Alex can help suggest some topics to explore.`

const JORDAN_INTRO_1_MULTIPLE_4 = `Before looking into any particular study, what are the top three things you'd want to understand better or think through to decide whether clinical trials are something you'd want to explore further?`

const JORDAN_INTRO_1_MULTIPLE_5 = `Feel free to share your concerns or anything that would be important to you personally.`

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

  if (!audio || timestamps == null) {
    throw new Error(`Missing audio or timestamps for ${name}`)
  }

  const prefix = character === 'doctor' ? 'doctor' : 'companion'

  fs.mkdirSync('public/intro-voices', { recursive: true })

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
      name: 'ALEX_INTRO_1_MULTIPLE_1',
      text: ALEX_INTRO_1_MULTIPLE_1,
      character: 'doctor',
    },
    {
      name: 'ALEX_INTRO_1_MULTIPLE_2',
      text: ALEX_INTRO_1_MULTIPLE_2,
      character: 'doctor',
    },
    {
      name: 'ALEX_INTRO_1_MULTIPLE_3',
      text: ALEX_INTRO_1_MULTIPLE_3,
      character: 'doctor',
    },
    {
      name: 'JORDAN_INTRO_1_MULTIPLE_1',
      text: JORDAN_INTRO_1_MULTIPLE_1,
      character: 'companion',
    },
    {
      name: 'JORDAN_INTRO_1_MULTIPLE_2',
      text: JORDAN_INTRO_1_MULTIPLE_2,
      character: 'companion',
    },
    {
      name: 'JORDAN_INTRO_1_MULTIPLE_3',
      text: JORDAN_INTRO_1_MULTIPLE_3,
      character: 'companion',
    },
    {
      name: 'JORDAN_INTRO_1_MULTIPLE_4',
      text: JORDAN_INTRO_1_MULTIPLE_4,
      character: 'companion',
    },
    {
      name: 'JORDAN_INTRO_1_MULTIPLE_5',
      text: JORDAN_INTRO_1_MULTIPLE_5,
      character: 'companion',
    },
  ]

  for (const intro of intros) {
    await generateOneIntro(intro.name, intro.text, intro.character)
  }

  console.log('🎉 Done! All 8 intro audio and timestamp files saved!')
}

// --------------------------------------------------------------------------
// Choose what to run
// --------------------------------------------------------------------------

generateAllIntros().catch((err) => {
  console.error('❌ Intro generation failed:', err)
  process.exitCode = 1
})
