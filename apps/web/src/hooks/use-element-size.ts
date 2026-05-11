import { useCallback, useLayoutEffect, useState } from "react"

type ElementSize = {
  height: number
  width: number
}

const EMPTY_SIZE: ElementSize = {
  height: 0,
  width: 0,
}

export function useElementSize<TElement extends Element>() {
  const [element, setElement] = useState<TElement | null>(null)
  const [size, setSize] = useState<ElementSize>(EMPTY_SIZE)

  const ref = useCallback((node: TElement | null) => {
    setElement(node)
  }, [])

  useLayoutEffect(() => {
    if (!element) {
      setSize(EMPTY_SIZE)
      return
    }

    let frame = 0
    const measure = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const rect = element.getBoundingClientRect()
        setSize((current) => {
          if (current.height === rect.height && current.width === rect.width) {
            return current
          }

          return {
            height: rect.height,
            width: rect.width,
          }
        })
      })
    }

    measure()
    const resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(element)

    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
    }
  }, [element])

  return {
    element,
    ref,
    size,
  }
}
