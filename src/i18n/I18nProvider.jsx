import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import {
  LANG_META,
  loadLanguage,
  saveLanguage,
  normalizeLang,
} from './prefs'
import { translatePhrase } from './phrases'

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => loadLanguage())

  const setLang = useCallback((code) => {
    setLangState(saveLanguage(normalizeLang(code)))
  }, [])

  useEffect(() => {
    saveLanguage(lang)
  }, [lang])

  const tx = useCallback((english) => translatePhrase(lang, english), [lang])

  const value = {
    lang,
    setLang,
    tx,
    short: LANG_META[lang].short,
    meta: LANG_META[lang],
    voiceLang: LANG_META[lang].voice,
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    return {
      lang: 'en',
      setLang: () => {},
      tx: (english) => String(english || ''),
      short: 'EN',
      meta: LANG_META.en,
      voiceLang: 'en-US',
    }
  }
  return ctx
}

/** Safe outside provider — falls back to English. */
export function useTx() {
  const ctx = useContext(I18nContext)
  return useCallback(
    (english) => (ctx ? ctx.tx(english) : String(english || '')),
    [ctx],
  )
}
