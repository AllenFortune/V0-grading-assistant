"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, ArrowLeft, BookOpen, Calendar, Clock, ExternalLink, Users } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

interface Course {
  id: string
  name: string
  course_code: string
  enrollment_term_id: number
  start_at: string | null
  end_at: string | null
  total_students: number
  workflow_state: string
  term?: {
    name: string
  }
}

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

export default function CourseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.id as string

  const [course, setCourse] = useState<Course | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (courseId) {
      fetchCourse()
      fetchAssignments()
    }
  }, [courseId])

  async function fetchCourse() {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/canvas/courses/${courseId}?include[]=term`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch course")
      }

      const data = await response.json()
      console.log("Fetched course:", data.course)
      setCourse(data.course)
    } catch (err) {
      console.error("Error fetching course:", err)
      setError(err instanceof Error ? err.message : "An error occurred while fetching course")
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchAssignments() {
    setIsLoadingAssignments(true)

    try {
      const response = await fetch(`/api/canvas/courses/${courseId}/assignments`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch assignments")
      }

      const data = await response.json()
      console.log("Fetched assignments:", data.assignments)
      setAssignments(data.assignments)
    } catch (err) {
      console.error("Error fetching assignments:", err)
      // Don't set the main error state, just log it
    } finally {
      setIsLoadingAssignments(false)
    }
  }

  function formatDate(dateString: string | null): string {
    if (!dateString) return "No due date"
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="p-8">
      <Button variant="outline" size="sm" className="mb-6" onClick={() => router.push("/dashboard/courses")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Courses
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
      ) : course ? (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold">{course.name}</h1>
                <Badge variant={course.workflow_state === "available" ? "default" : "outline"}>
                  {course.workflow_state === "available" ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="text-muted-foreground">{course.course_code}</p>
            </div>
            <Button asChild>
              <a href={`${course.html_url || "#"}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Canvas
              </a>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Term</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-muted-foreground" />
                  <span>{course.term?.name || "No term assigned"}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Dates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-muted-foreground" />
                  <span>
                    {course.start_at ? `${formatDate(course.start_at)} - ${formatDate(course.end_at)}` : "No dates set"}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Students</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Users className="h-5 w-5 mr-2 text-muted-foreground" />
                  <span>{course.total_students || "Unknown"} students</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="assignments">
            <TabsList>
              <TabsTrigger value="assignments">Assignments</TabsTrigger>
              <TabsTrigger value="students">Students</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="assignments" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Assignments</CardTitle>
                  <CardDescription>Manage and grade assignments for this course</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingAssignments ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-4 border rounded-md">
                          <div className="space-y-2">
                            <Skeleton className="h-5 w-48" />
                            <Skeleton className="h-4 w-24" />
                          </div>
                          <Skeleton className="h-9 w-24" />
                        </div>
                      ))}
                    </div>
                  ) : assignments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-6 text-center">
                      <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-xl font-semibold mb-2">No Assignments Found</h3>
                      <p className="text-muted-foreground mb-4">This course doesn't have any assignments yet.</p>
                      <Button onClick={fetchAssignments}>Refresh Assignments</Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {assignments.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border rounded-md"
                        >
                          <div className="space-y-1 mb-4 md:mb-0">
                            <h3 className="font-medium">{assignment.name}</h3>
                            <div className="flex items-center text-sm text-muted-foreground">
                              <span className="mr-4">Due: {formatDate(assignment.due_at)}</span>
                              <span>{assignment.points_possible} points</span>
                            </div>
                            {assignment.needs_grading_count > 0 && (
                              <Badge variant="destructive" className="mt-1">
                                {assignment.needs_grading_count} need grading
                              </Badge>
                            )}
                          </div>
                          <Button asChild>
                            <a href={`/dashboard/courses/${courseId}/assignments/${assignment.id}`}>Grade</a>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="students" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Students</CardTitle>
                  <CardDescription>View and manage students enrolled in this course</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>Student management coming soon...</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Analytics</CardTitle>
                  <CardDescription>View course analytics and performance metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>Analytics coming soon...</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <BookOpen className="h-16 w-16 text-muted-foreground mb-6" />
          <h2 className="text-2xl font-bold mb-2">Course Not Found</h2>
          <p className="text-muted-foreground mb-6">We couldn't find this course in your Canvas account.</p>
          <Button onClick={() => router.push("/dashboard/courses")}>Back to Courses</Button>
        </div>
      )}
    </div>
  )
}

