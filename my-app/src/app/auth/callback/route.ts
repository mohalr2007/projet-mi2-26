// made by mohamed
import { NextResponse } from 'next/server'
import { createClient } from '../../../utils/supabase/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/'

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            // Fetch the user to determine where to redirect
            const { data: { user } } = await supabase.auth.getUser()
            
            // Check profiles table for account type
            const { data: profile } = await supabase
                .from('profiles')
                .select('account_type')
                .eq('id', user?.id || '')
                .single()
            
            const accountType = profile?.account_type || user?.user_metadata?.account_type

            console.log('User account type:', accountType); // Debug log

            if (accountType === 'doctor') {
                return NextResponse.redirect(`${origin}/doctor-dashboard`)
            } else if (accountType === 'patient') {
                return NextResponse.redirect(`${origin}/dashboardpatientlarabi`)
            } else {
                // If the user doesn't have an account type yet (fresh Google sign in),
                // redirect them to the signup page to complete their profile.
                return NextResponse.redirect(`${origin}/signup?step=complete`)
            }

            // Fallback (should be unreachable now)
            return NextResponse.redirect(`${origin}${next}`)
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-error`)
}
// made by mohamed
