import { useState, useEffect, useRef } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
    Clock,
    User,
    LogOut,
    MessageSquare,
    BookOpen,
    CreditCard,
    ClipboardList,
    LayoutDashboard,
    Calendar,
    Users,
    Menu,
    X,
    ChevronDown,
    Flame,
    Sparkles,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTimer } from '@/context/TimerContext'
import { toast } from 'sonner'

const navLinks = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Library', href: '/library', icon: BookOpen },
    { name: 'AI Tutor', href: '/study', icon: MessageSquare },
    { name: 'Flashcards', href: '/flashcards', icon: CreditCard },
    { name: 'Quizzes', href: '/quizzes', icon: ClipboardList },
    { name: 'Timer', href: '/timer', icon: Clock },
    { name: 'Planner', href: '/planner', icon: Calendar },
    { name: 'Collaborate', href: '/collaborate', icon: Users },
]

export function Navbar() {
    const navigate = useNavigate()
    const location = useLocation()
    const { dayStreak } = useTimer()
    const [userEmail, setUserEmail] = useState<string>(() => {
        try {
            const tokenKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
            if (tokenKey) {
                const parsed = JSON.parse(localStorage.getItem(tokenKey) || '')
                return parsed?.user?.email || ''
            }
        } catch {}
        return ''
    })
    const [userName, setUserName] = useState<string>(() => {
        try {
            const saved = localStorage.getItem('studymate_user_name')
            if (saved) return saved
            const tokenKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
            if (tokenKey) {
                const parsed = JSON.parse(localStorage.getItem(tokenKey) || '')
                return parsed?.user?.user_metadata?.full_name || parsed?.user?.email?.split('@')[0] || ''
            }
        } catch {}
        return ''
    })
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                setUserEmail(user.email || '')
                const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Student'
                setUserName(name)
            }
        })
    }, [])

    // Close menus on route change or outside click
    useEffect(() => {
        setMobileMenuOpen(false)
        setProfileDropdownOpen(false)
    }, [location.pathname])

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setProfileDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut()
            toast.success('Logged out successfully')
            navigate('/auth')
        } catch (error: any) {
            toast.error(error.message || 'Logout failed')
        }
    }

    // Format display name to be neat, e.g. "Harshitha" instead of "JAVAJI HARSHITHA PRIYA"
    const getShortName = (name: string) => {
        if (!name) return 'Student'
        const parts = name.trim().split(/\s+/)
        const first = parts[0]
        return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
    }

    return (
        <header className="sticky top-0 z-40 bg-white/80 hover:bg-white/98 backdrop-blur-xl hover:backdrop-blur-3xl border-b border-purple-100/60 hover:border-purple-200/80 shadow-xs hover:shadow-lg hover:shadow-[#603DD9]/5 transition-all duration-500 w-full group/navbar">
            {/* Top ambient luminous highlight on hover */}
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#603DD9]/40 to-transparent opacity-0 group-hover/navbar:opacity-100 transition-opacity duration-500" />
            
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
                {/* Generous Height for a spacious, modern SaaS feel */}
                <div className="h-20 flex items-center justify-between gap-2 sm:gap-4">
                    {/* Left: Brand Identity */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <NavLink to="/" className="flex items-center gap-2.5 group">
                            <img
                                src="/logo-icon.webp"
                                alt="StudyMate+ Logo"
                                width="48"
                                height="48"
                                fetchPriority="high"
                                decoding="async"
                                className="w-11 h-11 sm:w-12 sm:h-12 object-contain drop-shadow-sm group-hover:scale-105 transition-transform"
                            />
                            <span className="text-xl sm:text-2xl font-black bg-gradient-to-r from-[#603DD9] via-[#7B42E2] to-[#9E4CEC] bg-clip-text text-transparent tracking-tight group-hover:opacity-90 transition-opacity whitespace-nowrap">
                                StudyMate+
                            </span>
                        </NavLink>
                    </div>

                    {/* Middle: Clean Desktop Navigation */}
                    <nav className="hidden lg:flex items-center gap-1 xl:gap-2 min-w-0">
                        {navLinks.map((link) => {
                            const isCurrent = location.pathname === link.href
                            return (
                                <NavLink
                                    key={link.name}
                                    to={link.href}
                                    className={`px-3 xl:px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
                                        isCurrent
                                            ? 'bg-gradient-to-r from-[#603DD9] to-[#9E4CEC] text-white shadow-md shadow-[#603DD9]/25 font-black'
                                            : 'text-slate-600 hover:text-[#603DD9] hover:bg-[#603DD9]/8 font-semibold'
                                    }`}
                                >
                                    <link.icon className={`w-4 h-4 flex-shrink-0 ${isCurrent ? 'text-white' : 'text-slate-400 group-hover:text-[#603DD9]'}`} />
                                    <span>{link.name}</span>
                                </NavLink>
                            )
                        })}
                    </nav>

                    {/* Right Section: Streak & Profile */}
                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                        {/* Day Streak Pill */}
                        <div
                            onClick={() => navigate('/timer')}
                            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-100/90 border border-orange-300 text-amber-950 text-xs font-black cursor-pointer hover:bg-orange-200 transition-all whitespace-nowrap shadow-xs"
                            title="Daily Study Streak"
                            role="button"
                            tabIndex={0}
                            aria-label={`Daily Study Streak: ${dayStreak} ${dayStreak === 1 ? 'Day' : 'Days'}`}
                        >
                            <Flame className="w-3.5 h-3.5 fill-amber-600 text-amber-700 animate-pulse flex-shrink-0" />
                            <span>{dayStreak} {dayStreak === 1 ? 'Day' : 'Days'}</span>
                        </div>

                        {/* Profile Dropdown Menu */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                type="button"
                                onClick={() => setProfileDropdownOpen(prev => !prev)}
                                className="flex items-center gap-2 p-1 sm:p-1.5 sm:pr-3 rounded-2xl hover:bg-slate-100/80 transition-all border border-slate-200/70 focus:outline-none focus:ring-2 focus:ring-[#603DD9]/20"
                                aria-label="User profile menu"
                            >
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#603DD9] to-[#9E4CEC] text-white font-black text-xs flex items-center justify-center shadow-xs flex-shrink-0">
                                    {userName ? userName.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                                </div>
                                <span className="hidden sm:inline text-xs font-bold text-slate-800 max-w-[120px] truncate">
                                    {getShortName(userName)}
                                </span>
                                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Dropdown Card */}
                            {profileDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-64 bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl shadow-2xl shadow-purple-500/15 p-2 z-50 animate-slide-in">
                                    <div className="px-3 py-2.5 border-b border-slate-100">
                                        <p className="text-xs font-black text-slate-900 break-words">{userName}</p>
                                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{userEmail}</p>
                                    </div>
                                    <div className="py-1 space-y-0.5">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigate('/profile')
                                                setProfileDropdownOpen(false)
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-[#603DD9]/10 hover:text-[#603DD9] rounded-xl transition-colors text-left"
                                        >
                                            <User className="w-4 h-4 text-[#603DD9]" />
                                            <span>My Profile</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigate('/study')
                                                setProfileDropdownOpen(false)
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-[#603DD9]/10 hover:text-[#603DD9] rounded-xl transition-colors text-left"
                                        >
                                            <Sparkles className="w-4 h-4 text-[#9E4CEC]" />
                                            <span>AI Study Assistant</span>
                                        </button>
                                    </div>
                                    <div className="pt-1 border-t border-slate-100">
                                        <button
                                            type="button"
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors text-left"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            <span>Sign Out</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Mobile / Tablet Hamburger Toggle */}
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(prev => !prev)}
                            className="p-2 rounded-xl text-slate-600 hover:text-[#603DD9] hover:bg-[#603DD9]/10 lg:hidden transition-colors focus:outline-none flex-shrink-0"
                            aria-label="Toggle navigation menu"
                        >
                            {mobileMenuOpen ? (
                                <X className="w-5 h-5 text-[#603DD9]" />
                            ) : (
                                <Menu className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile & Tablet Dropdown Navigation Menu */}
            {mobileMenuOpen && (
                <div className="lg:hidden border-t border-purple-100 bg-white/98 backdrop-blur-xl shadow-2xl animate-slide-in">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-3">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {navLinks.map((link) => {
                                const isCurrent = location.pathname === link.href
                                return (
                                    <NavLink
                                        key={link.name}
                                        to={link.href}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`flex items-center gap-2.5 p-3 rounded-2xl text-xs font-bold transition-all ${
                                            isCurrent
                                                ? 'bg-gradient-to-r from-[#603DD9] to-[#9E4CEC] text-white shadow-md shadow-[#603DD9]/20 font-black'
                                                : 'bg-slate-50 text-slate-700 hover:bg-[#603DD9]/10 hover:text-[#603DD9]'
                                        }`}
                                    >
                                        <link.icon className="w-4 h-4 flex-shrink-0" />
                                        <span className="truncate">{link.name}</span>
                                    </NavLink>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}
        </header>
    )
}
