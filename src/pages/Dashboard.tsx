import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useNavigate } from 'react-router-dom'
import {
    FileText,
    Clock,
    Calendar,
    Upload,
    MessageSquare,
    CreditCard,
    ClipboardList,
    CalendarDays,
    Flame,
    ArrowRight,
    Activity,
    CheckCircle2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTimer } from '@/context/TimerContext'

export function Dashboard() {
    const navigate = useNavigate()
    const { dayStreak } = useTimer()
    const [userName, setUserName] = useState<string>(() => {
        try {
            const saved = localStorage.getItem('studymate_user_name')
            if (saved) return saved
            const tokenKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
            if (tokenKey) {
                const raw = localStorage.getItem(tokenKey)
                if (raw) {
                    const parsed = JSON.parse(raw)
                    const meta = parsed?.user?.user_metadata
                    let name = meta?.full_name || meta?.name || ''
                    if (name && name === name.toUpperCase()) {
                        name = name.toLowerCase().split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
                    }
                    return name
                }
            }
        } catch {}
        return ''
    })
    const [statsData, setStatsData] = useState({
        documents: 0,
        studyTime: 0, // in minutes
        weekSessions: 0,
        flashcardCount: 0,
        quizCount: 0,
        recentActivity: [] as any[]
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Get user full name or display name
            let name = user.user_metadata?.full_name || user.user_metadata?.name || ''
            if (!name) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', user.id)
                    .maybeSingle()
                if (profile?.full_name) {
                    name = profile.full_name
                }
            }
            if (name) {
                // Format nicely if in ALL CAPS
                if (name === name.toUpperCase()) {
                    name = name.toLowerCase().split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
                }
                setUserName(name)
                try {
                    localStorage.setItem('studymate_user_name', name)
                } catch {}
            }

            const startOfToday = new Date()
            startOfToday.setHours(0, 0, 0, 0)

            const sevenDaysAgo = new Date()
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

            // Fetch all metrics in parallel for maximum speed
            const [
                { count: docCount },
                { data: todaySessions },
                { data: weekSessions },
                { count: cardCount },
                { count: quizCount },
                { data: recent }
            ] = await Promise.all([
                supabase.from('documents').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                supabase.from('study_sessions').select('duration').eq('user_id', user.id).gte('created_at', startOfToday.toISOString()),
                supabase.from('study_sessions').select('duration').eq('user_id', user.id).gte('created_at', sevenDaysAgo.toISOString()),
                supabase.from('flashcards').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                supabase.from('quizzes').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                supabase.from('study_sessions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5)
            ])

            const todaySeconds = todaySessions?.reduce((acc, curr) => acc + (curr.duration || 0), 0) || 0
            const totalWeekSeconds = weekSessions?.reduce((acc, curr) => acc + (curr.duration || 0), 0) || 0
            const totalWeekHours = (totalWeekSeconds / 3600).toFixed(1)

            const formatActivityDuration = (sec: number) => {
                if (!sec || sec < 60) return `${sec || 0}s`
                return `${Math.round(sec / 60)}m`
            }

            setStatsData({
                documents: docCount || 0,
                studyTime: Math.floor(todaySeconds / 60),
                weekSessions: parseFloat(totalWeekHours),
                flashcardCount: cardCount || 0,
                quizCount: quizCount || 0,
                recentActivity: recent?.map(s => ({
                    title: s.subject || 'Focus Session',
                    time: new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ` (${formatActivityDuration(s.duration)})`
                })) || []
            })

        } catch (error) {
            console.error('Error loading dashboard:', error)
        } finally {
            setLoading(false)
        }
    }

    const quickActions = [
        {
            title: 'Upload Document',
            description: 'Add new study materials & notes',
            icon: Upload,
            href: '/library',
        },
        {
            title: 'AI Chat Tutor',
            description: 'Ask deep questions about your documents',
            icon: MessageSquare,
            href: '/study',
        },
        {
            title: 'Review Flashcards',
            description: 'Master concepts with spaced repetition',
            icon: CreditCard,
            href: '/flashcards',
        },
        {
            title: 'Take AI Quiz',
            description: 'Generate instant MCQ practice tests',
            icon: ClipboardList,
            href: '/quizzes',
        },
        {
            title: 'Focus Timer',
            description: 'Pomodoro intervals & live tracking',
            icon: Clock,
            href: '/timer',
        },
        {
            title: 'Study Planner',
            description: 'Organize milestones & schedules',
            icon: CalendarDays,
            href: '/planner',
        },
    ]

    const recentActivity = statsData.recentActivity

    // Focus Progress percentage (Daily 60m target)
    const dailyTargetPercent = Math.min(100, Math.round((statsData.studyTime / 60) * 100))

    return (
        <div className="relative space-y-5 animate-fade-in max-w-[1400px] mx-auto pb-8 overflow-hidden pt-0">
            {/* Ambient Moving Gradient Blobs on Left & Right */}
            <div className="absolute -left-32 top-10 w-96 h-96 rounded-full bg-[#603DD9]/10 blur-3xl pointer-events-none animate-float-slow -z-10" />
            <div className="absolute -right-32 top-40 w-96 h-96 rounded-full bg-[#9E4CEC]/15 blur-3xl pointer-events-none animate-float-reverse -z-10" />
            <div className="absolute left-1/3 bottom-10 w-80 h-80 rounded-full bg-[#603DD9]/8 blur-3xl pointer-events-none animate-pulse-glow -z-10" />

            {/* Top Hero Banner with Simple Floating Animations */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#603DD9] via-[#7B42E2] to-[#9E4CEC] p-7 sm:p-10 text-white shadow-xl shadow-[#603DD9]/25">
                {/* Moving Ambient Glow Inside Banner */}
                <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/15 blur-2xl pointer-events-none animate-float-slow" />
                <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-[#9E4CEC]/30 blur-2xl pointer-events-none animate-float-reverse" />
                <div className="absolute top-1/2 right-1/4 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none animate-pulse-glow" />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-3 max-w-2xl">
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-white drop-shadow-sm">
                            Welcome back{userName ? `, ${userName}` : ''}!
                        </h1>
                        <p className="text-white/90 text-sm sm:text-base leading-relaxed font-medium">
                            Track your focus streaks, master your study materials, and generate AI insights in one unified workspace.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 self-start lg:self-auto">
                        <Button
                            onClick={() => navigate('/study')}
                            className="bg-white text-[#603DD9] hover:bg-white/95 font-black px-5 py-3 rounded-2xl shadow-lg shadow-black/10 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 border-0 text-sm"
                        >
                            <MessageSquare className="w-4 h-4 text-[#603DD9]" />
                            Open AI Tutor
                        </Button>
                        <Button
                            onClick={() => navigate('/timer')}
                            variant="outline"
                            className="bg-white/10 hover:bg-white/20 text-white border-white/30 font-bold px-4 py-3 rounded-2xl backdrop-blur-sm transition-all text-sm"
                        >
                            <Clock className="w-4 h-4 mr-1.5" />
                            Timer
                        </Button>
                    </div>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* 6 METRIC CARDS FIT IN ONE SINGLE LINE */}
            {/* ========================================================================= */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5">
                {/* 1. DOCUMENTS VAULT CARD */}
                <div
                    onClick={() => navigate('/library')}
                    className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-100/90 shadow-xs hover:border-[#603DD9]/30 hover:shadow-lg hover:shadow-[#603DD9]/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative overflow-hidden flex flex-col justify-between"
                >
                    {/* Top hover gradient line */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#603DD9] to-[#9E4CEC] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className="space-y-2.5">
                        {/* Header Badge & Icon */}
                        <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 truncate">
                                Vault
                            </span>
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#603DD9] to-[#9E4CEC] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform duration-300 flex-shrink-0">
                                <FileText className="w-4 h-4 stroke-[2.2]" />
                            </div>
                        </div>

                        {/* Metric Value */}
                        <div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                                    {loading ? '-' : statsData.documents}
                                </span>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide truncate">
                                    Docs
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5 font-medium">
                                Uploaded notes
                            </p>
                        </div>
                    </div>

                    {/* Footer Graphic & Link */}
                    <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-[#603DD9]">
                        <span className="text-[10px] text-slate-500 font-medium truncate">
                            AI Ready
                        </span>
                        <span className="flex items-center gap-0.5 group-hover:translate-x-1 transition-transform flex-shrink-0">
                            Library <ArrowRight className="w-2.5 h-2.5" />
                        </span>
                    </div>
                </div>

                {/* 2. TODAY'S STUDY FOCUS CARD */}
                <div
                    onClick={() => navigate('/timer')}
                    className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-100/90 shadow-xs hover:border-[#603DD9]/30 hover:shadow-lg hover:shadow-[#603DD9]/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative overflow-hidden flex flex-col justify-between"
                >
                    {/* Top hover gradient line */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#603DD9] via-[#7B42E2] to-[#9E4CEC] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className="space-y-2.5">
                        {/* Header Badge & Icon */}
                        <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 group-hover:text-[#603DD9] transition-colors truncate">
                                Today
                            </span>
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#603DD9] to-[#9E4CEC] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform duration-300 flex-shrink-0">
                                <Clock className="w-4 h-4 stroke-[2.2]" />
                            </div>
                        </div>

                        {/* Metric Value */}
                        <div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl sm:text-2xl font-black bg-gradient-to-r from-[#603DD9] to-[#9E4CEC] bg-clip-text text-transparent tracking-tight font-mono">
                                    {loading ? '-' : `${statsData.studyTime}m`}
                                </span>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide truncate">
                                    Focus
                                </span>
                            </div>

                            {/* Mini Daily Progress Bar */}
                            <div className="mt-1.5 space-y-0.5">
                                <div className="flex justify-between text-[9px] font-bold text-slate-400">
                                    <span>Goal 60m</span>
                                    <span className="text-[#603DD9]">{dailyTargetPercent}%</span>
                                </div>
                                <div className="h-1 rounded-full bg-slate-100 overflow-hidden shadow-inner">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-[#603DD9] to-[#9E4CEC] transition-all duration-500"
                                        style={{ width: `${dailyTargetPercent}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Graphic & Link */}
                    <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-[#603DD9]">
                        <span className="text-[10px] text-slate-500 font-medium truncate">
                            {dailyTargetPercent >= 100 ? 'Goal Done 🎯' : `${Math.max(0, 60 - statsData.studyTime)}m left`}
                        </span>
                        <span className="flex items-center gap-0.5 group-hover:translate-x-1 transition-transform flex-shrink-0">
                            Timer <ArrowRight className="w-2.5 h-2.5" />
                        </span>
                    </div>
                </div>

                {/* 3. WEEKLY STUDY VOLUME CARD */}
                <div
                    onClick={() => navigate('/timer')}
                    className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-100/90 shadow-xs hover:border-[#603DD9]/30 hover:shadow-lg hover:shadow-[#603DD9]/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative overflow-hidden flex flex-col justify-between"
                >
                    {/* Top hover gradient line */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#603DD9] to-[#9E4CEC] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className="space-y-2.5">
                        {/* Header Badge & Icon */}
                        <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 truncate">
                                Weekly
                            </span>
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#603DD9] to-[#9E4CEC] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform duration-300 flex-shrink-0">
                                <Calendar className="w-4 h-4 stroke-[2.2]" />
                            </div>
                        </div>

                        {/* Metric Value */}
                        <div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                                    {loading ? '-' : `${statsData.weekSessions}h`}
                                </span>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide truncate">
                                    7 Days
                                </span>
                            </div>

                            {/* Mini 7-Day Sparkline Bar Visualization */}
                            <div className="mt-1.5 flex items-end gap-1 h-3.5">
                                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((_day, idx) => {
                                    const isTodayIdx = idx === ((new Date().getDay() + 6) % 7)
                                    const heights = ['h-1.5', 'h-2.5', 'h-3', 'h-2', 'h-3.5', 'h-2.5', 'h-3']
                                    return (
                                        <div key={idx} className="flex-1 flex flex-col items-center">
                                            <div
                                                className={`w-full rounded-t-xs transition-all duration-300 ${
                                                    isTodayIdx
                                                        ? 'bg-gradient-to-t from-[#603DD9] to-[#9E4CEC] h-3.5 shadow-xs'
                                                        : `bg-slate-200 ${heights[idx]}`
                                                }`}
                                            />
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Footer Graphic & Link */}
                    <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-[#603DD9]">
                        <span className="text-[10px] text-slate-500 font-medium truncate">
                            Active
                        </span>
                        <span className="flex items-center gap-0.5 group-hover:translate-x-1 transition-transform flex-shrink-0">
                            Stats <ArrowRight className="w-2.5 h-2.5" />
                        </span>
                    </div>
                </div>

                {/* 4. SMART FLASHCARDS CARD */}
                <div
                    onClick={() => navigate('/flashcards')}
                    className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-100/90 shadow-xs hover:border-[#603DD9]/30 hover:shadow-lg hover:shadow-[#603DD9]/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative overflow-hidden flex flex-col justify-between"
                >
                    {/* Top hover gradient line */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#603DD9] to-[#9E4CEC] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className="space-y-2.5">
                        {/* Header Badge & Icon */}
                        <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 truncate">
                                Cards
                            </span>
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#603DD9] to-[#9E4CEC] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform duration-300 flex-shrink-0">
                                <CreditCard className="w-4 h-4 stroke-[2.2]" />
                            </div>
                        </div>

                        {/* Metric Value */}
                        <div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                                    {loading ? '-' : statsData.flashcardCount}
                                </span>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide truncate">
                                    Cards
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5 font-medium">
                                Spaced Review
                            </p>
                        </div>
                    </div>

                    {/* Footer Graphic & Link */}
                    <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-[#603DD9]">
                        <span className="text-[10px] text-slate-500 font-medium truncate">
                            Ready
                        </span>
                        <span className="flex items-center gap-0.5 group-hover:translate-x-1 transition-transform flex-shrink-0">
                            Practice <ArrowRight className="w-2.5 h-2.5" />
                        </span>
                    </div>
                </div>

                {/* 5. AI QUIZZES TAKEN CARD */}
                <div
                    onClick={() => navigate('/quizzes')}
                    className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-100/90 shadow-xs hover:border-[#603DD9]/30 hover:shadow-lg hover:shadow-[#603DD9]/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative overflow-hidden flex flex-col justify-between"
                >
                    {/* Top hover gradient line */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#603DD9] to-[#9E4CEC] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className="space-y-2.5">
                        {/* Header Badge & Icon */}
                        <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 truncate">
                                Quizzes
                            </span>
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#603DD9] to-[#9E4CEC] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform duration-300 flex-shrink-0">
                                <ClipboardList className="w-4 h-4 stroke-[2.2]" />
                            </div>
                        </div>

                        {/* Metric Value */}
                        <div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                                    {loading ? '-' : statsData.quizCount}
                                </span>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide truncate">
                                    Taken
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5 font-medium">
                                Instant Practice
                            </p>
                        </div>
                    </div>

                    {/* Footer Graphic & Link */}
                    <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-[#603DD9]">
                        <span className="text-[10px] text-slate-500 font-medium truncate">
                            AI MCQs
                        </span>
                        <span className="flex items-center gap-0.5 group-hover:translate-x-1 transition-transform flex-shrink-0">
                            Quiz <ArrowRight className="w-2.5 h-2.5" />
                        </span>
                    </div>
                </div>

                {/* 6. FOCUS STREAK CARD */}
                <div
                    onClick={() => navigate('/timer')}
                    className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-100/90 shadow-xs hover:border-orange-400/30 hover:shadow-lg hover:shadow-orange-500/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative overflow-hidden flex flex-col justify-between"
                >
                    {/* Top hover gradient line */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 via-amber-500 to-[#9E4CEC] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className="space-y-2.5">
                        {/* Header Badge & Icon */}
                        <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 group-hover:text-orange-600 transition-colors truncate">
                                Streak
                            </span>
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-[#9E4CEC] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform duration-300 flex-shrink-0">
                                <Flame className="w-4 h-4 fill-white stroke-[2.2]" />
                            </div>
                        </div>

                        {/* Metric Value */}
                        <div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl sm:text-2xl font-black bg-gradient-to-r from-orange-500 to-[#9E4CEC] bg-clip-text text-transparent tracking-tight">
                                    {dayStreak}
                                </span>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide truncate">
                                    {dayStreak === 1 ? 'Day' : 'Days'}
                                </span>
                            </div>

                            {/* 5-Day Streak Flame Dots */}
                            <div className="mt-1.5 flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((d) => (
                                    <div
                                        key={d}
                                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                                            d <= Math.min(dayStreak, 5)
                                                ? 'bg-gradient-to-r from-orange-500 to-[#9E4CEC] shadow-xs'
                                                : 'bg-slate-100'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer Graphic & Link */}
                    <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-orange-600">
                        <span className="text-[10px] text-slate-500 font-medium truncate">
                            Active
                        </span>
                        <span className="flex items-center gap-0.5 group-hover:translate-x-1 transition-transform flex-shrink-0">
                            Timer <ArrowRight className="w-2.5 h-2.5" />
                        </span>
                    </div>
                </div>
            </div>

            {/* Quick Actions Section */}
            <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-slate-900">Quick Actions</h2>
                        <p className="text-xs text-slate-500 font-medium">Jump straight into your daily study routines</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                    {quickActions.map((action, index) => (
                        <Card
                            key={index}
                            className="bg-white border border-slate-100/90 rounded-2xl hover:border-[#603DD9]/40 hover:shadow-lg hover:shadow-[#603DD9]/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
                            onClick={() => navigate(action.href)}
                        >
                            <CardContent className="p-5">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#603DD9]/10 to-[#9E4CEC]/15 text-[#603DD9] group-hover:from-[#603DD9] group-hover:to-[#9E4CEC] group-hover:text-white flex items-center justify-center flex-shrink-0 transition-all duration-300 shadow-sm border border-[#603DD9]/10">
                                        <action.icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-sm text-slate-900 group-hover:text-[#603DD9] transition-colors">
                                            {action.title}
                                        </h3>
                                        <p className="text-xs text-slate-500 truncate mt-0.5">{action.description}</p>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-[#603DD9]/10 flex items-center justify-center transition-colors flex-shrink-0">
                                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#603DD9] group-hover:translate-x-0.5 transition-all" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Bottom 3-Column Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
                {/* 1. Study Streak Card */}
                <Card className="bg-white border border-slate-100/90 rounded-3xl shadow-sm overflow-hidden flex flex-col hover:shadow-lg transition-all duration-300">
                    <CardHeader className="pb-3 border-b border-slate-100/80 bg-gradient-to-r from-slate-50/50 to-white">
                        <CardTitle className="flex items-center gap-2.5 text-slate-900 text-base font-bold">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#603DD9]/10 to-[#9E4CEC]/15 text-[#603DD9] flex items-center justify-center">
                                <Flame className="w-4 h-4 fill-orange-500 text-orange-500" />
                            </div>
                            Study Streak
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 flex-1 flex flex-col justify-between text-center">
                        <div className="py-4">
                            <div className="text-6xl font-black bg-gradient-to-r from-[#603DD9] via-[#7B42E2] to-[#9E4CEC] bg-clip-text text-transparent">
                                {dayStreak}
                            </div>
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-1.5">
                                {dayStreak === 1 ? 'Day Streak' : 'Days Streak'}
                            </p>
                        </div>
                        <div className="bg-[#603DD9]/5 border border-[#603DD9]/15 rounded-2xl p-3.5 text-xs text-slate-600 flex items-center justify-center gap-2 font-medium">
                            <CheckCircle2 className="w-4 h-4 text-[#603DD9] flex-shrink-0" />
                            <span>Study daily to keep your momentum glowing!</span>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Quick Flashcards / Review Card */}
                <Card className="bg-white border border-slate-100/90 rounded-3xl shadow-sm overflow-hidden flex flex-col hover:shadow-lg transition-all duration-300">
                    <CardHeader className="pb-3 border-b border-slate-100/80 bg-gradient-to-r from-slate-50/50 to-white">
                        <CardTitle className="flex items-center gap-2.5 text-slate-900 text-base font-bold">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#603DD9]/10 to-[#9E4CEC]/15 text-[#603DD9] flex items-center justify-center">
                                <CreditCard className="w-4 h-4" />
                            </div>
                            Smart Flashcards
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 flex-1 flex flex-col justify-between text-center">
                        <div className="py-4">
                            <div className="text-6xl font-black bg-gradient-to-r from-[#603DD9] via-[#7B42E2] to-[#9E4CEC] bg-clip-text text-transparent">
                                {statsData.flashcardCount}
                            </div>
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-1.5">
                                Total Cards Ready
                            </p>
                        </div>
                        <Button
                            onClick={() => navigate('/flashcards')}
                            className="w-full bg-gradient-to-r from-[#603DD9] to-[#9E4CEC] hover:opacity-95 text-white font-black h-12 rounded-2xl shadow-md shadow-[#603DD9]/20 transition-all hover:scale-[1.02] active:scale-[0.98] border-0 flex items-center justify-center gap-2"
                        >
                            Start Review Session
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </CardContent>
                </Card>

                {/* 3. Recent Activity */}
                <Card className="bg-white border border-slate-100/90 rounded-3xl shadow-sm overflow-hidden flex flex-col hover:shadow-lg transition-all duration-300">
                    <CardHeader className="pb-3 border-b border-slate-100/80 bg-gradient-to-r from-slate-50/50 to-white">
                        <CardTitle className="flex items-center gap-2.5 text-slate-900 text-base font-bold">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#603DD9]/10 to-[#9E4CEC]/15 text-[#603DD9] flex items-center justify-center">
                                <Clock className="w-4 h-4" />
                            </div>
                            Recent Activity
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 flex-1 flex flex-col justify-center">
                        {recentActivity.length > 0 ? (
                            <div className="space-y-3.5">
                                {recentActivity.map((activity, index) => (
                                    <div key={index} className="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                                        <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-[#603DD9] to-[#9E4CEC] mt-1.5 flex-shrink-0 shadow-sm shadow-[#603DD9]/30" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-900 truncate">{activity.title}</p>
                                            <p className="text-[11px] text-slate-500 font-medium">{activity.time}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6">
                                <div className="w-12 h-12 rounded-2xl bg-[#603DD9]/5 text-[#603DD9] flex items-center justify-center mx-auto mb-2.5">
                                    <Activity className="w-6 h-6 opacity-60" />
                                </div>
                                <p className="text-xs font-bold text-slate-800">No Recent Activity</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">Start a focus timer to log your sessions</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
