"use client"

import { Card } from "@/components/ui/card"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps } from 'recharts'
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { createClient } from '@/lib/supabase/client'

interface ApplicationData {
  date: string;
  LinkedIn: number;
  Monster: number;
  ZipRecruiter: number;
  Indeed: number;
}

export default function ApplicationChart({ userId }: { userId: string }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [data, setData] = useState<ApplicationData[]>([])
  
  const textColor = isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)'
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
  
  useEffect(() => {
    async function fetchApplicationData() {
      const supabase = createClient()
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      const { data: applications } = await supabase
        .from('applications')
        .select('application_date, platform')
        .eq('user_id', userId)
        .gte('application_date', sevenDaysAgo.toISOString())
        .order('application_date', { ascending: true })
      
      if (applications) {
        const groupedData: Record<string, Record<string, number>> = {}
        
        applications.forEach(app => {
          const date = new Date(app.application_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          if (!groupedData[date]) {
            groupedData[date] = {
              LinkedIn: 0,
              Monster: 0,
              ZipRecruiter: 0,
              Indeed: 0
            }
          }
          groupedData[date][app.platform] = (groupedData[date][app.platform] || 0) + 1
        })
        
        const chartData = Object.entries(groupedData).map(([date, platforms]) => ({
          date,
          ...platforms
        }))
        
        setData(chartData)
      }
    }
    
    fetchApplicationData()
  }, [userId])
  
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorLinkedIn" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorMonster" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorZipRecruiter" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorIndeed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="date" 
            stroke={textColor}
            tick={{ fill: textColor }}
          />
          <YAxis 
            stroke={textColor}
            tick={{ fill: textColor }}
          />
          <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="LinkedIn" 
            stroke="hsl(var(--chart-1))" 
            fillOpacity={1} 
            fill="url(#colorLinkedIn)" 
          />
          <Area 
            type="monotone" 
            dataKey="Monster" 
            stroke="hsl(var(--chart-2))" 
            fillOpacity={1} 
            fill="url(#colorMonster)" 
          />
          <Area 
            type="monotone" 
            dataKey="ZipRecruiter" 
            stroke="hsl(var(--chart-3))" 
            fillOpacity={1} 
            fill="url(#colorZipRecruiter)" 
          />
          <Area 
            type="monotone" 
            dataKey="Indeed" 
            stroke="hsl(var(--chart-4))" 
            fillOpacity={1} 
            fill="url(#colorIndeed)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <Card className="p-3 bg-background/80 backdrop-blur-sm border border-border shadow-md">
        <p className="text-sm font-medium">{label}</p>
        <div className="mt-2 space-y-1">
          {payload.map((entry, index) => (
            <div key={`item-${index}`} className="flex items-center text-xs">
              <div 
                className="w-3 h-3 rounded-full mr-2" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="font-medium">{entry.name}: </span>
              <span className="ml-1">{entry.value}</span>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return null;
};