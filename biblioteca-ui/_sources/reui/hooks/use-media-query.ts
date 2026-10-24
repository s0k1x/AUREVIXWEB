import * as React from "react"

/**
 * Tri-state media query hook: `undefined` until the first client effect
 * resolves (SSR and the very first render), then a live boolean.
 *
 * Unlike `useIsMobile`, the unresolved state is observable on purpose so
 * callers can defer work (e.g. mounting an iframe) until the breakpoint
 * is actually known instead of guessing a default.
 *
 * Prefer rem-based queries (e.g. "(min-width: 64rem)") when matching a
 * Tailwind breakpoint: both CSS media queries and matchMedia resolve rem
 * against the initial 16px font size, so they cannot disagree under
 * browser font scaling the way a hardcoded px query can.
 */
export function useMediaQuery(query: string): boolean | undefined {
  const [matches, setMatches] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => {
      setMatches(mql.matches)
    }
    mql.addEventListener("change", onChange)
    setMatches(mql.matches)
    return () => mql.removeEventListener("change", onChange)
  }, [query])

  return matches
}
