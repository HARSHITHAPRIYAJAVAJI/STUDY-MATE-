import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTimer } from '@/context/TimerContext'
import { Play, Pause, RotateCcw, X, GripHorizontal, Coffee, Brain, Maximize2 } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

export function FloatingTimer() {
    const { minutes, seconds, isActive, isStarted, isBreak, initialMinutes, pause, resume, reset, dismiss } = useTimer()
    const location = useLocation()
    const navigate = useNavigate()
    const [position, setPosition] = useState({ x: window.innerWidth - 240, y: window.innerHeight - 170 })
    const [isDragging, setIsDragging] = useState(false)
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

    // Drag Effect
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                const newX = Math.min(Math.max(12, e.clientX - dragOffset.x), window.innerWidth - 230)
                const newY = Math.min(Math.max(12, e.clientY - dragOffset.y), window.innerHeight - 160)
                setPosition({ x: newX, y: newY })
            }
        }
        const handleMouseUp = () => setIsDragging(false)

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }
    }, [isDragging, dragOffset])

    // Hide on the actual Timer page or if timer has not been started
    if (location.pathname === '/timer' || (!isActive && !isStarted)) return null

    // Drag Start
    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true)
        setDragOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        })
    }

    const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

    // Calculate percentage elapsed
    const totalSeconds = (isBreak ? 5 : initialMinutes) * 60
    const remainingSeconds = minutes * 60 + seconds
    const progressPercent = Math.max(0, Math.min(100, ((totalSeconds - remainingSeconds) / totalSeconds) * 100))

    return createPortal(
        <div
            className="fixed z-[100] bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl shadow-slate-900/20 border border-slate-200/90 w-56 overflow-hidden select-none transition-shadow hover:shadow-indigo-500/10"
            style={{ left: position.x, top: position.y }}
        >
            {/* Header / Drag Bar */}
            <div
                className={`h-7 px-2.5 flex items-center justify-between cursor-grab active:cursor-grabbing transition-colors ${
                    isBreak
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                }`}
                onMouseDown={handleMouseDown}
            >
                <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide">
                    {isBreak ? (
                        <>
                            <Coffee className="w-3.5 h-3.5" />
                            <span>Break Time</span>
                        </>
                    ) : (
                        <>
                            <Brain className="w-3.5 h-3.5" />
                            <span>Focus Session</span>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            navigate('/timer')
                        }}
                        title="Expand to Fullscreen Timer"
                        className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/20 transition-colors text-white/80 hover:text-white"
                    >
                        <Maximize2 className="w-3 h-3" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            dismiss()
                        }}
                        title="Close Floating Widget"
                        className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/20 transition-colors text-white/80 hover:text-white"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 h-1 overflow-hidden">
                <div
                    className={`h-full transition-all duration-300 ${
                        isBreak ? 'bg-amber-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                />
            </div>

            {/* Timer Body */}
            <div className="p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-2xl font-black font-mono tracking-tight text-slate-800 leading-none">
                            {formattedTime}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                            <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                    isActive
                                        ? 'bg-emerald-500 animate-pulse'
                                        : 'bg-amber-400'
                                }`}
                            />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                {isActive ? 'Running' : 'Paused'}
                            </span>
                        </div>
                    </div>

                    {/* Quick Grip Indicator */}
                    <div
                        className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing p-1"
                        onMouseDown={handleMouseDown}
                        title="Drag to reposition"
                    >
                        <GripHorizontal className="w-4 h-4" />
                    </div>
                </div>

                {/* Action Buttons: Pause / Resume + Reset */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                    {isActive ? (
                        <button
                            type="button"
                            onClick={pause}
                            className="flex-1 h-9 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200/80 text-amber-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                        >
                            <Pause className="w-3.5 h-3.5 fill-current" />
                            Pause
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={resume}
                            className="flex-1 h-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 text-emerald-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                        >
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                            Resume
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={reset}
                        title="Reset Timer"
                        className="h-9 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 font-medium text-xs flex items-center justify-center gap-1 transition-all active:scale-[0.98]"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

