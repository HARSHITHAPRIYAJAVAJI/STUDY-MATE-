import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
    Users,
    Plus,
    UserPlus,
    Sparkles,
    Radio,
    Copy,
    Check,
    Clock,
    BookOpen,
    Share2,
    Flame,
    ArrowRight,
    Search,
    Zap,
    Send,
    X,
    Laptop,
} from 'lucide-react'
import { toast } from 'sonner'

interface StudyRoom {
    id: string
    code: string
    name: string
    topic: string
    type: 'Focus Sprint' | 'Exam Prep' | 'Q&A Discussion' | 'Document Review'
    host: string
    participants: { name: string; avatar: string; isHost?: boolean }[]
    activeCount: number
    maxCapacity: number
    isPrivate?: boolean
    focusTimeElapsed?: string
    createdAt: string
}

const INITIAL_ROOMS: StudyRoom[] = [
    {
        id: 'room-1',
        code: 'PHYS-9021',
        name: 'Quantum Physics Final Prep',
        topic: 'Wave-Particle Duality & Schrodinger Equations',
        type: 'Exam Prep',
        host: 'Alex Rivera',
        participants: [
            { name: 'Alex Rivera', avatar: 'AR', isHost: true },
            { name: 'Sarah Chen', avatar: 'SC' },
            { name: 'Marcus Bell', avatar: 'MB' },
            { name: 'Priya Patel', avatar: 'PP' },
        ],
        activeCount: 4,
        maxCapacity: 8,
        focusTimeElapsed: '45m in session',
        createdAt: '10 mins ago',
    },
    {
        id: 'room-2',
        code: 'CS-4410',
        name: 'Algorithms & Dynamic Programming',
        topic: 'LeetCode Mediums & Graph Traversal',
        type: 'Focus Sprint',
        host: 'Elena Rostova',
        participants: [
            { name: 'Elena Rostova', avatar: 'ER', isHost: true },
            { name: 'David Kim', avatar: 'DK' },
            { name: 'Jordan Hayes', avatar: 'JH' },
        ],
        activeCount: 3,
        maxCapacity: 6,
        focusTimeElapsed: '25m Pomodoro',
        createdAt: '25 mins ago',
    },
    {
        id: 'room-3',
        code: 'BIO-2010',
        name: 'Cellular Biology & Genetics',
        topic: 'DNA Replication & CRISPR Gene Editing',
        type: 'Document Review',
        host: 'Chloe Bennett',
        participants: [
            { name: 'Chloe Bennett', avatar: 'CB', isHost: true },
            { name: 'Liam Wilson', avatar: 'LW' },
        ],
        activeCount: 2,
        maxCapacity: 5,
        focusTimeElapsed: '15m in session',
        createdAt: '40 mins ago',
    },
]

