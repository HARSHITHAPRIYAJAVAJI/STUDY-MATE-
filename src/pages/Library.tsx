import { useState, useRef, useEffect } from 'react'
import UploadZone from '@/components/library/UploadZone'
import DocumentGrid from '@/components/library/DocumentGrid'
import { Search, FileText, BookOpen, Languages } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { supabase } from '@/lib/supabase'
import { API_BASE_URL, fetchWithAuth } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Progress } from "@/components/ui/Progress"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"

export function Library() {
    const [selectedLanguage, setSelectedLanguage] = useState('english')
    const [documents, setDocuments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [dragActive, setDragActive] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // UI Filters
    const [searchQuery, setSearchQuery] = useState("")
    const [languageFilter, setLanguageFilter] = useState("all")
    const [subjectFilter, setSubjectFilter] = useState("all")

    // Upload Progress Tracking
    // Format: { [fileId]: { name, progress, status, error? } }
    const [uploadProgress, setUploadProgress] = useState<Record<string, any>>({})

    useEffect(() => {
        fetchDocuments()
    }, [])

    const fetchDocuments = async () => {
        try {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
                const { data, error } = await supabase
                    .from('documents')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })

                if (error) {
                    console.error('Error fetching documents:', error)
                } else {
                    const mappedDocs = data?.map(doc => ({
                        ...doc,
                        created_date: doc.created_at
                    })) || []
                    setDocuments(mappedDocs)
                }
            }
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files
        if (files) {
            handleFiles(files)
        }
    }

    const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true)
        } else if (e.type === "dragleave") {
            setDragActive(false)
        }
    }

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)

        const files = e.dataTransfer.files
        if (files && files.length > 0) {
            handleFiles(files)
        }
    }

    const processFile = async (file: File) => {
        const fileId = Date.now() + Math.random().toString()

        // Initial State: Uploading
        setUploadProgress(prev => ({
            ...prev,
            [fileId]: { name: file.name, progress: 0, status: 'uploading' }
        }))

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("User not authenticated")

            // 1. Upload to Storage
            const fileExt = file.name.split('.').pop()
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
            const filePath = `${user.id}/${fileName}`

            // Simulate progress for upload
            const uploadInterval = setInterval(() => {
                setUploadProgress(prev => {
                    if (!prev[fileId] || prev[fileId].status !== 'uploading') return prev;
                    const current = prev[fileId].progress;
                    return {
                        ...prev,
                        [fileId]: { ...prev[fileId], progress: Math.min(current + 10, 30) } // Cap at 30% for actual upload start
                    }
                });
            }, 200);

            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(filePath, file)

            clearInterval(uploadInterval);

            if (uploadError) throw uploadError

            // State: Extracting/Analyzing
            setUploadProgress(prev => ({
                ...prev,
                [fileId]: { name: file.name, progress: 50, status: 'analyzing' }
            }))

            // Simulate AI Processing Delay (2 seconds)
            await new Promise(resolve => setTimeout(resolve, 2000));

            setUploadProgress(prev => ({
                ...prev,
                [fileId]: { name: file.name, progress: 80, status: 'extracting' }
            }))

            // 2. Insert into Database
            const { data: newDoc, error: dbError } = await supabase
                .from('documents')
                .insert({
                    user_id: user.id,
                    title: file.name.replace(`.${fileExt}`, ''),
                    file_path: filePath,
                    language: selectedLanguage,
                    status: 'processing',
                    pages: Math.floor(Math.random() * 50) + 1, // Mock page count
                    subject: 'General Study',
                    summary: 'Processing document chunks...',
                })
                .select('id')
                .single();

            if (dbError) throw dbError;

            // Trigger backend document chunking and embedding in background
            if (newDoc?.id) {
                fetchWithAuth(`${API_BASE_URL}/api/documents/${newDoc.id}/process`, { method: 'POST' })
                    .then(() => fetchDocuments())
                    .catch(err => console.warn("Background doc processing warning:", err));
            }

            setUploadProgress(prev => ({
                ...prev,
                [fileId]: { name: file.name, progress: 100, status: 'completed' }
            }))

            // Refresh list
            fetchDocuments()

            // Remove from progress list after 3 seconds
            setTimeout(() => {
                setUploadProgress(prev => {
                    const newProgress = { ...prev };
                    delete newProgress[fileId];
                    return newProgress;
                });
            }, 3000);

        } catch (error: any) {
            console.error("File processing error:", error)
            setUploadProgress(prev => ({
                ...prev,
                [fileId]: { name: file.name, progress: 100, status: 'error', error: error.message }
            }))
        }
    }

    const handleFiles = async (files: FileList) => {
        const newFiles = Array.from(files)
        // Check authentication
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            alert('Please sign in to upload documents.')
            return
        }

        // Process each file
        newFiles.forEach(file => processFile(file))
    }

    // Filtering logic
    const filteredDocuments = documents.filter(doc => {
        const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (doc.summary || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesLanguage = languageFilter === "all" || (doc.language && doc.language.toLowerCase() === languageFilter);
        // Subject filter logic (mock subjects for now)
        const matchesSubject = subjectFilter === "all" || (doc.subject && doc.subject === subjectFilter);

        return matchesSearch && matchesLanguage && matchesSubject;
    });

    const subjects = [...new Set(documents.map(d => d.subject).filter(Boolean))];

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this document?')) return;

        try {
            const { error } = await supabase.from('documents').delete().eq('id', id);
            if (error) throw error;

            // Optimistic update
            setDocuments(prev => prev.filter(doc => doc.id !== id));
        } catch (error) {
            console.error('Error deleting document:', error);
            alert('Failed to delete document');
        }
    };

    const handleRename = async (id: string, newTitle: string) => {
        try {
            const { error } = await supabase.from('documents').update({ title: newTitle }).eq('id', id);
            if (error) throw error;

            // Optimistic update
            setDocuments(prev => prev.map(doc => doc.id === id ? { ...doc, title: newTitle } : doc));
        } catch (error) {
            console.error('Error renaming document:', error);
            alert('Failed to rename document');
        }
    };

    return (
        <div className="space-y-4 animate-fade-in max-w-7xl mx-auto">
            {/* Header */}
            <div className="text-center space-y-1 pt-0">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-[#603DD9] via-[#7B42E2] to-[#9E4CEC] bg-clip-text text-transparent tracking-tight">
                    Document Library
                </h1>
                <p className="text-slate-500 max-w-lg mx-auto text-xs sm:text-sm font-normal">
                    Upload and manage study materials with automatic AI summaries, flashcard generation, and concept extraction.
                </p>
            </div>

                {/* Upload Zone */}
                <UploadZone
                    onFileSelect={handleFileSelect}
                    dragActive={dragActive}
                    onDrag={handleDrag}
                    onDrop={handleDrop}
                    fileInputRef={fileInputRef}
                    selectedLanguage={selectedLanguage}
                    onLanguageChange={setSelectedLanguage}
                />

                {/* Upload Progress Area */}
                {Object.keys(uploadProgress).length > 0 && (
                    <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0">
                        <CardHeader>
                            <CardTitle className="text-lg">Processing Files</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {Object.entries(uploadProgress).map(([id, file]) => (
                                <div key={id} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-blue-600" />
                                            <span className="text-sm font-medium">{file.name}</span>
                                            {file.status === 'error' && <span className="text-red-500 text-xs">({file.error})</span>}
                                        </div>
                                        <Badge variant={file.status === 'completed' ? 'default' : file.status === 'error' ? 'danger' : 'secondary'}>
                                            {file.status}
                                        </Badge>
                                    </div>
                                    <Progress value={file.progress} className="h-2" />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {/* Filters */}
                <Card className="relative z-10 bg-white shadow-md border-0 rounded-2xl overflow-visible">
                    <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row gap-4 items-center">
                            <div className="flex-1 w-full md:w-auto relative">
                                <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                                <Input
                                    placeholder="Search documents..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 h-10 bg-white border-slate-200 rounded-xl focus:border-[#603DD9] focus:ring-[#603DD9]/20 transition-all font-medium text-xs sm:text-sm"
                                />
                            </div>

                            <div className="flex gap-4 w-full md:w-auto">
                                <Select value={languageFilter} onValueChange={setLanguageFilter}>
                                    <SelectTrigger className="w-full md:w-[180px] h-10 border-slate-200 bg-white text-slate-700">
                                        <div className="flex items-center gap-2">
                                            <Languages className="w-4 h-4 text-slate-500" />
                                            <span>
                                                {languageFilter === 'all' ? 'All Languages' :
                                                    languageFilter.charAt(0).toUpperCase() + languageFilter.slice(1)}
                                            </span>
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Languages</SelectItem>
                                        <SelectItem value="english">English</SelectItem>
                                        <SelectItem value="spanish">Spanish</SelectItem>
                                        <SelectItem value="french">French</SelectItem>
                                        <SelectItem value="german">German</SelectItem>
                                        <SelectItem value="chinese">Chinese</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                                    <SelectTrigger className="w-full md:w-[180px] h-10 border-slate-200 bg-white text-slate-700">
                                        <div className="flex items-center gap-2">
                                            <BookOpen className="w-4 h-4 text-slate-500" />
                                            <span>
                                                {subjectFilter === 'all' ? 'All Subjects' : subjectFilter}
                                            </span>
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Subjects</SelectItem>
                                        {subjects.map(subject => (
                                            <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Documents Grid */}
                <div className="space-y-4">
                    <DocumentGrid
                        documents={filteredDocuments}
                        isLoading={loading}
                        onDocumentDelete={handleDelete}
                        onDocumentRename={handleRename}
                    />
                </div>
        </div>
    )
}
