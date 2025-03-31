import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createCanvasApiClient } from "@/lib/canvas-api"
import type { Database } from "@/types/supabase"

export async function GET(
  request: Request,
  { params }: { params: { courseId: string; assignmentId: string; userId: string } },
) {
  try {
    const { courseId, assignmentId, userId } = params

    if (!courseId || !assignmentId || !userId) {
      return NextResponse.json({ error: "Course ID, Assignment ID, and User ID are required" }, { status: 400 })
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

    // Parse URL parameters
    const url = new URL(request.url)
    const include = url.searchParams.get("include")?.split(",") || ["user", "submission_comments"]

    // Create Canvas API client
    const canvasApi = createCanvasApiClient(canvasUrl, canvasToken)

    // Fetch the specific submission
    try {
      const submission = await canvasApi.getSubmission(courseId, assignmentId, userId, {
        include,
      })

      // Add validation to ensure the submission has the expected structure
      if (!submission) {
        console.error("Submission not found or returned empty")
        return NextResponse.json({ error: "Submission not found" }, { status: 404 })
      }

      // If the submission doesn't have user data, create a minimal user object
      if (!submission.user) {
        console.warn("Submission missing user data, creating minimal user object")
        submission.user = {
          id: userId,
          name: `Student ${userId}`,
          sortable_name: `Student ${userId}`,
          avatar_url: "",
        }
      }

      return NextResponse.json({ submission })
    } catch (submissionError) {
      console.error("Error fetching submission:", submissionError)

      // Try to get the assignment to at least return that
      try {
        const assignment = await canvasApi.getAssignment(courseId, assignmentId)
        return NextResponse.json(
          {
            error: "Failed to fetch submission details",
            assignment,
            submission: {
              id: "unknown",
              user_id: userId,
              assignment_id: assignmentId,
              user: {
                id: userId,
                name: `Student ${userId}`,
                sortable_name: `Student ${userId}`,
                avatar_url: "",
              },
            },
          },
          { status: 200 },
        )
      } catch (assignmentError) {
        console.error("Error fetching assignment:", assignmentError)
        return NextResponse.json({ error: "Failed to fetch submission and assignment details" }, { status: 404 })
      }
    }
  } catch (error) {
    console.error("Error in submission API route:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 },
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { courseId: string; assignmentId: string; userId: string } },
) {
  try {
    const { courseId, assignmentId, userId } = params

    if (!courseId || !assignmentId || !userId) {
      return NextResponse.json({ error: "Course ID, Assignment ID, and User ID are required" }, { status: 400 })
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

    // Get the request body
    const body = await request.json()

    // Create Canvas API client
    const canvasApi = createCanvasApiClient(canvasUrl, canvasToken)

    // Update the submission grade
    try {
      const updatedSubmission = await canvasApi.updateSubmissionGrade(courseId, assignmentId, userId, body)
      return NextResponse.json({ submission: updatedSubmission })
    } catch (error) {
      console.error("Error updating submission grade:", error)
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to update submission grade" },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error in submission update API route:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 },
    )
  }
}

