import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: './backend/env.env' });

const LANDING_URL = process.env.LANDING_SUPABASE_URL!;
const LANDING_KEY = process.env.LANDING_SUPABASE_SERVICE_KEY!;

const landing = createClient(LANDING_URL, LANDING_KEY);

async function getExpressCourseLeads() {
  console.log('🔍 Проверяем какие source есть в landing_leads...\n');
  
  // Сначала посмотрим все уникальные source
  const { data: allLeads } = await landing
    .from('landing_leads')
    .select('source')
    .not('phone', 'is', null)
    .limit(100);
  
  const sources = new Set(allLeads?.map(l => l.source).filter(Boolean));
  console.log('📋 Уникальные source:');
  sources.forEach(s => console.log(`  - ${s}`));
  
  console.log('\n🎯 Ищу лиды с ExpressCourse...\n');
  
  // Теперь получим всех с ExpressCourse
  const { data: expressLeads, error } = await landing
    .from('landing_leads')
    .select('*')
    .not('phone', 'is', null)
    .ilike('source', '%express%');
  
  if (error) {
    console.error('Ошибка:', error);
    return;
  }
  
  console.log(`📊 Найдено лидов с ExpressCourse: ${expressLeads?.length || 0}\n`);
  
  if (expressLeads && expressLeads.length > 0) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📱 СПИСОК ПОЛУЧАТЕЛЕЙ:\n');
    
    expressLeads.forEach((lead, i) => {
      console.log(`${i+1}. ${lead.name || 'Нет имени'}`);
      console.log(`   📱 ${lead.phone}`);
      console.log(`   📧 ${lead.email || 'нет email'}`);
      console.log(`   📍 Source: ${lead.source}`);
      console.log('');
    });
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`🎯 ИТОГО: ${expressLeads.length} получателей для рассылки\n`);
  }
}

getExpressCourseLeads();
