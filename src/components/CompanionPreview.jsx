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
        width: '550px',
        height: '550px',
        position: 'relative',
        border: 'none',
        background: '#f4f3ec',
        boxShadow:
          'rgba(0, 0, 0, 0.1) 0 10px 15px -3px, rgba(0, 0, 0, 0.3) 0 5px 25px -3px',
      }}
    />
  )
}

export function CompanionPreviewPage() {
  const companions = [
    { name: 'F1', model: 'f1.glb', body: 'F' },
    { name: 'F2', model: 'f2.glb', body: 'F' },
    { name: 'M1', model: 'm1.glb', body: 'M' },
    { name: 'M2', model: 'm2.glb', body: 'M' },
  ]

  const companion = { name: 'M2', model: 'm2.glb', body: 'M' }

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '20px',
        padding: '30px',
        textAlign: 'center',
      }}
    >
      <CompanionPreview
        model={`/character-models/companion-characters/${companion.model}`}
        body={companion.body}
      />
    </div>
  )
}
