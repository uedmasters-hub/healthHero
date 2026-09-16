import { createContext, useContext } from 'react'

export const ONBOARDING_KEY = 'healthhero.onboardingComplete'

export const OnboardingActiveContext = createContext(false)

export function useOnboardingActive() {
  return useContext(OnboardingActiveContext)
}

export const ONBOARD_LOGO = '/img/health_hero.svg'

export const ONBOARD_SLIDES = [
  {
    id: 'book',
    title: 'Book care in minutes',
    body: 'Find trusted doctors in your city, compare slots, and book in-clinic or video consultations without the wait.',
    image: '/img/onboard/onboarding-01.png',
  },
  {
    id: 'meet',
    title: 'Meet doctor anywhere',
    body: 'Choose between clinic visits and secure video consultations whenever it suits you.',
    image: '/img/onboard/onboarding-02.png',
  },
  {
    id: 'place',
    title: 'Everything in one place',
    body: 'Keep your appointments, prescriptions, lab reports, and health records organized in a single app.',
    image: '/img/onboard/onboarding-03.png',
  },
  {
    id: 'protect',
    title: 'Your health, protected',
    body: 'Your personal information stays secure with privacy-first protection built into every interaction.',
    image: '/img/onboard/onboarding-04.png',
  },
]

export const ONBOARD_ASSETS = [ONBOARD_LOGO, ...ONBOARD_SLIDES.map((slide) => slide.image)]

export function hasCompletedOnboarding() {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === '1'
  } catch {
    return false
  }
}

export function markOnboardingComplete() {
  try {
    localStorage.setItem(ONBOARDING_KEY, '1')
  } catch {
    /* private mode */
  }
}

export function preloadOnboardAssets(urls = ONBOARD_ASSETS) {
  return Promise.all(
    urls.map(
      (src) => new Promise((resolve) => {
        const image = new Image()
        image.onload = () => resolve(src)
        image.onerror = () => resolve(src)
        image.src = src
      }),
    ),
  )
}
