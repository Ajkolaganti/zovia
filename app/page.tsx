import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowRightIcon, BriefcaseIcon, SearchIcon, CalendarIcon } from 'lucide-react'

export default function Home() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5 z-0" />
        <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/7709012/pexels-photo-7709012.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2')] opacity-5 mix-blend-overlay" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
          <div className="flex flex-col items-center text-center">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                Automate Your Job Search
              </span>
            </h1>
            <p className="mt-6 text-xl max-w-3xl text-muted-foreground">
              Let Zovia handle your job applications. We'll automatically apply to jobs from LinkedIn, Monster, ZipRecruiter, and other platforms, so you can focus on preparing for interviews.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="rounded-full text-lg px-8">
                <Link href="/register">Get Started</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full text-lg px-8">
                <Link href="/how-it-works">How It Works</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">How Zovia Works</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Our intelligent system handles every step of the job application process
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<BriefcaseIcon className="w-10 h-10 text-primary" />}
              title="Upload Your Resume"
              description="Upload your resume and provide your job preferences. We'll store everything securely in our database."
            />
            
            <FeatureCard 
              icon={<SearchIcon className="w-10 h-10 text-primary" />}
              title="We Find Matches"
              description="Our AI scans job boards like LinkedIn, Monster, and ZipRecruiter to find positions matching your criteria."
            />
            
            <FeatureCard 
              icon={<CalendarIcon className="w-10 h-10 text-primary" />}
              title="Automated Applications"
              description="We automatically apply to jobs on your behalf from 9-5 daily, maximizing your chances of finding the perfect role."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary/10 to-secondary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold">Ready to Transform Your Job Search?</h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Join thousands of professionals who have streamlined their job search with Zovia.
          </p>
          <Button asChild size="lg" className="mt-8 rounded-full text-lg px-8">
            <Link href="/register">
              Get Started <ArrowRightIcon className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { 
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="p-6 backdrop-blur-sm bg-card/80 hover:bg-card/90 transition-all duration-300 border border-border hover:border-primary/20 hover:shadow-lg">
      <div className="flex flex-col items-center text-center">
        <div className="p-3 rounded-full bg-primary/10 mb-4">
          {icon}
        </div>
        <h3 className="text-xl font-medium mb-2">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </Card>
  )
}