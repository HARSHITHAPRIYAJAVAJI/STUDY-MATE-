import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { supabase } from '@/lib/supabase'
import { LogOut, Mail, Save, Camera, GraduationCap, Award, Book } from 'lucide-react'

export function Profile() {
    const [loading, setLoading] = useState(false)
    const [updating, setUpdating] = useState(false)
    const [user, setUser] = useState<any>(null)
    const [fullName, setFullName] = useState('')
    const [age, setAge] = useState('')
    const [grade, setGrade] = useState('')
    const [school, setSchool] = useState('')
    const [major, setMajor] = useState('')
    const [skills, setSkills] = useState('')
    const [bio, setBio] = useState('')
    const [avatarUrl] = useState('')
    const [stats, setStats] = useState({
        documents: 0,
        studyHours: 0,
        quizPoints: 0
    })

    // Fetch user data and stats on mount
    useEffect(() => {
        const getProfile = async () => {
            try {
                setLoading(true)
                const { data: { user } } = await supabase.auth.getUser()

                if (user) {
                    setUser(user)
                    // Get profile data
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', user.id)
                        .single()

                    if (profile) {
                        setFullName(profile.full_name || '')
                        setAge(profile.age?.toString() || '')
                        setGrade(profile.grade_level || '')
                        setSchool(profile.school || '')
                        setMajor(profile.major || '')
                        setSkills(profile.skills ? profile.skills.join(', ') : '')
                        setBio(profile.bio || '')
                    } else if (user.user_metadata?.full_name) {
                        setFullName(user.user_metadata.full_name)
                    }

                    // Fetch Real Stats in parallel
                    const [docsRes, sessionsRes, quizzesRes] = await Promise.all([
                        supabase.from('documents').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
                        supabase.from('study_sessions').select('duration').eq('user_id', user.id),
                        supabase.from('quizzes').select('score').eq('user_id', user.id)
                    ])

                    const docCount = docsRes.count || 0

                    // Calculate total study hours (seconds / 3600)
                    const totalSeconds = sessionsRes.data?.reduce((acc, curr) => acc + (curr.duration || 0), 0) || 0
                    const hours = Math.round((totalSeconds / 3600) * 10) / 10 // Round to 1 decimal

                    // Calculate total quiz points
                    const totalPoints = quizzesRes.data?.reduce((acc, curr) => acc + (curr.score || 0), 0) || 0

                    setStats({
                        documents: docCount,
                        studyHours: hours,
                        quizPoints: totalPoints
                    })
                }
            } catch (error) {
                console.error('Error loading profile:', error)
            } finally {
                setLoading(false)
            }
        }

        getProfile()
    }, [])

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return

        try {
            setUpdating(true)

            const skillsArray = skills.split(',').map(s => s.trim()).filter(s => s)

            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    full_name: fullName,
                    age: age ? parseInt(age) : null,
                    grade_level: grade,
                    school: school,
                    major: major,
                    skills: skillsArray,
                    bio: bio,
                })

            if (error) throw error
            alert('Profile updated successfully!')
        } catch (error: any) {
            alert('Error updating profile: ' + error.message)
        } finally {
            setUpdating(false)
        }
    }

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        window.location.reload()
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        )
    }

    return (
        <div className="space-y-4 animate-fade-in max-w-4xl mx-auto pt-0">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="relative group">
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt={fullName}
                            className="w-24 h-24 rounded-full object-cover shadow-lg border-4 border-white"
                        />
                    ) : (
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                            {fullName ? fullName[0].toUpperCase() : 'U'}
                        </div>
                    )}
                    <button className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-md border hover:bg-gray-50 transition-colors">
                        <Camera className="w-4 h-4 text-gray-600" />
                    </button>
                </div>
                <div className="text-center md:text-left space-y-1">
                    <h1 className="text-2xl font-bold text-gray-900">{fullName || 'Student'}</h1>
                    <p className="text-gray-500 flex items-center justify-center md:justify-start gap-2">
                        <Mail className="w-4 h-4" />
                        {user?.email}
                    </p>
                    <div className="flex items-center justify-center md:justify-start gap-2 pt-2">

                    </div>
                </div>
                <div className="md:ml-auto">
                    <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-2" onClick={handleSignOut}>
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Stats */}
                <Card className="md:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle className="text-lg">Your Stats</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                <Book className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.documents}</p>
                                <p className="text-xs text-gray-500">Documents</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                <GraduationCap className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.studyHours}h</p>
                                <p className="text-xs text-gray-500">Study Time</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center">
                                <Award className="w-5 h-5 text-pink-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.quizPoints}</p>
                                <p className="text-xs text-gray-500">Quiz Points</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Edit Profile Form */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Profile Settings</CardTitle>
                        <CardDescription>Update your personal information</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleUpdateProfile} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Full Name</label>
                                    <Input
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="Your name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Email Address</label>
                                    <Input value={user?.email || ''} disabled className="bg-gray-50" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Age</label>
                                    <Input
                                        type="number"
                                        value={age}
                                        onChange={(e) => setAge(e.target.value)}
                                        placeholder="18"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Grade / Class</label>
                                    <Input
                                        value={grade}
                                        onChange={(e) => setGrade(e.target.value)}
                                        placeholder="e.g. 12th Grade"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">School / University</label>
                                    <Input
                                        value={school}
                                        onChange={(e) => setSchool(e.target.value)}
                                        placeholder="e.g. Stanford University"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Major / Subject</label>
                                    <Input
                                        value={major}
                                        onChange={(e) => setMajor(e.target.value)}
                                        placeholder="e.g. Computer Science"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Skills</label>
                                <Input
                                    value={skills}
                                    onChange={(e) => setSkills(e.target.value)}
                                    placeholder="e.g. React, Python, Biology (comma separated)"
                                />
                                <p className="text-xs text-gray-500">Separate multiple skills with commas</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Resume / Bio</label>
                                <textarea
                                    className="w-full h-32 rounded-lg border border-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    placeholder="Brief summary of your academic background..."
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                ></textarea>
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" type="button">Cancel</Button>
                                <Button type="submit" className="gap-2" disabled={updating}>
                                    <Save className="w-4 h-4" />
                                    {updating ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
