import * as React from "react"

const MOBILE_BREAKPOINT = 768

function getMobileSnapshot() {
  return window.innerWidth < MOBILE_BREAKPOINT
}

function getServerSnapshot() {
  return false
}

export function useIsMobile() {
  return React.useSyncExternalStore(
    React.useCallback(
      (onChange) => {
        const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
        mql.addEventListener("change", onChange)
        return () => mql.removeEventListener("change", onChange)
      },
      []
    ),
    getMobileSnapshot,
    getServerSnapshot
  )
}
