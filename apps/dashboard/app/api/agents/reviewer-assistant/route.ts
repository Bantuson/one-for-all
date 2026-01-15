import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * POST /api/agents/reviewer-assistant
 *
 * Send a question to the reviewer assistant agent and receive an answer.
 * Creates an agent_session record and invokes the backend reviewer assistant crew.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { question, institution_id, application_id, course_id } = body

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      )
    }

    if (!institution_id) {
      return NextResponse.json(
        { error: 'Institution ID is required' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Create an agent session record
    const sessionInput = {
      question,
      institution_id,
      application_id: application_id || null,
      course_id: course_id || null,
      user_id: userId,
    }

    const { data: session, error: sessionError } = await supabase
      .from('agent_sessions')
      .insert({
        agent_type: 'reviewer_assistant',
        status: 'running',
        institution_id,
        input_context: sessionInput,
        created_by: userId,
      })
      .select()
      .single()

    if (sessionError) {
      console.error('Failed to create agent session:', sessionError)
      // Continue anyway - session tracking is not critical
    }

    // Call the backend reviewer assistant API
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    const backendApiKey = process.env.BACKEND_API_KEY || ''

    try {
      const backendResponse = await fetch(
        `${backendUrl}/api/v1/agents/reviewer-assistant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': backendApiKey,
          },
          body: JSON.stringify({
            question,
            institution_id,
            application_id,
            course_id,
          }),
        }
      )

      if (!backendResponse.ok) {
        // Backend unavailable - use fallback RAG search
        console.warn('Backend unavailable, using fallback RAG search')
        return await handleFallbackSearch(
          supabase,
          question,
          institution_id,
          application_id,
          course_id,
          session?.id
        )
      }

      const result = await backendResponse.json()

      // Update session with result
      if (session?.id) {
        await supabase
          .from('agent_sessions')
          .update({
            status: 'completed',
            output_result: result,
            completed_at: new Date().toISOString(),
          })
          .eq('id', session.id)
      }

      // Record the decision/answer
      if (session?.id) {
        await supabase.from('agent_decisions').insert({
          session_id: session.id,
          agent_type: 'reviewer_assistant',
          decision_type: 'question_answer',
          input_data: sessionInput,
          output_data: result,
          confidence_score: getConfidenceScore(result.confidence),
          reasoning: result.answer,
        })
      }

      return NextResponse.json({
        answer: result.answer,
        citations: result.citations || [],
        recommendations: result.recommendations || [],
        confidence: result.confidence || 'Medium',
        session_id: session?.id,
      })
    } catch (backendError) {
      console.error('Backend request failed:', backendError)
      return await handleFallbackSearch(
        supabase,
        question,
        institution_id,
        application_id,
        course_id,
        session?.id
      )
    }
  } catch (error) {
    console.error('Reviewer assistant API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Fallback search when backend is unavailable.
 * Uses direct Supabase queries to provide basic answers.
 */
async function handleFallbackSearch(
  supabase: ReturnType<typeof createServiceClient>,
  question: string,
  institutionId: string,
  applicationId: string | null,
  courseId: string | null,
  sessionId: string | null
) {
  const questionLower = question.toLowerCase()
  let answer = ''
  const citations: string[] = []
  const recommendations: string[] = []
  let confidence: 'High' | 'Medium' | 'Low' = 'Low'

  try {
    // Determine question type and fetch relevant data
    if (
      questionLower.includes('document') ||
      questionLower.includes('missing')
    ) {
      // Document-related question
      if (applicationId) {
        const { data: docs } = await supabase
          .from('application_documents')
          .select('document_type, review_status, flag_reason')
          .eq('application_id', applicationId)

        if (docs) {
          const missing = ['id_document', 'matric_certificate', 'proof_of_residence'].filter(
            (type) => !docs.find((d) => d.document_type === type)
          )
          const flagged = docs.filter((d) => d.review_status === 'flagged')

          answer = `Document Status:\n`
          answer += `- Total uploaded: ${docs.length}\n`
          answer += `- Missing: ${missing.length > 0 ? missing.join(', ') : 'None'}\n`
          answer += `- Flagged: ${flagged.length}\n`

          if (flagged.length > 0) {
            answer += `\nFlagged documents:\n`
            flagged.forEach((d) => {
              answer += `- ${d.document_type}: ${d.flag_reason}\n`
            })
          }

          confidence = 'High'
          recommendations.push(
            missing.length > 0
              ? 'Request applicant to upload missing documents'
              : 'All required documents are uploaded'
          )
        }
      } else {
        answer =
          'Please select an application to check document status.'
        recommendations.push('Select an application from the list')
      }
    } else if (
      questionLower.includes('eligible') ||
      questionLower.includes('requirement') ||
      questionLower.includes('qualify')
    ) {
      // Eligibility question
      if (courseId) {
        const { data: course } = await supabase
          .from('courses')
          .select('name, code, requirements')
          .eq('id', courseId)
          .single()

        if (course) {
          const reqs = course.requirements || {}
          answer = `Requirements for ${course.name} (${course.code}):\n`
          answer += `- Minimum APS: ${reqs.min_aps || 'Not specified'}\n`
          answer += `- Required subjects: ${
            reqs.required_subjects?.join(', ') || 'Not specified'
          }\n`

          if (reqs.notes) {
            answer += `\nNotes: ${reqs.notes}`
          }

          citations.push(`Course: ${course.name}`)
          confidence = 'Medium'
        }
      }

      if (applicationId) {
        const { data: app } = await supabase
          .from('applications')
          .select('academic_info')
          .eq('id', applicationId)
          .single()

        if (app?.academic_info) {
          const aps = app.academic_info.total_aps
          answer += `\n\nApplicant APS: ${aps || 'Not calculated'}`
          confidence = 'Medium'
        }
      }

      if (!answer) {
        answer =
          'Please select a course and/or application to check eligibility.'
      }
    } else if (
      questionLower.includes('compare') ||
      questionLower.includes('similar') ||
      questionLower.includes('average')
    ) {
      // Comparison question
      if (applicationId && courseId) {
        const { data: accepted } = await supabase
          .from('application_choices')
          .select('application:applications(academic_info)')
          .eq('course_id', courseId)
          .eq('status', 'accepted')
          .limit(20)

        if (accepted && accepted.length > 0) {
          const apsScores = accepted
            .map((a) => (a.application as { academic_info?: { total_aps?: number } })?.academic_info?.total_aps)
            .filter((aps): aps is number => typeof aps === 'number')

          if (apsScores.length > 0) {
            const avg = apsScores.reduce((a, b) => a + b, 0) / apsScores.length
            answer = `Comparison Data:\n`
            answer += `- Accepted students: ${apsScores.length}\n`
            answer += `- Average APS: ${avg.toFixed(1)}\n`
            answer += `- Range: ${Math.min(...apsScores)} - ${Math.max(...apsScores)}\n`
            confidence = 'Medium'
          }
        } else {
          answer =
            'No accepted applicants found for comparison. This may be a new course.'
          confidence = 'Low'
        }
      } else {
        answer =
          'Please select both an application and course for comparison.'
      }
    } else {
      // General policy search - search RAG embeddings
      const { data: ragResults } = await supabase
        .from('rag_embeddings')
        .select('content, source')
        .ilike('content', `%${question.split(' ').slice(0, 3).join('%')}%`)
        .eq('institution_id', institutionId)
        .limit(3)

      if (ragResults && ragResults.length > 0) {
        answer = 'Based on our knowledge base:\n\n'
        ragResults.forEach((r, idx) => {
          answer += `${idx + 1}. ${r.content.slice(0, 200)}...\n\n`
          if (r.source) citations.push(r.source)
        })
        confidence = 'Low'
        recommendations.push(
          'This is a basic search result. For more detailed analysis, please ensure the backend service is running.'
        )
      } else {
        answer =
          "I couldn't find specific information for your question. This may be because:\n" +
          '- The backend service is currently unavailable\n' +
          '- No matching policies are stored for your institution\n\n' +
          'Please try rephrasing your question or contact support.'
        confidence = 'Low'
      }
    }
  } catch (searchError) {
    console.error('Fallback search error:', searchError)
    answer =
      'An error occurred while searching. Please try again later.'
    confidence = 'Low'
  }

  // Update session if we have one
  if (sessionId) {
    await supabase
      .from('agent_sessions')
      .update({
        status: 'completed',
        output_result: { answer, citations, recommendations, confidence },
        completed_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
  }

  return NextResponse.json({
    answer,
    citations,
    recommendations,
    confidence,
    session_id: sessionId,
    fallback: true,
  })
}

/**
 * Convert confidence string to numeric score.
 */
function getConfidenceScore(confidence: string | undefined): number {
  switch (confidence) {
    case 'High':
      return 0.9
    case 'Medium':
      return 0.6
    case 'Low':
      return 0.3
    default:
      return 0.5
  }
}
