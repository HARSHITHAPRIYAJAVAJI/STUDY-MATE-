import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { supabase } from '@/lib/supabase'
import { API_BASE_URL } from '@/lib/api'
import {
    CreditCard,
    ChevronDown,
    RotateCw,
    Check,
    Sparkles,
    Loader2,
    Shuffle,
    Layers,
    BookOpen,
    HelpCircle,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Trash2,
    FolderOpen,
    Plus,
    Download,
    List,
    X,
} from 'lucide-react'
import { toast } from 'sonner'

export function Flashcards() {
    const [flipped, setFlipped] = useState(false)
    const [currentCard, setCurrentCard] = useState(0)
    const [flashcards, setFlashcards] = useState<any[]>([])
    const [documents, setDocuments] = useState<any[]>([])
    const [selectedDocId, setSelectedDocId] = useState<string>('')
    const [activeDeckId, setActiveDeckId] = useState<string>('all')
    const [cardCount, setCardCount] = useState<number>(5) // 5 or 10
    const [isGenerating, setIsGenerating] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [isExporting, setIsExporting] = useState(false)
    const [showManageModal, setShowManageModal] = useState(false)
    const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set())

    useEffect(() => {
        fetchInitialData()
    }, [])

    const fetchInitialData = async () => {
        setIsLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Fetch user documents
            const { data: docs } = await supabase
                .from('documents')
                .select('id, title')
                .eq('user_id', user.id)

            if (docs) {
                setDocuments(docs)
                if (docs.length > 0 && !selectedDocId) {
                    setSelectedDocId(docs[0].id.toString())
                }
            }

            // Fetch existing flashcards
            const { data: existingCards } = await supabase
                .from('flashcards')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            if (existingCards) {
                const seen = new Set<string>()
                const uniqueCards = existingCards.filter(card => {
                    const norm = card.question?.trim().toLowerCase().replace(/[?.,!]/g, '')
                    if (!norm || seen.has(norm)) return false
                    seen.add(norm)
                    return true
                })
                setFlashcards(uniqueCards)
            }
        } catch (error) {
            console.error("Error fetching flashcards:", error)
        } finally {
            setIsLoading(false)
        }
    }

    // Group flashcards into distinct document decks
    const decks = useMemo(() => {
        const docMap = new Map<string, string>()
        documents.forEach(d => docMap.set(d.id.toString(), d.title))

        const grouped = new Map<string, { id: string, title: string, cards: any[] }>()

        // Initialize entries for all documents
        documents.forEach(d => {
            grouped.set(d.id.toString(), {
                id: d.id.toString(),
                title: d.title,
                cards: []
            })
        })

        const unassigned: any[] = []

        flashcards.forEach(card => {
            const docId = card.document_id?.toString()
            if (docId && grouped.has(docId)) {
                grouped.get(docId)!.cards.push(card)
            } else if (docId) {
                // If doc was deleted or title not in current list
                if (!grouped.has(docId)) {
                    grouped.set(docId, {
                        id: docId,
                        title: card.tag || 'Study Material Deck',
                        cards: []
                    })
                }
                grouped.get(docId)!.cards.push(card)
            } else {
                unassigned.push(card)
            }
        })

        const activeDecks = Array.from(grouped.values()).filter(d => d.cards.length > 0)
        if (unassigned.length > 0) {
            activeDecks.push({
                id: 'general',
                title: 'General Study Deck',
                cards: unassigned
            })
        }

        return activeDecks
    }, [flashcards, documents])

    // Get current deck's cards
    const currentDeckCards = useMemo(() => {
        if (activeDeckId === 'all') return flashcards
        const foundDeck = decks.find(d => d.id === activeDeckId)
        return foundDeck ? foundDeck.cards : []
    }, [activeDeckId, decks, flashcards])

    const activeDeckName = activeDeckId === 'all' 
        ? 'All Combined Flashcards' 
        : (decks.find(d => d.id === activeDeckId)?.title || 'Document Deck')

    // Reset card index when active deck changes
    const handleSwitchDeck = (deckId: string) => {
        setActiveDeckId(deckId)
        setCurrentCard(0)
        setFlipped(false)
    }

    const handleGenerate = async () => {
        if (!selectedDocId) {
            toast.error("Please select a document first")
            return
        }

        setIsGenerating(true)
        try {
            const response = await fetch(`${API_BASE_URL}/api/ai/flashcards`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    documentId: selectedDocId,
                    count: cardCount
                })
            })

            const data = await response.json()

            if (!data.success || !data.flashcards) {
                throw new Error(data.error || "Failed to generate flashcards.")
            }

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Save generated flashcards with document_id to Supabase (prevent duplicate questions)
            const selectedDoc = documents.find(d => d.id.toString() === selectedDocId.toString())
            const existingQMap = new Set(flashcards.map(c => c.question?.trim().toLowerCase().replace(/[?.,!]/g, '')))
            
            const uniqueCardsForDb = data.flashcards
                .filter((card: any) => {
                    const norm = card.question?.trim().toLowerCase().replace(/[?.,!]/g, '')
                    if (!norm || existingQMap.has(norm)) return false
                    existingQMap.add(norm)
                    return true
                })
                .map((card: any) => ({
                    user_id: user.id,
                    document_id: selectedDocId,
                    question: card.question,
                    answer: card.answer,
                    tag: selectedDoc ? selectedDoc.title : (card.tag || 'AI Generated'),
                    difficulty: 'medium'
                }))

            if (uniqueCardsForDb.length === 0) {
                toast.info("All generated flashcard questions already exist in your deck!")
                return
            }

            const { data: insertedCards, error } = await supabase
                .from('flashcards')
                .insert(uniqueCardsForDb)
                .select()

            if (error) throw error

            if (insertedCards && insertedCards.length > 0) {
                setFlashcards(prev => {
                    const seen = new Set<string>()
                    const combined = [...insertedCards, ...prev]
                    return combined.filter(c => {
                        const norm = c.question?.trim().toLowerCase().replace(/[?.,!]/g, '')
                        if (!norm || seen.has(norm)) return false
                        seen.add(norm)
                        return true
                    })
                })
                // Automatically switch to the generated document's deck
                setActiveDeckId(selectedDocId)
                setCurrentCard(0)
                setFlipped(false)
                toast.success(`Generated ${insertedCards.length} new unique flashcard${insertedCards.length > 1 ? 's' : ''} for ${selectedDoc?.title || 'Document'}!`)
            }

        } catch (error: any) {
            console.error("Failed to generate:", error)
            toast.error(`Generation failed: ${error.message}`)
        } finally {
            setIsGenerating(false)
        }
    }

    const handleNext = useCallback(() => {
        if (currentDeckCards.length === 0) return
        setFlipped(false)
        setCurrentCard((prev) => (prev + 1) % currentDeckCards.length)
    }, [currentDeckCards.length])

    const handlePrevious = useCallback(() => {
        if (currentDeckCards.length === 0) return
        setFlipped(false)
        setCurrentCard((prev) => (prev - 1 + currentDeckCards.length) % currentDeckCards.length)
    }, [currentDeckCards.length])

    const toggleMastered = (id: string) => {
        setMasteredIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) {
                next.delete(id)
                toast.info("Marked as studying")
            } else {
                next.add(id)
                toast.success("Card marked as Mastered! 🎉")
            }
            return next
        })
    }

    const shuffleCards = () => {
        if (currentDeckCards.length <= 1) return
        const shuffled = [...currentDeckCards].sort(() => Math.random() - 0.5)
        
        if (activeDeckId === 'all') {
            setFlashcards(shuffled)
        } else {
            setFlashcards(prev => {
                const otherCards = prev.filter(c => c.document_id?.toString() !== activeDeckId)
                return [...shuffled, ...otherCards]
            })
        }
        setCurrentCard(0)
        setFlipped(false)
        toast.info("Current deck shuffled!")
    }

    // Delete single card with confirmation
    const deleteCard = async (id: string) => {
        if (!confirm("Are you sure you want to delete this flashcard?")) return

        try {
            const { error } = await supabase.from('flashcards').delete().eq('id', id)
            if (error) throw error

            setFlashcards(prev => prev.filter(c => c.id !== id))
            if (currentCard >= currentDeckCards.length - 1 && currentCard > 0) {
                setCurrentCard(prev => prev - 1)
            }
            toast.success("Flashcard deleted successfully")
        } catch (error: any) {
            console.error("Delete failed:", error)
            toast.error("Failed to delete card: " + (error.message || ''))
        }
    }

    // Delete all cards in active deck
    const deleteEntireDeck = async () => {
        if (currentDeckCards.length === 0) return
        const confirmMsg = activeDeckId === 'all'
            ? `Are you sure you want to delete ALL ${flashcards.length} flashcards across all decks?`
            : `Are you sure you want to delete all ${currentDeckCards.length} flashcards in "${activeDeckName}"?`

        if (!confirm(confirmMsg)) return

        try {
            const cardIdsToDelete = currentDeckCards.map(c => c.id)
            const { error } = await supabase.from('flashcards').delete().in('id', cardIdsToDelete)
            if (error) throw error

            setFlashcards(prev => prev.filter(c => !cardIdsToDelete.includes(c.id)))
            setActiveDeckId('all')
            setCurrentCard(0)
            setFlipped(false)
            setShowManageModal(false)
            toast.success("Deck deleted successfully")
        } catch (error: any) {
            console.error("Delete deck failed:", error)
            toast.error("Failed to delete deck: " + (error.message || ''))
        }
    }

    // Export current deck to formatted PDF
    const handleExportPDF = async () => {
        if (currentDeckCards.length === 0) {
            toast.error("No flashcards to export in this deck.")
            return
        }

        setIsExporting(true)
        try {
            const { default: jsPDF } = await import('jspdf')
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            })

            const pageWidth = doc.internal.pageSize.getWidth()
            const pageHeight = doc.internal.pageSize.getHeight()
            const margin = 16
            const contentWidth = pageWidth - (margin * 2)

            // Header Banner
            doc.setFillColor(96, 61, 217) // #603DD9
            doc.rect(0, 0, pageWidth, 28, 'F')

            doc.setTextColor(255, 255, 255)
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(16)
            doc.text('StudyMate+ • Flashcard Study Deck', margin, 12)

            doc.setFont('helvetica', 'normal')
            doc.setFontSize(9)
            doc.text(`Deck: ${activeDeckName}   |   Cards: ${currentDeckCards.length}   |   Generated: ${new Date().toLocaleDateString()}`, margin, 20)

            let yPosition = 36

            currentDeckCards.forEach((card, index) => {
                const qLines = doc.splitTextToSize(`Q: ${card.question}`, contentWidth - 14)
                const aLines = doc.splitTextToSize(`A: ${card.answer}`, contentWidth - 14)
                const cardHeight = 10 + (qLines.length * 5) + (aLines.length * 5) + 6

                // Add new page if overflowing
                if (yPosition + cardHeight > pageHeight - margin) {
                    doc.addPage()
                    yPosition = margin + 4
                }

                // Card container box
                doc.setDrawColor(226, 232, 240) // border slate-200
                doc.setFillColor(248, 250, 252) // bg slate-50
                doc.roundedRect(margin, yPosition, contentWidth, cardHeight, 3, 3, 'FD')

                // Card Number & Tag
                doc.setFont('helvetica', 'bold')
                doc.setFontSize(8.5)
                doc.setTextColor(96, 61, 217)
                doc.text(`CARD ${index + 1}  •  ${card.tag || activeDeckName}`, margin + 6, yPosition + 6.5)

                // Question
                doc.setFont('helvetica', 'bold')
                doc.setFontSize(9.5)
                doc.setTextColor(30, 41, 59)
                doc.text(qLines, margin + 6, yPosition + 13)

                // Answer
                const ansY = yPosition + 13 + (qLines.length * 5) + 1.5
                doc.setFont('helvetica', 'normal')
                doc.setFontSize(9.5)
                doc.setTextColor(71, 85, 105)
                doc.text(aLines, margin + 6, ansY)

                yPosition += cardHeight + 5
            })

            const safeFileName = `${activeDeckName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_flashcards.pdf`
            doc.save(safeFileName)
            toast.success(`Exported ${currentDeckCards.length} flashcards to PDF!`)
        } catch (error: any) {
            console.error("PDF export error:", error)
            toast.error("Failed to generate PDF: " + (error.message || ''))
        } finally {
            setIsExporting(false)
        }
    }

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (['input', 'textarea', 'select'].includes((e.target as HTMLElement).tagName.toLowerCase())) return
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault()
                setFlipped(prev => !prev)
            } else if (e.key === 'ArrowRight') {
                handleNext()
            } else if (e.key === 'ArrowLeft') {
                handlePrevious()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handleNext, handlePrevious])

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="w-10 h-10 text-[#603DD9] animate-spin mb-4" />
                <p className="text-slate-500 font-bold text-sm">Loading your document flashcard decks...</p>
            </div>
        )
    }

    const activeCard = currentDeckCards[currentCard]
    const isCurrentMastered = activeCard ? masteredIds.has(activeCard.id) : false
    const currentDeckMasteredCount = currentDeckCards.filter(c => masteredIds.has(c.id)).length

    return (
        <div className="space-y-4 animate-fade-in max-w-5xl mx-auto pt-0">
            {/* Header */}
            <div className="text-center space-y-1 pt-0">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-[#603DD9] via-[#7B42E2] to-[#9E4CEC] bg-clip-text text-transparent tracking-tight">
                    Smart Flashcard Decks
                </h1>
                <p className="text-slate-500 max-w-lg mx-auto text-xs sm:text-sm font-normal">
                    Active recall flashcard decks separated by document, with PDF export and card management.
                </p>
            </div>

            {/* AI Flashcard Generator Card */}
            <Card className="bg-white/95 border border-purple-100 shadow-md shadow-purple-500/5 rounded-2xl overflow-hidden">
                <CardContent className="p-5 sm:p-6">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
                        <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#603DD9] to-[#9E4CEC] flex items-center justify-center flex-shrink-0 shadow-md shadow-[#603DD9]/20 text-white">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm sm:text-base font-black text-slate-800 tracking-tight">Generate Document Deck</h3>
                                <p className="text-xs text-slate-500 font-medium">
                                    Select a document to create an isolated flashcard study deck
                                </p>
                            </div>
                        </div>

                        {/* Generator Controls */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
                            {/* Document Selector */}
                            <div className="relative flex-1 sm:w-60">
                                <select
                                    className="appearance-none w-full bg-slate-50 border border-slate-200/90 rounded-xl px-3.5 py-2 pr-9 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#603DD9]/20 focus:border-[#603DD9] cursor-pointer h-10 transition-all"
                                    value={selectedDocId}
                                    onChange={(e) => setSelectedDocId(e.target.value)}
                                >
                                    <option value="">Select Document...</option>
                                    {documents.map(doc => (
                                        <option key={doc.id} value={doc.id}>{doc.title}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>

                            {/* Card Count Selector (5 or 10) */}
                            <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/70">
                                <button
                                    type="button"
                                    onClick={() => setCardCount(5)}
                                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                                        cardCount === 5
                                            ? 'bg-white text-[#603DD9] shadow-xs font-black'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    5 Cards
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCardCount(10)}
                                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                                        cardCount === 10
                                            ? 'bg-white text-[#603DD9] shadow-xs font-black'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    10 Cards
                                </button>
                            </div>

                            {/* Generate Button */}
                            <Button
                                className="h-10 px-5 bg-gradient-to-r from-[#603DD9] to-[#9E4CEC] hover:opacity-95 text-white shadow-md shadow-[#603DD9]/20 gap-2 font-bold text-xs rounded-xl transition-all hover:scale-105 active:scale-95"
                                onClick={handleGenerate}
                                disabled={isGenerating || !selectedDocId}
                            >
                                {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                {isGenerating ? `Generating...` : `Generate (${cardCount})`}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Document Decks Filter / Selector & Top Tools */}
            {decks.length > 0 && (
                <div className="space-y-2.5">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <FolderOpen className="w-3.5 h-3.5 text-[#603DD9]" />
                            Document Decks ({decks.length})
                        </span>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleExportPDF}
                                disabled={isExporting || currentDeckCards.length === 0}
                                className="h-8 px-3 text-xs font-bold rounded-xl border-purple-200/80 text-[#603DD9] hover:bg-purple-50 gap-1.5 shadow-xs transition-all"
                            >
                                {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                <span>Save as PDF</span>
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowManageModal(true)}
                                className="h-8 px-3 text-xs font-bold rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5 shadow-xs"
                            >
                                <List className="w-3.5 h-3.5 text-slate-500" />
                                <span>Manage Cards</span>
                            </Button>
                        </div>
                    </div>

                    {/* Scrollable Deck Selector Pills */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                        {/* All Cards Combined Pill */}
                        <button
                            type="button"
                            onClick={() => handleSwitchDeck('all')}
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 border ${
                                activeDeckId === 'all'
                                    ? 'bg-gradient-to-r from-[#603DD9] to-[#9E4CEC] text-white border-transparent shadow-md shadow-[#603DD9]/20 font-black'
                                    : 'bg-white text-slate-700 border-slate-200/80 hover:bg-purple-50/40 hover:border-[#603DD9]/30'
                            }`}
                        >
                            <Layers className="w-3.5 h-3.5" />
                            <span>All Decks</span>
                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                                activeDeckId === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                                {flashcards.length}
                            </span>
                        </button>

                        {/* Individual Document Decks */}
                        {decks.map(deck => {
                            const isDeckActive = activeDeckId === deck.id
                            return (
                                <button
                                    key={deck.id}
                                    type="button"
                                    onClick={() => handleSwitchDeck(deck.id)}
                                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 border max-w-[240px] truncate ${
                                        isDeckActive
                                            ? 'bg-gradient-to-r from-[#603DD9] to-[#9E4CEC] text-white border-transparent shadow-md shadow-[#603DD9]/20 font-black'
                                            : 'bg-white text-slate-700 border-slate-200/80 hover:bg-purple-50/40 hover:border-[#603DD9]/30'
                                    }`}
                                >
                                    <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
                                    <span className="truncate">{deck.title}</span>
                                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black flex-shrink-0 ${
                                        isDeckActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                        {deck.cards.length}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Flashcard Viewer */}
            {currentDeckCards.length > 0 ? (
                <div className="max-w-3xl mx-auto space-y-5">
                    {/* Top Bar: Progress & Tools for Current Deck */}
                    <div className="flex flex-wrap items-center justify-between text-xs px-1 gap-2">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <span className="text-slate-800 font-bold flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-[#603DD9]" />
                                Card {currentCard + 1} of {currentDeckCards.length}
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-600 font-semibold truncate max-w-[180px] sm:max-w-[240px]">
                                {activeDeckName}
                            </span>
                            {currentDeckMasteredCount > 0 && (
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-bold">
                                    {currentDeckMasteredCount} Mastered
                                </Badge>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <Badge className="bg-purple-50 text-[#603DD9] border-purple-200/70 px-2.5 py-1 font-bold text-[11px] max-w-[150px] truncate">
                                {activeCard.tag || activeDeckName}
                            </Badge>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={shuffleCards}
                                className="h-7 px-2 text-xs text-slate-500 hover:text-[#603DD9] hover:bg-[#603DD9]/8 gap-1 rounded-lg"
                                title="Shuffle Deck"
                            >
                                <Shuffle className="w-3 h-3" />
                                Shuffle
                            </Button>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                            className="bg-gradient-to-r from-[#603DD9] to-[#9E4CEC] h-full transition-all duration-300 rounded-full"
                            style={{ width: `${((currentCard + 1) / currentDeckCards.length) * 100}%` }}
                        />
                    </div>

                    {/* Card Container (3D Flip) */}
                    <div
                        className="relative h-[360px] sm:h-[390px] cursor-pointer group select-none"
                        style={{ perspective: '1200px' }}
                        onClick={() => setFlipped(!flipped)}
                    >
                        <div
                            className="absolute inset-0 transition-all duration-500 ease-out"
                            style={{
                                transformStyle: 'preserve-3d',
                                transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                            }}
                        >
                            {/* Front: Question */}
                            <Card
                                className={`absolute inset-0 bg-white shadow-xl border border-purple-100/70 rounded-3xl overflow-hidden flex flex-col justify-between p-7 sm:p-10 transition-all group-hover:shadow-2xl ${
                                    isCurrentMastered ? 'ring-2 ring-emerald-500/50' : ''
                                }`}
                                style={{ backfaceVisibility: 'hidden' }}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <span className="inline-flex items-center gap-1.5 text-xs font-black text-[#603DD9] uppercase tracking-wider bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
                                        <HelpCircle className="w-3.5 h-3.5" /> Question
                                    </span>
                                    {isCurrentMastered && (
                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Mastered
                                        </span>
                                    )}
                                </div>

                                <div className="text-center my-auto px-2">
                                    <h2 className="text-xl sm:text-2xl font-normal text-slate-800 leading-snug">
                                        {activeCard.question}
                                    </h2>
                                </div>

                                <div className="flex items-center justify-center gap-2 text-slate-400 text-xs font-medium bg-slate-50/90 border border-slate-100 px-4 py-1.5 rounded-full w-fit mx-auto">
                                    <RotateCw className="w-3.5 h-3.5 text-[#603DD9]" />
                                    Click or press Space to reveal answer
                                </div>
                            </Card>

                            {/* Back: Answer */}
                            <Card
                                className="absolute inset-0 bg-gradient-to-br from-[#603DD9] via-[#7B42E2] to-[#9E4CEC] text-white shadow-2xl rounded-3xl overflow-hidden flex flex-col justify-between p-7 sm:p-10"
                                style={{
                                    backfaceVisibility: 'hidden',
                                    transform: 'rotateY(180deg)'
                                }}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <span className="inline-flex items-center gap-1.5 text-xs font-black text-purple-100 uppercase tracking-wider bg-white/15 px-3 py-1 rounded-full backdrop-blur-sm border border-white/20">
                                        <BookOpen className="w-3.5 h-3.5" /> Answer
                                    </span>
                                    <span className="text-xs text-purple-200 font-semibold max-w-[200px] truncate">
                                        {activeCard.tag || activeDeckName}
                                    </span>
                                </div>

                                <div className="text-center my-auto px-2 overflow-y-auto max-h-[220px]">
                                    <p className="text-lg sm:text-xl text-white font-semibold leading-relaxed">
                                        {activeCard.answer}
                                    </p>
                                </div>

                                <div className="flex items-center justify-center gap-2 text-purple-200 text-xs font-medium bg-white/10 px-4 py-1.5 rounded-full w-fit mx-auto backdrop-blur-sm">
                                    <RotateCw className="w-3.5 h-3.5" />
                                    Click or press Space to see question
                                </div>
                            </Card>
                        </div>
                    </div>

                    {/* Bottom Controls */}
                    <div className="flex items-center justify-between gap-3 pt-1">
                        <Button
                            variant="outline"
                            className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 px-4 sm:px-5 h-10 rounded-xl shadow-xs gap-1.5 font-bold text-xs"
                            onClick={(e) => { e.stopPropagation(); handlePrevious(); }}
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Previous
                        </Button>

                        {/* Middle Actions: Delete & Mastery */}
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-10 px-3 bg-white border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 rounded-xl transition-all shadow-xs"
                                onClick={(e) => { e.stopPropagation(); deleteCard(activeCard.id); }}
                                title="Delete flashcard"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                className={`h-10 px-4 rounded-xl border transition-all shadow-xs font-bold text-xs gap-1.5 ${
                                    isCurrentMastered
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                        : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50'
                                }`}
                                onClick={(e) => { e.stopPropagation(); toggleMastered(activeCard.id); }}
                            >
                                <Check className={`w-3.5 h-3.5 ${isCurrentMastered ? 'text-emerald-600' : 'text-slate-400'}`} />
                                {isCurrentMastered ? 'Mastered' : 'Mark as Mastered'}
                            </Button>
                        </div>

                        <Button
                            variant="outline"
                            className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 px-4 sm:px-5 h-10 rounded-xl shadow-xs gap-1.5 font-bold text-xs"
                            onClick={(e) => { e.stopPropagation(); handleNext(); }}
                        >
                            Next
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            ) : (
                <EmptyState
                    icon={<CreditCard className="w-16 h-16 text-purple-200" />}
                    title={activeDeckId === 'all' ? "No Flashcards Found" : `Deck is Empty`}
                    description={
                        activeDeckId === 'all'
                            ? "Select a document in the generator above to create your first flashcard deck."
                            : `This document doesn't have flashcards yet. Generate cards using the box above!`
                    }
                    action={
                        <Button
                            className="bg-gradient-to-r from-[#603DD9] to-[#9E4CEC] hover:opacity-95 px-6 h-10 shadow-lg shadow-[#603DD9]/20 font-bold rounded-xl text-white text-xs"
                            onClick={() => {
                                const select = document.querySelector('select');
                                select?.focus();
                            }}
                        >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Select Document to Generate
                        </Button>
                    }
                />
            )}

            {/* Manage Cards Modal */}
            {showManageModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-slide-in">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                                    <List className="w-4 h-4 text-[#603DD9]" />
                                    Manage Cards • {activeDeckName}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {currentDeckCards.length} flashcard(s) in this deck
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-xl text-slate-400 hover:text-slate-800"
                                onClick={() => setShowManageModal(false)}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* Card List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                            {currentDeckCards.map((card, idx) => (
                                <div
                                    key={card.id}
                                    className="p-3.5 rounded-2xl border border-slate-200/90 bg-white hover:border-[#603DD9]/30 transition-all flex items-start justify-between gap-3 shadow-xs"
                                >
                                    <div className="space-y-1 flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-[#603DD9] bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                                                #{idx + 1}
                                            </span>
                                            <span className="text-[11px] font-bold text-slate-400 truncate">
                                                {card.tag || activeDeckName}
                                            </span>
                                        </div>
                                        <p className="text-xs font-normal text-slate-800 leading-snug">
                                            {card.question}
                                        </p>
                                        <p className="text-xs text-slate-500 font-medium line-clamp-2">
                                            {card.answer}
                                        </p>
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl shrink-0"
                                        onClick={() => deleteCard(card.id)}
                                        title="Delete Card"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}

                            {currentDeckCards.length === 0 && (
                                <p className="text-center text-xs text-slate-400 py-8">No flashcards in this deck.</p>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            {currentDeckCards.length > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={deleteEntireDeck}
                                    className="text-red-600 border-red-200 hover:bg-red-50 text-xs font-bold rounded-xl h-9 gap-1.5"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Delete Entire Deck
                                </Button>
                            )}
                            <Button
                                size="sm"
                                onClick={() => setShowManageModal(false)}
                                className="bg-[#603DD9] text-white hover:bg-[#5233bd] text-xs font-bold rounded-xl h-9 px-5 ml-auto"
                            >
                                Done
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
