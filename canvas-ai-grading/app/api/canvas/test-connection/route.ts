import { NextResponse } from "next/server"
import { createCanvasApiClient, isValidUrl, normalizeCanvasUrl } from "@/lib/canvas-api"

export async function POST(request: Request) {
  try {
    const { canvasUrl, canvasToken } = await request.json()

    // Validate inputs
    if (!canvasUrl || !canvasToken) {
      return NextResponse.json({ error: "Canvas URL and API token are required" }, { status: 400 })
    }

    // Validate URL format
    if (!isValidUrl(canvasUrl) && !isValidUrl(`https://${canvasUrl}`)) {
      return NextResponse.json({ error: "Please enter a valid Canvas URL" }, { status: 400 })
    }

    // Normalize the Canvas URL
    const normalizedUrl = normalizeCanvasUrl(canvasUrl)

    // Create Canvas API client
    const canvasApi = createCanvasApiClient(normalizedUrl, canvasToken)

    // Test the connection
    try {
      const result = await canvasApi.testConnection()
      return NextResponse.json(result)
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to connect to Canvas" },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error("Canvas test connection error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 },
    )
  }
}

