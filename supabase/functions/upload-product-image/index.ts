import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const siteId = formData.get("site_id") as string;

    if (!file || !siteId) {
      return new Response(
        JSON.stringify({ error: "file and site_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return new Response(
        JSON.stringify({ error: "File must be an image" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "File size must be less than 5MB" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate site exists
    const { data: site, error: siteError } = await supabase
      .from("sites")
      .select("id")
      .eq("id", siteId)
      .single();

    if (siteError || !site) {
      return new Response(
        JSON.stringify({ error: "Site not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop();
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const fileName = `${siteId}/${timestamp}_${random}.${fileExt}`;

    // Upload to Supabase Storage
    const buffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: "3600",
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(fileName);

    return new Response(
      JSON.stringify({
        status: "success",
        image_url: urlData.publicUrl,
        file_name: fileName,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error uploading image:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
