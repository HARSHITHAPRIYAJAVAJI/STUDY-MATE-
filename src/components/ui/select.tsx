import * as React from "react"
import { cn } from "@/lib/utils"

type SelectContextType = {
    value: string
    onValueChange: (value: string) => void
    open: boolean
    setOpen: (open: boolean) => void
}

const Context = React.createContext<SelectContextType | undefined>(undefined)

function useSelect() {
    const context = React.useContext(Context)
    if (!context) throw new Error("useSelect must be used within a SelectProvider")
    return context
}

const Select = ({ value, onValueChange, children }: any) => {
    const [open, setOpen] = React.useState(false)
    const containerRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <Context.Provider value={{ value, onValueChange, open, setOpen }}>
            <div ref={containerRef} className="relative w-full z-40">{children}</div>
        </Context.Provider>
    )
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(({ className, children, ...props }, ref) => {
    const { open, setOpen } = useSelect()
    return (
        <button
            ref={ref}
            type="button"
            onClick={() => setOpen(!open)}
            className={cn(
                "flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#603DD9]/20 disabled:cursor-not-allowed disabled:opacity-50 font-medium transition-colors",
                className
            )}
            {...props}
        >
            {children}
            <span className="ml-2 text-xs text-slate-400">▼</span>
        </button>
    )
})
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = ({ placeholder }: any) => {
    const { value } = useSelect()
    return <span className="block truncate">{value ? (value.charAt(0).toUpperCase() + value.slice(1)) : placeholder}</span>
}

const SelectContent = ({ children, className }: any) => {
    const { open } = useSelect()
    if (!open) return null
    return (
        <div className={cn("absolute z-50 min-w-[8rem] overflow-hidden rounded-xl border border-slate-200/90 bg-white text-slate-950 shadow-xl shadow-purple-500/10 animate-slide-in w-full mt-1.5", className)}>
            <div className="p-1 max-h-60 overflow-y-auto space-y-0.5">{children}</div>
        </div>
    )
}

const SelectItem = React.forwardRef<HTMLDivElement, any>(({ className, children, value, ...props }, ref) => {
    const { onValueChange, setOpen, value: selectedValue } = useSelect()
    return (
        <div
            ref={ref}
            className={cn(
                "relative flex w-full cursor-pointer select-none items-center rounded-lg py-2 pl-8 pr-2 text-xs font-semibold outline-none hover:bg-[#603DD9]/10 hover:text-[#603DD9] transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                value === selectedValue && "bg-[#603DD9]/10 text-[#603DD9] font-bold",
                className
            )}
            onClick={(e) => {
                onValueChange(value)
                setOpen(false)
                e.stopPropagation()
            }}
            {...props}
        >
            <span className="absolute left-2.5 flex h-3.5 w-3.5 items-center justify-center text-[#603DD9]">
                {value === selectedValue && <span>✓</span>}
            </span>
            {children}
        </div>
    )
})
SelectItem.displayName = "SelectItem"

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }
