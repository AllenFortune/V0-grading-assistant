"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, BookOpen, Calendar, Clock, Loader2, Users } from "lucide-react"
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

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCourses()
  }, [])

  async function fetchCourses() {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        "/api/canvas/courses?include[]=term&enrollment_state=active&state[]=available&enrollment_type=teacher",
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch courses")
      }

      const data = await response.json()
      console.log("Fetched courses:", data.courses)
      setCourses(data.courses)
    } catch (err) {
      console.error("Error fetching courses:", err)
      setError(err instanceof Error ? err.message : "An error occurred while fetching courses")
    } finally {
      setIsLoading(false)
    }
  }

  function formatDate(dateString: string | null): string {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Courses</h1>
          <p className="text-muted-foreground">Manage your Canvas courses</p>
        </div>
        <Button onClick={fetchCourses} disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Refresh Courses
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Courses Found</h3>
            <p className="text-muted-foreground text-center mb-4">
              We couldn't find any active courses in your Canvas account.
            </p>
            <Button onClick={fetchCourses}>Refresh Courses</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card key={course.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{course.name}</CardTitle>
                  <Badge variant={course.workflow_state === "available" ? "default" : "outline"}>
                    {course.workflow_state === "available" ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <CardDescription>{course.course_code}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {course.term && (
                    <div className="flex items-center text-sm">
                      <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{course.term.name}</span>
                    </div>
                  )}
                  <div className="flex items-center text-sm">
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>
                      {course.start_at
                        ? `${formatDate(course.start_at)} - ${formatDate(course.end_at)}`
                        : "No dates set"}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{course.total_students || "Unknown"} students</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <a href={`/dashboard/courses/${course.id}`}>View Course</a>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

