import { NavLink } from 'react-router-dom'
import {
    LayoutDashboard,
    Library,
    MessageSquare,
    CreditCard,
    ClipboardList,
    Clock,
    Calendar,
    Users,
    User,
    ChevronLeft,
    ChevronRight,
    X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
    collapsed: boolean
    isOpen: boolean
    onToggleCollapse: () => void
    onCloseMobile: () => void
}

const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Library', href: '/library', icon: Library },
    { name: 'AI Tutor', href: '/study', icon: MessageSquare },
    { name: 'Flashcards', href: '/flashcards', icon: CreditCard },
    { name: 'Quizzes', href: '/quizzes', icon: ClipboardList },
    { name: 'Focus Timer', href: '/timer', icon: Clock },
    { name: 'Planner', href: '/planner', icon: Calendar },
    { name: 'Collaborate', href: '/collaborate', icon: Users },
    { name: 'Profile', href: '/profile', icon: User },
]

export function Sidebar({ collapsed, isOpen, onToggleCollapse, onCloseMobile }: SidebarProps) {
    return (
        <>
            {/* Mobile Backdrop Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden transition-opacity"
                    onClick={onCloseMobile}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar Container */}
            <aside
                className={cn(
                    'fixed left-0 top-0 h-screen bg-white border-r border-slate-200/80 z-50 flex flex-col transition-all duration-300 ease-in-out shadow-lg lg:shadow-none',
                    collapsed ? 'w-20' : 'w-64',
                    // Mobile sliding
                    isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                )}
            >
                {/* Header / Logo */}
                <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between">
                    <NavLink
                        to="/"
                        onClick={onCloseMobile}
                        className={cn(
                            'flex items-center transition-all overflow-hidden',
                            collapsed ? 'justify-center w-full' : ''
                        )}
                        title="StudyMate+"
                    >
                        {collapsed ? (
                            <span className="text-lg font-black bg-gradient-to-r from-[#603DD9] to-[#9E4CEC] bg-clip-text text-transparent">
                                S+
                            </span>
                        ) : (
                            <div className="min-w-0 flex-1">
                                <h1 className="text-lg font-black bg-gradient-to-r from-[#603DD9] to-[#9E4CEC] bg-clip-text text-transparent leading-none">
                                    StudyMate+
                                </h1>
                                <p className="text-[11px] text-slate-400 font-medium mt-1">AI Learning Platform</p>
                            </div>
                        )}
                    </NavLink>

                    {/* Mobile Close Button */}
                    <button
                        type="button"
                        onClick={onCloseMobile}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 lg:hidden"
                        aria-label="Close sidebar"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation Links */}
                <div className="flex-1 px-3 py-5 overflow-y-auto space-y-6">
                    <div>
                        {!collapsed && (
                            <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                                Study Tools
                            </p>
                        )}
                        <nav className="space-y-1.5">
                            {navigation.map((item) => (
                                <NavLink
                                    key={item.name}
                                    to={item.href}
                                    onClick={onCloseMobile}
                                    title={collapsed ? item.name : undefined}
                                    className={({ isActive }) =>
                                        cn(
                                            'flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-200 group relative',
                                            collapsed ? 'justify-center px-0' : '',
                                            isActive
                                                ? 'bg-gradient-to-r from-[#603DD9] to-[#9E4CEC] text-white shadow-md shadow-[#603DD9]/25 font-bold'
                                                : 'text-slate-600 hover:bg-[#603DD9]/5 hover:text-[#603DD9]'
                                        )
                                    }
                                >
                                    {({ isActive }) => (
                                        <>
                                            <item.icon
                                                className={cn(
                                                    'w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110',
                                                    isActive ? 'text-white' : 'text-slate-500 group-hover:text-[#603DD9]'
                                                )}
                                            />
                                            {!collapsed && (
                                                <span className="truncate">{item.name}</span>
                                            )}
                                        </>
                                    )}
                                </NavLink>
                            ))}
                        </nav>
                    </div>
                </div>

                {/* Bottom Collapse Toggle Footer */}
                <div className="p-3 border-t border-slate-100 bg-slate-50/50">
                    <button
                        type="button"
                        onClick={onToggleCollapse}
                        className={cn(
                            'w-full flex items-center gap-2.5 p-2.5 rounded-2xl text-xs font-bold text-slate-500 hover:text-[#603DD9] hover:bg-white transition-all shadow-xs border border-transparent hover:border-slate-200/80',
                            collapsed ? 'justify-center' : 'justify-between'
                        )}
                        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {!collapsed && <span>Collapse Sidebar</span>}
                        {collapsed ? (
                            <ChevronRight className="w-4 h-4 text-[#603DD9]" />
                        ) : (
                            <ChevronLeft className="w-4 h-4 text-slate-400" />
                        )}
                    </button>
                </div>
            </aside>
        </>
    )
}
