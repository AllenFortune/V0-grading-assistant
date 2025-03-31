import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import type { NextRequest } from "next/server"
import type { Database } from "@/types/supabase"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })
    await supabase.auth.exchangeCodeForSession(code)

    // Get the user session
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session) {
      // Check if the user has Canvas settings in their metadata
      const { data: userData } = await supabase.auth.getUser()
      const userMetadata = userData.user?.user_metadata || {}

      // If the user has Canvas settings in their metadata, redirect to dashboard
      if (userMetadata.canvas_connected) {
        return NextResponse.redirect(new URL("/dashboard", requestUrl.origin))
      }

      // Otherwise, try to check the user_settings table
      try {
        const { data: userSettings, error } = await supabase
          .from("user_settings")
          .select("id")
          .eq("user_id", session.user.id)
          .limit(1)

        // If there's no error and we found settings, redirect to dashboard
        if (!error && userSettings && userSettings.length > 0) {
          return NextResponse.redirect(new URL("/dashboard", requestUrl.origin))
        }
      } catch (err) {
        console.warn("Error checking user_settings, table might not exist:", err)
        // Continue to onboarding
      }

      // If we get here, the user needs to complete onboarding
      return NextResponse.redirect(new URL("/onboarding", requestUrl.origin))
    }
  }

  // Redirect to the login page by default
  return NextResponse.redirect(new URL("/login", requestUrl.origin))
}

