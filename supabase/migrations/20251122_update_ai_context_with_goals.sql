DROP FUNCTION IF EXISTS get_student_context_for_ai(UUID);

CREATE OR REPLACE FUNCTION get_student_context_for_ai(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_context JSONB;
  v_profile RECORD;
  v_progress_stats RECORD;
  v_recent_lessons JSONB;
  v_video_struggles JSONB;
  v_goals_stats JSONB;
  v_recent_goals JSONB;
BEGIN
  SELECT 
    p.full_name,
    p.level,
    p.xp,
    p.current_streak,
    p.longest_streak
  INTO v_profile
  FROM profiles p
  WHERE p.id = p_user_id;

  SELECT 
    COUNT(*) as total_lessons,
    COUNT(*) FILTER (WHERE is_completed = true) as completed_lessons,
    COALESCE(SUM(xp_earned), 0) as total_xp
  INTO v_progress_stats
  FROM student_progress
  WHERE user_id = p_user_id;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'lesson_id', l.id,
      'title', l.title,
      'completed_at', sp.completed_at,
      'xp_earned', sp.xp_earned
    ) ORDER BY sp.completed_at DESC
  ), '[]'::jsonb)
  INTO v_recent_lessons
  FROM student_progress sp
  JOIN lessons l ON l.id = sp.lesson_id
  WHERE sp.user_id = p_user_id AND sp.is_completed = true
  LIMIT 5;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'lesson_id', vws.lesson_id,
      'seeks_count', vws.seeks_count,
      'pauses_count', vws.pauses_count,
      'max_second_reached', vws.max_second_reached,
      'session_start', vws.session_start
    ) ORDER BY vws.session_start DESC
  ), '[]'::jsonb)
  INTO v_video_struggles
  FROM video_watch_sessions vws
  WHERE vws.user_id = p_user_id 
    AND (vws.seeks_count > 5 OR vws.pauses_count > 10)
  LIMIT 5;

  SELECT jsonb_build_object(
    'total_goals', COUNT(*),
    'completed_goals', COUNT(*) FILTER (WHERE status = 'done'),
    'in_progress_goals', COUNT(*) FILTER (WHERE status = 'in_progress'),
    'todo_goals', COUNT(*) FILTER (WHERE status = 'todo'),
    'overdue_goals', COUNT(*) FILTER (WHERE status != 'done' AND due_date < CURRENT_DATE),
    'goals_this_week', COUNT(*) FILTER (WHERE status = 'done' AND completed_at >= DATE_TRUNC('week', CURRENT_DATE)),
    'completion_rate', CASE 
      WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE status = 'done')::DECIMAL / COUNT(*)) * 100, 2)
      ELSE 0
    END
  )
  INTO v_goals_stats
  FROM user_goals
  WHERE user_id = p_user_id;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', ug.id,
      'title', ug.title,
      'status', ug.status,
      'due_date', ug.due_date,
      'priority', ug.priority,
      'created_at', ug.created_at,
      'completed_at', ug.completed_at
    ) ORDER BY 
      CASE ug.status
        WHEN 'in_progress' THEN 1
        WHEN 'todo' THEN 2
        WHEN 'done' THEN 3
      END,
      ug.created_at DESC
  ), '[]'::jsonb)
  INTO v_recent_goals
  FROM user_goals ug
  WHERE ug.user_id = p_user_id
  LIMIT 10;

  v_context := jsonb_build_object(
    'student_id', p_user_id,
    'profile', jsonb_build_object(
      'full_name', v_profile.full_name,
      'level', v_profile.level,
      'xp', v_profile.xp,
      'current_streak', v_profile.current_streak,
      'longest_streak', v_profile.longest_streak
    ),
    'progress', jsonb_build_object(
      'total_lessons', v_progress_stats.total_lessons,
      'completed_lessons', v_progress_stats.completed_lessons,
      'total_xp', v_progress_stats.total_xp
    ),
    'recent_lessons', v_recent_lessons,
    'video_struggles', v_video_struggles,
    'goals', jsonb_build_object(
      'statistics', v_goals_stats,
      'recent_goals', v_recent_goals
    )
  );

  RETURN v_context;
END;
$$ LANGUAGE plpgsql;

