import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (!roles) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { start_date, end_date, period_label } = await req.json()

    console.log(`Generating report for period: ${period_label}`)

    // Simulate report generation logic
    const activeUsers = Math.floor(Math.random() * 100) + 50
    const sentiment = ['positive', 'neutral', 'negative'][Math.floor(Math.random() * 3)]
    const issuesCount = Math.floor(Math.random() * 20)

    const keyPoints = {
      positive: [
        'Высокая вовлечённость в модуль "Автоматизация"',
        'Средняя оценка курса 4.8/5',
        'Время завершения уроков сократилось на 15%'
      ],
      warnings: [
        'Снижение активности в выходные дни',
        'Некоторые студенты застревают на уроке 4.2'
      ],
      critical: issuesCount > 10 ? [
        'Критическое снижение активности у 12 пользователей',
        'Высокий процент незавершённых уроков'
      ] : []
    }

    const recommendations = [
      'Пофиксить видео в уроке 4.2 - высокий процент пропусков',
      'Связаться с 12 студентами в группе риска',
      'Добавить дополнительные упражнения в модуль "Интеграции"',
      'Организовать live-сессию для обсуждения сложных тем'
    ]

    const summary = sentiment === 'positive'
      ? `За период ${period_label} наблюдается позитивная динамика. Активность студентов выросла, а качество обратной связи улучшилось.`
      : sentiment === 'neutral'
      ? `За период ${period_label} показатели остались на стабильном уровне. Требуется внимание к некоторым аспектам обучения.`
      : `За период ${period_label} выявлены проблемные зоны. Необходимы срочные меры для улучшения вовлечённости.`

    // Insert report into database
    const { data: report, error: insertError } = await supabaseClient
      .from('admin_reports')
      .insert({
        period_label,
        start_date,
        end_date,
        active_users: activeUsers,
        sentiment,
        issues_count: issuesCount,
        summary,
        key_points: keyPoints,
        recommendations
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting report:', insertError)
      throw insertError
    }

    console.log('Report generated successfully:', report.id)

    return new Response(
      JSON.stringify({ 
        success: true,
        report 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Error generating report:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
