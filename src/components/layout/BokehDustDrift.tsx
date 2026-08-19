import React, { useEffect, useRef, memo } from 'react'

interface Particle {
    x: number
    y: number
    baseX: number
    baseY: number
    radius: number
    layer: 0 | 1 | 2 // 0 = background dust, 1 = midground motes, 2 = foreground bokeh disc
    color: string
    alpha: number
    baseAlpha: number
    vx: number
    vy: number
    twinkleSpeed: number
    twinklePhase: number
    swayPhase: number
    swaySpeed: number
    swayAmp: number
}

/**
 * BokehDustDrift
 * Interactive depth-of-field particle background with:
 * - Large defocused foreground bokeh discs
 * - Luminous glowing motes
 * - Fine background sparkling dust drifting with organic turbulence & gentle mouse repulsion
 */
export const BokehDustDrift: React.FC = memo(() => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d', { alpha: true })
        if (!ctx) return

        let animationFrameId: number
        let width = 0
        let height = 0
        let dpr = 1

        const updateDimensions = () => {
            if (!canvas) return
            const newWidth = window.innerWidth
            const newHeight = window.innerHeight
            const newDpr = Math.min(window.devicePixelRatio || 1, 2)

            if (newWidth !== width || newHeight !== height || newDpr !== dpr) {
                width = newWidth
                height = newHeight
                dpr = newDpr
                canvas.width = width * dpr
                canvas.height = height * dpr
                ctx.scale(dpr, dpr)
            }
        }

        // Defer initial sizing to the next frame to prevent forced reflow
        requestAnimationFrame(() => {
            updateDimensions()
        })

        const handleResize = () => {
            requestAnimationFrame(updateDimensions)
        }
        window.addEventListener('resize', handleResize, { passive: true })

        // Mouse tracking for soft gentle parallax repulsion
        const mouse = {
            x: -1000,
            y: -1000,
            targetX: -1000,
            targetY: -1000,
            radius: 160,
            isActive: false,
        }

        const handleMouseMove = (e: MouseEvent) => {
            mouse.targetX = e.clientX
            mouse.targetY = e.clientY
            mouse.isActive = true
        }

        const handleMouseLeave = () => {
            mouse.isActive = false
            mouse.targetX = -1000
            mouse.targetY = -1000
        }

        window.addEventListener('mousemove', handleMouseMove, { passive: true })
        document.addEventListener('mouseleave', handleMouseLeave)

        // Color palettes for bokeh dust
        // Cool harmonious blues, cyans, and soft purples
        const paletteLayer0 = ['#93c5fd', '#bae6fd', '#c7d2fe', '#e0e7ff'] // Fine dust
        const paletteLayer1 = ['#38bdf8', '#60a5fa', '#818cf8', '#3b82f6', '#a5b4fc'] // Glowing motes
        const paletteLayer2 = ['#38bdf8', '#60a5fa', '#818cf8', '#93c5fd'] // Foreground bokeh

        // Initialize particles
        const particles: Particle[] = []
        const initW = window.innerWidth || 1200
        const initH = window.innerHeight || 800
        const totalCount = Math.min(Math.floor((initW * initH) / 14000), 75) // Responsive count

        for (let i = 0; i < totalCount; i++) {
            const rand = Math.random()
            let layer: 0 | 1 | 2 = 0
            let radius = 1.2
            let baseAlpha = 0.35
            let color = paletteLayer0[Math.floor(Math.random() * paletteLayer0.length)]
            let vy = -(Math.random() * 0.3 + 0.1) // Upward drift
            let vx = Math.random() * 0.2 - 0.05 // Gentle right drift

            if (rand < 0.6) {
                // Layer 0: Sharp Micro Dust (60% of particles)
                layer = 0
                radius = Math.random() * 1.5 + 0.8
                baseAlpha = Math.random() * 0.35 + 0.2
                color = paletteLayer0[Math.floor(Math.random() * paletteLayer0.length)]
                vy = -(Math.random() * 0.25 + 0.08)
            } else if (rand < 0.88) {
                // Layer 1: Glowing Midground Motes (28% of particles)
                layer = 1
                radius = Math.random() * 3.5 + 2.5
                baseAlpha = Math.random() * 0.3 + 0.25
                color = paletteLayer1[Math.floor(Math.random() * paletteLayer1.length)]
                vy = -(Math.random() * 0.35 + 0.12)
            } else {
                // Layer 2: Defocused Bokeh Discs (12% of particles)
                layer = 2
                radius = Math.random() * 22 + 14
                baseAlpha = Math.random() * 0.09 + 0.04
                color = paletteLayer2[Math.floor(Math.random() * paletteLayer2.length)]
                vy = -(Math.random() * 0.45 + 0.18)
            }

            const initialX = Math.random() * initW
            const initialY = Math.random() * initH

            particles.push({
                x: initialX,
                y: initialY,
                baseX: initialX,
                baseY: initialY,
                radius,
                layer,
                color,
                alpha: baseAlpha,
                baseAlpha,
                vx,
                vy,
                twinkleSpeed: Math.random() * 0.03 + 0.01,
                twinklePhase: Math.random() * Math.PI * 2,
                swayPhase: Math.random() * Math.PI * 2,
                swaySpeed: Math.random() * 0.015 + 0.008,
                swayAmp: Math.random() * 0.6 + 0.2,
            })
        }

        // Main animation loop
        let isRunning = true

        const handleVisibilityChange = () => {
            if (document.hidden) {
                isRunning = false
            } else {
                isRunning = true
                lastTime = performance.now()
                render(lastTime)
            }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)

        let lastTime = performance.now()

        const render = (currentTime: number) => {
            if (!isRunning) return

            const dt = Math.min((currentTime - lastTime) / 16.666, 2)
            lastTime = currentTime

            ctx.clearRect(0, 0, width, height)

            // Smooth cursor interpolation
            mouse.x += (mouse.targetX - mouse.x) * 0.1
            mouse.y += (mouse.targetY - mouse.y) * 0.1

            // Render particles by layer for natural depth ordering
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i]

                // Organic sway & drift
                p.swayPhase += p.swaySpeed * dt
                p.twinklePhase += p.twinkleSpeed * dt

                p.y += p.vy * dt
                p.x += (p.vx + Math.sin(p.swayPhase) * p.swayAmp) * dt

                // Twinkle brightness variation
                p.alpha = p.baseAlpha * (0.75 + 0.25 * Math.sin(p.twinklePhase))

                // Mouse Repulsion & Parallax
                if (mouse.isActive && mouse.x > 0 && mouse.y > 0) {
                    const dx = p.x - mouse.x
                    const dy = p.y - mouse.y
                    const dist = Math.sqrt(dx * dx + dy * dy)
                    const maxDist = mouse.radius * (p.layer === 2 ? 1.6 : p.layer === 1 ? 1.2 : 0.8)

                    if (dist < maxDist && dist > 0) {
                        const force = (1 - dist / maxDist) * (p.layer === 2 ? 3.2 : p.layer === 1 ? 1.8 : 0.7)
                        p.x += (dx / dist) * force * dt
                        p.y += (dy / dist) * force * dt
                    }
                }

                // Wrap around edges seamlessly
                if (p.y < -p.radius * 2) {
                    p.y = height + p.radius * 2
                    p.x = Math.random() * width
                }
                if (p.x < -p.radius * 2) p.x = width + p.radius * 2
                if (p.x > width + p.radius * 2) p.x = -p.radius * 2

                // Drawing Particle with realistic bokeh & halo
                ctx.save()
                ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha))

                if (p.layer === 2) {
                    // Layer 2: Defocused Bokeh Disc with soft optical falloff
                    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius)
                    grad.addColorStop(0, p.color)
                    grad.addColorStop(0.4, p.color)
                    grad.addColorStop(0.85, `${p.color}66`)
                    grad.addColorStop(1, `${p.color}00`)

                    ctx.fillStyle = grad
                    ctx.beginPath()
                    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
                    ctx.fill()
                } else if (p.layer === 1) {
                    // Layer 1: Luminous Mote with glowing halo
                    const haloRadius = p.radius * 2.8
                    const grad = ctx.createRadialGradient(p.x, p.y, p.radius * 0.2, p.x, p.y, haloRadius)
                    grad.addColorStop(0, '#ffffff')
                    grad.addColorStop(0.3, p.color)
                    grad.addColorStop(1, `${p.color}00`)

                    ctx.fillStyle = grad
                    ctx.beginPath()
                    ctx.arc(p.x, p.y, haloRadius, 0, Math.PI * 2)
                    ctx.fill()
                } else {
                    // Layer 0: Fine Sharp Micro-Dust
                    ctx.fillStyle = p.color
                    ctx.shadowColor = p.color
                    ctx.shadowBlur = 4
                    ctx.beginPath()
                    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
                    ctx.fill()
                }

                ctx.restore()
            }

            animationFrameId = requestAnimationFrame(render)
        }

        animationFrameId = requestAnimationFrame(render)

        return () => {
            window.removeEventListener('resize', handleResize)
            window.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseleave', handleMouseLeave)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            cancelAnimationFrame(animationFrameId)
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
            className="pointer-events-none fixed inset-0 z-0 h-full w-full select-none"
            aria-hidden="true"
        />
    )
})

BokehDustDrift.displayName = 'BokehDustDrift'
