import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [impersonating, setImpersonating] = useState(null) // { originalProfile, freelancerProfile }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
        if (event === 'SIGNED_IN') {
          supabase.rpc('increment_login_count', { user_id: session.user.id }).catch(() => {})
        }
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (data) {
      setProfile(data)
    } else {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        setProfile({
          id: authUser.id,
          email: authUser.email,
          name: authUser.user_metadata?.name || authUser.email,
          role: authUser.user_metadata?.role || 'freelancer',
        })
      }
    }
    setLoading(false)
  }

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signUp = (email, password) =>
    supabase.auth.signUp({ email, password })

  const signOut = () => supabase.auth.signOut()

  function impersonate(freelancerProfile) {
    setImpersonating({
      originalProfile: profile,
      originalUser: user,
    })
    setProfile(freelancerProfile)
    setUser({ ...user, id: freelancerProfile.id })
  }

  function stopImpersonating() {
    if (impersonating) {
      setProfile(impersonating.originalProfile)
      setUser(impersonating.originalUser)
      setImpersonating(null)
    }
  }

  const activeProfile = profile
  const isAdmin = !impersonating && activeProfile?.role === 'admin'

  return (
    <AuthContext.Provider value={{
      user, profile: activeProfile, loading, signIn, signUp, signOut,
      isAdmin, fetchProfile, impersonate, stopImpersonating, impersonating
    }}>
      {children}
    </AuthContext.Provider>
  )
}
