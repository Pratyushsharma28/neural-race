import { useEffect, useRef } from 'react'

/**
 * useCarControls() – returns live { forward, back, left, right, handbrake }
 * The object reference is stable; fields are mutated directly for zero-GC reads.
 */
export function useCarControls() {
  const controls = useRef({
    forward: false,
    back: false,
    left: false,
    right: false,
    handbrake: false,
  })

  useEffect(() => {
    const keys = {
      ArrowUp: 'forward', w: 'forward', W: 'forward',
      ArrowDown: 'back', s: 'back', S: 'back',
      ArrowLeft: 'left', a: 'left', A: 'left',
      ArrowRight: 'right', d: 'right', D: 'right',
      ' ': 'handbrake', Space: 'handbrake',
    }

    const onKeyDown = (e) => {
      const action = keys[e.key]
      if (action) {
        e.preventDefault()
        controls.current[action] = true
      }
    }

    const onKeyUp = (e) => {
      const action = keys[e.key]
      if (action) {
        controls.current[action] = false
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  return controls
}
