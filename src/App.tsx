import { Suspense, lazy, useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { Toaster } from 'sonner'

// Lazy load pages
const Auth = lazy(() => import('./pages/Auth').then(module => ({ default: module.Auth })))
const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })))
const Library = lazy(() => import('./pages/Library').then(module => ({ default: module.Library })))
const Study = lazy(() => import('./pages/Study').then(module => ({ default: module.Study })))
const Flashcards = lazy(() => import('./pages/Flashcards').then(module => ({ default: module.Flashcards })))
const Quizzes = lazy(() => import('./pages/Quizzes').then(module => ({ default: module.Quizzes })))
const Timer = lazy(() => import('./pages/Timer').then(module => ({ default: module.Timer })))
const Planner = lazy(() => import('./pages/Planner').then(module => ({ default: module.Planner })))
const Collaborate = lazy(() => import('./pages/Collaborate').then(module => ({ default: module.Collaborate })))
const Profile = lazy(() => import('./pages/Profile').then(module => ({ default: module.Profile })))
import { supabase } from '@/lib/supabase'
import { TimerProvider } from '@/context/TimerContext'
import { FloatingTimer } from '@/components/FloatingTimer'

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error || !session) {
                if (error) {
                    console.warn("Auth session recovery:", error.message);
                    supabase.auth.signOut().catch(() => {});
                }
                setIsAuthenticated(false);
            } else {
                setIsAuthenticated(true);
            }
        }).catch(() => {
            setIsAuthenticated(false);
        });

        // Listen for changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
                setIsAuthenticated(false);
            } else {
                setIsAuthenticated(!!session);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    if (isAuthenticated === null) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
                <div className="w-10 h-10 border-3 border-[#603DD9]/20 border-t-[#603DD9] rounded-full animate-spin"></div>
            </div>
        )
    }

    if (!isAuthenticated) {
        return (
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading Auth...</div>}>
                <Auth onAuth={() => setIsAuthenticated(true)} />
            </Suspense>
        )
    }



    return (
        <TimerProvider>
            <BrowserRouter>
                <Toaster position="top-right" richColors closeButton theme="light" />
                <FloatingTimer />
                <Suspense fallback={
                    <div className="min-h-screen flex items-center justify-center">
                        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                }>
                    <Routes>
                        <Route path="/" element={<Layout />}>
                            <Route index element={<Dashboard />} />
                            <Route path="library" element={<Library />} />
                            <Route path="study" element={<Study />} />
                            <Route path="flashcards" element={<Flashcards />} />
                            <Route path="quizzes" element={<Quizzes />} />
                            <Route path="timer" element={<Timer />} />
                            <Route path="planner" element={<Planner />} />
                            <Route path="collaborate" element={<Collaborate />} />
                            <Route path="profile" element={<Profile />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Route>
                    </Routes>
                </Suspense>
            </BrowserRouter>
        </TimerProvider>
    )
}

export default App
