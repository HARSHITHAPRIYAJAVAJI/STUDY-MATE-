import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface TimerContextType {
    minutes: number
    seconds: number
    isActive: boolean
    isStarted: boolean
    isBreak: boolean
    initialMinutes: number
    sessionsToday: number
    totalFocusSecondsToday: number
    dayStreak: number
    toggle: () => void
    pause: () => void
    resume: () => void
    reset: () => void
    dismiss: () => void
    setDuration: (minutes: number) => void
    refreshStats: () => Promise<void>
}

const TimerContext = createContext<TimerContextType | undefined>(undefined)

// Simple Web Audio API bell chime for timer completion
function playChime() {
    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
        if (!AudioContextClass) return
        const ctx = new AudioContextClass()
        
        const now = ctx.currentTime
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        
        osc.type = 'sine'
        osc.frequency.setValueAtTime(587.33, now) // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15) // A5
        osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.35) // D6
        
        gain.gain.setValueAtTime(0.3, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2)
        
        osc.connect(gain)
        gain.connect(ctx.destination)
        
        osc.start(now)
        osc.stop(now + 1.2)
    } catch {
        // Ignore audio context errors if not allowed by browser autoplay
    }
}

export function TimerProvider({ children }: { children: ReactNode }) {
    const [initialMinutes, setInitialMinutes] = useState(15)
    const [minutes, setMinutes] = useState(15)
    const [seconds, setSeconds] = useState(0)
    const [isActive, setIsActive] = useState(false)
    const [isStarted, setIsStarted] = useState(false)
    const [isBreak, setIsBreak] = useState(false)

    const [sessionsToday, setSessionsToday] = useState(0)
    const [totalFocusSecondsToday, setTotalFocusSecondsToday] = useState(0)
    const [dayStreak, setDayStreak] = useState(1)

    // Tracks focus seconds elapsed since last DB save
    const pendingSecondsRef = useRef(0)

    // Fetch initial stats from Supabase
    const refreshStats = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const startOfToday = new Date()
            startOfToday.setHours(0, 0, 0, 0)

            // 1. Fetch today's study sessions
            const { data: todaySessions } = await supabase
                .from('study_sessions')
                .select('duration, created_at, subject')
                .eq('user_id', user.id)
                .gte('created_at', startOfToday.toISOString())

            const totalSeconds = todaySessions?.reduce((acc, curr) => acc + (curr.duration || 0), 0) || 0
            setTotalFocusSecondsToday(totalSeconds + pendingSecondsRef.current)

            // Count completed sessions today
            const completedCount = todaySessions?.filter(
                s => s.subject === 'Focus Session (Completed)' || (s.duration && s.duration >= 300)
            ).length || todaySessions?.length || 0
            setSessionsToday(completedCount)

            // 2. Fetch all sessions to compute streak
            const { data: allSessions } = await supabase
                .from('study_sessions')
                .select('created_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            if (allSessions && allSessions.length > 0) {
                const uniqueDates = new Set(
                    allSessions.map(s => {
                        const d = new Date(s.created_at)
                        return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
                    })
                )

                let streak = 0
                const today = new Date()
                const todayKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`

                const checkDate = new Date()
                if (uniqueDates.has(todayKey)) {
                    streak++
                    checkDate.setDate(checkDate.getDate() - 1)
                } else {
                    const yesterday = new Date()
                    yesterday.setDate(yesterday.getDate() - 1)
                    const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth() + 1}-${yesterday.getDate()}`
                    if (!uniqueDates.has(yesterdayKey)) {
                        setDayStreak(0)
                        return
                    }
                    checkDate.setDate(checkDate.getDate() - 1)
                }

                while (true) {
                    const dateKey = `${checkDate.getFullYear()}-${checkDate.getMonth() + 1}-${checkDate.getDate()}`
                    if (uniqueDates.has(dateKey)) {
                        streak++
                        checkDate.setDate(checkDate.getDate() - 1)
                    } else {
                        break
                    }
                }
                setDayStreak(Math.max(1, streak))
            } else {
                setDayStreak(1)
            }
        } catch (err) {
            console.error("Timer stats fetch error:", err)
        }
    }, [])

    useEffect(() => {
        refreshStats()
    }, [refreshStats])

    // Flush pending seconds to Supabase
    const flushPendingSeconds = useCallback(async (isCompleted = false) => {
        const secondsToSave = pendingSecondsRef.current
        if (secondsToSave <= 0) return

        pendingSecondsRef.current = 0

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { error: insertError } = await supabase.from('study_sessions').insert({
                user_id: user.id,
                duration: secondsToSave,
                subject: isCompleted ? 'Focus Session (Completed)' : 'Focus Session'
            })

            if (insertError) {
                console.warn("Study session save note:", insertError.message || insertError)
                return
            }

            await refreshStats()
        } catch (err) {
            console.warn("Failed to flush timer seconds:", err)
        }
    }, [refreshStats])

    // Listen for tab hide or close to flush pending study time
    useEffect(() => {
        const handleVisibilityOrUnload = () => {
            if (pendingSecondsRef.current > 0) {
                flushPendingSeconds(false)
            }
        }

        window.addEventListener('beforeunload', handleVisibilityOrUnload)
        document.addEventListener('visibilitychange', handleVisibilityOrUnload)

        return () => {
            window.removeEventListener('beforeunload', handleVisibilityOrUnload)
            document.removeEventListener('visibilitychange', handleVisibilityOrUnload)
        }
    }, [flushPendingSeconds])

    // Timer Interval logic
    useEffect(() => {
        let interval: any = null

        if (isActive) {
            interval = setInterval(() => {
                // Increment live focus counter if in focus mode
                if (!isBreak) {
                    pendingSecondsRef.current += 1
                    setTotalFocusSecondsToday(prev => prev + 1)

                    // Auto-flush every 30s to keep DB up-to-date
                    if (pendingSecondsRef.current >= 30) {
                        flushPendingSeconds(false)
                    }
                }

                setSeconds(prevSeconds => {
                    if (prevSeconds === 0) {
                        setMinutes(prevMinutes => {
                            if (prevMinutes === 0) {
                                // Timer Completed!
                                playChime()
                                setIsBreak(prevBreak => {
                                    const nextIsBreak = !prevBreak
                                    setIsActive(false)
                                    setIsStarted(false)

                                    if (!prevBreak) {
                                        // Completed a focus session!
                                        toast.success("Focus Session Complete! Take a well-deserved break 🎉")
                                        setSessionsToday(s => s + 1)
                                        flushPendingSeconds(true)
                                    } else {
                                        toast.info("Break ended! Ready to focus again?")
                                    }

                                    setMinutes(nextIsBreak ? 5 : initialMinutes)
                                    return nextIsBreak
                                })
                                return 0
                            }
                            return prevMinutes - 1
                        })
                        return 59
                    }
                    return prevSeconds - 1
                })
            }, 1000)
        }

        return () => {
            if (interval) clearInterval(interval)
        }
    }, [isActive, isBreak, initialMinutes, flushPendingSeconds])

    const toggle = () => {
        setIsActive(prev => {
            const next = !prev
            if (next) {
                setIsStarted(true)
            } else {
                flushPendingSeconds(false)
            }
            return next
        })
    }

    const pause = () => {
        setIsActive(false)
        flushPendingSeconds(false)
    }

    const resume = () => {
        setIsActive(true)
        setIsStarted(true)
    }

    const reset = () => {
        flushPendingSeconds(false)
        setIsActive(false)
        setIsStarted(false)
        setIsBreak(false)
        setMinutes(initialMinutes)
        setSeconds(0)
    }

    const dismiss = () => {
        flushPendingSeconds(false)
        setIsActive(false)
        setIsStarted(false)
    }

    const setDuration = (min: number) => {
        flushPendingSeconds(false)
        setInitialMinutes(min)
        setIsActive(false)
        setIsStarted(false)
        setIsBreak(false)
        setMinutes(min)
        setSeconds(0)
    }

    return (
        <TimerContext.Provider
            value={{
                minutes,
                seconds,
                isActive,
                isStarted,
                isBreak,
                initialMinutes,
                sessionsToday,
                totalFocusSecondsToday,
                dayStreak,
                toggle,
                pause,
                resume,
                reset,
                dismiss,
                setDuration,
                refreshStats
            }}
        >
            {children}
        </TimerContext.Provider>
    )
}

export function useTimer() {
    const context = useContext(TimerContext)
    if (context === undefined) {
        throw new Error('useTimer must be used within a TimerProvider')
    }
    return context
}
