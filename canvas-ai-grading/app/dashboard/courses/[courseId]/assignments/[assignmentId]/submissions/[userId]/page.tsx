"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, ArrowLeft, BookOpen, CheckCircle, ExternalLink, Loader2, Sparkles } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

interface Assignment {
  id: string
  name: string
  description: string
  due_at: string | null
  points_possible: number
  submission_types: string[]
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
  late?: boolean
  missing?: boolean
  submission_type: string | null
  body: string | null
  url: string | null
  attachments?: any[]
  submission_comments?: any[]
  user?: {
    id: string
    name: string
    sortable_name?: string
    avatar_url?: string
  }
}

interface AIGrading {
  grade: number
  feedback: string
  strengths: string[]
  areasForImprovement: string[]
  summary: string
}

export default function SubmissionGradingPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string
  const assignmentId = params.assignmentId as string
  const userId = params.userId as string

  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [isLoadingAssignment, setIsLoadingAssignment] = useState(true)
  const [isLoadingSubmission, setIsLoadingSubmission] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aiGrading, setAiGrading] = useState<AIGrading | null>(null)
  const [isGrading, setIsGrading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [grade, setGrade] = useState<string>("")
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (courseId && assignmentId && userId) {
      fetchAssignment()
      fetchSubmission()
    }
  }, [courseId, assignmentId, userId])

  useEffect(() => {
    if (submission?.grade) {
      setGrade(submission.grade)
    }
    if (submission?.submission_comments?.length > 0) {
      // Get the most recent teacher comment
      const teacherComments = submission.submission_comments
        .filter((comment) => comment.author_id === submission.user_id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      if (teacherComments.length > 0) {
        setFeedback(teacherComments[0].comment)
      }
    }
  }, [submission])

  async function fetchAssignment() {
    setIsLoadingAssignment(true)
    setError(null)

    try {
      console.log(`Fetching assignment ${assignmentId} for course ${courseId}`)
      const response = await fetch(`/api/canvas/courses/${courseId}/assignments/${assignmentId}`)

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Assignment fetch error response:", errorData)
        throw new Error(errorData.error || "Failed to fetch assignment")
      }

      const data = await response.json()
      console.log("Fetched assignment:", data.assignment)
      setAssignment(data.assignment)
    } catch (err) {
      console.error("Error fetching assignment:", err)
      setError(err instanceof Error ? err.message : "An error occurred while fetching assignment")
    } finally {
      setIsLoadingAssignment(false)
    }
  }

  async function fetchSubmission() {
    setIsLoadingSubmission(true)

    try {
      const response = await fetch(
        `/api/canvas/courses/${courseId}/assignments/${assignmentId}/submissions/${userId}?include[]=user&include[]=submission_comments`,
      )

      const data = await response.json()

      if (!response.ok) {
        console.error("Submission fetch error response:", data)
        throw new Error(data.error || "Failed to fetch submission")
      }

      // If we got an error but also an assignment, use that
      if (data.error && data.assignment) {
        setAssignment(data.assignment)
      }

      console.log("Fetched submission:", data.submission)

      // Ensure submission has at least a minimal user object
      if (data.submission && !data.submission.user) {
        data.submission.user = {
          id: userId,
          name: `Student ${userId}`,
        }
      }

      setSubmission(data.submission)
    } catch (err) {
      console.error("Error fetching submission:", err)
      // Create a minimal submission object if we couldn't fetch it
      if (!submission) {
        setSubmission({
          id: "unknown",
          user_id: userId,
          assignment_id: assignmentId,
          submitted_at: null,
          graded_at: null,
          score: null,
          grade: null,
          workflow_state: "unsubmitted",
          submission_type: null,
          body: null,
          url: null,
          user: {
            id: userId,
            name: `Student ${userId}`,
          },
        })
      }
    } finally {
      setIsLoadingSubmission(false)
    }
  }

  async function handleAIGrading() {
    if (!assignment || !submission) return

    setIsGrading(true)
    setError(null)

    try {
      const response = await fetch("/api/ai/grade-submission", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assignmentDescription: assignment.description,
          submissionContent: submission.body || "No content provided",
          pointsPossible: assignment.points_possible,
          rubric: null, // We could add rubric support in the future
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate AI grading")
      }

      const data = await response.json()
      console.log("AI Grading result:", data)
      setAiGrading(data)

      // Pre-fill the form with AI suggestions
      setGrade(data.grade.toString())
      setFeedback(data.feedback)
    } catch (err) {
      console.error("Error with AI grading:", err)
      setError(err instanceof Error ? err.message : "An error occurred with AI grading")
    } finally {
      setIsGrading(false)
    }
  }

  async function handleSubmitGrade() {
    if (!assignment || !submission) return

    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await fetch(
        `/api/canvas/courses/${courseId}/assignments/${assignmentId}/submissions/${userId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            submission: {
              posted_grade: grade,
              comment: {
                text_comment: feedback,
              },
            },
          }),
        },
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to submit grade")
      }

      const data = await response.json()
      console.log("Grade submission result:", data)
      setSubmission(data.submission)
      setSuccessMessage("Grade submitted successfully!")

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null)
      }, 3000)
    } catch (err) {
      console.error("Error submitting grade:", err)
      setError(err instanceof Error ? err.message : "An error occurred while submitting grade")
    } finally {
      setIsSaving(false)
    }
  }

  function formatDate(dateString: string | null): string {
    if (!dateString) return "No date"
    return new Date(dateString).toLocaleDateString()
  }

  // Get user's initials for avatar fallback
  function getUserInitials(name: string | undefined): string {
    if (!name) return "ST"

    const parts = name.split(" ")
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  return (
    <div className="p-8">
      <Button
        variant="outline"
        size="sm"
        className="mb-6"
        onClick={() => router.push(`/dashboard/courses/${courseId}/assignments/${assignmentId}`)}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Assignment
      </Button>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="mb-6 bg-green-50 text-green-900 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {isLoadingAssignment || isLoadingSubmission ? (
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-4 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
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
          </div>

          <div className="flex items-center space-x-4 p-4 border rounded-md bg-muted/30">
            <Avatar className="h-12 w-12">
              <AvatarImage src={submission?.user?.avatar_url || ""} alt={submission?.user?.name || "Student"} />
              <AvatarFallback>{getUserInitials(submission?.user?.name)}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold">{submission?.user?.name || `Student ${userId}`}</h2>
              <div className="flex items-center space-x-2 mt-1">
                {submission?.workflow_state === "graded" ? (
                  <Badge className="bg-green-500">
                    Graded: {submission.score}/{assignment.points_possible}
                  </Badge>
                ) : submission?.submitted_at ? (
                  <Badge>Submitted</Badge>
                ) : (
                  <Badge variant="destructive">Not Submitted</Badge>
                )}
                {submission?.submitted_at && (
                  <span className="text-sm text-muted-foreground">
                    Submitted: {formatDate(submission.submitted_at)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Student Submission</CardTitle>
                {submission?.submitted_at && (
                  <CardDescription>Submitted on {formatDate(submission.submitted_at)}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {submission?.body ? (
                  <div
                    className="prose max-w-none dark:prose-invert overflow-auto max-h-[500px] p-4 border rounded-md bg-muted/30"
                    dangerouslySetInnerHTML={{ __html: submission.body }}
                  />
                ) : submission?.url ? (
                  <div className="p-4 border rounded-md bg-muted/30">
                    <p className="mb-4">Student submitted a URL:</p>
                    <Button asChild variant="outline">
                      <a href={submission.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open Submission URL
                      </a>
                    </Button>
                  </div>
                ) : submission?.attachments && submission.attachments.length > 0 ? (
                  <div className="p-4 border rounded-md bg-muted/30">
                    <p className="mb-4">Student submitted {submission.attachments.length} attachment(s):</p>
                    <div className="space-y-2">
                      {submission.attachments.map((attachment) => (
                        <Button key={attachment.id} asChild variant="outline" className="w-full justify-start">
                          <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            {attachment.display_name || attachment.filename}
                          </a>
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Submission Content</h3>
                    <p className="text-muted-foreground">
                      This student hasn't submitted any content for this assignment.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Grading</CardTitle>
                  <CardDescription>Provide feedback and assign a grade</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="grade">Grade (out of {assignment.points_possible})</Label>
                    <Input
                      id="grade"
                      type="number"
                      min="0"
                      max={assignment.points_possible.toString()}
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      placeholder={`Enter grade (0-${assignment.points_possible})`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="feedback">Feedback</Label>
                    <Textarea
                      id="feedback"
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Provide feedback to the student"
                      rows={8}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between border-t pt-4">
                  <Button
                    variant="outline"
                    onClick={handleAIGrading}
                    disabled={isGrading || !submission?.body}
                    className="gap-2"
                  >
                    {isGrading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    AI Assist
                  </Button>
                  <Button onClick={handleSubmitGrade} disabled={isSaving || !grade}>
                    {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Submit Grade
                  </Button>
                </CardFooter>
              </Card>

              {aiGrading && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      AI Grading Suggestions
                    </CardTitle>
                    <CardDescription>AI-generated feedback and grade suggestion</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium mb-1">Suggested Grade</h3>
                      <p className="text-xl font-bold">
                        {aiGrading.grade} / {assignment.points_possible}
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-sm font-medium mb-1">Summary</h3>
                      <p className="text-sm">{aiGrading.summary}</p>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-sm font-medium mb-1">Strengths</h3>
                      <ul className="list-disc pl-5 text-sm space-y-1">
                        {aiGrading.strengths.map((strength, index) => (
                          <li key={index}>{strength}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium mb-1">Areas for Improvement</h3>
                      <ul className="list-disc pl-5 text-sm space-y-1">
                        {aiGrading.areasForImprovement.map((area, index) => (
                          <li key={index}>{area}</li>
                        ))}
                      </ul>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-sm font-medium mb-1">Detailed Feedback</h3>
                      <p className="text-sm whitespace-pre-line">{aiGrading.feedback}</p>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-4">
                    <Button
                      onClick={() => {
                        setGrade(aiGrading.grade.toString())
                        setFeedback(aiGrading.feedback)
                      }}
                      variant="outline"
                      className="w-full"
                    >
                      Use AI Suggestions
                    </Button>
                  </CardFooter>
                </Card>
              )}
            </div>
          </div>
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

