import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET: Fetch ranked applications from materialized view
 * Query params: course_id, institution_id, limit, offset, recommendation
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const courseId = searchParams.get('course_id');
    const institutionId = searchParams.get('institution_id');
    const recommendation = searchParams.get('recommendation');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!courseId && !institutionId) {
      return NextResponse.json(
        { error: 'Either course_id or institution_id is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('application_rankings')
      .select('*')
      .order('rank_position', { ascending: true })
      .range(offset, offset + limit - 1);

    if (courseId) {
      query = query.eq('course_id', courseId);
    }

    if (institutionId) {
      query = query.eq('institution_id', institutionId);
    }

    if (recommendation) {
      query = query.eq('recommendation', recommendation);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Rankings fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      rankings: data,
      pagination: {
        limit,
        offset,
        total: count || data?.length || 0
      }
    });
  } catch (error) {
    console.error('Rankings API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST: Trigger materialized view refresh or apply ranking flags
 * Body: { action: 'refresh' | 'apply_flags', course_id, intake_limit?, thresholds? }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, course_id, intake_limit, thresholds } = body;

    if (action === 'refresh') {
      // Refresh the materialized view
      const { error } = await supabase.rpc('refresh_application_rankings');

      if (error) {
        console.error('Rankings refresh error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Rankings refreshed' });
    }

    if (action === 'apply_flags') {
      if (!course_id) {
        return NextResponse.json(
          { error: 'course_id is required for apply_flags action' },
          { status: 400 }
        );
      }

      // First refresh the view
      await supabase.rpc('refresh_application_rankings');

      // Get course info
      const { data: course } = await supabase
        .from('courses')
        .select('id, name, intake_limit, auto_accept_threshold, conditional_threshold, waitlist_threshold')
        .eq('id', course_id)
        .single();

      if (!course) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 });
      }

      const effectiveLimit = intake_limit || course.intake_limit;
      if (!effectiveLimit) {
        return NextResponse.json(
          { error: 'No intake limit specified' },
          { status: 400 }
        );
      }

      const effectiveThresholds = thresholds || {
        auto_accept: course.auto_accept_threshold || 0.80,
        conditional: course.conditional_threshold || 1.00,
        waitlist: course.waitlist_threshold || 1.50
      };

      // Get rankings for course
      const { data: rankings } = await supabase
        .from('application_rankings')
        .select('*')
        .eq('course_id', course_id)
        .order('rank_position');

      if (!rankings || rankings.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'No applications to rank',
          results: { total: 0 }
        });
      }

      // Calculate cutoffs
      const autoAcceptCutoff = Math.floor(effectiveLimit * effectiveThresholds.auto_accept);
      const conditionalCutoff = Math.floor(effectiveLimit * effectiveThresholds.conditional);
      const waitlistCutoff = Math.floor(effectiveLimit * effectiveThresholds.waitlist);

      // Apply rankings and create decisions
      const results = {
        auto_accept: 0,
        conditional: 0,
        waitlist: 0,
        rejection_flagged: 0,
        total: rankings.length
      };

      for (const ranking of rankings) {
        let recommendation: string;
        let confidence: number;

        if (ranking.rank_position <= autoAcceptCutoff) {
          recommendation = 'auto_accept';
          confidence = 0.95;
        } else if (ranking.rank_position <= conditionalCutoff) {
          recommendation = 'conditional';
          confidence = 0.85;
        } else if (ranking.rank_position <= waitlistCutoff) {
          recommendation = 'waitlist';
          confidence = 0.80;
        } else {
          recommendation = 'rejection_flagged';
          confidence = 0.90;
        }

        results[recommendation as keyof typeof results]++;

        // Create agent decision
        await supabase.from('agent_decisions').insert({
          decision_type: 'ranking_assigned',
          target_type: 'application',
          target_id: ranking.application_id,
          decision_value: {
            choice_id: ranking.choice_id,
            course_id: course_id,
            rank_position: ranking.rank_position,
            aps_score: ranking.aps_score,
            recommendation,
            intake_limit: effectiveLimit
          },
          confidence_score: confidence,
          reasoning: `Ranked #${ranking.rank_position} of ${rankings.length} with APS ${ranking.aps_score}`
        });
      }

      return NextResponse.json({
        success: true,
        course_id,
        course_name: course.name,
        intake_limit: effectiveLimit,
        thresholds: effectiveThresholds,
        results
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "refresh" or "apply_flags"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Rankings API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
