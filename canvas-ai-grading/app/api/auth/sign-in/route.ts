import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { Database } from "@/types/supabase"

export async function POST(request: Request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })

  // Get the URL to redirect back to after authentication
  const requestUrl = new URL(request.url)
  const callbackUrl = `${requestUrl.origin}/api/auth/callback`

  // Start the OAuth flow with Canvas
  // Note: You'll need to configure your Canvas OAuth provider in Supabase
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "canvas", // This would need to be configured in Supabase
    options: {
      redirectTo: callbackUrl,
    },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.redirect(data.url)
}

