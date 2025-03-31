"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, ArrowLeft, BookOpen, ExternalLink } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Assignment {
  id: string
  name: string
  description: string
  due_at: string | null
  points_possible: number
  submission_types: string[]
  has_submitted_submissions: boolean
  needs_grading_count: number
}

interface Submission {
  id: string
  user_id: string
  assignment_id: string
  submitted_at: string | null
  graded_at: string | null
  score: number | null
  grade: string | null
  workflow_state: string
  late: boolean
  missing: boolean
  submission_type: string | null
  body: string | null
  url: string | null
  attachments: any[]
  user: {
    id: string
    name: string
    sortable_name: string
    avatar_url: string
  }
}

export default function AssignmentGradingPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string
  const assignmentId = params.assignmentId as string

  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("all")

  useEffect(() => {
    if (courseId && assignmentId) {
      fetchAssignment()
      fetchSubmissions()
    }
  }, [courseId, assignmentId])

  async function fetchAssignment() {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/canvas/courses/${courseId}/assignments/${assignmentId}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch assignment")
      }

      const data = await response.json()
      console.log("Fetched assignment:", data.assignment)
      setAssignment(data.assignment)
    } catch (err) {
      console.error("Error fetching assignment:", err)
      setError(err instanceof Error ? err.message : "An error occurred while fetching assignment")
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchSubmissions() {
    setIsLoadingSubmissions(true)

    try {
      const response = await fetch(
        `/api/canvas/courses/${courseId}/assignments/${assignmentId}/submissions?include[]=user`,
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch submissions")
      }

      const data = await response.json()
      console.log("Fetched submissions:", data.submissions)
      setSubmissions(data.submissions)
    } catch (err) {
      console.error("Error fetching submissions:", err)
      // Don't set the main error state, just log it
    } finally {
      setIsLoadingSubmissions(false)
    }
  }

  function formatDate(dateString: string | null): string {
    if (!dateString) return "No date"
    return new Date(dateString).toLocaleDateString()
  }

  function getSubmissionStatusBadge(submission: Submission) {
    if (submission.workflow_state === "graded") {
      return <Badge className="bg-green-500">Graded</Badge>
    } else if (submission.missing) {
      return <Badge variant="destructive">Missing</Badge>
    } else if (submission.late) {
      return (
        <Badge variant="warning" className="bg-yellow-500">
          Late
        </Badge>
      )
    } else if (submission.submitted_at) {
      return <Badge>Submitted</Badge>
    } else {
      return <Badge variant="outline">Not Submitted</Badge>
    }
  }

  function filterSubmissions() {
    if (activeTab === "all") {
      return submissions
    } else if (activeTab === "submitted") {
      return submissions.filter((s) => s.submitted_at && s.workflow_state !== "graded")
    } else if (activeTab === "graded") {
      return submissions.filter((s) => s.workflow_state === "graded")
    } else if (activeTab === "missing") {
      return submissions.filter((s) => s.missing || (!s.submitted_at && !s.workflow_state))
    }
    return submissions
  }

  const filteredSubmissions = filterSubmissions()

  return (
    <div className="p-8">
      <Button
        variant="outline"
        size="sm"
        className="mb-6"
        onClick={() => router.push(`/dashboard/courses/${courseId}`)}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Course
      </Button>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-4 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      ) : assignment ? (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold">{assignment.name}</h1>
              </div>
              <p className="text-muted-foreground">
                {assignment.points_possible} points • Due: {formatDate(assignment.due_at)}
              </p>
            </div>
            <Button asChild>
              <a href={`${assignment.html_url || "#"}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Canvas
              </a>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Assignment Description</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="prose max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: assignment.description || "No description provided." }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Grading Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Submissions:</span>
                    <span>{submissions.filter((s) => s.submitted_at).length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Graded:</span>
                    <span>{submissions.filter((s) => s.workflow_state === "graded").length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Needs Grading:</span>
                    <span>{submissions.filter((s) => s.submitted_at && s.workflow_state !== "graded").length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Missing:</span>
                    <span>{submissions.filter((s) => s.missing || (!s.submitted_at && !s.workflow_state)).length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Student Submissions</CardTitle>
              <CardDescription>View and grade student submissions</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-6">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="submitted">Needs Grading</TabsTrigger>
                  <TabsTrigger value="graded">Graded</TabsTrigger>
                  <TabsTrigger value="missing">Missing</TabsTrigger>
                </TabsList>
              </Tabs>

              {isLoadingSubmissions ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-md">
                      <div className="flex items-center space-x-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-5 w-48" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      </div>
                      <Skeleton className="h-9 w-24" />
                    </div>
                  ))}
                </div>
              ) : filteredSubmissions.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-6 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Submissions Found</h3>
                  <p className="text-muted-foreground mb-4">There are no submissions in this category.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredSubmissions.map((submission) => (
                    <div
                      key={submission.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-md"
                    >
                      <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                        <Avatar>
                          <AvatarImage src={submission.user.avatar_url} alt={submission.user.name} />
                          <AvatarFallback>{submission.user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-medium">{submission.user.name}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            {getSubmissionStatusBadge(submission)}
                            {submission.submitted_at && (
                              <span className="text-xs text-muted-foreground">
                                Submitted: {formatDate(submission.submitted_at)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {submission.workflow_state === "graded" && (
                          <div className="text-sm font-medium mr-4">
                            Grade: {submission.score}/{assignment.points_possible}
                          </div>
                        )}
                        <Button
                          asChild
                          variant={submission.submitted_at ? "default" : "outline"}
                          disabled={!submission.submitted_at}
                        >
                          <a
                            href={`/dashboard/courses/${courseId}/assignments/${assignmentId}/submissions/${submission.user_id}`}
                          >
                            {submission.workflow_state === "graded" ? "Review" : "Grade"}
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <BookOpen className="h-16 w-16 text-muted-foreground mb-6" />
          <h2 className="text-2xl font-bold mb-2">Assignment Not Found</h2>
          <p className="text-muted-foreground mb-6">We couldn't find this assignment in your Canvas account.</p>
          <Button onClick={() => router.push(`/dashboard/courses/${courseId}`)}>Back to Course</Button>
        </div>
      )}
    </div>
  )
}

