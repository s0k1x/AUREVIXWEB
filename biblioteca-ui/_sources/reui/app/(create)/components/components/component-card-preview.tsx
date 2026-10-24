"use client"

import * as React from "react"
import { RotateCwIcon } from "lucide-react"

import {
  CATALOG_FRAME_DESIGN_KEYS,
  resolveComponentPreviewFrameHeight,
  resolveComponentPreviewFrameMinWidth,
  shouldFrameComponentPreview,
} from "@/lib/component-preview-frame"
import { useIntersectionObserver } from "@/hooks/use-intersection-observer"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ComponentPreviewFrame } from "@/components/component-preview-frame"

/**
 * Isolates a single component preview so a failed lazy import (e.g. a missing
 * or stale locally-built `@reui/components-*-<category>` dist, or a cold
 * Turbopack compile failure) degrades to a Retry card instead of crashing the
 * whole /components/<category> route with the Next error overlay. Mirrors
 * BlockErrorBoundary in the blocks grid (block-card-container.tsx).
 */
class ComponentPreviewErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-44 w-full flex-col items-center justify-center gap-3">
          <p className="text-site-muted-foreground text-xs">
            Failed to load preview
          </p>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => this.setState({ hasError: false })}
          >
            <RotateCwIcon className="mr-1.5 size-3" />
            Retry
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}

type LivePreviewComponent = React.ComponentType<{
  name: string
  base?: string
  category?: string
}>

let livePreviewModulePromise: Promise<{
  ComponentLivePreviewRuntime: LivePreviewComponent
}> | null = null

function loadLivePreviewModule() {
  if (!livePreviewModulePromise) {
    livePreviewModulePromise = import("./component-live-preview-runtime")
  }

  return livePreviewModulePromise
}

/**
 * Below this width a card cannot carry a category's MIN_FRAME_WIDTH. The frame
 * would lay the example out at that width and paint it scaled to fit, so a
 * sidebar shell at 800px lands at ~0.4 on a 375px phone and its 14px chrome
 * renders at ~6px.
 *
 * Upstream never reaches that state: its card swaps in a generated still below
 * the same breakpoint. This repo carries no thumbnails (see the NOT SYNCED note
 * in reui.io's scripts/sync-oss.mts), so it drops the minimum instead and lets
 * the example take its own mobile branch inside the frame, which every sidebar
 * example is built to survive - each mounts a SidebarInset header carrying a
 * SidebarTrigger.
 */
const MIN_WIDTH_VIEWPORT_QUERY = "(min-width: 48rem)"

/**
 * Picks between the iframe-backed preview (heavy categories only) and the
 * inline one every other category keeps using. See
 * lib/component-preview-frame.ts for the allowlist and the kill switch.
 */
export function ComponentCardPreview({
  name,
  title,
  base = "base",
  category,
  previewHeight,
}: {
  name: string
  title: string
  base?: string
  category?: string
  previewHeight?: string
}) {
  // Tri-state on purpose: `undefined` until the first client effect resolves.
  // Only the minWidth branch below reads it, so every other category mounts
  // exactly as it did before this existed.
  const isWideViewport = useMediaQuery(MIN_WIDTH_VIEWPORT_QUERY)

  const inline = (
    <InlineComponentCardPreview
      name={name}
      title={title}
      base={base}
      category={category}
    />
  )

  if (!shouldFrameComponentPreview(category, "catalog")) {
    return inline
  }

  const height = resolveComponentPreviewFrameHeight({
    category,
    metaPreviewHeight: previewHeight,
  })
  const categoryMinWidth = resolveComponentPreviewFrameMinWidth(category)

  // Hold the frame back until the breakpoint is known, so it cannot mount at
  // one width and re-lay-out under the reader a frame later. Only categories
  // that ask for a minimum width wait; the box keeps the frame's own height,
  // so nothing shifts when it swaps in.
  if (categoryMinWidth > 0 && isWideViewport === undefined) {
    return (
      <div
        data-slot="preview-frame"
        aria-label={`${title} preview loading`}
        className="flex w-full items-center justify-center"
        style={{ height }}
      >
        <Spinner className="text-site-muted-foreground/40 size-4" />
      </div>
    )
  }

  return (
    <ComponentPreviewFrame
      name={name}
      base={base}
      title={title}
      height={height}
      minWidth={isWideViewport ? categoryMinWidth : 0}
      designKeys={CATALOG_FRAME_DESIGN_KEYS}
      // NOT `preview`: FrameContent centers that slot and caps it at
      // `sm:max-w-[80%]`, which is right for an inline demo but boxes a frame
      // that is already sized to fill its card. This slot is unmatched by
      // those rules, so the example spans the full card width.
      slot="preview-frame"
      fallback={inline}
    />
  )
}

function InlineComponentCardPreview({
  name,
  title,
  base = "base",
  category,
}: {
  name: string
  title: string
  base?: string
  category?: string
}) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const idleCallbackRef = React.useRef<number | null>(null)
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const isVisible = useIntersectionObserver(containerRef, {
    rootMargin: "300px",
    threshold: 0,
    freezeOnceVisible: true,
  })

  const [LivePreview, setLivePreview] =
    React.useState<LivePreviewComponent | null>(null)

  React.useEffect(() => {
    if (!isVisible || LivePreview) {
      return
    }

    const activate = () => {
      loadLivePreviewModule()
        .then((mod) => {
          React.startTransition(() => {
            setLivePreview(() => mod.ComponentLivePreviewRuntime)
          })
        })
        .catch((error) => {
          console.error("Failed to load live component preview", error)
        })
    }

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleCallbackRef.current = window.requestIdleCallback(activate, {
        timeout: 1500,
      })

      return () => {
        if (idleCallbackRef.current != null) {
          window.cancelIdleCallback(idleCallbackRef.current)
        }
      }
    }

    timeoutRef.current = setTimeout(activate, 150)

    return () => {
      if (timeoutRef.current != null) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [LivePreview, isVisible])

  const fallback = (
    <div
      data-slot="preview"
      aria-label={`${title} preview loading`}
      className="flex h-44 w-full items-center justify-center"
    >
      <Spinner className="text-site-muted-foreground/40 size-4" />
    </div>
  )

  return (
    <div
      ref={containerRef}
      data-slot="preview"
      className="flex w-full items-center justify-center"
    >
      {LivePreview ? (
        <ComponentPreviewErrorBoundary>
          <React.Suspense fallback={fallback}>
            <LivePreview name={name} base={base} category={category} />
          </React.Suspense>
        </ComponentPreviewErrorBoundary>
      ) : (
        fallback
      )}
    </div>
  )
}
