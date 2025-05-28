import { createClient } from 'npm:@supabase/supabase-js@2.39.0'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }
  
  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    )
  }
  
  try {
    const body = await req.json()
    
    const { jobTitle, company, jobDescription, location, salary, platform, jobUrl, userId } = body
    
    if (!jobTitle || !company || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      )
    }
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') as string,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
    )
    
    // In a real implementation, this would:
    // 1. Get the user's resume and job preferences
    // 2. Use the resume to apply to the job
    // 3. Record the application in the database
    
    // For demo purposes, we just record the application
    const { data, error } = await supabase
      .from('applications')
      .insert({
        user_id: userId,
        job_title: jobTitle,
        company: company,
        job_description: jobDescription || '',
        location: location || '',
        salary: salary || '',
        platform: platform || '',
        job_url: jobUrl || '',
        status: 'Applied'
      })
      .select()
    
    if (error) {
      throw new Error(error.message)
    }
    
    return new Response(
      JSON.stringify({ success: true, application: data[0] }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    )
    
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    )
  }
})