import { CheckCircleIcon, XCircleIcon, ClockIcon, LinkIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function JobApplicationList({ userId }: { userId: string }) {
  const supabase = createClient()
  
  const { data: applications } = await supabase
    .from('applications')
    .select('*')
    .eq('user_id', userId)
    .order('application_date', { ascending: false })
    .limit(10)

  const statusIcons = {
    Applied: <ClockIcon className="h-4 w-4 text-blue-500" />,
    Interview: <CheckCircleIcon className="h-4 w-4 text-green-500" />,
    Rejected: <XCircleIcon className="h-4 w-4 text-red-500" />,
  }

  const statusColors = {
    Applied: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    Interview: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    Rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  }

  if (!applications || applications.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No applications found. Start applying to jobs to see them here.
      </div>
    )
  }

  return (
    <div className="relative overflow-x-auto rounded-md">
      <table className="w-full text-sm text-left">
        <thead className="text-xs uppercase bg-muted/50">
          <tr>
            <th scope="col" className="px-6 py-3">Job Title</th>
            <th scope="col" className="px-6 py-3">Company</th>
            <th scope="col" className="px-6 py-3">Applied Date</th>
            <th scope="col" className="px-6 py-3">Platform</th>
            <th scope="col" className="px-6 py-3">Location</th>
            <th scope="col" className="px-6 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((application) => (
            <tr key={application.id} className="bg-card/50 border-b hover:bg-muted/20">
              <td className="px-6 py-4 font-medium">{application.job_title}</td>
              <td className="px-6 py-4">{application.company}</td>
              <td className="px-6 py-4">{new Date(application.application_date).toLocaleDateString()}</td>
              <td className="px-6 py-4">
                <div className="flex items-center">
                  <LinkIcon className="h-3 w-3 mr-1" />
                  {application.platform}
                </div>
              </td>
              <td className="px-6 py-4">{application.location}</td>
              <td className="px-6 py-4">
                <Badge variant="outline" className={statusColors[application.status as keyof typeof statusColors]}>
                  <span className="flex items-center">
                    {statusIcons[application.status as keyof typeof statusIcons]}
                    <span className="ml-1">{application.status}</span>
                  </span>
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}