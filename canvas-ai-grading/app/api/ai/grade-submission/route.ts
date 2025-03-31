import { NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { assignmentDescription, submissionContent, pointsPossible, rubric } = body

    if (!assignmentDescription || !submissionContent) {
      return NextResponse.json({ error: "Assignment description and submission content are required" }, { status: 400 })
    }

    // Construct the prompt for the AI
    const prompt = `
You are an expert educational assistant helping a teacher grade a student submission.

ASSIGNMENT DESCRIPTION:
${assignmentDescription}

POINTS POSSIBLE: ${pointsPossible || "Not specified"}

${rubric ? `RUBRIC:\n${rubric}` : ""}

STUDENT SUBMISSION:
${submissionContent}

Please provide a comprehensive evaluation of this submission. Your response should include:

1. A suggested grade (out of ${pointsPossible || 100} points)
2. Detailed feedback explaining the grade, highlighting strengths and areas for improvement
3. Specific references to the submission content to justify your evaluation
4. Constructive suggestions for improvement

Format your response as a JSON object with the following structure:
{
  "grade": number,
  "feedback": "detailed feedback text",
  "strengths": ["strength1", "strength2", ...],
  "areasForImprovement": ["area1", "area2", ...],
  "summary": "brief summary of evaluation"
}
`

    // Call the AI model to generate the grading
    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt,
      temperature: 0.2, // Lower temperature for more consistent results
      maxTokens: 2000,
    })

    // Parse the JSON response
    try {
      const grading = JSON.parse(text)
      return NextResponse.json(grading)
    } catch (error) {
      console.error("Error parsing AI response:", error)
      return NextResponse.json({ error: "Failed to parse AI response", rawResponse: text }, { status: 500 })
    }
  } catch (error) {
    console.error("Error in AI grading:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 },
    )
  }
}

