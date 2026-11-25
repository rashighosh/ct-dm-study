import { useEffect, useRef } from 'react'
import { initCompanionPreview } from '../companionPreview'
import bg from '../assets/bg.jpg'

export default function CompanionPreview({ model, body }) {
  const containerRef = useRef(null)

  useEffect(() => {
    let preview = null
    let cancelled = false

    async function loadCharacter() {
      try {
        const instance = await initCompanionPreview(
          containerRef.current,
          model,
          body,
        )

        if (cancelled) {
          instance.dispose()
          return
        }

        preview = instance
      } catch (error) {
        console.error('Error loading companion preview:', error)
      }
    }

    loadCharacter()

    return () => {
      cancelled = true
      preview?.dispose()
    }
  }, [model, body])

  return (
    <div
      ref={containerRef}
      style={{
        width: '350px',
        height: '350px',
        position: 'relative',
        border: 'none',
        background: '#f4f3ec',
        boxShadow:
          'rgba(0, 0, 0, 0.1) 0 10px 15px -3px, rgba(0, 0, 0, 0.3) 0 5px 25px -3px',
      }}
    />
  )
}
