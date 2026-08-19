import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import Markdown from 'react-markdown'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import {
    Send,
    Bot,
    User,
    BookOpen,
    FileText,
    Pencil,
    Trash2,
    Check,
    Search,
    Maximize2,
    Minimize2,
    Upload,
    ChevronDown,
    X,
    Plus,
    MessageSquare,
    History,
    Sparkles,
    Menu,
    Loader2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Link } from 'react-router-dom'

const DocumentViewer = lazy(() => import('@/components/study/DocumentViewer').then(m => ({ default: m.DocumentViewer })))

export function Study() {
    // --- State Management ---
    const [selectedDocuments, setSelectedDocuments] = useState<string[]>(() => {
        const saved = localStorage.getItem('study_selected_docs')
        return saved ? JSON.parse(saved) : []
    })
    const [documents, setDocuments] = useState<any[]>([])
    const [previewDoc, setPreviewDoc] = useState<any | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    // Chat State
    const [message, setMessage] = useState('')
    const [messages, setMessages] = useState<Array<{
        id: string
        role: 'user' | 'assistant'
        content: string
        timestamp: Date
    }>>([])
    const [isLoading, setIsLoading] = useState(false)
    const [sessionId, setSessionId] = useState<string | null>(null)
    const [sessions, setSessions] = useState<any[]>([])
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
    const [editText, setEditText] = useState('')

    // Layout State
    const [focusMode, setFocusMode] = useState(false)
    const [showDocPicker, setShowDocPicker] = useState(false)
    const [showHistory, setShowHistory] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [splitRatio, setSplitRatio] = useState(55) // Left panel %
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
    const [editSessionTitle, setEditSessionTitle] = useState('')
    const isResizing = useRef(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Session Tracking
    const [sessionDuration, setSessionDuration] = useState(0)
    const sessionStartTime = useRef<number>(Date.now())
    const lastSaveTime = useRef<number>(Date.now())

    // --- Effects ---

    useEffect(() => {
        localStorage.setItem('study_selected_docs', JSON.stringify(selectedDocuments))
    }, [selectedDocuments])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    // Study Time Tracking logic
    const saveStudySession = useCallback(async (durationInSeconds: number) => {
        if (durationInSeconds < 10) return; // Don't save very short accidental visits

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            await supabase.from('study_sessions').insert({
                user_id: user.id,
                duration: Math.round(durationInSeconds),
                subject: selectedDocuments.length > 0 ? "Active Document Study" : "General Study"
            })
        } catch (err) {
            console.error("Failed to save study session:", err)
        }
    }, [selectedDocuments])

    useEffect(() => {
        const timer = setInterval(() => {
            const now = Date.now()
            const currentSessionSeconds = (now - sessionStartTime.current) / 1000
            setSessionDuration(Math.floor(currentSessionSeconds))

            // Auto-save every minute to prevent data loss
            if (now - lastSaveTime.current > 60000) {
                const chunkToSave = (now - lastSaveTime.current) / 1000
                saveStudySession(chunkToSave)
                lastSaveTime.current = now
            }
        }, 1000)

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                const now = Date.now()
                const finalChunk = (now - lastSaveTime.current) / 1000
                saveStudySession(finalChunk)
                lastSaveTime.current = now
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            clearInterval(timer)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            const now = Date.now()
            const finalChunk = (now - lastSaveTime.current) / 1000
            saveStudySession(finalChunk)
        }
    }, [saveStudySession])

    // Load Documents
    useEffect(() => {
        const fetchDocuments = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data } = await supabase
                    .from('documents')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                if (data) setDocuments(data)
            }
        }
        fetchDocuments()
    }, [])

    // Initialize Preview (Load first selected doc if available)
    useEffect(() => {
        if (!previewDoc && selectedDocuments.length > 0 && documents.length > 0) {
            const firstDocId = selectedDocuments[0]
            const doc = documents.find(d => d.id.toString() === firstDocId)
            if (doc) loadPreview(doc)
        }
    }, [selectedDocuments, documents])

    // Load Chat Sessions
    useEffect(() => {
        const fetchSessions = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data } = await supabase
                    .from('qa_sessions')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })

                if (data && data.length > 0) {
                    setSessions(data)
                    // Auto-select latest session if none selected
                    if (!sessionId) {
                        switchSession(data[0].id)
                    }
                } else {
                    // Create default session
                    createSession('New Study Session')
                }
            }
        }
        fetchSessions()
    }, [])

    // --- Session Actions ---

    const createSession = async (title: string) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase
            .from('qa_sessions')
            .insert({ user_id: user.id, title })
            .select()
            .single()

        if (data) {
            setSessions(prev => [data, ...prev])
            setSessionId(data.id)
            setMessages([])
            setShowHistory(false)
        }
        if (error) console.error("Error creating session:", error)
    }

    const switchSession = async (id: string) => {
        setSessionId(id)
        setShowHistory(false)
        setIsLoading(true)

        // Fetch messages for this session
        const { data: msgs } = await supabase
            .from('qa_messages')
            .select('*')
            .eq('session_id', id)
            .order('created_at', { ascending: true })

        if (msgs) {
            setMessages(msgs.map(m => ({
                id: m.id,
                role: m.role as 'user' | 'assistant',
                content: m.content,
                timestamp: new Date(m.created_at)
            })))
        } else {
            setMessages([])
        }
        setIsLoading(false)
    }

    const deleteSession = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!confirm("Delete this chat session?")) return

        await supabase.from('qa_sessions').delete().eq('id', id)
        setSessions(prev => prev.filter(s => s.id !== id))
        if (sessionId === id) {
            setMessages([])
            setSessionId(null)
            const others = sessions.filter(s => s.id !== id)
            if (others.length > 0) switchSession(others[0].id)
        }
    }

    const startEditingSession = (session: any, e: React.MouseEvent) => {
        e.stopPropagation()
        setEditingSessionId(session.id)
        setEditSessionTitle(session.title)
    }

    const saveSessionTitle = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!editSessionTitle.trim()) return

        setSessions(prev => prev.map(s => s.id === id ? { ...s, title: editSessionTitle } : s))
        setEditingSessionId(null)

        const { error } = await supabase
            .from('qa_sessions')
            .update({ title: editSessionTitle })
            .eq('id', id)

        if (error) {
            console.error("Error renaming session:", error)
        }
    }

    const cancelEditingSession = (e: React.MouseEvent) => {
        e.stopPropagation()
        setEditingSessionId(null)
        setEditSessionTitle('')
    }

    // --- Logic ---

    const loadPreview = async (doc: any) => {
        if (previewDoc?.id === doc.id) return
        try {
            const { data, error } = await supabase.storage
                .from('documents')
                .createSignedUrl(doc.file_path, 3600)
            if (error) throw error
            setPreviewDoc(doc)
            setPreviewUrl(data.signedUrl)
        } catch (err) {
            console.error("Preview error:", err)
        }
    }

    const toggleDocument = (id: string) => {
        setSelectedDocuments(prev => {
            if (prev.includes(id)) {
                return prev.filter(d => d !== id)
            }
            if (prev.length >= 6) {
                alert("Max 6 documents allowed.")
                return prev
            }
            return [...prev, id]
        })
    }

    const cancelEditing = () => {
        setEditingMessageId(null)
        setEditText('')
    }

    // Resizing
    const [isDragging, setIsDragging] = useState(false)
    const leftPanelRef = useRef<HTMLDivElement>(null)
    const rightPanelRef = useRef<HTMLDivElement>(null)

    const startResizing = useCallback((e: React.MouseEvent) => {
        e.preventDefault()
        setIsDragging(true)
        isResizing.current = true
        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', stopResizing)
    }, [])

    const stopResizing = useCallback(() => {
        isResizing.current = false
        setIsDragging(false)
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', stopResizing)
        if (leftPanelRef.current) {
            const width = parseFloat(leftPanelRef.current.style.width)
            if (!isNaN(width)) setSplitRatio(width)
        }
    }, [])

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (isResizing.current && leftPanelRef.current && rightPanelRef.current) {
            const containerWidth = window.innerWidth
            const newPercentage = (e.clientX / containerWidth) * 100
            if (newPercentage > 20 && newPercentage < 80) {
                leftPanelRef.current.style.width = `${newPercentage}%`
                rightPanelRef.current.style.width = `${100 - newPercentage}%`
            }
        }
    }, [])

    // Chat Functions
    const handleSend = async () => {
        if (!message.trim()) return

        const userMessage = {
            id: Date.now().toString(),
            role: 'user' as const,
            content: message,
            timestamp: new Date(),
        }

        setMessages(prev => [...prev, userMessage])
        setMessage('')
        setIsLoading(true)

        if (sessionId) {
            await supabase.from('qa_messages').insert({
                session_id: sessionId,
                role: 'user',
                content: message
            })
        }

        try {
            const response = await fetch('http://127.0.0.1:3001/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message,
                    documentIds: selectedDocuments,
                    conversationHistory: messages.map(msg => ({ role: msg.role, content: msg.content }))
                }),
            })
            const data = await response.json()
            if (data.error) throw new Error(data.error)

            const aiMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant' as const,
                content: data.response || "No response generated.",
                timestamp: new Date(),
            }
            setMessages(prev => [...prev, aiMessage])

            if (sessionId) {
                await supabase.from('qa_messages').insert({
                    session_id: sessionId,
                    role: 'assistant',
                    content: aiMessage.content
                })
            }
        } catch (error: any) {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: "Error: " + error.message,
                timestamp: new Date()
            }])
        } finally {
            setIsLoading(false)
        }
    }

    const saveEdit = async (id: string) => {
        if (!editText.trim()) return

        const editedMsgIndex = messages.findIndex(m => m.id === id)
        if (editedMsgIndex === -1) return

        const keptMessages = messages.slice(0, editedMsgIndex + 1)
        keptMessages[keptMessages.length - 1].content = editText
        setMessages(keptMessages)
        setEditingMessageId(null)
        setIsLoading(true)

        if (sessionId) {
            await supabase.from('qa_messages').update({ content: editText }).eq('id', id)
            const { data: futureMsgs } = await supabase.from('qa_messages').select('id')
                .eq('session_id', sessionId)
                .gt('created_at', messages[editedMsgIndex].timestamp.toISOString())
            if (futureMsgs?.length) await supabase.from('qa_messages').delete().in('id', futureMsgs.map(m => m.id))
        }

        try {
            const response = await fetch('http://127.0.0.1:3001/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: editText,
                    documentIds: selectedDocuments,
                    conversationHistory: keptMessages.slice(0, -1).map(msg => ({ role: msg.role, content: msg.content }))
                }),
            })
            const data = await response.json()
            const aiMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant' as const,
                content: data.response || "No response.",
                timestamp: new Date(),
            }
            setMessages(prev => [...prev, aiMessage])
            if (sessionId) await supabase.from('qa_messages').insert({ session_id: sessionId, role: 'assistant', content: aiMessage.content })
        } catch (err) {
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    const deleteMessage = async (id: string) => {
        if (!confirm("Delete this message?")) return

        const msgIndex = messages.findIndex(m => m.id === id)
        if (msgIndex === -1) return

        const idsToDelete = [id]
        if (messages[msgIndex].role === 'user') {
            const nextMsg = messages[msgIndex + 1]
            if (nextMsg && nextMsg.role === 'assistant') idsToDelete.push(nextMsg.id)
        }

        setMessages(prev => prev.filter(m => !idsToDelete.includes(m.id)))
        if (sessionId) await supabase.from('qa_messages').delete().in('id', idsToDelete)
    }

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        const s = seconds % 60
        return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m}:${s.toString().padStart(2, '0')}`
    }

    const filteredDocs = documents.filter(doc => doc.title.toLowerCase().includes(searchQuery.toLowerCase()))

    return (
        <div className={`flex flex-col flex-1 w-full h-[calc(100vh-5rem)] overflow-hidden ${focusMode ? 'fixed inset-0 z-50 bg-white h-screen' : ''}`}>
            <style>{`
                .markdown-content h1, .markdown-content h2, .markdown-content h3 { 
                    font-weight: 800; margin-top: 1rem; margin-bottom: 0.5rem; line-height: 1.25; color: #1e1b4b;
                }
                .markdown-content h1 { font-size: 1.15rem; }
                .markdown-content h2 { font-size: 1rem; }
                .markdown-content h3 { font-size: 0.875rem; }
                .markdown-content p { margin-bottom: 0.75rem; line-height: 1.6; }
                .markdown-content ul, .markdown-content ol { padding-left: 1.25rem; margin-bottom: 0.75rem; }
                .markdown-content li { margin-bottom: 0.35rem; }
                .markdown-content strong { font-weight: 700; color: #603DD9; }
                .markdown-content code { background: #f3f0ff; color: #603DD9; padding: 0.15rem 0.35rem; border-radius: 0.375rem; font-size: 0.85em; }
                
                @media (max-width: 768px) {
                    .study-panel-left { width: 100% !important; height: 40% !important; }
                    .study-panel-right { width: 100% !important; height: 60% !important; }
                }
            `}</style>

            {/* --- Top Bar with Royal Purple Styling --- */}
            <div className="h-16 border-b border-purple-100/80 flex items-center justify-between px-4 sm:px-6 bg-white/95 backdrop-blur-xl shrink-0 z-20 shadow-xs">
                <div className="flex items-center gap-3 sm:gap-4">
                    {focusMode ? (
                        <Button variant="ghost" size="icon" onClick={() => setFocusMode(false)} className="hover:bg-[#603DD9]/10 text-[#603DD9]">
                            <Minimize2 className="w-5 h-5" />
                        </Button>
                    ) : (
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#603DD9] to-[#9E4CEC] flex items-center justify-center text-white shadow-xs">
                                <Sparkles className="w-4 h-4" />
                            </div>
                            <span className="font-black text-base sm:text-lg bg-gradient-to-r from-[#603DD9] via-[#7B42E2] to-[#9E4CEC] bg-clip-text text-transparent tracking-tight">
                                AI Study Studio
                            </span>
                        </div>
                    )}

                    {/* Document Picker Dropdown */}
                    <div className="relative relative-picker">
                        <Button
                            variant="outline"
                            className="bg-slate-50/90 border-slate-200/90 hover:border-[#603DD9]/40 text-slate-700 min-w-[170px] sm:min-w-[210px] justify-between rounded-xl h-9 text-xs font-bold transition-all"
                            onClick={() => setShowDocPicker(!showDocPicker)}
                        >
                            <span className="truncate max-w-[140px] sm:max-w-[160px] flex items-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5 text-[#603DD9]" />
                                {selectedDocuments.length === 0 ? "Select Documents" : `${selectedDocuments.length} Active Docs`}
                            </span>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        </Button>

                        {showDocPicker && (
                            <div className="absolute top-full left-0 mt-2 w-[340px] sm:w-[380px] bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-3 z-50 animate-slide-in">
                                <div className="relative mb-2.5">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        placeholder="Search your library..."
                                        className="pl-9 h-9 text-xs rounded-xl border-slate-200 focus:border-[#603DD9] focus:ring-[#603DD9]/20"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <div className="max-h-[260px] overflow-y-auto space-y-1 pr-1">
                                    {filteredDocs.map(doc => {
                                        const isSelected = selectedDocuments.includes(doc.id.toString())
                                        return (
                                            <div
                                                key={doc.id}
                                                className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
                                                    isSelected 
                                                        ? 'bg-[#603DD9]/10 text-[#603DD9] font-bold border border-[#603DD9]/20' 
                                                        : 'hover:bg-slate-50 text-slate-700'
                                                }`}
                                                onClick={() => toggleDocument(doc.id.toString())}
                                            >
                                                <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                                                    isSelected ? 'bg-[#603DD9] border-[#603DD9]' : 'border-slate-300'
                                                }`}>
                                                    {isSelected && <Check className="w-3 h-3 text-white" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-semibold truncate">{doc.title}</p>
                                                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{new Date(doc.created_at).toLocaleDateString()}</p>
                                                </div>
                                                {isSelected && (
                                                    <div
                                                        className="p-1 hover:bg-red-100 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                                                        onClick={(e) => { e.stopPropagation(); toggleDocument(doc.id.toString()); }}
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                    {filteredDocs.length === 0 && <p className="text-center text-xs text-slate-400 py-6">No documents found.</p>}
                                </div>
                                <div className="pt-2.5 mt-2 border-t border-slate-100 flex items-center justify-between">
                                    <Button size="sm" variant="ghost" className="text-xs text-slate-500 hover:text-slate-800" onClick={() => setSelectedDocuments([])}>Clear All</Button>
                                    <Button size="sm" className="text-xs bg-[#603DD9] hover:bg-[#5233bd] text-white rounded-xl px-4 font-bold" onClick={() => setShowDocPicker(false)}>Done</Button>
                                </div>
                            </div>
                        )}
                        {showDocPicker && <div className="fixed inset-0 z-40" onClick={() => setShowDocPicker(false)} />}
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    {/* Live Duration Counter */}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50/60 rounded-xl border border-purple-100 text-[#603DD9] text-xs font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="font-mono">{formatTime(sessionDuration)}</span>
                    </div>

                    <Link to="/library">
                        <Button variant="ghost" size="sm" className="gap-1.5 text-xs font-bold text-slate-600 hover:text-[#603DD9] hover:bg-[#603DD9]/8 rounded-xl h-9">
                            <Upload className="w-3.5 h-3.5 text-[#603DD9]" />
                            <span className="hidden sm:inline">Upload Docs</span>
                        </Button>
                    </Link>

                    <Button
                        variant={focusMode ? "secondary" : "outline"}
                        size="sm"
                        className={`gap-1.5 text-xs font-bold rounded-xl h-9 transition-all ${
                            focusMode 
                                ? 'bg-[#603DD9] text-white hover:bg-[#5233bd]' 
                                : 'border-slate-200 text-slate-700 hover:border-[#603DD9]/40 hover:text-[#603DD9]'
                        }`}
                        onClick={() => setFocusMode(!focusMode)}
                    >
                        {focusMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">{focusMode ? "Exit Focus" : "Focus Mode"}</span>
                    </Button>
                </div>
            </div>

            {/* --- Main Content Split --- */}
            <div className={`flex-1 w-full min-h-0 flex flex-col md:flex-row overflow-hidden ${isDragging ? 'cursor-col-resize select-none' : ''}`}>
                {/* Left Panel: Viewer */}
                <div
                    ref={leftPanelRef}
                    style={{ width: `${splitRatio}%` }}
                    className="flex flex-col h-full min-h-0 border-r border-purple-100/70 bg-slate-50/60 relative study-panel-left w-full md:w-auto overflow-hidden"
                >
                    {isDragging && <div className="absolute inset-0 z-50 bg-transparent" />}

                    {/* Viewer Tabs/Header */}
                    <div className="h-11 border-b border-purple-100/70 bg-white flex items-center px-2 gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                        {selectedDocuments.length === 0 && (
                            <span className="text-xs text-slate-600 px-3 font-semibold">No documents selected for preview</span>
                        )}
                        {selectedDocuments.map(docId => {
                            const doc = documents.find(d => d.id.toString() === docId)
                            if (!doc) return null
                            const isActive = previewDoc?.id === doc.id
                            return (
                                <button
                                    key={doc.id}
                                    onClick={() => loadPreview(doc)}
                                    className={`h-8 px-3 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all min-w-[100px] max-w-[200px] ${
                                        isActive 
                                            ? 'bg-[#603DD9]/10 text-[#603DD9] border border-[#603DD9]/20 shadow-xs' 
                                            : 'text-slate-600 hover:bg-slate-100/80 border border-transparent'
                                    }`}
                                >
                                    <FileText className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#603DD9]' : 'text-slate-400'}`} />
                                    <span className="truncate">{doc.title}</span>
                                </button>
                            )
                        })}
                    </div>

                    {/* Viewer Canvas - Expansive Full Dimensions */}
                    <div className="flex-1 w-full h-full min-h-0 overflow-hidden relative p-2 sm:p-3 bg-slate-50/40 flex flex-col">
                        {previewUrl ? (
                            <Suspense fallback={
                                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100/50 rounded-2xl">
                                    <Loader2 className="w-8 h-8 text-[#603DD9] animate-spin mb-2" />
                                    <span className="text-xs font-semibold text-slate-500">Loading Document Viewer...</span>
                                </div>
                            }>
                                <DocumentViewer
                                    url={previewUrl}
                                    title={previewDoc?.title || "Document"}
                                    isImage={!!previewDoc?.file_path.match(/\.(jpg|jpeg|png|gif|webp)$/i)}
                                />
                            </Suspense>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 max-w-sm mx-auto">
                                <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center mx-auto mb-3 text-[#603DD9]">
                                    <BookOpen className="w-6 h-6 stroke-[2.2]" />
                                </div>
                                <h4 className="text-sm font-bold text-slate-800">No Document Selected</h4>
                                <p className="text-xs text-slate-500 mt-1">
                                    Select a document from the top picker or upload study material to preview it side-by-side with AI tutor.
                                </p>
                                <Button
                                    size="sm"
                                    onClick={() => setShowDocPicker(true)}
                                    className="mt-4 bg-[#603DD9] hover:bg-[#5233bd] text-white text-xs font-bold rounded-xl px-4 py-2"
                                >
                                    Select Document
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Resizer Handle */}
                <div
                    onMouseDown={startResizing}
                    className={`hidden md:flex w-1.5 hover:bg-[#603DD9] hover:w-2 transition-all cursor-col-resize z-10 bg-purple-100/80 items-center justify-center group ${isDragging ? 'bg-[#603DD9] w-2' : ''}`}
                >
                    <div className="w-0.5 h-8 bg-slate-400 rounded-full group-hover:bg-white" />
                </div>

                {/* Right Panel: Chat & History */}
                <div
                    ref={rightPanelRef}
                    style={{ width: `${100 - splitRatio}%` }}
                    className="flex flex-row h-full min-h-0 bg-white overflow-hidden relative study-panel-right w-full md:w-auto"
                >
                    {/* Chat History Sidebar */}
                    <div className={`${showHistory ? 'w-72 opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-4'} transition-all duration-300 ease-in-out bg-slate-50/80 border-r border-purple-100/70 flex flex-col shrink-0 overflow-hidden`}>
                        <div className="p-3.5 border-b border-purple-100/60 flex items-center justify-between bg-white/70 backdrop-blur-sm sticky top-0 z-10">
                            <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                <History className="w-3.5 h-3.5 text-[#603DD9]" />
                                Chat History
                            </h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg hover:bg-slate-200/60"
                                onClick={() => setShowHistory(false)}
                                aria-label="Close session history"
                                title="Close history"
                            >
                                <X className="w-4 h-4 text-slate-500" />
                            </Button>
                        </div>

                        <div className="p-3">
                            <Button
                                className="w-full justify-start gap-2 bg-gradient-to-r from-[#603DD9] to-[#9E4CEC] hover:opacity-95 text-white shadow-md shadow-[#603DD9]/20 transition-all font-bold text-xs rounded-xl h-9"
                                onClick={() => createSession('New Study Session')}
                                aria-label="Create new study session"
                            >
                                <Plus className="w-4 h-4" /> New Session
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                            {sessions.map(session => (
                                <div
                                    key={session.id}
                                    className={`group flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer text-xs transition-all border ${sessionId === session.id
                                        ? 'bg-white border-[#603DD9]/30 shadow-sm text-[#603DD9] font-bold'
                                        : 'border-transparent hover:bg-white hover:border-slate-200 text-slate-600'
                                        }`}
                                    onClick={() => switchSession(session.id)}
                                >
                                    <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${sessionId === session.id ? 'text-[#603DD9]' : 'text-slate-500'}`} />

                                    {editingSessionId === session.id ? (
                                        <div className="flex items-center gap-1 flex-1 min-w-0 animate-in fade-in" onClick={e => e.stopPropagation()}>
                                            <Input
                                                value={editSessionTitle}
                                                onChange={e => setEditSessionTitle(e.target.value)}
                                                className="h-7 text-xs py-1 px-2 border-[#603DD9]/40 focus:ring-[#603DD9]/20 rounded-lg"
                                                autoFocus
                                                onClick={e => e.stopPropagation()}
                                                onKeyDown={e => {
                                                    e.stopPropagation()
                                                    if (e.key === 'Enter') saveSessionTitle(session.id, e as any)
                                                    if (e.key === 'Escape') cancelEditingSession(e as any)
                                                }}
                                                aria-label="Session Title"
                                            />
                                            <button onClick={(e) => saveSessionTitle(session.id, e)} aria-label="Save session title" className="text-emerald-600 hover:bg-emerald-50 p-1 rounded"><Check className="w-3.5 h-3.5" /></button>
                                            <button onClick={(e) => cancelEditingSession(e)} aria-label="Cancel editing" className="text-red-500 hover:bg-red-50 p-1 rounded"><X className="w-3.5 h-3.5" /></button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex-1 truncate">
                                                <p className="truncate font-semibold">{session.title}</p>
                                                <p className="text-[10px] text-slate-600 font-medium mt-0.5">
                                                    {new Date(session.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                                                <button
                                                    onClick={(e) => startEditingSession(session, e)}
                                                    className="p-1 hover:bg-slate-100 text-slate-500 hover:text-[#603DD9] rounded-md transition-all"
                                                    title="Rename Session"
                                                    aria-label="Rename session"
                                                >
                                                    <Pencil className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={(e) => deleteSession(session.id, e)}
                                                    className="p-1 hover:bg-red-50 text-slate-500 hover:text-red-500 rounded-md transition-all"
                                                    title="Delete Session"
                                                    aria-label="Delete session"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Main Chat Interface */}
                    <div className="flex-1 flex flex-col min-w-0 bg-white">
                        {/* Chat Header */}
                        <div className="h-12 border-b border-purple-100/70 flex items-center justify-between px-4 bg-white/90 backdrop-blur shrink-0 z-10">
                            <div className="flex items-center gap-2.5">
                                {!showHistory && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setShowHistory(true)}
                                        className="h-8 w-8 rounded-lg text-slate-700 hover:text-[#603DD9] hover:bg-[#603DD9]/8 transition-colors"
                                        title="Open chat sessions menu"
                                        aria-label="Open chat sessions menu"
                                    >
                                        <Menu className="w-4 h-4" />
                                    </Button>
                                )}
                                <div>
                                    <h2 className="font-bold text-xs sm:text-sm text-slate-800 flex items-center gap-2">
                                        <span className="truncate max-w-[200px] sm:max-w-[300px]">
                                            {sessions.find(s => s.id === sessionId)?.title || "Study Session"}
                                        </span>
                                    </h2>
                                </div>
                            </div>
                            <div className="text-xs text-slate-700 flex items-center gap-1.5 font-semibold">
                                <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-600'}`} />
                                <span className="text-[11px] font-bold text-[#5233bd]">{isLoading ? 'Generating response...' : 'AI Ready'}</span>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-5 scroll-smooth bg-slate-50/20">
                            {messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#603DD9] to-[#9E4CEC] flex items-center justify-center mb-4 text-white shadow-lg shadow-[#603DD9]/20 animate-float-slow">
                                        <Sparkles className="w-7 h-7" />
                                    </div>
                                    <h3 className="text-base font-black text-slate-800">StudyMate AI Copilot</h3>
                                    <p className="text-xs text-slate-600 max-w-xs mt-1.5 leading-relaxed font-medium">
                                        Ask questions, generate flashcards, summarize complex concepts, or test your knowledge across your materials.
                                    </p>
                                </div>
                            ) : (
                                messages.map(msg => (
                                    <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2`}>
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs text-xs font-black ${
                                            msg.role === 'user' 
                                                ? 'bg-[#603DD9] text-white' 
                                                : 'bg-gradient-to-br from-[#603DD9] to-[#9E4CEC] text-white'
                                        }`}>
                                            {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                        </div>
                                        <div className={`flex-1 max-w-[85%] space-y-1 group`}>
                                            <div className={`flex items-center gap-2 mb-1 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                                <span className="text-xs font-bold text-slate-700">{msg.role === 'user' ? 'You' : 'StudyMate AI'}</span>
                                                <span className="text-[10px] text-slate-600 font-medium">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>

                                            {editingMessageId === msg.id ? (
                                                <div className="bg-white p-3 rounded-2xl border-2 border-[#603DD9]/30 shadow-md">
                                                    <Input
                                                        value={editText}
                                                        onChange={e => setEditText(e.target.value)}
                                                        className="mb-2 bg-slate-50 border-slate-200 text-xs rounded-xl"
                                                        autoFocus
                                                    />
                                                    <div className="flex justify-end gap-2">
                                                        <Button size="sm" variant="ghost" className="text-xs h-8" onClick={cancelEditing}>Cancel</Button>
                                                        <Button size="sm" className="text-xs h-8 bg-[#603DD9] text-white hover:bg-[#5233bd] rounded-xl font-bold" onClick={() => saveEdit(msg.id)}>Save & Resend</Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className={`text-xs sm:text-sm leading-relaxed shadow-xs ${
                                                    msg.role === 'user'
                                                        ? 'text-white bg-gradient-to-r from-[#603DD9] to-[#9E4CEC] p-3.5 rounded-2xl rounded-tr-xs font-medium shadow-md shadow-[#603DD9]/15'
                                                        : 'text-slate-800 bg-white border border-purple-100/80 p-4 rounded-2xl rounded-tl-xs markdown-content'
                                                }`}>
                                                    {msg.role === 'assistant' ? <Markdown>{msg.content}</Markdown> : msg.content}
                                                </div>
                                            )}

                                            {/* Message Actions */}
                                            {msg.role === 'user' && !editingMessageId && (
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end pt-1">
                                                    <button onClick={() => { setEditText(msg.content); setEditingMessageId(msg.id); }} aria-label="Edit message" className="p-1 hover:bg-slate-100 rounded-md text-slate-500 hover:text-[#603DD9] transition-colors" title="Edit Message"><Pencil className="w-3 h-3" /></button>
                                                    <button onClick={() => deleteMessage(msg.id)} aria-label="Delete message" className="p-1 hover:bg-red-50 rounded-md text-slate-500 hover:text-red-500 transition-colors" title="Delete Message"><Trash2 className="w-3 h-3" /></button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                            {isLoading && (
                                <div className="flex gap-3 animate-in fade-in">
                                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#603DD9] to-[#9E4CEC] flex items-center justify-center shrink-0 text-white shadow-xs">
                                        <Bot className="w-4 h-4" />
                                    </div>
                                    <div className="bg-white border border-purple-100/80 rounded-2xl rounded-tl-xs p-3.5 flex gap-2 shadow-xs items-center">
                                        <span className="text-xs font-bold text-[#603DD9]">Thinking</span>
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#603DD9] animate-bounce" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#7B42E2] animate-bounce [animation-delay:-0.15s]" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#9E4CEC] animate-bounce [animation-delay:-0.3s]" />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-3.5 bg-white border-t border-purple-100/70">
                            <div className="relative flex items-end gap-2 max-w-4xl mx-auto">
                                <div className="relative flex-1">
                                    <Input
                                        placeholder={selectedDocuments.length > 0 ? `Ask about your ${selectedDocuments.length} active doc(s)...` : "Ask any study question or concept..."}
                                        className="pr-12 py-3 h-11 text-xs sm:text-sm shadow-xs border-slate-200 bg-slate-50/70 focus:bg-white focus:border-[#603DD9] focus:ring-2 focus:ring-[#603DD9]/20 transition-all rounded-xl font-medium"
                                        value={message}
                                        onChange={e => setMessage(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && !isLoading && (e.preventDefault(), handleSend())}
                                        aria-label="Chat Message"
                                    />
                                    <Button
                                        size="icon"
                                        className={`absolute right-1 top-1 w-9 h-9 rounded-lg transition-all ${
                                            message.trim() 
                                                ? 'bg-gradient-to-r from-[#603DD9] to-[#9E4CEC] text-white shadow-md shadow-[#603DD9]/25 hover:opacity-95 hover:scale-105 active:scale-95' 
                                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                        }`}
                                        onClick={handleSend}
                                        disabled={isLoading || !message.trim()}
                                        aria-label="Send message"
                                        title="Send message"
                                    >
                                        <Send className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                            <p className="text-center text-[11px] text-slate-600 mt-2 flex items-center justify-center gap-1.5 font-medium">
                                {selectedDocuments.length > 0 ? (
                                    <span className="flex items-center gap-1 text-[#603DD9] font-bold">
                                        <Sparkles className="w-3 h-3 text-[#9E4CEC]" /> 
                                        Referencing {selectedDocuments.length} active document(s) in context
                                    </span>
                                ) : (
                                    "✨ General Knowledge Mode • Select documents to reference them in chat"
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
