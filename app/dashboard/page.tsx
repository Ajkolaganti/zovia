import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import DashboardMetrics from '@/components/dashboard/DashboardMetrics'
import JobApplicationList from '@/components/dashboard/JobApplicationList'
import ApplicationChart from '@/components/dashboard/ApplicationChart'
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = createClient()
  
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    redirect('/login')
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Track your job applications and manage your automated job search.
          </p>
        </div>
        
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardMetrics userId={session.user.id} />
        </Suspense>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="col-span-1 lg:col-span-2 backdrop-blur-sm bg-card/80 border border-border">
            <CardHeader>
              <CardTitle>Application Activity</CardTitle>
              <CardDescription>Your job application activity over time</CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="h-80 flex items-center justify-center">Loading chart...</div>}>
                <ApplicationChart userId={session.user.id} />
              </Suspense>
            </CardContent>
          </Card>
          
          <Card className="col-span-1 backdrop-blur-sm bg-card/80 border border-border">
            <CardHeader>
              <CardTitle>Job Board Distribution</CardTitle>
              <CardDescription>Applications by platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {/* Job Board Distribution Chart */}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card className="backdrop-blur-sm bg-card/80 border border-border">
          <CardHeader>
            <CardTitle>Recent Applications</CardTitle>
            <CardDescription>Your most recent job applications</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="h-96 flex items-center justify-center">Loading applications...</div>}>
              <JobApplicationList userId={session.user.id} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}