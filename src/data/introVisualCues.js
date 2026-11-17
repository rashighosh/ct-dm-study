import {
  faCommentNodes,
  faStethoscope,
  faClipboardList,
  faHeartCircleCheck,
  faUser,
  faFileLines,
  faCheck,
  faGlobe,
  faMagnifyingGlass,
  faQuestion,
  faDatabase,
  faNotesMedical,
  faUserCheck,
  faCircleCheck,
  faFileCircleCheck,
  faHandHoldingHeart,
  faUsers,
  faEarthAmericas,
  faHeart,
  faCircleExclamation,
  faCommentDots,
  faLightbulb,
  faBullhorn,
  faArrowRight,
  faRobot,
} from '@fortawesome/free-solid-svg-icons'

export const INTRO_VISUAL_CUES = {
  // DR. ALEX
  '/intro-voices/doctor-audio-ALEX_INTRO_1_MULTIPLE_1.mp3': [
    {
      at: 3.5,
      duration: 2.5,
      icons: [faCommentNodes, faRobot],
      stagger: 0.5,
    },
    {
      at: 6.5,
      duration: 1.5,
      icons: [faStethoscope, faClipboardList],
      stagger: 0.3,
    },
    {
      at: 8.5,
      duration: 3,
      icons: [faUser, faHeartCircleCheck],
      stagger: 0.3,
    },
  ],
  '/intro-voices/doctor-audio-ALEX_INTRO_1_MULTIPLE_2.mp3': [
    {
      at: 1.5,
      duration: 3,
      icons: [faFileLines, faCheck],
      stagger: 0.3,
    },
    {
      at: 5,
      duration: 6,
      icons: [faMagnifyingGlass, faQuestion],
      stagger: 0.5,
    },
  ],
  '/intro-voices/doctor-audio-ALEX_INTRO_1_MULTIPLE_3.mp3': [
    {
      at: 3.3,
      duration: 7,
      icons: [faDatabase, faNotesMedical, faUserCheck],
      stagger: 0.5,
    },
    {
      at: 12.5,
      duration: 4,
      icons: [faUser, faArrowRight, faFileCircleCheck],
      stagger: 0.3,
    },
  ],
  '/intro-voices/companion-audio-JORDAN_INTRO_1_MULTIPLE_1.mp3': [
    {
      at: 1,
      duration: 3.5,
      icons: [faFileCircleCheck, faHandHoldingHeart],
      stagger: 0.5,
    },
    {
      at: 5,
      duration: 4.5,
      icons: [faEarthAmericas, faHeart, faCircleExclamation],
      stagger: 0.5,
    },
    {
      at: 10,
      duration: 3,
      icons: [faUserCheck, faHandHoldingHeart],
      stagger: 0.3,
    },
  ],
  '/intro-voices/companion-audio-JORDAN_INTRO_1_MULTIPLE_2.mp3': [
    {
      at: 2,
      duration: 2,
      icons: [faHandHoldingHeart, faCommentDots],
      stagger: 0.3,
    },
    {
      at: 5.5,
      duration: 4,
      icons: [faUser, faLightbulb, faHeart],
      stagger: 0.5,
    },
    {
      at: 9.5,
      duration: 4,
      icons: [faUser, faArrowRight, faFileLines],
      stagger: 0.3,
    },
  ],
  '/intro-voices/companion-audio-JORDAN_INTRO_1_MULTIPLE_3.mp3': [],
  '/intro-voices/companion-audio-JORDAN_INTRO_1_MULTIPLE_4.mp3': [],
  '/intro-voices/companion-audio-JORDAN_INTRO_1_MULTIPLE_5.mp3': [],
}
