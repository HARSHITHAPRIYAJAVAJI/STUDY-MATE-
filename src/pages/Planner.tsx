import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import {
    Calendar,
    Plus,
    CheckCircle2,
    Circle,
    Trash2,
    Sparkles,
    Loader2,
    BookOpen,
    Check,
    Clock,
    Target,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { API_BASE_URL } from '@/lib/api'
import { toast } from 'sonner'

interface PlanTask {
    id: string
    title: string
    completed: boolean
    category?: string
}

interface StudyPlan {
    id: string
    title: string
    documentTitles: string[]
    deadline: string
    hoursPerDay: number
    startDate: string
    status: 'active' | 'completed'
    completedHours: number
    tasks: PlanTask[]
}

const DEFAULT_PLANS: StudyPlan[] = [
    {
        id: '1',
        title: 'Machine Learning Mastery',
        documentTitles: ['Big Data Analytics', 'Neural Networks Notes'],
        deadline: '2026-03-15',
        hoursPerDay: 2,
        startDate: '2026-01-20',
        status: 'active',
        completedHours: 6.5,
        tasks: [
            { id: '1', title: 'Complete Chapter 1-3 Core Foundations', completed: true, category: 'Reading' },
            { id: '2', title: 'Practice 10 flashcards on Backpropagation', completed: true, category: 'Practice' },
            { id: '3', title: 'Review neural networks architectures', completed: false, category: 'Review' },
            { id: '4', title: 'Take adaptive AI practice quiz', completed: false, category: 'Testing' },
        ],
    },
    {
        id: '2',
        title: 'Data Structures & Algorithms Prep',
        documentTitles: ['Data Structures Handbook'],
        deadline: '2026-02-28',
        hoursPerDay: 1.5,
        startDate: '2026-01-22',
        status: 'active',
        completedHours: 3.0,
        tasks: [
            { id: '1', title: 'Study binary search trees and graph traversals', completed: true, category: 'Study' },
            { id: '2', title: 'Solve 5 graph problems on LeetCode', completed: false, category: 'Practice' },
            { id: '3', title: 'Review time & space complexity cheat sheet', completed: false, category: 'Revision' },
        ],
    },
]

export function Planner() {
    const [plans, setPlans] = useState<StudyPlan[]>(() => {
        const saved = localStorage.getItem('studymate_study_plans')
        return saved ? JSON.parse(saved) : DEFAULT_PLANS
    })

    const [documents, setDocuments] = useState<any[]>([])
    const [planTitle, setPlanTitle] = useState('')
    const [selectedDocIds, setSelectedDocIds] = useState<string[]>([])
    const [deadline, setDeadline] = useState('')
    const [hoursPerDay, setHoursPerDay] = useState('1')
    const [isGenerating, setIsGenerating] = useState(false)
    const [newTaskText, setNewTaskText] = useState<{ [planId: string]: string }>({})

    useEffect(() => {
        localStorage.setItem('studymate_study_plans', JSON.stringify(plans))
    }, [plans])

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

    const toggleDocSelection = (docId: string) => {
        setSelectedDocIds(prev =>
            prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
        )
    }

    const handleCreatePlan = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!planTitle.trim()) {
            toast.error("Please enter a plan title")
            return
        }

        setIsGenerating(true)
        try {
            // Call AI endpoint to generate smart tasks
            const response = await fetch(`${API_BASE_URL}/api/ai/study-plan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: planTitle,
                    documentIds: selectedDocIds,
                    deadline: deadline,
                    hoursPerDay: parseFloat(hoursPerDay) || 1
                })
            })

            const data = await response.json()
            const generatedTasks = data.tasks && data.tasks.length > 0
                ? data.tasks
                : [
                    { id: '1', title: 'Read introductory sections & key takeaways', completed: false, category: 'Reading' },
                    { id: '2', title: 'Generate and review flashcards for core terms', completed: false, category: 'Practice' },
                    { id: '3', title: 'Test understanding with an AI quiz', completed: false, category: 'Testing' },
                    { id: '4', title: 'Final revision and weak-spot review', completed: false, category: 'Revision' },
                ]

            const selectedDocTitles = documents
                .filter(d => selectedDocIds.includes(d.id.toString()))
                .map(d => d.title)

            const newPlan: StudyPlan = {
                id: Date.now().toString(),
                title: planTitle,
                documentTitles: selectedDocTitles,
                deadline: deadline || 'No deadline set',
                hoursPerDay: parseFloat(hoursPerDay) || 1,
                startDate: new Date().toISOString(),
                status: 'active',
                completedHours: 0,
                tasks: generatedTasks
            }

            setPlans(prev => [newPlan, ...prev])
            setPlanTitle('')
            setSelectedDocIds([])
            setDeadline('')
            setHoursPerDay('1')
            toast.success("New AI study plan generated!")
        } catch (error: any) {
            console.error("Plan creation error:", error)
            toast.error("Created plan with standard tasks")
        } finally {
            setIsGenerating(false)
        }
    }

    const toggleTask = (planId: string, taskId: string) => {
        setPlans(prev => prev.map(plan => {
            if (plan.id !== planId) return plan
            const updatedTasks = plan.tasks.map(task =>
                task.id === taskId ? { ...task, completed: !task.completed } : task
            )
            const allDone = updatedTasks.every(t => t.completed)
            return {
                ...plan,
                tasks: updatedTasks,
                status: allDone ? 'completed' : 'active'
            }
        }))
    }

    const addTaskToPlan = (planId: string) => {
        const text = newTaskText[planId]?.trim()
        if (!text) return

        setPlans(prev => prev.map(plan => {
            if (plan.id !== planId) return plan
            return {
                ...plan,
                tasks: [...plan.tasks, { id: Date.now().toString(), title: text, completed: false, category: 'Custom' }]
            }
        }))
        setNewTaskText(prev => ({ ...prev, [planId]: '' }))
        toast.success("Task added to plan")
    }

    const deleteTaskFromPlan = (planId: string, taskId: string) => {
        setPlans(prev => prev.map(plan => {
            if (plan.id !== planId) return plan
            return {
                ...plan,
                tasks: plan.tasks.filter(t => t.id !== taskId)
            }
        }))
    }

    const deletePlan = (planId: string) => {
        if (!confirm("Are you sure you want to delete this study plan?")) return
        setPlans(prev => prev.filter(p => p.id !== planId))
        toast.success("Study plan deleted")
    }

    return (
        <div className="space-y-4 animate-fade-in max-w-5xl mx-auto pt-0">
            {/* Header */}
            <div className="text-center space-y-1 pt-0">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-[#603DD9] via-[#7B42E2] to-[#9E4CEC] bg-clip-text text-transparent tracking-tight">
                    Smart Study Planner
                </h1>
                <p className="text-slate-500 max-w-lg mx-auto text-xs sm:text-sm font-normal">
                    Organize your study schedules, link your documents, and track milestone tasks towards your goals.
                </p>
            </div>

            {/* Layout Split: Create Plan Form & Active Plans */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Create New Plan Card */}
                <div className="lg:col-span-5">
                    <Card className="bg-white border border-purple-100 shadow-xl shadow-purple-500/5 rounded-3xl overflow-hidden backdrop-blur-sm sticky top-24">
                        <CardContent className="p-6 sm:p-7">
                            <form onSubmit={handleCreatePlan} className="space-y-4">
                                {/* Form Title */}
                                <div className="flex items-center gap-2.5 mb-1">
                                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#603DD9] to-[#9E4CEC] flex items-center justify-center text-white shadow-xs">
                                        <Sparkles className="w-4 h-4" />
                                    </div>
                                    <h2 className="text-base font-bold text-slate-800 tracking-tight">
                                        Create New Plan
                                    </h2>
                                </div>

                                {/* 1. Plan Title */}
                                <div>
                                    <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                                        Plan Title
                                    </label>
                                    <Input
                                        placeholder="e.g., Midterm Exam Prep"
                                        value={planTitle}
                                        onChange={e => setPlanTitle(e.target.value)}
                                        className="h-10 text-xs sm:text-sm rounded-xl border-slate-200 focus:border-[#603DD9] focus:ring-2 focus:ring-[#603DD9]/20"
                                        required
                                    />
                                </div>

                                {/* 2. Documents Multi-Select Box */}
                                <div>
                                    <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                                        <span>Documents</span>
                                        <span className="text-[11px] text-slate-400 font-normal">
                                            {selectedDocIds.length} selected
                                        </span>
                                    </label>
                                    <div className="border border-slate-200 rounded-xl p-2 max-h-40 overflow-y-auto space-y-1 bg-slate-50/50">
                                        {documents.length === 0 ? (
                                            <p className="text-xs text-slate-400 text-center py-3">No documents uploaded yet</p>
                                        ) : (
                                            documents.map(doc => {
                                                const isSelected = selectedDocIds.includes(doc.id.toString())
                                                return (
                                                    <div
                                                        key={doc.id}
                                                        onClick={() => toggleDocSelection(doc.id.toString())}
                                                        className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-all ${
                                                            isSelected
                                                                ? 'bg-purple-50 text-[#603DD9] font-medium'
                                                                : 'hover:bg-slate-100 text-slate-700 font-normal'
                                                        }`}
                                                    >
                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                                            isSelected ? 'bg-[#603DD9] border-[#603DD9]' : 'border-slate-300 bg-white'
                                                        }`}>
                                                            {isSelected && <Check className="w-3 h-3 text-white" />}
                                                        </div>
                                                        <span className="text-xs truncate flex-1">{doc.title}</span>
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>
                                </div>

                                {/* 3. Deadline */}
                                <div>
                                    <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                                        Deadline
                                    </label>
                                    <Input
                                        type="date"
                                        value={deadline}
                                        onChange={e => setDeadline(e.target.value)}
                                        className="h-10 text-xs sm:text-sm rounded-xl border-slate-200 focus:border-[#603DD9] focus:ring-2 focus:ring-[#603DD9]/20"
                                    />
                                </div>

                                {/* 4. Study Hours per Day */}
                                <div>
                                    <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                                        Study Hours per Day
                                    </label>
                                    <Input
                                        type="number"
                                        min="0.5"
                                        max="12"
                                        step="0.5"
                                        value={hoursPerDay}
                                        onChange={e => setHoursPerDay(e.target.value)}
                                        className="h-10 text-xs sm:text-sm rounded-xl border-slate-200 focus:border-[#603DD9] focus:ring-2 focus:ring-[#603DD9]/20"
                                    />
                                </div>

                                {/* Generate Plan Button */}
                                <Button
                                    type="submit"
                                    disabled={isGenerating}
                                    className="w-full h-11 rounded-xl bg-gradient-to-r from-[#603DD9] to-[#9E4CEC] hover:opacity-95 text-white font-semibold text-xs sm:text-sm shadow-md shadow-[#603DD9]/20 gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] mt-2"
                                >
                                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                                    {isGenerating ? "Generating Plan..." : "Generate Plan"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Active Plans List */}
                <div className="lg:col-span-7 space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                            <Target className="w-4 h-4 text-[#603DD9]" />
                            Active Study Plans ({plans.length})
                        </h2>
                    </div>

                    {plans.length === 0 ? (
                        <Card className="border border-purple-100 shadow-sm rounded-3xl p-8 text-center bg-white">
                            <Calendar className="w-12 h-12 mx-auto text-purple-200 mb-3" />
                            <h3 className="font-bold text-slate-800 text-sm">No Active Plans Yet</h3>
                            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                                Fill out the form on the left to generate your personalized AI study schedule and task checklist.
                            </p>
                        </Card>
                    ) : (
                        plans.map(plan => {
                            const completedCount = plan.tasks.filter(t => t.completed).length
                            const totalCount = plan.tasks.length
                            const taskProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

                            return (
                                <Card key={plan.id} className="border border-purple-100 shadow-md shadow-purple-500/5 rounded-3xl overflow-hidden bg-white hover:shadow-lg transition-all">
                                    <CardContent className="p-5 sm:p-6 space-y-4">
                                        {/* Card Header */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="space-y-1 flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="font-bold text-slate-900 text-base leading-snug">{plan.title}</h3>
                                                    <Badge className={`text-[10px] font-semibold ${
                                                        plan.status === 'completed'
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                            : 'bg-purple-50 text-[#603DD9] border-purple-100'
                                                    }`}>
                                                        {plan.status === 'completed' ? 'Completed 🎉' : 'In Progress'}
                                                    </Badge>
                                                </div>

                                                <div className="flex items-center gap-3 text-xs text-slate-400 font-normal flex-wrap pt-0.5">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                        Deadline: <strong className="text-slate-600 font-medium">{plan.deadline}</strong>
                                                    </span>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3.5 h-3.5 text-[#603DD9]" />
                                                        Target: <strong className="text-slate-600 font-medium">{plan.hoursPerDay}h / day</strong>
                                                    </span>
                                                </div>
                                            </div>

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => deletePlan(plan.id)}
                                                className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl shrink-0"
                                                title="Delete Plan"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>

                                        {/* Document Tags */}
                                        {plan.documentTitles && plan.documentTitles.length > 0 && (
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                {plan.documentTitles.map((title, i) => (
                                                    <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-normal flex items-center gap-1">
                                                        <BookOpen className="w-2.5 h-2.5 text-[#603DD9]" />
                                                        {title}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Progress Bar */}
                                        <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                            <div className="flex items-center justify-between text-xs font-normal">
                                                <span className="text-slate-600">Task Completion</span>
                                                <span className="font-semibold text-[#603DD9]">{completedCount} of {totalCount} tasks ({taskProgress}%)</span>
                                            </div>
                                            <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                                                <div
                                                    className="bg-gradient-to-r from-[#603DD9] to-[#9E4CEC] h-full transition-all duration-300 rounded-full"
                                                    style={{ width: `${taskProgress}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Tasks Checklist */}
                                        <div className="space-y-2">
                                            <p className="text-xs font-semibold text-slate-700">Milestone Tasks:</p>
                                            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                                                {plan.tasks.map(task => (
                                                    <div
                                                        key={task.id}
                                                        className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all group ${
                                                            task.completed
                                                                ? 'bg-slate-50/80 border-slate-100 text-slate-400'
                                                                : 'bg-white border-slate-200/80 hover:border-[#603DD9]/30 text-slate-700'
                                                        }`}
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleTask(plan.id, task.id)}
                                                            className="flex-shrink-0"
                                                        >
                                                            {task.completed ? (
                                                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                                            ) : (
                                                                <Circle className="w-4 h-4 text-slate-400 hover:text-[#603DD9]" />
                                                            )}
                                                        </button>
                                                        <span className={`text-xs flex-1 ${task.completed ? 'line-through text-slate-400 font-normal' : 'font-medium'}`}>
                                                            {task.title}
                                                        </span>
                                                        {task.category && (
                                                            <span className="text-[9px] bg-purple-50 text-[#603DD9] px-1.5 py-0.5 rounded font-normal hidden sm:inline-block">
                                                                {task.category}
                                                            </span>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => deleteTaskFromPlan(plan.id, task.id)}
                                                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 p-1 transition-opacity"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Add Custom Task Input */}
                                        <div className="flex gap-2 pt-2 border-t border-slate-100">
                                            <Input
                                                placeholder="Add a new milestone task..."
                                                value={newTaskText[plan.id] || ''}
                                                onChange={e => setNewTaskText(prev => ({ ...prev, [plan.id]: e.target.value }))}
                                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTaskToPlan(plan.id))}
                                                className="text-xs h-9 rounded-xl border-slate-200"
                                            />
                                            <Button
                                                type="button"
                                                size="sm"
                                                onClick={() => addTaskToPlan(plan.id)}
                                                className="h-9 px-3.5 bg-slate-100 text-slate-700 hover:bg-purple-50 hover:text-[#603DD9] text-xs font-semibold rounded-xl"
                                            >
                                                <Plus className="w-3.5 h-3.5 mr-1" />
                                                Add
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })
                    )}
                </div>
            </div>
        </div>
    )
}
