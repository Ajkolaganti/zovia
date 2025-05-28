"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BriefcaseIcon, BookmarkIcon, ArrowUpCircleIcon, ClockIcon, CheckIcon, XIcon, MapPinIcon, BuildingIcon, DollarSignIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { createClient } from '@/lib/supabase/client'

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  description: string;
  requirements: string[];
  posted: string;
  source: string;
  applied: boolean;
  saved: boolean;
}

export default function JobsPage() {
  const [activeTab, setActiveTab] = useState("discovered")
  const [autoApplyEnabled, setAutoApplyEnabled] = useState(true)
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  
  const supabase = createClient()
  
  useEffect(() => {
    fetchJobs()
  }, [])
  
  async function fetchJobs() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        return
      }
      
      // Fetch job preferences
      const { data: preferences } = await supabase
        .from('job_preferences')
        .select('*')
        .eq('user_id', session.user.id)
        .single()
      
      if (preferences) {
        // Call the scrape-jobs edge function
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/scrape-jobs?roles=${encodeURIComponent(preferences.desired_roles)}&locations=${encodeURIComponent(preferences.locations)}`, {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
        })
        
        const { jobs: scrapedJobs } = await response.json()
        
        // Fetch applied jobs to mark them
        const { data: applications } = await supabase
          .from('applications')
          .select('job_url')
          .eq('user_id', session.user.id)
        
        const appliedUrls = new Set(applications?.map(app => app.job_url) || [])
        
        // Transform scraped jobs to match our interface
        const transformedJobs = scrapedJobs.map((job: any) => ({
          id: job.url,
          title: job.title,
          company: job.company,
          location: job.location,
          salary: job.salary,
          description: job.description,
          requirements: [],
          posted: 'Recently',
          source: job.platform,
          applied: appliedUrls.has(job.url),
          saved: false
        }))
        
        setJobs(transformedJobs)
      }
    } catch (error) {
      console.error('Error fetching jobs:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch jobs. Please try again later.",
      })
    } finally {
      setLoading(false)
    }
  }
  
  const discoveredJobs = jobs.filter(job => !job.applied && !job.saved)
  const savedJobs = jobs.filter(job => job.saved)
  const appliedJobs = jobs.filter(job => job.applied)
  
  const applyToJob = async (jobId: string) => {
    try {
      const job = jobs.find(j => j.id === jobId)
      if (!job) return
      
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please log in to apply for jobs.",
        })
        return
      }
      
      // Call the apply-to-job edge function
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/apply-to-job`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          userId: session.user.id,
          jobTitle: job.title,
          company: job.company,
          jobDescription: job.description,
          location: job.location,
          salary: job.salary,
          platform: job.source,
          jobUrl: job.id
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to apply to job')
      }
      
      setJobs(prev => 
        prev.map(j => 
          j.id === jobId ? { ...j, applied: true, saved: false } : j
        )
      )
      
      toast({
        title: "Application submitted",
        description: "Your application has been submitted successfully.",
      })
    } catch (error) {
      console.error('Error applying to job:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit application. Please try again later.",
      })
    }
  }
  
  const saveJob = async (jobId: string) => {
    setJobs(prev => 
      prev.map(job => 
        job.id === jobId ? { ...job, saved: !job.saved } : job
      )
    )
    
    const job = jobs.find(j => j.id === jobId)
    
    toast({
      title: job?.saved ? "Job removed from saved" : "Job saved",
      description: job?.saved 
        ? "The job has been removed from your saved jobs." 
        : "The job has been saved for later review.",
    })
  }
  
  const toggleAutoApply = () => {
    setAutoApplyEnabled(!autoApplyEnabled)
    
    toast({
      title: autoApplyEnabled ? "Auto-apply disabled" : "Auto-apply enabled",
      description: autoApplyEnabled 
        ? "Auto-apply has been disabled. No automatic applications will be submitted." 
        : "Auto-apply has been enabled. We'll automatically apply to matching jobs.",
    })
  }
  
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">Loading jobs...</div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
            <p className="text-muted-foreground mt-2">
              Browse, save, and apply to jobs that match your criteria
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch 
              id="auto-apply" 
              checked={autoApplyEnabled}
              onCheckedChange={toggleAutoApply}
            />
            <Label htmlFor="auto-apply">Auto-Apply</Label>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="discovered" className="flex items-center gap-2">
              <BriefcaseIcon className="h-4 w-4" />
              <span>Discovered</span>
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex items-center gap-2">
              <BookmarkIcon className="h-4 w-4" />
              <span>Saved</span>
            </TabsTrigger>
            <TabsTrigger value="applied" className="flex items-center gap-2">
              <ArrowUpCircleIcon className="h-4 w-4" />
              <span>Applied</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="discovered" className="pt-6">
            <div className="grid grid-cols-1 gap-6">
              {discoveredJobs.length > 0 ? (
                discoveredJobs.map(job => (
                  <JobCard 
                    key={job.id}
                    job={job}
                    onApply={() => applyToJob(job.id)}
                    onSave={() => saveJob(job.id)}
                  />
                ))
              ) : (
                <Card className="backdrop-blur-sm bg-card/80 border border-border">
                  <CardContent className="flex flex-col items-center justify-center p-8">
                    <BriefcaseIcon className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No jobs discovered yet</h3>
                    <p className="text-muted-foreground text-center mt-2">
                      We're actively searching for jobs that match your criteria.
                      Check back soon or adjust your job preferences.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="saved" className="pt-6">
            <div className="grid grid-cols-1 gap-6">
              {savedJobs.length > 0 ? (
                savedJobs.map(job => (
                  <JobCard 
                    key={job.id}
                    job={job}
                    onApply={() => applyToJob(job.id)}
                    onSave={() => saveJob(job.id)}
                  />
                ))
              ) : (
                <Card className="backdrop-blur-sm bg-card/80 border border-border">
                  <CardContent className="flex flex-col items-center justify-center p-8">
                    <BookmarkIcon className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No saved jobs</h3>
                    <p className="text-muted-foreground text-center mt-2">
                      Save jobs you're interested in to review them later.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="applied" className="pt-6">
            <div className="grid grid-cols-1 gap-6">
              {appliedJobs.length > 0 ? (
                appliedJobs.map(job => (
                  <JobCard 
                    key={job.id}
                    job={job}
                    onApply={() => {}}
                    onSave={() => {}}
                    applied
                  />
                ))
              ) : (
                <Card className="backdrop-blur-sm bg-card/80 border border-border">
                  <CardContent className="flex flex-col items-center justify-center p-8">
                    <ArrowUpCircleIcon className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No applications yet</h3>
                    <p className="text-muted-foreground text-center mt-2">
                      Once you apply to jobs, they will appear here.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

interface JobCardProps {
  job: Job;
  onApply: () => void;
  onSave: () => void;
  applied?: boolean;
}

function JobCard({ job, onApply, onSave, applied = false }: JobCardProps) {
  const [expanded, setExpanded] = useState(false)
  
  return (
    <Card className="backdrop-blur-sm bg-card/80 border border-border hover:border-primary/20 transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-start gap-2">
                <h3 className="text-xl font-bold">{job.title}</h3>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  {job.source}
                </Badge>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2">
                <div className="flex items-center text-muted-foreground">
                  <BuildingIcon className="h-4 w-4 mr-1" />
                  {job.company}
                </div>
                
                <div className="flex items-center text-muted-foreground">
                  <MapPinIcon className="h-4 w-4 mr-1" />
                  {job.location}
                </div>
                
                <div className="flex items-center text-muted-foreground">
                  <DollarSignIcon className="h-4 w-4 mr-1" />
                  {job.salary}
                </div>
              </div>
              
              <div className="flex items-center text-xs text-muted-foreground mt-2">
                <ClockIcon className="h-3 w-3 mr-1" />
                Posted {job.posted}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {applied ? (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 flex items-center">
                  <CheckIcon className="h-3 w-3 mr-1" />
                  Applied
                </Badge>
              ) : (
                <>
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={onApply}
                  >
                    Apply Now
                  </Button>
                  
                  <Button
                    variant={job.saved ? "secondary" : "outline"}
                    size="sm"
                    onClick={onSave}
                  >
                    {job.saved ? (
                      <>
                        <BookmarkIcon className="h-4 w-4 mr-1 fill-current" />
                        Saved
                      </>
                    ) : (
                      <>
                        <BookmarkIcon className="h-4 w-4 mr-1" />
                        Save
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
          
          <div className={`mt-2 space-y-4 ${expanded ? '' : 'line-clamp-2'}`}>
            <p>{job.description}</p>
            
            {expanded && job.requirements.length > 0 && (
              <div>
                <h4 className="font-medium mt-2 mb-1">Requirements:</h4>
                <ul className="list-disc pl-5 space-y-1">
                  
                  {job.requirements.map((req, index) => (
                    <li key={index}>{req}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          <Button 
            variant="ghost" 
            className="w-full mt-2"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Show Less' : 'Show More'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}