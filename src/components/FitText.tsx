import { useLayoutEffect, useRef } from 'react'

const MIN_SIZE = 6

/**
 * Texto em uma linha que reduz a fonte quando não cabe na largura disponível.
 * O tamanho base vem das classes (ex.: text-2xl); só encolhe, nunca cresce.
 */
export function FitText({ text, className = '' }: { text: string; className?: string }) {
  const outer = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const box = outer.current
    const span = inner.current
    if (!box || !span) return

    const fit = () => {
      span.style.fontSize = ''
      const width = () => span.getBoundingClientRect().width
      const available = box.getBoundingClientRect().width
      const natural = width()
      if (natural <= available || natural === 0) return

      // Estimativa proporcional; a largura não escala exatamente linear (hinting, kerning),
      // então ajusta em passos de 0,25 px até caber.
      let size = Math.floor(((parseFloat(getComputedStyle(span).fontSize) * available) / natural) * 4) / 4
      span.style.fontSize = `${size}px`
      while (width() > available && size > MIN_SIZE) {
        size -= 0.25
        span.style.fontSize = `${size}px`
      }
    }

    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(box)
    return () => ro.disconnect()
  }, [text])

  return (
    <div ref={outer} className={className} data-fit>
      <span ref={inner} className="inline-block whitespace-nowrap">{text}</span>
    </div>
  )
}
