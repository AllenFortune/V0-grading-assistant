"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle, ExternalLink, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClientSupabaseClient } from "@/lib/supabase-client"

export default function OnboardingPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [canvasSettings, setCanvasSettings] = useState({
    canvasUrl: "",
    canvasToken: "",
    canvasTokenName: "Canvas Grading Assistant",
  })
  const [isConnected, setIsConnected] = useState(false)
  const [canvasUser, setCanvasUser] = useState<any>(null)

  // Function to validate URL format
  function isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch (e) {
      return false
    }
  }

  // Function to normalize Canvas URL
  function normalizeCanvasUrl(url: string): string {
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

  async function testCanvasConnection() {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (!canvasSettings.canvasUrl || !canvasSettings.canvasToken) {
        throw new Error("Canvas URL and API token are required")
      }

      // Validate and normalize the Canvas URL
      if (!isValidUrl(canvasSettings.canvasUrl) && !isValidUrl(`https://${canvasSettings.canvasUrl}`)) {
        throw new Error("Please enter a valid Canvas URL")
      }

      const normalizedUrl = normalizeCanvasUrl(canvasSettings.canvasUrl)

      // Call our API endpoint that will proxy the request to Canvas
      const response = await fetch("/api/canvas/test-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          canvasUrl: normalizedUrl,
          canvasToken: canvasSettings.canvasToken,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to connect to Canvas")
      }

      setCanvasUser(data.user)
      setIsConnected(true)
      setSuccess(`Successfully connected to Canvas as ${data.user.name}`)

      // Update the canvasUrl with the normalized version
      setCanvasSettings((prev) => ({
        ...prev,
        canvasUrl: normalizedUrl,
      }))
    } catch (err) {
      console.error("Canvas connection test error:", err)
      setError(err instanceof Error ? err.message : "Failed to connect to Canvas")
      setIsConnected(false)
    } finally {
      setIsLoading(false)
    }
  }

  async function saveCanvasSettings() {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // First, ensure the user_settings table exists
      await ensureUserSettingsTable()

      // Then save the settings to the database
      await saveSettingsToDatabase()

      // Also save to user metadata as a backup
      await saveSettingsToUserMetadata()

      setSuccess("Canvas settings saved successfully")

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push("/dashboard")
        // Force a hard navigation to ensure the page reloads
        window.location.href = "/dashboard"
      }, 1500)
    } catch (err) {
      console.error("Settings save error:", err)
      setError(err instanceof Error ? err.message : "An error occurred while saving settings")
    } finally {
      setIsLoading(false)
    }
  }

  // Helper function to ensure the user_settings table exists
  async function ensureUserSettingsTable() {
    try {
      const response = await fetch("/api/setup/ensure-tables", {
        method: "POST",
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.warn("Warning: Failed to ensure tables exist:", errorData.error)
        // Continue anyway as the table might already exist
      }
    } catch (err) {
      console.warn("Warning: Error ensuring tables exist:", err)
      // Continue anyway as the table might already exist
    }
  }

  // Helper function to save settings to the database
  async function saveSettingsToDatabase() {
    const supabase = createClientSupabaseClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      throw new Error("You must be logged in to save settings")
    }

    // First try to insert a new record
    const { error } = await supabase.from("user_settings").insert({
      user_id: session.user.id,
      canvas_url: canvasSettings.canvasUrl,
      canvas_token: canvasSettings.canvasToken,
      canvas_token_name: canvasSettings.canvasTokenName,
      auto_sync: true,
      sync_frequency: "daily",
      notifications_enabled: true,
      email_notifications: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    // If there's an error (likely because the record already exists), try updating
    if (error) {
      console.log("Insert failed, trying update:", error)

      const { error: updateError } = await supabase
        .from("user_settings")
        .update({
          canvas_url: canvasSettings.canvasUrl,
          canvas_token: canvasSettings.canvasToken,
          canvas_token_name: canvasSettings.canvasTokenName,
          auto_sync: true,
          sync_frequency: "daily",
          notifications_enabled: true,
          email_notifications: true,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", session.user.id)

      if (updateError) {
        console.error("Update failed:", updateError)
        throw new Error(`Failed to save settings: ${updateError.message || updateError.code || "Unknown error"}`)
      }
    }
  }

  // Helper function to save settings to user metadata
  async function saveSettingsToUserMetadata() {
    const supabase = createClientSupabaseClient()

    // Update user metadata with Canvas settings
    const { error } = await supabase.auth.updateUser({
      data: {
        canvas_url: canvasSettings.canvasUrl,
        canvas_token: canvasSettings.canvasToken,
        canvas_token_name: canvasSettings.canvasTokenName,
        canvas_connected: true,
        canvas_user: canvasUser,
        auto_sync: true,
        sync_frequency: "daily",
        notifications_enabled: true,
        email_notifications: true,
        updated_at: new Date().toISOString(),
      },
    })

    if (error) {
      console.error("User metadata update error:", error)
      throw error
    }
  }

  function handleSkip() {
    router.push("/dashboard")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set Up Canvas Integration</CardTitle>
          <CardDescription>Connect your Canvas account to enable AI-assisted grading</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-50 text-green-900 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {isConnected && canvasUser && (
            <Alert className="bg-green-50 text-green-900 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Connected to Canvas as {canvasUser.name} ({canvasUser.email})
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="canvasUrl">Canvas URL</Label>
            <Input
              id="canvasUrl"
              placeholder="https://your-school.instructure.com"
              value={canvasSettings.canvasUrl}
              onChange={(e) => setCanvasSettings({ ...canvasSettings, canvasUrl: e.target.value })}
            />
            <p className="text-sm text-muted-foreground">
              Enter your school's Canvas URL (e.g., https://university.instructure.com)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="canvasToken">Canvas API Token</Label>
            <Input
              id="canvasToken"
              type="password"
              placeholder="Canvas API token"
              value={canvasSettings.canvasToken}
              onChange={(e) => setCanvasSettings({ ...canvasSettings, canvasToken: e.target.value })}
            />
            <p className="text-sm text-muted-foreground">Paste your Canvas API token here</p>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium mb-2">How to generate a Canvas API token:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Log in to your Canvas account</li>
              <li>Click on your profile picture in the top right corner</li>
              <li>Select "Settings" from the dropdown menu</li>
              <li>Scroll down to the "Approved Integrations" section</li>
              <li>Click the "+ New Access Token" button</li>
              <li>
                Enter <strong>{canvasSettings.canvasTokenName}</strong> as the Purpose
              </li>
              <li>Optionally set an expiration date (we recommend at least 1 year)</li>
              <li>Click "Generate Token"</li>
              <li>Copy the generated token and paste it in the field above</li>
            </ol>
            <div className="mt-2">
              <Button variant="outline" size="sm" asChild className="text-xs">
                <a
                  href={
                    canvasSettings.canvasUrl
                      ? `${normalizeCanvasUrl(canvasSettings.canvasUrl)}profile/settings`
                      : "https://canvas.instructure.com/profile/settings"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-1 h-3 w-3" />
                  Open Canvas Settings
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-4">
          <Button variant="outline" onClick={handleSkip}>
            Skip for now
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={testCanvasConnection}
              disabled={isLoading || !canvasSettings.canvasUrl || !canvasSettings.canvasToken}
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Test Connection
            </Button>
            <Button onClick={saveCanvasSettings} disabled={isLoading || !isConnected}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save & Continue
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

