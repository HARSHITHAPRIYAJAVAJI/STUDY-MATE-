import { Outlet, useLocation } from 'react-router-dom'
import { Navbar } from './Navbar'
import { AmbientBackground } from './AmbientBackground'

export function Layout() {
    const location = useLocation()
    const isStudyPage = location.pathname === '/study'

    return (
        <div className={`${isStudyPage ? 'h-screen overflow-hidden' : 'min-h-screen'} bg-[#FAFAFC] flex flex-col antialiased relative selection:bg-[#603DD9]/15 selection:text-[#603DD9]`}>
            {/* Minimal Ambient Moving Blue Lines & Soft Glow */}
            <AmbientBackground />

            {/* Top Responsive Navbar on all pages */}
            <div className="relative z-40">
                <Navbar />
            </div>

            {/* Main Content Area */}
            {isStudyPage ? (
                <main className="flex-1 w-full h-[calc(100vh-5rem)] min-h-0 flex flex-col overflow-hidden relative z-10">
                    <Outlet />
                </main>
            ) : (
                <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-2 sm:pt-3 pb-8 relative z-10">
                    <Outlet />
                </main>
            )}
        </div>
    )
}
