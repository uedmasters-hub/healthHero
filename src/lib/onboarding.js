import { createContext, useContext } from 'react'
import { BRAND_LOGO_PATH, BRAND_STORAGE } from './brand'
import { requireSupabase } from './supabase'

export const ONBOARDING_KEY = BRAND_STORAGE.onboarding
export const ONBOARDING_USER_PREFIX = BRAND_STORAGE.onboardingUserPrefix

export const OnboardingActiveContext = createContext(false)
export const OnboardingStatusContext = createContext('pending')

/** @typedef {'pending' | 'needed' | 'done'} OnboardingStatus */

export function useOnboardingActive() {
  return useContext(OnboardingActiveContext)
}

export function useOnboardingStatus() {
  return useContext(OnboardingStatusContext)
}

export const ONBOARD_LOGO = BRAND_LOGO_PATH

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

function userCacheKey(userId) {
  return `${ONBOARDING_USER_PREFIX}${userId}`
}

/** Legacy device-wide flag (pre user-scoped cache). */
export function hasCompletedOnboarding() {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === '1'
  } catch {
    return false
  }
}

export function getLocalOnboardingComplete(userId) {
  if (!userId) return false
  try {
    if (localStorage.getItem(userCacheKey(userId)) === '1') return true
    // One-time migration from the old global key.
    if (localStorage.getItem(ONBOARDING_KEY) === '1') {
      localStorage.setItem(userCacheKey(userId), '1')
      return true
    }
  } catch {
    /* private mode */
  }
  return false
}

export function setLocalOnboardingComplete(userId) {
  try {
    if (userId) localStorage.setItem(userCacheKey(userId), '1')
    localStorage.setItem(ONBOARDING_KEY, '1')
  } catch {
    /* private mode */
  }
}

/** @deprecated Prefer setLocalOnboardingComplete(userId) */
export function markOnboardingComplete() {
  try {
    localStorage.setItem(ONBOARDING_KEY, '1')
  } catch {
    /* private mode */
  }
}

export async function fetchOnboardingCompleted(userId) {
  if (!userId) return false
  try {
    const { data, error } = await requireSupabase()
      .from('users')
      .select('onboarding_completed')
      .eq('id', userId)
      .maybeSingle()
    if (error) return false
    return Boolean(data?.onboarding_completed)
  } catch {
    return false
  }
}

export async function persistOnboardingCompleted(userId) {
  if (!userId) return { ok: false }
  setLocalOnboardingComplete(userId)
  try {
    const { error } = await requireSupabase()
      .from('users')
      .update({ onboarding_completed: true })
      .eq('id', userId)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (error) {
    return { ok: false, error: String(error?.message || error) }
  }
}

/**
 * Resolve whether this authenticated user still needs product onboarding.
 * Local cache is consulted first for fast startup; Supabase is the SSOT.
 */
export async function resolveOnboardingCompleted(userId) {
  if (!userId) return true
  if (getLocalOnboardingComplete(userId)) return true
  const remote = await fetchOnboardingCompleted(userId)
  if (remote) {
    setLocalOnboardingComplete(userId)
    return true
  }
  return false
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
