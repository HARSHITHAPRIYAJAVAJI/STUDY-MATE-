import React, { memo } from 'react'
import { BokehDustDrift } from './BokehDustDrift'

/**
 * AmbientBackground
 * Combines minimal soft glowing ambient haze, subtle blue lines,
 * and the interactive Bokeh Dust Drift particle field (3 parallax layers with mouse repulsion).
 */
export const AmbientBackground: React.FC = memo(() => {
    return (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none" aria-hidden="true">
            {/* Interactive Bokeh Dust Drift (Particles, Glowing Motes, Defocused Discs) */}
            <BokehDustDrift />

            {/* Minimal Grid Layer with soft fading mask */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#3b82f608_1px,transparent_1px),linear-gradient(to_bottom,#3b82f608_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] opacity-50" />

            {/* Ambient Soft Blue Glowing Light Orbs */}
            <div className="absolute -top-32 -left-32 w-[550px] h-[550px] rounded-full bg-gradient-to-br from-blue-400/8 via-cyan-400/5 to-transparent blur-3xl animate-ambient-drift-1" />
            <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] rounded-full bg-gradient-to-bl from-indigo-400/8 via-sky-400/6 to-transparent blur-3xl animate-ambient-drift-2" />
            <div className="absolute -bottom-40 left-1/4 w-[650px] h-[650px] rounded-full bg-gradient-to-tr from-sky-400/7 via-blue-500/5 to-transparent blur-3xl animate-ambient-drift-3" />

            {/* Elegant Moving Blue Geometric & Flow Lines */}
            <svg
                className="absolute inset-0 w-full h-full opacity-40 mix-blend-multiply"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
                viewBox="0 0 1440 900"
            >
                <defs>
                    {/* Linear Gradients for Flowing Lines */}
                    <linearGradient id="blueLineGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
                        <stop offset="30%" stopColor="#60a5fa" stopOpacity="0.45" />
                        <stop offset="70%" stopColor="#3b82f6" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
                    </linearGradient>

                    <linearGradient id="blueLineGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#818cf8" stopOpacity="0" />
                        <stop offset="40%" stopColor="#38bdf8" stopOpacity="0.5" />
                        <stop offset="80%" stopColor="#60a5fa" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                    </linearGradient>

                    <linearGradient id="blueLineGrad3" x1="0%" y1="50%" x2="100%" y2="50%">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
                        <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Flowing Wave Line 1 */}
                <path
                    d="M-200,250 C300,120 700,420 1200,200 C1400,120 1600,280 1800,220"
                    fill="none"
                    stroke="url(#blueLineGrad1)"
                    strokeWidth="1.75"
                    strokeDasharray="16 12"
                    className="animate-flow-wave-1"
                />

                {/* Secondary Counter Wave Line */}
                <path
                    d="M-200,650 C250,800 650,500 1100,720 C1350,820 1550,680 1800,740"
                    fill="none"
                    stroke="url(#blueLineGrad2)"
                    strokeWidth="1.5"
                    strokeDasharray="20 16"
                    className="animate-flow-wave-2"
                />

                {/* Diagonal Ambient Light Stream */}
                <path
                    d="M-100,-100 L1600,1000"
                    fill="none"
                    stroke="url(#blueLineGrad3)"
                    strokeWidth="1.2"
                    strokeDasharray="40 120"
                    className="animate-stream-line"
                />

                {/* Subtle Horizontal Horizon Line */}
                <path
                    d="M-100,480 Q720,440 1600,480"
                    fill="none"
                    stroke="url(#blueLineGrad1)"
                    strokeWidth="1"
                    strokeDasharray="12 24"
                    className="animate-flow-wave-3 opacity-60"
                />
            </svg>

            {/* Delicate sweeping light shimmer beam */}
            <div className="absolute -inset-[100%] bg-gradient-to-tr from-transparent via-sky-400/[0.03] to-transparent transform -rotate-12 animate-light-beam" />
        </div>
    )
})

AmbientBackground.displayName = 'AmbientBackground'
