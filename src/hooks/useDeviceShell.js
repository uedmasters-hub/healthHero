import { useEffect, useSyncExternalStore } from 'react'
import {
  SHELL_MODE,
  getShellMode,
  subscribeShellMode,
} from '../lib/deviceShell'

/**
 * Live shell mode: `native` (edge-to-edge phone PWA) or `preview` (desktop frame).
 * Syncs `html.is-native-shell` / `data-shell` for CSS tokens.
 */
export function useDeviceShell() {
  const mode = useSyncExternalStore(subscribeShellMode, getShellMode, () => SHELL_MODE.PREVIEW)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.shell = mode
    root.classList.toggle('is-native-shell', mode === SHELL_MODE.NATIVE)
    return () => {
      root.classList.remove('is-native-shell')
      delete root.dataset.shell
    }
  }, [mode])

  return mode
}

export { SHELL_MODE }
