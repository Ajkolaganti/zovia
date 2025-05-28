import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient, SupabaseClient, PostgrestSingleResponse, User } from '@supabase/supabase-js'
import puppeteer, { Browser, Page } from 'puppeteer'

const corsHeaders = {
  'Access-Control-Allow-Origin': '* ', // Adjust for production to your app's domain
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log('LinkedIn scraping function initializing')

// Define a type for our scraped job data for clarity
interface ScrapedJob {
  job_title: string
  company: string
  job_description: string
  location: string
  salary: string
  job_url: string
  platform: string
  status: string
  // user_id?: string // Optional: if we want to associate with a user later
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let browser: Browser | null = null
  let supabaseClient: SupabaseClient | null = null
  let currentUserId: string | null = null

  try {
    // TODO: Implement proper authentication/authorization if this function is invoked by users directly
    // For now, assuming it might be triggered by a cron job or authorized backend call.

    console.log('LinkedIn scraping function invoked')

    // Initialize Supabase client
    // Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set as environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Supabase URL or Service Role Key is missing from environment variables.')
      throw new Error('Server configuration error: Supabase credentials not found.')
    }
    // Client for general operations (like service role inserts)
    supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Attempt to get user from Authorization header for user-specific actions
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      // Create a temporary client scoped to the user's token to verify and get user
      // This client should not be used for service_role operations
      const userSupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, { // Still use service key for this temp client creation for stability in edge
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { autoRefreshToken: false, persistSession: false }
      })
      const { data: { user }, error: userError } = await userSupabaseClient.auth.getUser()

      if (userError) {
        console.warn('Error getting user from token:', userError.message)
        // Not throwing error, will proceed as anonymous/system if currentUserId remains null
      } else if (user) {
        currentUserId = user.id
        console.log('Scraping on behalf of user:', currentUserId)
      } else {
        console.warn('No user found from token, proceeding as anonymous/system.')
      }
    } else {
      console.warn('No Authorization header found, proceeding as anonymous/system.')
    }

    if (!currentUserId) {
      // IMPORTANT: Fallback or error if user_id is strictly required and not found
      // For now, using the previous placeholder strategy if no user context.
      // This will FAIL if the placeholder is not a valid FK to auth.users.
      // TODO: Replace this with a valid system/default user ID if anonymous scraping is allowed
      // or throw an error if user context is mandatory.
      currentUserId = 'b518c5d5-2139-413e-ba3d-2e0f9dcd30aa' // Your previously used placeholder
      console.warn(`No authenticated user context. Falling back to placeholder user_id: ${currentUserId}. Ensure this ID is valid or update strategy.`)
    }

    // Launch Puppeteer
    // Important: Args for serverless environments
    // Full list of args: https://peter.sh/experiments/chromium-command-line-switches/
    browser = await puppeteer.launch({
      headless: true, // Or 'new' for the new headless mode
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // Crucial for environments with limited shared memory
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        // '--single-process', // May be needed in some environments, but can affect stability
        '--disable-gpu', // Often recommended for headless, though modern headless might not strictly need it
      ],
      // You might need to specify executablePath if running locally and Deno doesn't find it,
      // or if using a custom Chromium build in a specific environment.
      // executablePath: Deno.env.get('PUPPETEER_EXECUTABLE_PATH') || undefined,
    })

    const page = await browser.newPage()

    // It's good practice to set a user agent that's not obviously a bot
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36')

    console.log('Navigating to LinkedIn job search...')
    // Using a generic software engineer search. This might need to be parameterized later.
    // LinkedIn might require login for full access or might present CAPTCHAs.
    const linkedInUrl = 'https://www.linkedin.com/jobs/search/?keywords=Software%20Engineer&location=United%20States&f_TPR=r86400&geoId=103644278&refresh=true' // Added some filters: last 24h, US
    await page.goto(linkedInUrl, { waitUntil: 'networkidle2', timeout: 60000 }) // Increased timeout

    const allScrapedJobs: ScrapedJob[] = []
    let currentPage = 1
    const maxPagesToScrape = 3 // Limit how many pages to scrape for now

    let pageTitle = 'N/A'; // Declare pageTitle outside the loop

    // Main scraping loop for pagination
    while (currentPage <= maxPagesToScrape) {
      console.log(`Scraping page ${currentPage} of potentially ${maxPagesToScrape}...`)

      if (currentPage > 1) { // No need to navigate again for the first page if already there
        // Wait 5 seconds for page to settle after click
        await new Promise(r => setTimeout(r, 5000))
      }

      pageTitle = await page.title()
      console.log('Page title for current page:', pageTitle)

      const jobListingsSelector = 'ul.jobs-search__results-list li'
      try {
        await page.waitForSelector(jobListingsSelector, { timeout: 20000 })
        console.log('Job listings found on page ', currentPage)
      } catch (e) {
        console.warn(`Job listings selector not found on page ${currentPage}. May be end of results or page change issue.`)
        break // Exit loop if listings not found
      }

      const jobsOnPage: ScrapedJob[] = await page.evaluate((selector) => {
        const jobElements = Array.from(document.querySelectorAll(selector))
        const jobs: ScrapedJob[] = []
        // On LinkedIn, job cards might be repeated or new ones loaded dynamically.
        // This slice(0,25) is a safeguard if the selector is too broad for a single page load.
        for (const element of jobElements.slice(0, 25)) {
          const jobTitle = element.querySelector('.base-search-card__title')?.textContent?.trim() || 'N/A'
          const company = element.querySelector('.base-search-card__subtitle a')?.textContent?.trim() || 'N/A'
          const location = element.querySelector('.job-search-card__location')?.textContent?.trim() || 'N/A'
          const jobUrl = (element.querySelector('.base-card__full-link') as HTMLAnchorElement)?.href || '#'
          jobs.push({
            job_title: jobTitle,
            company: company,
            job_description: 'Description placeholder - full scraping needed',
            location: location,
            salary: 'Not specified',
            job_url: jobUrl,
            platform: 'LinkedIn',
            status: 'scraped_pending_review',
          })
        }
        return jobs
      }, jobListingsSelector)

      console.log(`Scraped ${jobsOnPage.length} jobs from page ${currentPage}.`)
      if (jobsOnPage.length === 0 && currentPage > 1) { // If not the first page and no jobs, probably end of results
        console.log('No jobs found on this page, assuming end of results.')
        break
      }
      allScrapedJobs.push(...jobsOnPage)

      // Attempt to find and click the "Next" page button
      if (currentPage < maxPagesToScrape) {
        const nextButtonSelector = 'button[aria-label="Next"]'
        const nextButton = await page.$(nextButtonSelector)
        if (nextButton) {
          console.log('Found "Next" button, clicking for page ', currentPage + 1)
          await nextButton.click()
          // It's crucial to wait for navigation or new content to load here.
          // page.waitForNavigation({ waitUntil: 'networkidle2' }) can be unreliable with client-side routing.
          // A fixed timeout or waiting for a specific element on the next page is safer.
        } else {
          console.log('No "Next" button found, assuming end of results.')
          break // Exit loop if no next button
        }
      }
      currentPage++
    }

    console.log(`Total scraped jobs after pagination: ${allScrapedJobs.length}.`)
    if (allScrapedJobs.length === 0) {
      console.warn('No jobs were scraped at all. Check selectors and page content.')
    }

    let successfulInserts = 0
    if (supabaseClient && allScrapedJobs.length > 0) {
      console.log('Attempting to insert all scraped jobs into Supabase...')
      // const placeholderUserId = 'b518c5d5-2139-413e-ba3d-2e0f9dcd30aa'; // Now using currentUserId

      for (const job of allScrapedJobs) {
        const { error }: PostgrestSingleResponse<null> = await supabaseClient
          .from('applications')
          .insert({
            user_id: currentUserId,
            job_title: job.job_title,
            company: job.company,
            job_url: job.job_url,
            status: job.status,
            platform: job.platform,
            job_description: job.job_description,
            location: job.location,
            salary: job.salary,
          })
        if (error) {
          console.error('Error inserting job into Supabase:', error.message, 'Job:', job.job_title)
        } else {
          successfulInserts++
          // Data is null for a basic insert without .select(). We only confirm no error.
          console.log('Successfully processed insert for job:', job.job_title)
        }
      }
      console.log(`Successfully processed ${successfulInserts} insert operations out of ${allScrapedJobs.length} jobs attempted.`)
    }

    return new Response(JSON.stringify({ jobs: allScrapedJobs, pageTitle, successfulInserts }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error in LinkedIn scraping function:', error.stack || error)
    // if (page) {
    //   await page.screenshot({ path: 'linkedin_error_screenshot.png' })
    //   console.log('Error screenshot taken: linkedin_error_screenshot.png')
    // }
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  } finally {
    if (browser) {
      console.log('Closing browser...')
      await browser.close()
      console.log('Browser closed.')
    }
  }
})

// To run/test locally (ensure Deno is installed):
// deno run --allow-net --allow-env supabase/functions/scrape-linkedin-jobs/index.ts

// To deploy:
// supabase functions deploy scrape-linkedin-jobs --project-ref <your-project-ref> 