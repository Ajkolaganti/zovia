import { createClient } from 'npm:@supabase/supabase-js@2.39.0'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

// Mock job data - in a real implementation, this would scrape actual job boards
const mockJobs = [
  {
    title: "Senior Frontend Developer",
    company: "TechCorp",
    location: "San Francisco, CA",
    salary: "$120,000 - $150,000",
    description: "We're looking for a Senior Frontend Developer with React experience to join our team.",
    platform: "LinkedIn",
    url: "https://linkedin.com/jobs/view/senior-frontend-developer",
  },
  {
    title: "Full Stack Engineer",
    company: "StartupX",
    location: "Remote",
    salary: "$100,000 - $130,000",
    description: "Join our fast-growing startup as a Full Stack Engineer working on our core product.",
    platform: "Monster",
    url: "https://monster.com/jobs/view/full-stack-engineer",
  },
  {
    title: "React Developer",
    company: "WebSolutions",
    location: "New York, NY",
    salary: "$90,000 - $120,000",
    description: "Looking for a React Developer to help build modern web applications.",
    platform: "ZipRecruiter",
    url: "https://ziprecruiter.com/jobs/view/react-developer",
  },
]

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }
  
  try {
    // Get query parameters
    const url = new URL(req.url)
    const roles = url.searchParams.get('roles')
    const locations = url.searchParams.get('locations')
    
    if (!roles) {
      return new Response(
        JSON.stringify({ error: "Roles parameter is required" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      )
    }
    
    // In a real implementation, this would use the roles and locations to filter jobs
    // For demo purposes, we just return mock data
    
    return new Response(
      JSON.stringify({ jobs: mockJobs }),
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