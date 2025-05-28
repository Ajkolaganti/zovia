"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, User, Briefcase, AtSign } from "lucide-react"
import ResumeUploader from "@/components/profile/ResumeUploader"
import { Label } from "@/components/ui/label"

const profileFormSchema = z.object({
  fullName: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  phone: z.string().optional(),
  location: z.string().min(1, { message: "Location is required" }),
  bio: z.string().max(500, { message: "Bio must not exceed 500 characters" }).optional(),
  linkedin: z.string().optional(),
  website: z.string().url({ message: "Please enter a valid URL" }).optional().or(z.literal('')),
})

const jobPreferencesSchema = z.object({
  desiredRoles: z.string().min(1, { message: "Please enter at least one desired role" }),
  jobTypes: z.string().min(1, { message: "Please enter preferred job types" }),
  locations: z.string().min(1, { message: "Please enter preferred locations" }),
  minSalary: z.string().optional(),
  remoteOnly: z.boolean().default(false),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>
type JobPreferencesValues = z.infer<typeof jobPreferencesSchema>

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("profile")
  const router = useRouter()
  
  const supabase = createClientComponentClient()

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      location: "",
      bio: "",
      linkedin: "",
      website: "",
    },
  })

  const jobPreferencesForm = useForm<JobPreferencesValues>({
    resolver: zodResolver(jobPreferencesSchema),
    defaultValues: {
      desiredRoles: "",
      jobTypes: "",
      locations: "",
      minSalary: "",
      remoteOnly: false,
    },
  })

  useEffect(() => {
    async function getUserData() {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        router.push('/login')
        return
      }
      
      setUser(session.user)
      
      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
      
      if (profileData) {
        profileForm.reset({
          fullName: profileData.full_name || "",
          email: session.user.email || "",
          phone: profileData.phone || "",
          location: profileData.location || "",
          bio: profileData.bio || "",
          linkedin: profileData.linkedin || "",
          website: profileData.website || "",
        })
      } else {
        // Set email if profile doesn't exist yet
        profileForm.reset({ email: session.user.email || "" })
      }
      
      // Fetch job preferences
      const { data: preferencesData, error: preferencesError } = await supabase
        .from('job_preferences')
        .select('*')
        .eq('user_id', session.user.id)
        .single()
      
      if (preferencesData) {
        jobPreferencesForm.reset({
          desiredRoles: preferencesData.desired_roles || "",
          jobTypes: preferencesData.job_types || "",
          locations: preferencesData.locations || "",
          minSalary: preferencesData.min_salary?.toString() || "",
          remoteOnly: preferencesData.remote_only || false,
        })
      }
      
      setLoading(false)
    }
    
    getUserData()
  }, [router, profileForm, jobPreferencesForm, supabase])

  async function onProfileSubmit(data: ProfileFormValues) {
    if (!user) return
    
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: data.fullName,
          email: data.email,
          phone: data.phone,
          location: data.location,
          bio: data.bio,
          linkedin: data.linkedin,
          website: data.website,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
      
      if (error) throw error
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong while updating your profile.",
      })
    }
  }

  async function onJobPreferencesSubmit(data: JobPreferencesValues) {
    if (!user) return
    
    try {
      const { error } = await supabase
        .from('job_preferences')
        .upsert({
          user_id: user.id,
          desired_roles: data.desiredRoles,
          job_types: data.jobTypes,
          locations: data.locations,
          min_salary: data.minSalary ? parseInt(data.minSalary) : null,
          remote_only: data.remoteOnly,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
      
      if (error) throw error
      
      toast({
        title: "Job preferences updated",
        description: "Your job preferences have been updated successfully.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong while updating your job preferences.",
      })
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">Loading profile...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground mt-2">
            Manage your personal information and job preferences
          </p>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Profile</span>
            </TabsTrigger>
            <TabsTrigger value="resume" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              <span>Resume</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              <span>Job Preferences</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="pt-6">
            <Card className="backdrop-blur-sm bg-card/80 border border-border">
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Update your personal information. This will be used for job applications.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-8">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <FormField
                        control={profileForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Your full name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={profileForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input placeholder="Your email" {...field} readOnly />
                            </FormControl>
                            <FormDescription>Your email address cannot be changed here.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={profileForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input placeholder="Your phone number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={profileForm.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location</FormLabel>
                            <FormControl>
                              <Input placeholder="City, State" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={profileForm.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bio</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Tell us a bit about yourself"
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            A brief description of your professional background.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Separator />
                    
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <FormField
                        control={profileForm.control}
                        name="linkedin"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>LinkedIn</FormLabel>
                            <FormControl>
                              <div className="flex items-center">
                                <AtSign className="h-4 w-4 mr-2 text-muted-foreground" />
                                <Input placeholder="LinkedIn profile URL" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={profileForm.control}
                        name="website"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Website</FormLabel>
                            <FormControl>
                              <div className="flex items-center">
                                <AtSign className="h-4 w-4 mr-2 text-muted-foreground" />
                                <Input placeholder="Your personal website" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <Button type="submit">Save Profile</Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="resume" className="pt-6">
            <Card className="backdrop-blur-sm bg-card/80 border border-border">
              <CardHeader>
                <CardTitle>Resume</CardTitle>
                <CardDescription>
                  Upload your resume. This will be used for job applications.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResumeUploader />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="preferences" className="pt-6">
            <Card className="backdrop-blur-sm bg-card/80 border border-border">
              <CardHeader>
                <CardTitle>Job Preferences</CardTitle>
                <CardDescription>
                  Configure your job search preferences. These will be used to find and apply to jobs.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...jobPreferencesForm}>
                  <form onSubmit={jobPreferencesForm.handleSubmit(onJobPreferencesSubmit)} className="space-y-8">
                    <FormField
                      control={jobPreferencesForm.control}
                      name="desiredRoles"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Desired Roles</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Software Engineer, Frontend Developer, etc."
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Enter job titles separated by commas.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <FormField
                        control={jobPreferencesForm.control}
                        name="jobTypes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Job Types</FormLabel>
                            <FormControl>
                              <Input placeholder="Full-time, Contract, etc." {...field} />
                            </FormControl>
                            <FormDescription>
                              Enter job types separated by commas.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={jobPreferencesForm.control}
                        name="locations"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Preferred Locations</FormLabel>
                            <FormControl>
                              <Input placeholder="New York, Remote, etc." {...field} />
                            </FormControl>
                            <FormDescription>
                              Enter locations separated by commas.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <FormField
                        control={jobPreferencesForm.control}
                        name="minSalary"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Minimum Salary</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. 100000" type="number" {...field} />
                            </FormControl>
                            <FormDescription>
                              Annual salary in USD.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={jobPreferencesForm.control}
                        name="remoteOnly"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id="remoteOnly"
                                  checked={field.value}
                                  onChange={field.onChange}
                                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <Label htmlFor="remoteOnly">Remote Only</Label>
                              </div>
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormDescription>
                                Only apply to remote positions.
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <Button type="submit">Save Preferences</Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}