import { useState, useEffect, useRef } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import {
    ZoomIn,
    ZoomOut,
    RotateCw,
    Maximize2,
    Minimize2,
    ChevronLeft,
    ChevronRight,
    Loader2,
    FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString()

interface PDFPageProps {
    pdfDoc: any
    pageNumber: number
    scale: number
    rotation: number
    onRegisterElement: (el: HTMLDivElement | null) => void
}

function PDFPage({
    pdfDoc,
    pageNumber,
    scale,
    rotation,
    onRegisterElement,
}: PDFPageProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const renderTaskRef = useRef<any>(null)
    const [isPageLoading, setIsPageLoading] = useState<boolean>(true)

    useEffect(() => {
        let isCancelled = false

        const render = async () => {
            if (!pdfDoc || !canvasRef.current) return

            // If a render task is already in-flight on this canvas, cancel it and wait for it to stop
            if (renderTaskRef.current) {
                try {
                    renderTaskRef.current.cancel()
                    await renderTaskRef.current.promise
                } catch {
                    // Ignore expected RenderingCancelledException
                }
                renderTaskRef.current = null
            }

            if (isCancelled || !canvasRef.current) return

            let currentTask: any = null
            try {
                const page = await pdfDoc.getPage(pageNumber)
                if (isCancelled || !canvasRef.current) return

                const viewport = page.getViewport({ scale, rotation })
                const canvas = canvasRef.current
                const context = canvas.getContext('2d', { alpha: false })
                if (!context) return

                const outputScale = window.devicePixelRatio || 1
                canvas.width = Math.floor(viewport.width * outputScale)
                canvas.height = Math.floor(viewport.height * outputScale)
                canvas.style.width = `${Math.floor(viewport.width)}px`
                canvas.style.height = `${Math.floor(viewport.height)}px`

                const transform = outputScale !== 1
                    ? [outputScale, 0, 0, outputScale, 0, 0]
                    : null

                const renderContext = {
                    canvasContext: context,
                    transform: transform,
                    viewport: viewport,
                }

                currentTask = page.render(renderContext)
                renderTaskRef.current = currentTask

                await currentTask.promise

                if (!isCancelled) {
                    setIsPageLoading(false)
                }
            } catch (err: any) {
                if (err?.name !== 'RenderingCancelledException') {
                    console.error(`Page ${pageNumber} render error:`, err)
                }
            } finally {
                if (renderTaskRef.current === currentTask) {
                    renderTaskRef.current = null
                }
            }
        }

        render()

        return () => {
            isCancelled = true
            if (renderTaskRef.current) {
                try {
                    renderTaskRef.current.cancel()
                } catch {
                    // Ignore
                }
                renderTaskRef.current = null
            }
        }
    }, [pdfDoc, pageNumber, scale, rotation])

    return (
        <div
            ref={onRegisterElement}
            className="relative bg-white rounded-lg shadow-lg border border-slate-200/90 transition-all hover:shadow-xl group/page overflow-hidden shrink-0 min-h-[120px] flex items-center justify-center"
        >
            <canvas ref={canvasRef} className="block" />

            {isPageLoading && (
                <div className="absolute inset-0 bg-slate-50/70 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
                    <Loader2 className="w-5 h-5 text-[#603DD9] animate-spin" />
                </div>
            )}

            <div className="absolute bottom-2 right-2 bg-slate-900/60 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[10px] font-semibold opacity-0 group-hover/page:opacity-100 transition-opacity pointer-events-none">
                Page {pageNumber}
            </div>
        </div>
    )
}

interface DocumentViewerProps {
    url: string
    title: string
    isImage?: boolean
}

export function DocumentViewer({ url, title, isImage }: DocumentViewerProps) {
    const [numPages, setNumPages] = useState<number>(0)
    const [scale, setScale] = useState<number>(1.2)
    const [rotation, setRotation] = useState<number>(0)
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)
    const [currentPage, setCurrentPage] = useState<number>(1)
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
    const [pdfDoc, setPdfDoc] = useState<any>(null)

    const containerRef = useRef<HTMLDivElement>(null)
    const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map())

    // Load PDF Document
    useEffect(() => {
        if (isImage) {
            setLoading(false)
            setPdfDoc(null)
            return
        }

        let isCancelled = false
        setLoading(true)
        setError(null)
        setNumPages(0)
        setPdfDoc(null)

        let loadingTask: any = null

        const loadPdf = async () => {
            try {
                loadingTask = pdfjsLib.getDocument({
                    url: url,
                    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/cmaps/',
                    cMapPacked: true,
                })

                const doc = await loadingTask.promise
                if (isCancelled) {
                    doc.destroy()
                    return
                }

                setPdfDoc(doc)
                setNumPages(doc.numPages)
                setLoading(false)
            } catch (err: any) {
                if (!isCancelled) {
                    console.error("PDF load error:", err)
                    setError("Failed to load PDF document. Falling back to default viewer.")
                    setLoading(false)
                }
            }
        }

        loadPdf()

        return () => {
            isCancelled = true
            if (loadingTask) {
                try {
                    loadingTask.destroy()
                } catch {
                    // Ignore
                }
            }
        }
    }, [url, isImage])

    // Track scroll position to update current page indicator
    const handleScroll = () => {
        if (!containerRef.current) return
        const containerTop = containerRef.current.scrollTop
        const containerHeight = containerRef.current.clientHeight

        let visiblePage = 1
        pageRefs.current.forEach((el, pageNum) => {
            if (el && el.offsetTop <= containerTop + containerHeight / 3) {
                visiblePage = pageNum
            }
        })
        setCurrentPage(visiblePage)
    }

    const scrollToPage = (pageNum: number) => {
        const el = pageRefs.current.get(pageNum)
        if (el && containerRef.current) {
            containerRef.current.scrollTo({
                top: el.offsetTop - 16,
                behavior: 'smooth'
            })
        }
    }

    const zoomIn = () => setScale(prev => Math.min(2.5, +(prev + 0.2).toFixed(1)))
    const zoomOut = () => setScale(prev => Math.max(0.6, +(prev - 0.2).toFixed(1)))
    const resetZoom = () => setScale(1.1)
    const rotate = () => setRotation(prev => (prev + 90) % 360)

    if (isImage) {
        return (
            <div className="w-full h-full flex flex-col overflow-hidden bg-slate-100/50 rounded-2xl relative">
                <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
                    <img
                        src={url}
                        alt={title}
                        className="max-w-full max-h-full object-contain rounded-xl shadow-md border border-slate-200/80 bg-white"
                    />
                </div>
            </div>
        )
    }

    if (error) {
        // Fallback to standard iframe if canvas fails
        return (
            <div className="w-full h-full flex flex-col overflow-hidden bg-slate-50 relative rounded-2xl">
                <iframe
                    src={`${url}#toolbar=0&view=FitH`}
                    className="w-full h-full flex-1 rounded-2xl shadow-sm bg-white border border-purple-100/80 block"
                    title={title}
                />
            </div>
        )
    }

    return (
        <div className={`w-full h-full flex flex-col overflow-hidden bg-slate-100/60 rounded-2xl relative border border-purple-100/70 shadow-sm ${isFullscreen ? 'fixed inset-0 z-50 rounded-none bg-slate-900/90' : ''}`}>
            {/* Top Minimal Toolbar */}
            <div className="h-10 border-b border-purple-100/70 bg-white/95 backdrop-blur-md px-3 flex items-center justify-between shrink-0 select-none z-10">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <FileText className="w-3.5 h-3.5 text-[#603DD9]" />
                    <span className="truncate max-w-[180px] sm:max-w-[260px]">{title}</span>
                </div>

                <div className="flex items-center gap-1 sm:gap-1.5">
                    {numPages > 0 && (
                        <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100/80 px-2 py-0.5 rounded-lg mr-1">
                            <button
                                onClick={() => scrollToPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage <= 1}
                                className="p-0.5 hover:text-[#603DD9] disabled:opacity-30 transition-colors"
                            >
                                <ChevronLeft className="w-3 h-3" />
                            </button>
                            <span>{currentPage} / {numPages}</span>
                            <button
                                onClick={() => scrollToPage(Math.min(numPages, currentPage + 1))}
                                disabled={currentPage >= numPages}
                                className="p-0.5 hover:text-[#603DD9] disabled:opacity-30 transition-colors"
                            >
                                <ChevronRight className="w-3 h-3" />
                            </button>
                        </div>
                    )}

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={zoomOut}
                        className="h-7 w-7 rounded-lg text-slate-600 hover:text-[#603DD9] hover:bg-purple-50"
                        title="Zoom Out"
                    >
                        <ZoomOut className="w-3.5 h-3.5" />
                    </Button>

                    <button
                        onClick={resetZoom}
                        className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-[#603DD9] hover:bg-purple-50 rounded-lg transition-colors"
                        title="Reset Zoom"
                    >
                        {Math.round(scale * 100)}%
                    </button>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={zoomIn}
                        className="h-7 w-7 rounded-lg text-slate-600 hover:text-[#603DD9] hover:bg-purple-50"
                        title="Zoom In"
                    >
                        <ZoomIn className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={rotate}
                        className="h-7 w-7 rounded-lg text-slate-600 hover:text-[#603DD9] hover:bg-purple-50"
                        title="Rotate 90°"
                    >
                        <RotateCw className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="h-7 w-7 rounded-lg text-slate-600 hover:text-[#603DD9] hover:bg-purple-50"
                        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Viewer"}
                    >
                        {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </Button>
                </div>
            </div>

            {/* Document Scroll Canvas Area */}
            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="flex-1 w-full h-full min-h-0 overflow-y-auto overflow-x-auto p-4 flex flex-col items-center gap-4 scroll-smooth"
            >
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
                        <Loader2 className="w-8 h-8 text-[#603DD9] animate-spin mb-3" />
                        <p className="text-xs font-semibold text-slate-600">Rendering document pages...</p>
                    </div>
                ) : (
                    Array.from({ length: numPages }, (_, index) => {
                        const pageNum = index + 1
                        return (
                            <PDFPage
                                key={pageNum}
                                pdfDoc={pdfDoc}
                                pageNumber={pageNum}
                                scale={scale}
                                rotation={rotation}
                                onRegisterElement={(el) => {
                                    if (el) {
                                        pageRefs.current.set(pageNum, el)
                                    } else {
                                        pageRefs.current.delete(pageNum)
                                    }
                                }}
                            />
                        )
                    })
                )}
            </div>
        </div>
    )
}
