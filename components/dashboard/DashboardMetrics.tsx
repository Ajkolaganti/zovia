import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowUpIcon, BriefcaseIcon, ClockIcon, CheckCircleIcon, XCircleIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function DashboardMetrics({ userId }: { userId: string }) {
  const supabase = createClient()
  
  const { data: applications } = await supabase
    .from('applications')
    .select('*')
    .eq('user_id', userId)
  
  const { data: todayApplications } = await supabase
    .from('applications')
    .select('*')
    .eq('user_id', userId)
    .gte('application_date', new Date().toISOString().split('T')[0])
  
  const totalApplications = applications?.length || 0
  const appliedToday = todayApplications?.length || 0
  const interviews = applications?.filter(app => app.status === 'Interview')?.length || 0
  const rejections = applications?.filter(app => app.status === 'Rejected')?.length || 0
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total Applications"
        value={totalApplications}
        description="All time applications"
        icon={<BriefcaseIcon className="h-5 w-5 text-muted-foreground" />}
        trend={<TrendIndicator value={14} />}
      />
      
      <MetricCard
        title="Applied Today"
        value={appliedToday}
        description="Applications submitted today"
        icon={<ClockIcon className="h-5 w-5 text-muted-foreground" />}
        trend={<TrendIndicator value={8} />}
      />
      
      <MetricCard
        title="Interviews"
        value={interviews}
        description="Interview requests received"
        icon={<CheckCircleIcon className="h-5 w-5 text-muted-foreground" />}
        trend={<TrendIndicator value={2} />}
      />
      
      <MetricCard
        title="Rejections"
        value={rejections}
        description="Application rejections"
        icon={<XCircleIcon className="h-5 w-5 text-muted-foreground" />}
        trend={<TrendIndicator value={-3} />}
      />
    </div>
  )
}

function MetricCard({ 
  title, 
  value, 
  description, 
  icon, 
  trend 
}: { 
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  trend: React.ReactNode;
}) {
  return (
    <Card className="backdrop-blur-sm bg-card/80 border border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center space-x-2">
          <p className="text-xs text-muted-foreground">{description}</p>
          {trend}
        </div>
      </CardContent>
    </Card>
  )
}

function TrendIndicator({ value }: { value: number }) {
  const isPositive = value >= 0
  const absValue = Math.abs(value)
  
  return (
    <div className={`flex items-center space-x-1 text-xs ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
      {isPositive ? (
        <ArrowUpIcon className="h-3 w-3 rotate-0" />
      ) : (
        <ArrowUpIcon className="h-3 w-3 rotate-180" />
      )}
      <span>{absValue}%</span>
    </div>
  )
}