export function Collaborate() {
    const [rooms, setRooms] = useState<StudyRoom[]>(INITIAL_ROOMS)
    const [roomName, setRoomName] = useState('')
    const [topic, setTopic] = useState('')
    const [roomType, setRoomType] = useState<StudyRoom['type']>('Focus Sprint')
    const [joinCode, setJoinCode] = useState('')
    const [filterType, setFilterType] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [copiedRoomId, setCopiedRoomId] = useState<string | null>(null)
    const [activeLiveSession, setActiveLiveSession] = useState<StudyRoom | null>(null)
    const [chatMessages, setChatMessages] = useState<{ sender: string; text: string; time: string }[]>([
        { sender: 'System', text: 'Welcome to the synchronized study room! You can chat and share notes here.', time: 'Just now' },
        { sender: 'Study Mate AI', text: 'Tip: Click "Share Link" to invite your peers to this session.', time: 'Just now' }
    ])
    const [newChatText, setNewChatText] = useState('')

    // Create Room Handler
    const handleCreateRoom = (e: React.FormEvent) => {
        e.preventDefault()
        if (!roomName.trim()) {
            toast.error('Please enter a room name')
            return
        }

        const generatedCode = `STUDY-${Math.floor(1000 + Math.random() * 9000)}`
        const newRoom: StudyRoom = {
            id: `room-${Date.now()}`,
            code: generatedCode,
            name: roomName.trim(),
            topic: topic.trim() || 'General Study & Review',
            type: roomType,
            host: 'You',
            participants: [
                { name: 'You', avatar: 'ME', isHost: true },
            ],
            activeCount: 1,
            maxCapacity: 8,
            focusTimeElapsed: 'Just started',
            createdAt: 'Just now',
        }

        setRooms(prev => [newRoom, ...prev])
        setRoomName('')
        setTopic('')
        toast.success(`Room "${newRoom.name}" created! Code: ${generatedCode}`)
        setActiveLiveSession(newRoom)
    }

    // Join with Code Handler
    const handleJoinWithCode = (e: React.FormEvent) => {
        e.preventDefault()
        if (!joinCode.trim()) {
            toast.error('Please enter a room code')
            return
        }

        const codeFormatted = joinCode.trim().toUpperCase()
        const found = rooms.find(r => r.code.toUpperCase() === codeFormatted)
        if (found) {
            toast.success(`Joined room: ${found.name}`)
            setActiveLiveSession(found)
            setJoinCode('')
        } else {
            // Mock join a new external room
            const mockExternalRoom: StudyRoom = {
                id: `room-${Date.now()}`,
                code: codeFormatted,
                name: `Peer Session (${codeFormatted})`,
                topic: 'Collaborative Group Review',
                type: 'Focus Sprint',
                host: 'Study Host',
                participants: [
                    { name: 'Study Host', avatar: 'SH', isHost: true },
                    { name: 'You', avatar: 'ME' }
                ],
                activeCount: 2,
                maxCapacity: 8,
                focusTimeElapsed: 'Live Now',
                createdAt: 'Just joined',
            }
            setRooms(prev => [mockExternalRoom, ...prev])
            setActiveLiveSession(mockExternalRoom)
            setJoinCode('')
            toast.success(`Successfully connected to room ${codeFormatted}!`)
        }
    }

    // Copy Code
    const handleCopyCode = (room: StudyRoom) => {
        navigator.clipboard.writeText(room.code)
        setCopiedRoomId(room.id)
        toast.success(`Room code ${room.code} copied to clipboard!`)
        setTimeout(() => setCopiedRoomId(null), 2000)
    }

    // Send Live Chat Message
    const handleSendChatMessage = (e: React.FormEvent) => {
        e.preventDefault()
        if (!newChatText.trim()) return
        const msg = {
            sender: 'You',
            text: newChatText.trim(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
        setChatMessages(prev => [...prev, msg])
        setNewChatText('')
    }

    // Filtered rooms
    const filteredRooms = rooms.filter(room => {
        const matchesFilter = filterType === 'all' || room.type.toLowerCase().includes(filterType.toLowerCase())
        const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              room.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              room.code.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesFilter && matchesSearch
    })

    return (
        <div className="relative space-y-5 animate-fade-in max-w-6xl mx-auto pb-10 pt-0">
            {/* Ambient Background Glows matching Dashboard */}
            <div className="absolute -left-20 top-10 w-80 h-80 rounded-full bg-[#603DD9]/8 blur-3xl pointer-events-none -z-10" />
            <div className="absolute -right-20 top-40 w-80 h-80 rounded-full bg-[#9E4CEC]/10 blur-3xl pointer-events-none -z-10" />

            {/* Header */}
            <div className="text-center space-y-1 pt-0">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-[#603DD9] via-[#7B42E2] to-[#9E4CEC] bg-clip-text text-transparent tracking-tight">
                    Group Study & Collaborate
                </h1>
                <p className="text-slate-500 max-w-lg mx-auto text-xs sm:text-sm font-normal">
                    Host study rooms, synchronize Pomodoro focus sprints, and review documents together in real-time.
                </p>
            </div>

            {/* Top Quick Metric Row matching Dashboard style */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-purple-100/80 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Live Rooms</span>
                        <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">{rooms.length}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#603DD9] to-[#9E4CEC] text-white flex items-center justify-center shadow-xs">
                        <Radio className="w-5 h-5 animate-pulse" />
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-purple-100/80 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Peers Online</span>
                        <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                            {rooms.reduce((acc, r) => acc + r.activeCount, 0) + 12}
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#603DD9] to-[#7B42E2] text-white flex items-center justify-center shadow-xs">
                        <Users className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-purple-100/80 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Focus Hours</span>
                        <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">14.8h</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7B42E2] to-[#9E4CEC] text-white flex items-center justify-center shadow-xs">
                        <Clock className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-purple-100/80 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Study Streak</span>
                        <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 flex items-center gap-1">
                            5 Days <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-xs">
                        <Zap className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Create Room & Join Room Action Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Left Card: Create Study Room */}
                <div className="lg:col-span-7">
                    <Card className="bg-white border border-purple-100 shadow-xl shadow-purple-500/5 rounded-3xl overflow-hidden backdrop-blur-sm">
                        <CardContent className="p-6 sm:p-7">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#603DD9] to-[#9E4CEC] flex items-center justify-center flex-shrink-0 shadow-md shadow-[#603DD9]/20 text-white">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-slate-800 tracking-tight">Create Study Room</h2>
                                    <p className="text-xs text-slate-500 font-normal">
                                        Host a synchronized group session with custom topic and focus modes
                                    </p>
                                </div>
                            </div>

                            <form onSubmit={handleCreateRoom} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-700 block">
                                        Room Name <span className="text-[#603DD9]">*</span>
                                    </label>
                                    <Input
                                        placeholder="e.g., Computer Science Midterm Prep"
                                        value={roomName}
                                        onChange={e => setRoomName(e.target.value)}
                                        className="h-10 text-xs sm:text-sm rounded-xl border-slate-200 focus:border-[#603DD9] focus:ring-2 focus:ring-[#603DD9]/20 bg-slate-50/50 hover:bg-white transition-all"
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-700 block">
                                        Topic / Subject Description
                                    </label>
                                    <Input
                                        placeholder="e.g., Chapter 4: Neural Networks & Loss Functions"
                                        value={topic}
                                        onChange={e => setTopic(e.target.value)}
                                        className="h-10 text-xs sm:text-sm rounded-xl border-slate-200 focus:border-[#603DD9] focus:ring-2 focus:ring-[#603DD9]/20 bg-slate-50/50 hover:bg-white transition-all"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-700 block">
                                        Session Format
                                    </label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {(['Focus Sprint', 'Exam Prep', 'Q&A Discussion', 'Document Review'] as const).map(type => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setRoomType(type)}
                                                className={`p-2.5 rounded-xl border text-[11px] font-semibold text-center transition-all ${
                                                    roomType === type
                                                        ? 'bg-purple-50 border-[#603DD9] text-[#603DD9] shadow-xs'
                                                        : 'bg-white border-slate-200 text-slate-600 hover:border-purple-200 hover:bg-slate-50/80'
                                                }`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-[#603DD9] via-[#7B42E2] to-[#9E4CEC] hover:from-[#5233bd] hover:to-[#8c3adb] text-white font-bold text-xs sm:text-sm h-11 rounded-xl shadow-md shadow-[#603DD9]/20 transition-all hover:scale-[1.01] active:scale-[0.99] gap-2 mt-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Launch Study Room
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Card: Join Room with Code & Quick Perks */}
                <div className="lg:col-span-5 space-y-4">
                    <Card className="bg-white border border-purple-100 shadow-xl shadow-purple-500/5 rounded-3xl overflow-hidden backdrop-blur-sm">
                        <CardContent className="p-6 sm:p-7">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-[#603DD9] border border-purple-100 flex items-center justify-center flex-shrink-0">
                                    <UserPlus className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-slate-800 tracking-tight">Join via Room Code</h2>
                                    <p className="text-xs text-slate-500 font-normal">
                                        Enter an invite code to join a peer's session
                                    </p>
                                </div>
                            </div>

                            <form onSubmit={handleJoinWithCode} className="space-y-3">
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="e.g. PHYS-9021"
                                        value={joinCode}
                                        onChange={e => setJoinCode(e.target.value)}
                                        className="h-10 text-xs sm:text-sm rounded-xl border-slate-200 focus:border-[#603DD9] focus:ring-2 focus:ring-[#603DD9]/20 bg-slate-50/50 uppercase tracking-wider font-semibold"
                                    />
                                    <Button
                                        type="submit"
                                        className="bg-[#603DD9] hover:bg-[#5233bd] text-white font-bold px-5 rounded-xl text-xs shrink-0 shadow-sm"
                                    >
                                        Join
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Collaborative Feature Card */}
                    <div className="bg-gradient-to-br from-[#603DD9]/5 via-[#7B42E2]/5 to-[#9E4CEC]/5 border border-purple-100/90 rounded-3xl p-5 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#603DD9]">
                            <Zap className="w-4 h-4 text-[#603DD9]" />
                            StudyMate+ Collaborative Perks
                        </div>
                        <ul className="space-y-2 text-xs text-slate-600 font-medium">
                            <li className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#603DD9]" />
                                Synchronized focus intervals & Pomodoro timer
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#603DD9]" />
                                Real-time peer chat & shared document study
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#603DD9]" />
                                AI-assisted collective summaries & questions
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Active Study Rooms Directory */}
            <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                            Active Study Rooms
                        </h2>
                        <p className="text-xs text-slate-500">
                            Discover active public rooms or jump back into your peer sessions
                        </p>
                    </div>

                    {/* Filter & Search Bar */}
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search rooms..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:border-[#603DD9] focus:outline-none bg-white w-36 sm:w-48 transition-all"
                            />
                        </div>

                        <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs">
                            {[
                                { id: 'all', label: 'All' },
                                { id: 'sprint', label: 'Sprint' },
                                { id: 'exam', label: 'Exam' },
                                { id: 'q&a', label: 'Q&A' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setFilterType(tab.id)}
                                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                                        filterType === tab.id
                                            ? 'bg-[#603DD9] text-white'
                                            : 'text-slate-600 hover:text-[#603DD9]'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {filteredRooms.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredRooms.map(room => (
                            <div
                                key={room.id}
                                className="bg-white rounded-3xl p-5 border border-purple-100/90 shadow-sm hover:shadow-xl hover:shadow-purple-500/5 hover:border-[#603DD9]/30 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden"
                            >
                                {/* Top hover gradient accent */}
                                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#603DD9] to-[#9E4CEC] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                <div>
                                    {/* Card Top Pill Row */}
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#603DD9] bg-purple-50 border border-purple-100 px-2.5 py-0.5 rounded-full">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            {room.type}
                                        </span>

                                        <button
                                            onClick={() => handleCopyCode(room)}
                                            className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-[#603DD9] bg-slate-50 hover:bg-purple-50 px-2 py-0.5 rounded-md border border-slate-100 transition-colors"
                                            title="Click to copy code"
                                        >
                                            {copiedRoomId === room.id ? (
                                                <>
                                                    <Check className="w-3 h-3 text-emerald-600" />
                                                    <span className="text-emerald-600 font-bold">Copied</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="w-3 h-3" />
                                                    <span>{room.code}</span>
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {/* Room Title & Topic */}
                                    <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug group-hover:text-[#603DD9] transition-colors line-clamp-1">
                                        {room.name}
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 font-normal leading-relaxed">
                                        {room.topic}
                                    </p>

                                    {/* Session Duration & Host */}
                                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-3 pt-3 border-t border-slate-100">
                                        <span className="flex items-center gap-1 font-medium">
                                            <Clock className="w-3 h-3 text-[#603DD9]" />
                                            {room.focusTimeElapsed}
                                        </span>
                                        <span>•</span>
                                        <span className="truncate">Host: {room.host}</span>
                                    </div>
                                </div>

                                {/* Participants & Join Button */}
                                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div className="flex -space-x-1.5 overflow-hidden">
                                            {room.participants.slice(0, 3).map((p, i) => (
                                                <div
                                                    key={i}
                                                    className="w-6 h-6 rounded-full bg-gradient-to-br from-[#603DD9] to-[#9E4CEC] text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white"
                                                    title={p.name}
                                                >
                                                    {p.avatar}
                                                </div>
                                            ))}
                                        </div>
                                        <span className="text-[10px] font-semibold text-slate-500 ml-2">
                                            {room.activeCount}/{room.maxCapacity} Peers
                                        </span>
                                    </div>

                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            setActiveLiveSession(room)
                                            toast.success(`Connected to ${room.name}!`)
                                        }}
                                        className="h-8 px-3.5 text-xs font-bold bg-[#603DD9] hover:bg-[#5233bd] text-white rounded-xl shadow-xs gap-1"
                                    >
                                        Join
                                        <ArrowRight className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl p-12 border border-purple-100 text-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#603DD9] flex items-center justify-center mx-auto">
                            <Users className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-bold text-slate-800">No matching study rooms found</h3>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            Try adjusting your search query or create a new room to start studying with peers.
                        </p>
                        <Button
                            onClick={() => {
                                setSearchQuery('')
                                setFilterType('all')
                            }}
                            variant="outline"
                            className="rounded-xl text-xs font-bold border-purple-200 text-[#603DD9] hover:bg-purple-50"
                        >
                            Clear Filters
                        </Button>
                    </div>
                )}
            </div>

            {/* Interactive Live Collaborative Session Modal */}
            {activeLiveSession && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl border border-purple-100 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Live Modal Header */}
                        <div className="p-4 sm:p-5 border-b border-purple-100/80 bg-gradient-to-r from-purple-50/80 to-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#603DD9] to-[#9E4CEC] text-white flex items-center justify-center shadow-xs">
                                    <Radio className="w-5 h-5 animate-pulse" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate max-w-[220px] sm:max-w-md">
                                            {activeLiveSession.name}
                                        </h3>
                                        <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full">
                                            LIVE
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 font-normal truncate">
                                        Code: <strong className="text-[#603DD9]">{activeLiveSession.code}</strong> • {activeLiveSession.topic}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCopyCode(activeLiveSession)}
                                    className="h-8 text-xs font-bold border-purple-200 text-[#603DD9] hover:bg-purple-50 rounded-xl gap-1"
                                >
                                    <Share2 className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Invite</span>
                                </Button>
                                <button
                                    onClick={() => setActiveLiveSession(null)}
                                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body: Split into Live Shared Workspace & Realtime Group Chat */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-0 overflow-y-auto">
                            {/* Left: Synchronized Session Details */}
                            <div className="lg:col-span-7 p-5 space-y-4 border-b lg:border-b-0 lg:border-r border-slate-100 overflow-y-auto">
                                {/* Live Timer Banner */}
                                <div className="bg-gradient-to-r from-[#603DD9] to-[#7B42E2] rounded-2xl p-4 text-white flex items-center justify-between shadow-md shadow-[#603DD9]/15">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                            <Clock className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <div className="text-[11px] font-semibold text-purple-200 uppercase tracking-wider">Group Pomodoro Interval</div>
                                            <div className="text-xl font-black">23:45 Remaining</div>
                                        </div>
                                    </div>
                                    <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">
                                        Sync Active
                                    </span>
                                </div>

                                {/* Active Participants */}
                                <div>
                                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                                        Connected Peers ({activeLiveSession.activeCount})
                                    </h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {activeLiveSession.participants.map((p, i) => (
                                            <div key={i} className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-100">
                                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#603DD9] to-[#9E4CEC] text-white text-[10px] font-bold flex items-center justify-center">
                                                    {p.avatar}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-xs font-bold text-slate-800 truncate">{p.name}</div>
                                                    <div className="text-[10px] text-emerald-600 font-semibold">● Active</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Shared Scratchpad / Notes */}
                                <div>
                                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                        <BookOpen className="w-3.5 h-3.5 text-[#603DD9]" />
                                        Shared Room Notes
                                    </h4>
                                    <textarea
                                        defaultValue={`1. Discuss core concept equations\n2. Solve practice problem #3\n3. Review generated flashcard definitions`}
                                        rows={4}
                                        className="w-full text-xs font-medium text-slate-700 p-3 rounded-xl border border-slate-200 focus:border-[#603DD9] focus:outline-none bg-slate-50/50 resize-none leading-relaxed"
                                        placeholder="Collaborative notes synced with room participants..."
                                    />
                                </div>
                            </div>

                            {/* Right: Live Room Chat */}
                            <div className="lg:col-span-5 p-4 flex flex-col justify-between bg-slate-50/50 h-[340px] lg:h-auto">
                                <div className="space-y-2 overflow-y-auto pr-1 flex-1">
                                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center py-1">
                                        Session Chat
                                    </div>
                                    {chatMessages.map((msg, i) => (
                                        <div
                                            key={i}
                                            className={`p-2.5 rounded-xl text-xs ${
                                                msg.sender === 'You'
                                                    ? 'bg-[#603DD9] text-white ml-6 shadow-xs'
                                                    : msg.sender === 'System' || msg.sender === 'Study Mate AI'
                                                    ? 'bg-purple-50 border border-purple-100 text-slate-700'
                                                    : 'bg-white border border-slate-200 text-slate-800 mr-6'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-1 mb-0.5">
                                                <span className={`text-[10px] font-bold ${msg.sender === 'You' ? 'text-purple-200' : 'text-[#603DD9]'}`}>
                                                    {msg.sender}
                                                </span>
                                                <span className={`text-[9px] ${msg.sender === 'You' ? 'text-purple-200' : 'text-slate-400'}`}>
                                                    {msg.time}
                                                </span>
                                            </div>
                                            <p className="leading-snug">{msg.text}</p>
                                        </div>
                                    ))}
                                </div>

                                <form onSubmit={handleSendChatMessage} className="mt-3 flex gap-2">
                                    <Input
                                        placeholder="Type message to room..."
                                        value={newChatText}
                                        onChange={e => setNewChatText(e.target.value)}
                                        className="h-9 text-xs rounded-xl border-slate-200 focus:border-[#603DD9] bg-white"
                                    />
                                    <Button
                                        type="submit"
                                        size="sm"
                                        className="h-9 px-3 bg-[#603DD9] hover:bg-[#5233bd] text-white rounded-xl shadow-xs"
                                    >
                                        <Send className="w-3.5 h-3.5" />
                                    </Button>
                                </form>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-3.5 border-t border-slate-100 bg-white flex items-center justify-between">
                            <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                                <Laptop className="w-3.5 h-3.5 text-[#603DD9]" />
                                Connected to StudyMate+ Peer Server
                            </span>
                            <Button
                                size="sm"
                                onClick={() => {
                                    setActiveLiveSession(null)
                                    toast.info("Left the study room")
                                }}
                                className="bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-xl text-xs font-bold h-8"
                            >
                                Leave Room
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
