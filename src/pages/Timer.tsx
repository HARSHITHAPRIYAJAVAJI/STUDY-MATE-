import { useTimer } from '@/context/TimerContext'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Play, Pause, RotateCcw, Coffee, CheckCircle2, Flame, Clock, Brain } from 'lucide-react'

function formatFocusDuration(totalSec: number) {
    if (totalSec < 60) return `${totalSec}s`
    const hours = Math.floor(totalSec / 3600)
    const mins = Math.floor((totalSec % 3600) / 60)
    const secs = totalSec % 60
    if (hours > 0) {
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
    }
    if (mins < 5 && secs > 0) {
        return `${mins}m ${secs}s`
    }
    return `${mins}m`
}

export function Timer() {
    const {
        minutes,
        seconds,
        isActive,
        isBreak,
        initialMinutes,
        sessionsToday,
        totalFocusSecondsToday,
        dayStreak,
        toggle,
        reset,
        setDuration
    } = useTimer()

    // Calculate progress percentage
    const totalDurationSeconds = (isBreak ? 5 : initialMinutes) * 60
    const remainingSeconds = minutes * 60 + seconds
    const elapsedPercent = Math.max(0, Math.min(100, ((totalDurationSeconds - remainingSeconds) / totalDurationSeconds) * 100))

    return (
        <div className="space-y-3.5 animate-fade-in max-w-4xl mx-auto pt-0">
            {/* Header */}
            <div className="text-center space-y-1 pt-0">
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#603DD9] via-[#7B42E2] to-[#9E4CEC] bg-clip-text text-transparent tracking-tight">
                    Study Focus Timer
                </h1>
                <p className="text-slate-500 max-w-lg mx-auto text-xs font-normal">
                    Boost retention with structured Pomodoro focus blocks and track your real-time daily stats.
                </p>
            </div>

            {/* Timer Hero Card - Compact */}
            <div className="max-w-md sm:max-w-lg mx-auto">
                <Card className={`border shadow-lg rounded-3xl overflow-hidden backdrop-blur-sm transition-all duration-300 ${
                    isBreak
                        ? 'bg-white border-amber-200/90 shadow-amber-500/5'
                        : 'bg-white border-purple-100 shadow-purple-500/5'
                }`}>
                    <CardContent className="p-5 sm:p-6">
                        <div className="text-center space-y-4">
                            {/* Mode Pill Badge */}
                            <div>
                                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shadow-xs border ${
                                    isBreak
                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                        : 'bg-purple-50 text-[#603DD9] border-purple-100'
                                }`}>
                                    {isBreak ? (
                                        <>
                                            <Coffee className="w-3.5 h-3.5 text-amber-600 animate-bounce" />
                                            <span>Short Break</span>
                                        </>
                                    ) : (
                                        <>
                                            <Brain className="w-3.5 h-3.5 text-[#603DD9] animate-pulse" />
                                            <span>Deep Focus</span>
                                        </>
                                    )}
                                </div>

                                {/* Main Digital Timer Display */}
                                <div className="text-6xl sm:text-7xl font-bold font-mono tracking-tight text-slate-900 my-2 select-none">
                                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                                </div>

                                {/* Progress Bar */}
                                <div className="w-52 sm:w-60 mx-auto bg-slate-100 h-2 rounded-full overflow-hidden shadow-inner mt-1.5">
                                    <div
                                        className={`h-full transition-all duration-300 rounded-full ${
                                            isBreak
                                                ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                                                : 'bg-gradient-to-r from-[#603DD9] via-[#7B42E2] to-[#9E4CEC]'
                                        }`}
                                        style={{ width: `${elapsedPercent}%` }}
                                    />
                                </div>

                                <p className="text-slate-500 text-xs mt-2 font-normal">
                                    {isBreak
                                        ? 'Take a short break, stretch, and hydrate.'
                                        : 'Block out distractions and focus deeply on your study material.'}
                                </p>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center justify-center gap-2.5">
                                <Button
                                    size="lg"
                                    onClick={toggle}
                                    className={`w-32 h-10 rounded-xl gap-2 font-semibold text-xs shadow-md transition-all hover:scale-105 active:scale-95 ${
                                        isActive
                                            ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/25'
                                            : 'bg-gradient-to-r from-[#603DD9] to-[#9E4CEC] hover:opacity-95 text-white shadow-[#603DD9]/25'
                                    }`}
                                >
                                    {isActive ? (
                                        <>
                                            <Pause className="w-4 h-4 fill-current" />
                                            Pause
                                        </>
                                    ) : (
                                        <>
                                            <Play className="w-4 h-4 fill-current ml-0.5" />
                                            Start Focus
                                        </>
                                    )}
                                </Button>
                                <Button
                                    size="lg"
                                    variant="outline"
                                    onClick={reset}
                                    className="w-24 h-10 rounded-xl gap-1.5 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-semibold text-xs shadow-xs"
                                >
                                    <RotateCcw className="w-3.5 h-3.5 text-[#603DD9]" />
                                    Reset
                                </Button>
                            </div>

                            {/* Preset Durations */}
                            <div className="pt-3.5 border-t border-slate-100">
                                <p className="text-[11px] font-semibold text-slate-500 mb-2">
                                    Duration Presets
                                </p>
                                <div className="flex gap-2 justify-center flex-wrap">
                                    {[15, 25, 45, 60].map((min) => (
                                        <button
                                            key={min}
                                            type="button"
                                            onClick={() => setDuration(min)}
                                            className={`px-3 py-1 rounded-xl text-xs font-medium transition-all shadow-xs ${
                                                initialMinutes === min && !isBreak
                                                    ? 'bg-[#603DD9] text-white shadow-md shadow-[#603DD9]/20 scale-105 font-semibold'
                                                    : 'bg-slate-50 text-slate-600 border border-slate-200/80 hover:border-[#603DD9]/40 hover:bg-purple-50/30'
                                            }`}
                                        >
                                            {min} min
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Real-time Live Stats - Compact */}
            <div className="max-w-md sm:max-w-lg mx-auto grid grid-cols-3 gap-2.5 sm:gap-3">
                {/* 1. Sessions Today */}
                <Card className="border border-purple-100 shadow-sm rounded-2xl overflow-hidden bg-white/95 backdrop-blur-sm transition-all hover:shadow-md">
                    <CardContent className="p-3 text-center space-y-1">
                        <div className="w-8 h-8 mx-auto rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#603DD9] shadow-xs mb-1">
                            <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
                            {sessionsToday}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500">
                            Sessions Today
                        </div>
                        <p className="text-[9px] text-slate-400 font-normal truncate">
                            {sessionsToday >= 4 ? 'Goal Achieved! 🎯' : `${Math.max(0, 4 - sessionsToday)} to goal`}
                        </p>
                    </CardContent>
                </Card>

                {/* 2. Total Focus Time */}
                <Card className="border border-purple-100 shadow-sm rounded-2xl overflow-hidden bg-white/95 backdrop-blur-sm transition-all hover:shadow-md">
                    <CardContent className="p-3 text-center space-y-1">
                        <div className="w-8 h-8 mx-auto rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#603DD9] shadow-xs mb-1">
                            <Clock className="w-4 h-4" />
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-[#603DD9] tracking-tight font-mono">
                            {formatFocusDuration(totalFocusSecondsToday)}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500">
                            Total Focus Time
                        </div>
                        <p className="text-[9px] text-slate-400 font-normal flex items-center justify-center gap-1">
                            {isActive && !isBreak && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                            )}
                            {isActive && !isBreak ? 'Counting live' : 'Recorded today'}
                        </p>
                    </CardContent>
                </Card>

                {/* 3. Day Streak */}
                <Card className="border border-purple-100 shadow-sm rounded-2xl overflow-hidden bg-white/95 backdrop-blur-sm transition-all hover:shadow-md">
                    <CardContent className="p-3 text-center space-y-1">
                        <div className="w-8 h-8 mx-auto rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 shadow-xs mb-1">
                            <Flame className="w-4 h-4 animate-pulse" />
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-amber-600 tracking-tight">
                            {dayStreak} {dayStreak === 1 ? 'Day' : 'Days'}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500">
                            Day Streak
                        </div>
                        <p className="text-[9px] text-slate-400 font-normal">
                            Keep going! 🔥
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
