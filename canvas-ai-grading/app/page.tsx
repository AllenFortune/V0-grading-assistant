import { cookies } from "next/headers"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { redirect } from "next/navigation"
import type { Database } from "@/types/supabase"

// This is a Server Component by default (no 'use client' directive)
export default async function RootPage() {
  // Use the server component client for Supabase
  const cookieStore = cookies()
  const supabase = createServerComponentClient<Database>({ cookies: () => cookieStore })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
    return null // Add return to prevent further execution
  }

  // Check if user has completed onboarding
  const { data: userSettings } = await supabase
    .from("user_settings")
    .select("id")
    .eq("user_id", session.user.id)
    .limit(1)

  if (!userSettings || userSettings.length === 0) {
    redirect("/onboarding")
    return null // Add return to prevent further execution
  }

  // If user is authenticated and has completed onboarding, redirect to dashboard
  redirect("/dashboard")
  return null // This line won't be reached due to redirect, but added for clarity
}

