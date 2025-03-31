import { cookies } from "next/headers"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { redirect } from "next/navigation"
import type { Database } from "@/types/supabase"

export default async function DashboardPage() {
  const cookieStore = cookies()
  const supabase = createServerComponentClient<Database>({ cookies: () => cookieStore })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
    return null
  }

  // Get user data to check for Canvas settings in metadata
  const { data: userData } = await supabase.auth.getUser()
  const userMetadata = userData.user?.user_metadata || {}

  // Check if the user has Canvas settings
  let hasCanvasSettings = false
  let canvasUrl = null
  let canvasUser = null

  // First check metadata
  if (userMetadata.canvas_connected && userMetadata.canvas_url && userMetadata.canvas_token) {
    hasCanvasSettings = true
    canvasUrl = userMetadata.canvas_url
    canvasUser = userMetadata.canvas_user
  } else {
    // Then try to check the user_settings table
    try {
      const { data: userSettings, error } = await supabase
        .from("user_settings")
        .select("canvas_url, canvas_token")
        .eq("user_id", session.user.id)
        .limit(1)

      if (
        !error &&
        userSettings &&
        userSettings.length > 0 &&
        userSettings[0].canvas_url &&
        userSettings[0].canvas_token
      ) {
        hasCanvasSettings = true
        canvasUrl = userSettings[0].canvas_url
      }
    } catch (err) {
      console.warn("Error checking user_settings, table might not exist:", err)
      // Continue with hasCanvasSettings = false
    }
  }

  // If the user doesn't have Canvas settings, redirect to onboarding
  if (!hasCanvasSettings) {
    redirect("/onboarding")
    return null
  }

  // Render the dashboard
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <p className="mb-4">Welcome to your Canvas Grading Assistant dashboard!</p>

      {canvasUrl && (
        <div className="p-4 bg-green-50 text-green-900 rounded-md mb-4 dark:bg-green-900/20 dark:text-green-400">
          <p>Connected to Canvas: {canvasUrl}</p>
          {canvasUser && <p>Logged in as: {canvasUser.name}</p>}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
          <h2 className="text-xl font-semibold mb-2">Courses</h2>
          <p className="text-gray-600 dark:text-gray-300">Manage your Canvas courses</p>
          <a href="/dashboard/courses" className="text-blue-600 hover:underline block mt-4 dark:text-blue-400">
            View Courses →
          </a>
        </div>

        <div className="p-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
          <h2 className="text-xl font-semibold mb-2">Assignments</h2>
          <p className="text-gray-600 dark:text-gray-300">View and grade assignments</p>
          <a href="/dashboard/assignments" className="text-blue-600 hover:underline block mt-4 dark:text-blue-400">
            View Assignments →
          </a>
        </div>

        <div className="p-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
          <h2 className="text-xl font-semibold mb-2">Settings</h2>
          <p className="text-gray-600 dark:text-gray-300">Manage your account and Canvas integration</p>
          <a href="/dashboard/settings" className="text-blue-600 hover:underline block mt-4 dark:text-blue-400">
            View Settings →
          </a>
        </div>
      </div>
    </div>
  )
}

