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
            const accountType = user?.user_metadata?.account_type

            if (accountType === 'doctor') {
                return NextResponse.redirect(`${origin}/dashboardoctlarabi`)
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
