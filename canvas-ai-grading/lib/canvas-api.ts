/**
 * Canvas API client for making requests to the Canvas LMS API
 */

// Function to normalize Canvas URL
export function normalizeCanvasUrl(url: string): string {
  // Ensure URL has protocol
  let normalizedUrl = url
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    normalizedUrl = `https://${url}`
  }

  // Ensure URL ends with a slash
  if (!normalizedUrl.endsWith("/")) {
    normalizedUrl = `${normalizedUrl}/`
  }

  return normalizedUrl
}

// Function to validate URL format
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch (e) {
    return false
  }
}

// Canvas API client class
export class CanvasApiClient {
  private baseUrl: string
  private token: string

  constructor(canvasUrl: string, token: string) {
    this.baseUrl = normalizeCanvasUrl(canvasUrl)
    this.token = token
  }

  // Generic request method that can be used for any Canvas API endpoint
  async request<T>(endpoint: string, options: RequestInit = {}, throwOnError = true): Promise<T | null> {
    const url = `${this.baseUrl}api/v1/${endpoint.replace(/^\//, "")}`

    const headers = {
      Authorization: `Bearer ${this.token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...options.headers,
    }

    console.log(`Making Canvas API request to: ${url}`)

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      if (!response.ok) {
        let errorMessage = `Canvas API error: ${response.status} ${response.statusText}`

        try {
          const errorData = await response.json()
          errorMessage = errorData.errors?.[0]?.message || errorMessage
        } catch (e) {
          // If we can't parse the error as JSON, use the status text
        }

        if (throwOnError) {
          throw new Error(errorMessage)
        } else {
          console.warn(errorMessage)
          return null
        }
      }

      return response.json() as Promise<T>
    } catch (error) {
      console.error(`Canvas API request failed for ${url}:`, error)

      // Enhance the error message with more details
      if (error instanceof Error) {
        if (error.message === "Failed to fetch") {
          const enhancedError = new Error(
            `Network error when connecting to Canvas API at ${url}. Please check your Canvas URL and network connection.`,
          )
          if (throwOnError) {
            throw enhancedError
          } else {
            console.warn(enhancedError.message)
            return null
          }
        }
        if (throwOnError) {
          throw error
        } else {
          console.warn(error.message)
          return null
        }
      }

      const genericError = new Error(`Failed to connect to Canvas API: ${error}`)
      if (throwOnError) {
        throw genericError
      } else {
        console.warn(genericError.message)
        return null
      }
    }
  }

  // Get a specific assignment
  async getAssignment(courseId: string, assignmentId: string) {
    try {
      console.log(`Fetching assignment ${assignmentId} for course ${courseId}`)
      return await this.request<any>(`courses/${courseId}/assignments/${assignmentId}`)
    } catch (error) {
      console.error(`Error fetching assignment ${assignmentId}:`, error)
      throw error
    }
  }

  // Get current user
  async getCurrentUser() {
    return this.request<any>("users/self")
  }

  // Get courses
  async getCourses(
    options: {
      include?: string[]
      enrollment_state?: string
      state?: string[]
      enrollment_type?: string
    } = {},
  ) {
    const queryParams = new URLSearchParams()

    if (options.include && options.include.length > 0) {
      queryParams.set("include", options.include.join(","))
    }

    if (options.enrollment_state) {
      queryParams.set("enrollment_state", options.enrollment_state)
    }

    if (options.state && options.state.length > 0) {
      queryParams.set("state", options.state.join(","))
    }

    if (options.enrollment_type) {
      queryParams.set("enrollment_type", options.enrollment_type)
    }

    // Add per_page parameter to get more results
    queryParams.set("per_page", "100")

    const endpoint = `courses?${queryParams.toString()}`
    return this.request<any[]>(endpoint)
  }

  // Get a specific course
  async getCourse(courseId: string, options: { include?: string[] } = {}) {
    const queryParams = new URLSearchParams()

    if (options.include && options.include.length > 0) {
      queryParams.set("include", options.include.join(","))
    }

    const endpoint = `courses/${courseId}?${queryParams.toString()}`
    return this.request<any>(endpoint)
  }

  // Get assignments for a course
  async getCourseAssignments(
    courseId: string,
    options: {
      include?: string[]
      bucket?: string
      assignment_ids?: string[]
    } = {},
  ) {
    const queryParams = new URLSearchParams()

    if (options.include && options.include.length > 0) {
      queryParams.set("include", options.include.join(","))
    }

    if (options.bucket) {
      queryParams.set("bucket", options.bucket)
    }

    if (options.assignment_ids && options.assignment_ids.length > 0) {
      queryParams.set("assignment_ids", options.assignment_ids.join(","))
    }

    // Add per_page parameter to get more results
    queryParams.set("per_page", "100")

    const endpoint = `courses/${courseId}/assignments?${queryParams.toString()}`
    return this.request<any[]>(endpoint)
  }

  // Get submissions for an assignment
  async getAssignmentSubmissions(
    courseId: string,
    assignmentId: string,
    options: {
      include?: string[]
    } = {},
  ) {
    const queryParams = new URLSearchParams()

    if (options.include && options.include.length > 0) {
      queryParams.set("include", options.include.join(","))
    }

    // Add per_page parameter to get more results
    queryParams.set("per_page", "100")

    const endpoint = `courses/${courseId}/assignments/${assignmentId}/submissions?${queryParams.toString()}`
    return this.request<any[]>(endpoint)
  }

  // Get a specific submission
  async getSubmission(
    courseId: string,
    assignmentId: string,
    userId: string,
    options: {
      include?: string[]
    } = {},
  ) {
    const queryParams = new URLSearchParams()

    if (options.include && options.include.length > 0) {
      queryParams.set("include", options.include.join(","))
    }

    const endpoint = `courses/${courseId}/assignments/${assignmentId}/submissions/${userId}?${queryParams.toString()}`
    return this.request<any>(endpoint)
  }

  // Get a user by ID - with option to not throw on error
  async getUserById(userId: string, throwOnError = false) {
    try {
      console.log(`Fetching user ${userId}`)
      return await this.request<any>(`users/${userId}`, {}, throwOnError)
    } catch (error) {
      console.error(`Error fetching user ${userId}:`, error)
      if (throwOnError) {
        throw error
      }
      return null
    }
  }

  // Update a submission (grade)
  async updateSubmissionGrade(
    courseId: string,
    assignmentId: string,
    userId: string,
    data: {
      submission: {
        posted_grade: string | number
        comment?: {
          text_comment: string
        }
      }
    },
  ) {
    const endpoint = `courses/${courseId}/assignments/${assignmentId}/submissions/${userId}`
    return this.request<any>(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  // Test connection
  async testConnection() {
    try {
      const user = await this.getCurrentUser()
      return {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email || user.login_id,
          avatar_url: user.avatar_url,
        },
      }
    } catch (error) {
      throw error
    }
  }
}

// Create a Canvas API client instance
export function createCanvasApiClient(canvasUrl: string, token: string) {
  return new CanvasApiClient(canvasUrl, token)
}

