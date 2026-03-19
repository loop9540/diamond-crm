import confetti from 'canvas-confetti'

// Diamond sparkle burst
export function sparkle() {
  confetti({
    particleCount: 60,
    spread: 80,
    origin: { y: 0.7 },
    colors: ['#c3cca6', '#b3be94', '#8a9470', '#ffffff', '#e6e6e6'],
    shapes: ['circle'],
    scalar: 0.8,
    gravity: 1.2,
    ticks: 150,
  })
}

// Big sale celebration
export function saleCelebration() {
  const end = Date.now() + 800
  const colors = ['#c3cca6', '#10b981', '#f59e0b', '#ffffff']

  ;(function frame() {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors,
    })
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors,
    })
    if (Date.now() < end) requestAnimationFrame(frame)
  })()
}

// Money rain for payments
export function moneyRain() {
  confetti({
    particleCount: 40,
    spread: 100,
    origin: { y: 0 },
    colors: ['#10b981', '#059669', '#34d399', '#ffffff'],
    shapes: ['circle', 'square'],
    gravity: 0.8,
    scalar: 1.2,
    drift: 0.5,
    ticks: 200,
  })
}

// Small pop for quick actions
export function pop() {
  confetti({
    particleCount: 20,
    spread: 40,
    origin: { y: 0.8 },
    colors: ['#c3cca6', '#b3be94', '#ffffff'],
    scalar: 0.6,
    gravity: 1.5,
    ticks: 80,
  })
}

// Assign stock - directional burst
export function assignBurst() {
  confetti({
    particleCount: 35,
    angle: 45,
    spread: 60,
    origin: { x: 0.2, y: 0.6 },
    colors: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ffffff'],
    scalar: 0.7,
    ticks: 120,
  })
}
