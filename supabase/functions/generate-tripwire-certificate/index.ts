import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { PDFDocument, rgb, StandardFonts } from "https://cdn.skypack.dev/pdf-lib@1.17.1?dts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Get user from request auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { full_name } = await req.json();
    const userId = user.id;

    // 2. Check tripwire progress
    const { data: profile, error: profileError } = await supabaseClient
      .from('tripwire_user_profile')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    // Allow if 3 modules are completed OR if user is admin/tester (optional bypass)
    // Strict check:
    if (profile.modules_completed < 3) {
      throw new Error('Complete all 3 modules first');
    }

    // If certificate already exists, return it
    if (profile.certificate_issued && profile.certificate_url) {
      return new Response(
        JSON.stringify({ 
          url: profile.certificate_url,
          message: 'Certificate already issued' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Generate Certificate
    const pdfDoc = await PDFDocument.create();
    // A4 Landscape: 841.89 x 595.28
    const page = pdfDoc.addPage([841.89, 595.28]);
    const { width, height } = page.getSize();

    // Colors
    const black = rgb(0.01, 0.01, 0.01);
    const neonGreen = rgb(0, 1, 0.58); // #00FF94
    const white = rgb(1, 1, 1);
    const gray = rgb(0.6, 0.6, 0.6);

    // Fonts
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

    // Background
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: black,
    });

    // Border (Neon Green)
    const margin = 30;
    page.drawRectangle({
      x: margin,
      y: margin,
      width: width - margin * 2,
      height: height - margin * 2,
      borderColor: neonGreen,
      borderWidth: 2,
      color: undefined, // transparent
    });

    // Corner accents
    const cornerSize = 60;
    // Top-Left
    page.drawLine({ start: { x: margin, y: height - margin - cornerSize }, end: { x: margin, y: height - margin }, thickness: 4, color: neonGreen });
    page.drawLine({ start: { x: margin, y: height - margin }, end: { x: margin + cornerSize, y: height - margin }, thickness: 4, color: neonGreen });
    // Bottom-Right
    page.drawLine({ start: { x: width - margin, y: margin + cornerSize }, end: { x: width - margin, y: margin }, thickness: 4, color: neonGreen });
    page.drawLine({ start: { x: width - margin - cornerSize, y: margin }, end: { x: width - margin, y: margin }, thickness: 4, color: neonGreen });

    // Title
    page.drawText('CERTIFICATE', {
      x: width / 2 - 150,
      y: height - 120,
      size: 48,
      font: fontBold,
      color: neonGreen,
    });
    
    page.drawText('OF COMPLETION', {
      x: width / 2 - 110, // Approximate centering
      y: height - 160,
      size: 24,
      font: font,
      color: white,
    });

    // Recipient
    const nameText = full_name || user.email || 'Student';
    const nameSize = 42;
    const nameWidth = fontBold.widthOfTextAtSize(nameText, nameSize);
    
    page.drawText(nameText, {
      x: (width - nameWidth) / 2,
      y: height / 2 + 20,
      size: nameSize,
      font: fontBold,
      color: white,
    });

    page.drawLine({
      start: { x: (width - nameWidth) / 2 - 20, y: height / 2 },
      end: { x: (width + nameWidth) / 2 + 20, y: height / 2 },
      thickness: 1,
      color: gray,
    });

    // Description
    const desc = "Has successfully completed the intensive course";
    const descWidth = font.widthOfTextAtSize(desc, 18);
    page.drawText(desc, {
      x: (width - descWidth) / 2,
      y: height / 2 - 40,
      size: 18,
      font: font,
      color: gray,
    });

    // Course Name
    const courseName = "Tripwire: Introduction to AI";
    const courseWidth = fontBold.widthOfTextAtSize(courseName, 32);
    page.drawText(courseName, {
      x: (width - courseWidth) / 2,
      y: height / 2 - 90,
      size: 32,
      font: fontBold,
      color: neonGreen,
    });

    // Generate Certificate Number
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const certNumber = `ONAI-TW-2025-${timestamp}${random}`;

    // Footer Info
    const dateStr = new Date().toLocaleDateString('ru-RU');
    
    page.drawText(`DATE: ${dateStr}`, {
      x: margin + 40,
      y: margin + 40,
      size: 14,
      font: fontMono,
      color: gray,
    });

    page.drawText(`ID: ${certNumber}`, {
      x: width - margin - 260,
      y: margin + 40,
      size: 14,
      font: fontMono,
      color: neonGreen,
    });

    // onAI Academy Branding
    page.drawText('onAI Academy', {
      x: width / 2 - 60,
      y: margin + 40,
      size: 18,
      font: fontBold,
      color: white,
    });

    // Save PDF
    const pdfBytes = await pdfDoc.save();

    // 4. Upload to Storage
    const fileName = `${userId}_${Date.now()}.pdf`;
    const { error: uploadError } = await supabaseClient
      .storage
      .from('tripwire-certificates')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get Public URL
    const { data: { publicUrl } } = supabaseClient
      .storage
      .from('tripwire-certificates')
      .getPublicUrl(fileName);

    // 5. Update Database
    // Insert into tripwire_certificates
    await supabaseClient.from('tripwire_certificates').upsert({
      user_id: userId,
      certificate_number: certNumber,
      full_name: nameText,
      course_name: 'Tripwire: Введение в AI',
      certificate_url: publicUrl,
      issued_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    });

    // Update user profile
    await supabaseClient.from('tripwire_user_profile').update({
      certificate_issued: true,
      certificate_url: publicUrl,
      certificate_issued_at: new Date().toISOString()
    }).eq('user_id', userId);

    return new Response(
      JSON.stringify({ url: publicUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

