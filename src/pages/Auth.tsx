import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { BookOpen, Brain, Target, Users, Clock, TrendingUp, Eye, EyeOff } from 'lucide-react'

interface AuthProps {
    onAuth: () => void
}

import { supabase } from '@/lib/supabase'

export function Auth({ onAuth }: AuthProps) {
    const [isLogin, setIsLogin] = useState(true)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [fullName, setFullName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            if (isLogin) {
                // Login
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (error) throw error
            } else {
                // Sign Up
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                        },
                    },
                })
                if (error) throw error
                // For email confirmation flows, you might want to show a message here
            }
            onAuth()
        } catch (err: any) {
            setError(err.message || 'An error occurred during authentication')
        } finally {
            setLoading(false)
        }
    }



    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-soft"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-soft" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-soft" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="relative min-h-screen flex items-center justify-center p-4">
                <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                    {/* Left side - Branding & Features */}
                    <div className="hidden lg:block space-y-8 animate-fade-in">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <img
                                    src="/logo-icon.webp"
                                    alt="StudyMate+ Logo"
                                    width="56"
                                    height="56"
                                    className="w-14 h-14 object-contain drop-shadow-md"
                                />
                                <div>
                                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                                        StudyMate+
                                    </h1>
                                    <p className="text-muted-foreground">AI-Powered Study Companion</p>
                                </div>
                            </div>
                            <p className="text-xl text-gray-700 leading-relaxed">
                                Transform your learning experience with AI-powered tools designed to help you study smarter, not harder.
                            </p>
                        </div>

                        {/* Feature Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { icon: Brain, title: 'AI Q&A', desc: 'Ask anything about your documents' },
                                { icon: BookOpen, title: 'Smart Flashcards', desc: 'Spaced repetition learning' },
                                { icon: Target, title: 'Adaptive Quizzes', desc: 'Test your knowledge' },
                                { icon: Clock, title: 'Focus Timer', desc: 'Pomodoro technique' },
                                { icon: TrendingUp, title: 'Track Progress', desc: 'Monitor your growth' },
                                { icon: Users, title: 'Collaborate', desc: 'Study with peers' },
                            ].map((feature, i) => (
                                <div key={i} className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 hover-lift animate-slide-in" style={{ animationDelay: `${i * 100}ms` }}>
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-3">
                                        <feature.icon className="w-5 h-5 text-white" />
                                    </div>
                                    <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                                    <p className="text-xs text-gray-600">{feature.desc}</p>
                                </div>
                            ))}
                        </div>

                        {/* Stats */}

                    </div>

                    {/* Right side - Auth Form */}
                    <div className="w-full max-w-md mx-auto space-y-6 animate-slide-in">
                        {/* Mobile Logo */}
                        <div className="lg:hidden text-center mb-8">
                            <img
                                src="/logo-icon.webp"
                                alt="StudyMate+ Logo"
                                width="64"
                                height="64"
                                className="w-16 h-16 mx-auto mb-4 object-contain drop-shadow-lg"
                            />
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                StudyMate+
                            </h1>
                            <p className="text-muted-foreground mt-2">AI-Powered Study Companion</p>
                        </div>

                        {/* Auth Card */}
                        <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
                            <CardHeader className="space-y-1 pb-4">
                                <CardTitle className="text-2xl">{isLogin ? 'Welcome Back' : 'Create Account'}</CardTitle>
                                <CardDescription className="text-base">
                                    {isLogin
                                        ? 'Sign in to continue your learning journey'
                                        : 'Start your AI-powered study experience'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {error && (
                                        <div className="p-3 text-sm text-red-500 bg-red-50 rounded-lg border border-red-100">
                                            {error}
                                        </div>
                                    )}
                                    {!isLogin && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700">Full Name</label>
                                            <Input
                                                type="text"
                                                placeholder="John Doe"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                required
                                                className="h-11"
                                                disabled={loading}
                                            />
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Email</label>
                                        <Input
                                            type="email"
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="h-11"
                                            disabled={loading}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Password</label>
                                        <div className="relative">
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                placeholder="••••••••"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                className="h-11 pr-10"
                                                disabled={loading}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="w-4 h-4" />
                                                ) : (
                                                    <Eye className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {isLogin && (
                                        <div className="flex items-center justify-between text-sm">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" className="rounded border-gray-300" />
                                                <span className="text-gray-600">Remember me</span>
                                            </label>
                                            <button type="button" className="text-primary hover:underline">
                                                Forgot password?
                                            </button>
                                        </div>
                                    )}

                                    <Button
                                        type="submit"
                                        className="w-full h-11 text-base shadow-lg hover:shadow-xl transition-all"
                                        disabled={loading}
                                    >
                                        {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
                                    </Button>
                                </form>



                                <div className="mt-6 text-center">
                                    <button
                                        type="button"
                                        onClick={() => setIsLogin(!isLogin)}
                                        className="text-sm text-primary hover:underline font-medium"
                                    >
                                        {isLogin
                                            ? "Don't have an account? Sign up"
                                            : 'Already have an account? Sign in'}
                                    </button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Mobile Features */}
                        <div className="lg:hidden text-center space-y-2">
                            <p className="text-sm text-gray-600">
                                ✨ AI-Powered Q&A • 📚 Smart Flashcards • 🎯 Adaptive Quizzes
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
