import {
  faFlask,
  faPeopleGroup,
  faFileLines,
  faCircleQuestion,
  faClipboardList,
  faBookOpen,
  faHeadset,
  faMagnifyingGlass,
} from '@fortawesome/free-solid-svg-icons'

export const RESOURCES = [
  {
    id: 'featured-trials',
    title: 'Examples of real clinical trials',
    description:
      'Explore featured clincal trials from the National Cancer Institute.',
    url: 'https://www.cancer.gov/research/infrastructure/clinical-trials/featured',
    icon: faFlask,
  },
  {
    id: 'personal-stories',
    title: 'Personal stories',
    description:
      'Hear about experiences from people who have participated in cancer research.',
    url: 'https://www.cancer.gov/research/participate/stories',
    icon: faPeopleGroup,
  },
  {
    id: 'sample-consent',
    title: 'Sample consent form',
    description:
      'See the kind of information participants may receive before deciding whether to join a study.',
    url: 'https://www.cancer.gov/research/participate/articles/sample-informed-consent-form',
    icon: faFileLines,
  },
  {
    id: 'questions-to-ask',
    title: 'Questions to ask provider or research team',
    description:
      'Review questions you may want to ask a doctor or research team about a clinical trial.',
    url: 'https://www.cancer.gov/research/participate/clinical-trials/why-participate#questions-to-ask-before-joining-a-clinical-trial',
    icon: faCircleQuestion,
  },
  {
    id: 'details-checklist',
    title: 'Checklist to get ready to look for clinical trials',
    description:
      'See what information about your cancer may be useful when looking for clinical trials.',
    url: 'https://www.cancer.gov/research/participate/clinical-trials-search/steps/detailschecklist.pdf',
    icon: faClipboardList,
  },
  {
    id: 'finding-guide',
    title: 'Step-by-step guide to find clinical trials',
    description:
      'Read a step-by-step guide to finding clinical trials from the National Cancer Institute.',
    url: 'https://www.cancer.gov/research/participate/clinical-trials-search/help',
    icon: faBookOpen,
  },
  {
    id: 'nci-specialist',
    title: 'Contact information for an NCI specialist',
    description:
      'Get help and cancer information from a trained National Cancer Institute specialist.',
    url: 'https://www.cancer.gov/contact',
    icon: faHeadset,
  },
  {
    id: 'trial-search',
    title: 'Website to search for clinical trials',
    description:
      'Search the National Cancer Institute database for cancer clinical trials.',
    url: 'https://www.cancer.gov/research/participate/clinical-trials-search',
    icon: faMagnifyingGlass,
  },
]
