import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
    ClipboardList,
    ChevronDown,
    Sparkles,
    CheckCircle2,
    XCircle,
    Loader2,
    RotateCcw,
    Award,
    BookOpen,
    HelpCircle,
    Eye,
    ArrowRight,
    Trophy,
    Target
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export function Quizzes() {
    const [quizStarted, setQuizStarted] = useState(false)
    const [currentQuestion, setCurrentQuestion] = useState(0)
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
    const [userAnswers, setUserAnswers] = useState<{ [questionIndex: number]: number }>({})
    const [showResults, setShowResults] = useState(false)
    const [score, setScore] = useState(0)
    const [showReview, setShowReview] = useState(false)

    const [documents, setDocuments] = useState<any[]>([])
    const [selectedDocId, setSelectedDocId] = useState<string>('')
    const [questionCount, setQuestionCount] = useState<number>(5) // 5 or 10
    const [difficulty, setDifficulty] = useState<string>('medium')
    const [isGenerating, setIsGenerating] = useState(false)
    const [quiz, setQuiz] = useState<any[]>([])
    const [hasAnswered, setHasAnswered] = useState(false)

    useEffect(() => {
        fetchDocuments()
    }, [])

    const fetchDocuments = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data } = await supabase.from('documents').select('id, title').eq('user_id', user.id)
            if (data) setDocuments(data)
        } catch (error) {
            console.error("Error fetching docs:", error)
        }
    }

    const handleGenerateQuiz = async () => {
        if (!selectedDocId) {
            toast.error("Please select a document first")
            return
        }

        setIsGenerating(true)
        try {
            const response = await fetch('http://127.0.0.1:3001/api/ai/quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    documentId: selectedDocId,
                    count: questionCount,
                    difficulty: difficulty
                })
            })

            const data = await response.json()
            if (!data.success) throw new Error(data.error || "Failed to generate quiz")

            const generatedQuiz = data.quiz.map((q: any) => ({
                id: Math.random().toString(),
                question: q.question,
                options: q.options,
                correctAnswer: q.options.indexOf(q.correct_answer),
                explanation: q.explanation || "Correct choice as stated in document context."
            }))

            if (generatedQuiz.length === 0) throw new Error("No questions generated.")

            setQuiz(generatedQuiz)
            setQuizStarted(true)
            setCurrentQuestion(0)
            setSelectedAnswer(null)
            setUserAnswers({})
            setShowResults(false)
            setShowReview(false)
            setScore(0)
            setHasAnswered(false)
            toast.success(`Quiz with ${generatedQuiz.length} questions ready!`)

        } catch (error: any) {
            console.error("Quiz Error:", error)
            toast.error(error.message)
        } finally {
            setIsGenerating(false)
        }
    }

    const handleOptionSelect = (index: number) => {
        if (hasAnswered) return
        setSelectedAnswer(index)
        setHasAnswered(true)
        setUserAnswers(prev => ({ ...prev, [currentQuestion]: index }))

        if (index === quiz[currentQuestion].correctAnswer) {
            setScore(prev => prev + 1)
        }
    }

    const handleNext = () => {
        setHasAnswered(false)
        if (currentQuestion < quiz.length - 1) {
            setCurrentQuestion(currentQuestion + 1)
            setSelectedAnswer(null)
        } else {
            setShowResults(true)
        }
    }

    const retakeSameQuiz = () => {
        setCurrentQuestion(0)
        setSelectedAnswer(null)
        setUserAnswers({})
        setShowResults(false)
        setShowReview(false)
        setScore(0)
        setHasAnswered(false)
        toast.info("Quiz reset! Good luck!")
    }

    const resetToSetup = () => {
        setQuizStarted(false)
        setQuiz([])
        setScore(0)
        setCurrentQuestion(0)
        setUserAnswers({})
        setShowResults(false)
        setShowReview(false)
        setHasAnswered(false)
    }

    const selectedDocTitle = documents.find(d => d.id === selectedDocId)?.title || "Document"
    const scorePercentage = quiz.length > 0 ? Math.round((score / quiz.length) * 100) : 0

    // Dynamic grade message & color
    const getGradeInfo = (pct: number) => {
        if (pct === 100) return { title: "Mastery Level: 100%", subtitle: "Flawless score! You have thoroughly mastered this material.", icon: Trophy, color: "text-amber-500", bg: "bg-amber-50", border: "border-amber-200" }
        if (pct >= 80) return { title: "Outstanding Work!", subtitle: "Great comprehension and retention of the study material.", icon: Award, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" }
        if (pct >= 60) return { title: "Good Effort!", subtitle: "Solid foundation, with a few concepts to review.", icon: Target, color: "text-[#603DD9]", bg: "bg-purple-50", border: "border-purple-200" }
        return { title: "Keep Practicing!", subtitle: "Review the answers below or practice flashcards to strengthen weak spots.", icon: BookOpen, color: "text-[#603DD9]", bg: "bg-purple-50", border: "border-purple-200" }
    }

    const grade = getGradeInfo(scorePercentage)
    const GradeIcon = grade.icon

    return (
        <div className="space-y-4 animate-fade-in max-w-4xl mx-auto pt-0">
            {/* Header */}
            <div className="text-center space-y-1 pt-0">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-[#603DD9] via-[#7B42E2] to-[#9E4CEC] bg-clip-text text-transparent tracking-tight">
                    Smart Quiz Center
                </h1>
                <p className="text-slate-500 max-w-lg mx-auto text-xs sm:text-sm font-normal">
                    Test your knowledge with adaptive AI quizzes generated directly from your study documents.
                </p>
            </div>

            {!quizStarted ? (
                /* Balanced Quiz Setup Card */
                <div className="max-w-xl mx-auto">
                    <Card className="bg-white border border-purple-100 shadow-xl shadow-purple-500/5 rounded-3xl overflow-hidden backdrop-blur-sm">
                        <CardContent className="p-6 sm:p-8">
                            <div className="text-center space-y-5">
                                <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-[#603DD9] to-[#9E4CEC] flex items-center justify-center shadow-md shadow-[#603DD9]/20 text-white">
                                    <ClipboardList className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">Generate AI Quiz</h2>
                                    <p className="text-slate-500 text-xs sm:text-sm mt-0.5 font-normal">
                                        Customize your quiz options and test your knowledge
                                    </p>
                                </div>

                                <div className="space-y-4 max-w-md mx-auto text-left">
                                    {/* Document Selection */}
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                                            1. Select Study Document
                                        </label>
                                        <div className="relative">
                                            <select
                                                className="w-full appearance-none bg-slate-50 border border-slate-200/90 rounded-xl px-3.5 py-2.5 pr-9 text-xs sm:text-sm font-normal text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#603DD9]/20 focus:border-[#603DD9] cursor-pointer shadow-xs transition-all h-10"
                                                value={selectedDocId}
                                                onChange={(e) => setSelectedDocId(e.target.value)}
                                            >
                                                <option value="">Choose a document...</option>
                                                {documents.map(doc => (
                                                    <option key={doc.id} value={doc.id}>{doc.title}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* Question Count (5 or 10) */}
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                                            2. Number of Questions
                                        </label>
                                        <div className="grid grid-cols-2 gap-2.5">
                                            <button
                                                type="button"
                                                onClick={() => setQuestionCount(5)}
                                                className={`py-2 px-3 rounded-xl border text-xs sm:text-sm font-medium transition-all ${
                                                    questionCount === 5
                                                        ? 'bg-[#603DD9] text-white border-[#603DD9] shadow-sm font-semibold'
                                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                                }`}
                                            >
                                                5 Questions (Quick)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setQuestionCount(10)}
                                                className={`py-2 px-3 rounded-xl border text-xs sm:text-sm font-medium transition-all ${
                                                    questionCount === 10
                                                        ? 'bg-[#603DD9] text-white border-[#603DD9] shadow-sm font-semibold'
                                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                                }`}
                                            >
                                                10 Questions (In-Depth)
                                            </button>
                                        </div>
                                    </div>

                                    {/* Difficulty Level */}
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                                            3. Difficulty Level
                                        </label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['easy', 'medium', 'hard'].map((lvl) => (
                                                <button
                                                    key={lvl}
                                                    type="button"
                                                    onClick={() => setDifficulty(lvl)}
                                                    className={`py-2 px-3 rounded-xl border text-xs sm:text-sm font-medium capitalize transition-all ${
                                                        difficulty === lvl
                                                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs font-semibold'
                                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    {lvl}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    size="lg"
                                    className="w-full max-w-md gap-2 bg-gradient-to-r from-[#603DD9] to-[#9E4CEC] hover:opacity-95 shadow-md shadow-[#603DD9]/20 font-semibold h-11 rounded-xl text-white text-xs sm:text-sm transition-all hover:scale-[1.02] active:scale-[0.98] mt-1"
                                    onClick={handleGenerateQuiz}
                                    disabled={isGenerating || !selectedDocId}
                                >
                                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                    {isGenerating ? `Generating ${questionCount} Questions...` : `Start Quiz (${questionCount} Qs)`}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            ) : !showResults ? (
                /* Interactive Quiz Card */
                <div className="max-w-3xl mx-auto space-y-5">
                    {/* Header bar: Progress info */}
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <Badge className="bg-purple-50 text-[#603DD9] border-purple-200/80 font-semibold px-3 py-1 text-xs">
                                {selectedDocTitle}
                            </Badge>
                            <Badge variant="outline" className="text-slate-500 font-medium capitalize text-xs">
                                {difficulty}
                            </Badge>
                        </div>
                        <span className="text-xs font-semibold text-slate-700">
                            Question {currentQuestion + 1} of {quiz.length}
                        </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                            className="bg-gradient-to-r from-[#603DD9] to-[#9E4CEC] h-full transition-all duration-300 rounded-full"
                            style={{ width: `${((currentQuestion + 1) / quiz.length) * 100}%` }}
                        />
                    </div>

                    {/* Question Card */}
                    <Card className="border border-purple-100 shadow-xl rounded-3xl overflow-hidden bg-white">
                        <CardContent className="p-6 sm:p-8 space-y-5">
                            <div className="flex items-start gap-3">
                                <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-purple-50 text-[#603DD9] font-bold text-xs shrink-0 mt-0.5 border border-purple-100">
                                    {currentQuestion + 1}
                                </span>
                                <h3 className="text-base sm:text-lg font-semibold text-slate-800 leading-snug">
                                    {quiz[currentQuestion].question}
                                </h3>
                            </div>

                            {/* Options */}
                            <div className="space-y-2.5 pt-1">
                                {quiz[currentQuestion].options.map((option: string, index: number) => {
                                    const isSelected = selectedAnswer === index
                                    const isCorrect = index === quiz[currentQuestion].correctAnswer

                                    let buttonStyle = 'border-slate-200/90 bg-white hover:border-[#603DD9]/40 hover:bg-purple-50/20'
                                    let circleStyle = 'border-slate-300 bg-white text-slate-600'
                                    let textStyle = 'text-slate-700 font-normal'

                                    if (hasAnswered) {
                                        if (isCorrect) {
                                            buttonStyle = 'border-emerald-500 bg-emerald-50/70 shadow-xs'
                                            circleStyle = 'border-emerald-500 bg-emerald-500 text-white'
                                            textStyle = 'text-emerald-900 font-semibold'
                                        } else if (isSelected) {
                                            buttonStyle = 'border-rose-500 bg-rose-50/70 shadow-xs'
                                            circleStyle = 'border-rose-500 bg-rose-500 text-white'
                                            textStyle = 'text-rose-900 font-semibold'
                                        } else {
                                            buttonStyle = 'border-slate-100 opacity-40 bg-slate-50'
                                            circleStyle = 'border-slate-200 bg-slate-100 text-slate-400'
                                            textStyle = 'text-slate-400'
                                        }
                                    } else if (isSelected) {
                                        buttonStyle = 'border-[#603DD9] bg-purple-50 shadow-xs'
                                        circleStyle = 'border-[#603DD9] bg-[#603DD9] text-white'
                                        textStyle = 'text-[#603DD9] font-medium'
                                    }

                                    const letter = String.fromCharCode(65 + index)

                                    return (
                                        <button
                                            key={index}
                                            onClick={() => handleOptionSelect(index)}
                                            disabled={hasAnswered}
                                            className={`w-full text-left px-4 py-3 rounded-2xl border-2 transition-all duration-200 ${buttonStyle}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 font-semibold text-xs transition-colors ${circleStyle}`}
                                                >
                                                    {hasAnswered && isCorrect ? (
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                    ) : hasAnswered && isSelected && !isCorrect ? (
                                                        <XCircle className="w-3.5 h-3.5" />
                                                    ) : (
                                                        letter
                                                    )}
                                                </div>
                                                <span className={`text-xs sm:text-sm flex-1 ${textStyle}`}>
                                                    {option}
                                                </span>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>

                            {/* Explanation Box on Answer */}
                            {hasAnswered && (
                                <div className="mt-3 p-3.5 rounded-2xl bg-purple-50/60 border border-purple-100 text-xs animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center gap-1.5 font-semibold text-[#603DD9] mb-1">
                                        <HelpCircle className="w-3.5 h-3.5 text-[#603DD9]" />
                                        Explanation:
                                    </div>
                                    <p className="text-slate-700 leading-relaxed font-normal">
                                        {quiz[currentQuestion].explanation}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Navigation */}
                    <div className="flex justify-end">
                        {hasAnswered && (
                            <Button
                                onClick={handleNext}
                                className="bg-gradient-to-r from-[#603DD9] to-[#9E4CEC] hover:opacity-95 text-white px-7 h-10 rounded-xl shadow-md shadow-[#603DD9]/20 font-semibold gap-2 text-xs animate-in fade-in slide-in-from-bottom-2"
                            >
                                <span>{currentQuestion < quiz.length - 1 ? 'Next Question' : 'View Results'}</span>
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </div>
            ) : (
                /* Results Screen */
                <div className="max-w-2xl mx-auto space-y-6">
                    <Card className="border border-purple-100 shadow-2xl rounded-3xl overflow-hidden bg-white text-center p-6 sm:p-10">
                        <CardContent className="space-y-5 p-0">
                            <div className="w-18 h-18 mx-auto rounded-3xl bg-gradient-to-br from-[#603DD9] to-[#9E4CEC] flex items-center justify-center shadow-xl shadow-[#603DD9]/25 text-white">
                                <GradeIcon className="w-9 h-9" />
                            </div>

                            <div className="space-y-1.5">
                                <Badge className={`${grade.bg} ${grade.color} ${grade.border} text-xs font-semibold px-3 py-1`}>
                                    Quiz Complete
                                </Badge>
                                <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">{grade.title}</h2>
                                <p className="text-slate-500 text-xs sm:text-sm font-normal">{grade.subtitle}</p>
                            </div>

                            {/* Score Display */}
                            <div className="p-5 rounded-2xl bg-purple-50/50 border border-purple-100 max-w-sm mx-auto">
                                <div className="text-4xl sm:text-5xl font-black text-[#603DD9]">
                                    {score} <span className="text-slate-400 text-xl sm:text-2xl font-normal">/ {quiz.length}</span>
                                </div>
                                <p className="text-xs font-normal text-slate-500 mt-1">
                                    Accuracy: <strong className="text-slate-800 font-semibold">{scorePercentage}%</strong>
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    onClick={retakeSameQuiz}
                                    className="w-full sm:w-auto h-10 px-5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-xs gap-1.5"
                                >
                                    <RotateCcw className="w-3.5 h-3.5 text-[#603DD9]" />
                                    Retake Quiz
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowReview(!showReview)}
                                    className="w-full sm:w-auto h-10 px-5 rounded-xl border-purple-200 text-[#603DD9] hover:bg-purple-50 font-medium text-xs gap-1.5"
                                >
                                    <Eye className="w-3.5 h-3.5" />
                                    {showReview ? "Hide Answers" : "Review Answers"}
                                </Button>
                                <Button
                                    onClick={resetToSetup}
                                    className="w-full sm:w-auto h-10 px-6 rounded-xl bg-gradient-to-r from-[#603DD9] to-[#9E4CEC] hover:opacity-95 text-white font-semibold text-xs shadow-md shadow-[#603DD9]/20"
                                >
                                    New Quiz
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Detailed Review Section */}
                    {showReview && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                            <h3 className="font-semibold text-sm text-slate-800 px-1">Detailed Answer Review:</h3>
                            {quiz.map((q, qIndex) => {
                                const userAns = userAnswers[qIndex]
                                const isCorrect = userAns === q.correctAnswer
                                return (
                                    <Card key={qIndex} className="border border-slate-200/90 rounded-2xl overflow-hidden bg-white p-4 space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-2">
                                                <span className="font-semibold text-xs text-[#603DD9] bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100 shrink-0">
                                                    #{qIndex + 1}
                                                </span>
                                                <h4 className="text-xs font-semibold text-slate-800 leading-snug">{q.question}</h4>
                                            </div>
                                            <Badge className={`shrink-0 text-[10px] font-semibold ${isCorrect ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                                {isCorrect ? 'Correct' : 'Incorrect'}
                                            </Badge>
                                        </div>

                                        <div className="space-y-1.5 pl-6">
                                            {q.options.map((opt: string, optIndex: number) => {
                                                const isThisUserAns = userAns === optIndex
                                                const isThisCorrect = optIndex === q.correctAnswer
                                                return (
                                                    <div
                                                        key={optIndex}
                                                        className={`text-xs p-2 rounded-xl border flex items-center justify-between ${
                                                            isThisCorrect
                                                                ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900 font-semibold'
                                                                : isThisUserAns && !isThisCorrect
                                                                ? 'bg-rose-50/80 border-rose-300 text-rose-900 font-normal line-through'
                                                                : 'bg-slate-50/50 border-slate-100 text-slate-500 font-normal'
                                                        }`}
                                                    >
                                                        <span>{opt}</span>
                                                        {isThisCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-2" />}
                                                        {isThisUserAns && !isThisCorrect && <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 ml-2" />}
                                                    </div>
                                                )
                                            })}
                                        </div>

                                        <div className="pl-6 text-[11px] text-slate-500 font-normal bg-purple-50/30 p-2 rounded-xl border border-purple-50">
                                            <strong className="text-[#603DD9] font-semibold">Explanation:</strong> {q.explanation}
                                        </div>
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
