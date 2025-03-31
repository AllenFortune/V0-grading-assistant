import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createCanvasApiClient } from "@/lib/canvas-api"
import type { Database } from "@/types/supabase"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const courseId = params.id

    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 })
    }

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

    // Create Canvas API client
    const canvasApi = createCanvasApiClient(canvasUrl, canvasToken)

    // Fetch assignments for the course
    const assignments = await canvasApi.getCourseAssignments(courseId, {
      include: ["submission_count", "overrides"],
    })

    return NextResponse.json({ assignments })
  } catch (error) {
    console.error("Error fetching Canvas assignments:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 },
    )
  }
}

