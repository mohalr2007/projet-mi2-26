// made by mohamed
import { NextResponse } from 'next/server'
import { createClient } from '../../../utils/supabase/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            // Fetch the user to determine where to redirect
            const { data: { user } } = await supabase.auth.getUser()

            if (user?.id) {
                await supabase.from('system_audit_logs').insert({
                    actor_id: user.id,
                    action: 'user_signed_in',
                    entity_type: 'auth',
                    metadata: { method: 'oauth_google_callback' }
                });
            }
            
            // Check profiles table for account type
            const { data: profile } = await supabase
                .from('profiles')
                .select('account_type')
                .eq('id', user?.id || '')
                .single()
            
            const accountType = profile?.account_type || user?.user_metadata?.account_type

            console.log('User account type:', accountType); // Debug log

            if (accountType === 'doctor') {
                return NextResponse.redirect(`${origin}/dashboardoctlarabi`)
            } else if (accountType === 'patient') {
                return NextResponse.redirect(`${origin}/dashboardpatientlarabi`)
            } else {
                // If the user doesn't have an account type yet (fresh Google sign in),
                // redirect them to the signup page to complete their profile.
                return NextResponse.redirect(`${origin}/signup?step=complete`)
            }
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-error`)
}
// made by mohamed
