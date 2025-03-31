import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createCanvasApiClient } from "@/lib/canvas-api"
import type { Database } from "@/types/supabase"

export async function GET(request: Request, { params }: { params: { courseId: string; assignmentId: string } }) {
  try {
    const { courseId, assignmentId } = params

    if (!courseId || !assignmentId) {
      return NextResponse.json({ error: "Course ID and Assignment ID are required" }, { status: 400 })
    }

    console.log(`Processing request for course ${courseId}, assignment ${assignmentId}`)

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })

    // Check if the user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the user's Canvas settings
    let canvasUrl: string | null = null
    let canvasToken: string | null = null

    // First try to get from user_settings table
    try {
      const { data: userSettings, error } = await supabase
        .from("user_settings")
        .select("canvas_url, canvas_token")
        .eq("user_id", session.user.id)
        .single()

      if (!error && userSettings) {
        canvasUrl = userSettings.canvas_url
        canvasToken = userSettings.canvas_token
      }
    } catch (err) {
      console.warn("Error fetching from user_settings, trying user metadata:", err)
    }

    // If not found in table, try user metadata
    if (!canvasUrl || !canvasToken) {
      const { data: userData } = await supabase.auth.getUser()
      const userMetadata = userData.user?.user_metadata || {}

      if (userMetadata.canvas_url && userMetadata.canvas_token) {
        canvasUrl = userMetadata.canvas_url
        canvasToken = userMetadata.canvas_token
      }
    }

    // If still not found, return error
    if (!canvasUrl || !canvasToken) {
      return NextResponse.json({ error: "Canvas credentials not found. Please complete onboarding." }, { status: 400 })
    }

    console.log(`Using Canvas URL: ${canvasUrl} (token length: ${canvasToken.length})`)

    // Create Canvas API client
    const canvasApi = createCanvasApiClient(canvasUrl, canvasToken)

    try {
      // Use the dedicated method to fetch the assignment
      const assignment = await canvasApi.getAssignment(courseId, assignmentId)

      if (!assignment) {
        return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
      }

      return NextResponse.json({ assignment })
    } catch (err) {
      console.error("Error fetching specific assignment:", err)
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Assignment not found or inaccessible" },
        { status: 404 },
      )
    }
  } catch (error) {
    console.error("Error in assignment API route:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 },
    )
  }
}

