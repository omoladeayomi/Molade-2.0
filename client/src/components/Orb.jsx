// The Molade orb: the brand mark, Molade's avatar, and the "listening / thinking" visual.
// size is the orb's diameter in px; rings adds the circles around it; active animates it.

function Orb({ size = 32, rings = 0, active = false, className = '' }) {
  if (!rings) {
    return <div className={`orb shrink-0 ${className}`} style={{ width: size, height: size }} aria-hidden="true" />
  }

  const total = size * (1 + rings * 0.45)
  return (
    <div
      className={`relative grid shrink-0 place-items-center ${active ? 'orb-active' : ''} ${className}`}
      style={{ width: total, height: total }}
      aria-hidden="true"
    >
      {Array.from({ length: rings }, (_, i) => {
        const inset = (total - size) / 2 * (i / rings)
        return (
          <div
            key={i}
            className="orb-ring"
            style={{ inset, borderColor: `rgba(76, 141, 255, ${0.14 + i * 0.12})` }}
          />
        )
      })}
      <div className="orb" style={{ width: size, height: size }} />
    </div>
  )
}

export default Orb
