"use client"

import { useState, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, File as FileIcon, X, CheckCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { toast } from '@/hooks/use-toast'
import { Progress } from '@/components/ui/progress'

// Interface for resume data fetched from DB or being prepared for UI
interface ResumeInfo {
  id?: string;
  file_path?: string;
  name: string;
  size?: number; // Made size optional as it might not be from DB
  type?: string; // Made type optional
  lastModified?: number; // Made lastModified optional
}

export default function ResumeUploader() {
  const [newFile, setNewFile] = useState<File | null>(null) // For new file drops
  const [uploadedResumeInfo, setUploadedResumeInfo] = useState<ResumeInfo | null>(null) // For existing/uploaded resume
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  // Removed 'uploaded' state, will rely on uploadedResumeInfo
  const [user, setUser] = useState<any>(null)
  
  const supabase = createClientComponentClient()
  
  useEffect(() => {
    async function getUserAndResume() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setUser(session.user)
        const { data: resumeData } = await supabase
          .from('resumes')
          .select('file_name, file_path, id')
          .eq('user_id', session.user.id)
          .single()
        
        if (resumeData) {
          setUploadedResumeInfo({
            name: resumeData.file_name,
            id: resumeData.id,
            file_path: resumeData.file_path,
            // size, type, lastModified are not fetched, so they remain undefined
          });
        }
      }
    }
    getUserAndResume()
  }, [supabase])
  
  const onDrop = (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0]
    
    if (selectedFile) {
      const fileType = selectedFile.type
      
      if (
        fileType === 'application/pdf' || 
        fileType === 'application/msword' || 
        fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        setNewFile(selectedFile)
        setUploadedResumeInfo(null) // Clear any previously uploaded info display
        setProgress(0)
      } else {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: "Please upload a PDF or Word document",
        })
      }
    }
  }
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
    multiple: false,
  })
  
  const uploadResume = async () => {
    if (!newFile || !user) { // newFile is guaranteed to be a File object here
      console.error("Upload error: New file or user is missing.", { newFile, user });
      toast({
        variant: "destructive",
        title: "Upload precondition failed",
        description: "User session or file not found. Please try again.",
      });
      setUploading(false);
      return;
    }
    
    setUploading(true)
    setProgress(0)
    
    try {
      const filePath = `${user.id}/${newFile.name}`
      
      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, newFile, { // newFile is a File object
          cacheControl: '3600',
          upsert: true,
          // Removed onUploadProgress as it's not standard and causes errors
          // TODO: Implement resumable upload with tus-js-client for progress tracking
        })
      
      if (uploadError) {
        console.error("Supabase Storage upload error object:", uploadError);
        throw uploadError;
      }
      
      const resumeMetadata = {
        user_id: user.id,
        file_name: newFile.name,
        file_type: newFile.type,
        file_path: filePath,
        updated_at: new Date().toISOString()
      };

      const { data: upsertedData, error: dbError } = await supabase
        .from('resumes')
        .upsert(resumeMetadata, { onConflict: 'user_id' })
        .select('id, file_path, file_name') // Select data to update uploadedResumeInfo
        .single()
      
      if (dbError) {
        console.error("Database error during resume upsert:", dbError);
        throw dbError;
      }
      
      toast({
        title: "Resume uploaded",
        description: "Your resume has been uploaded successfully.",
      })
      
      if (upsertedData) {
        setUploadedResumeInfo({
            name: upsertedData.file_name,
            id: upsertedData.id,
            file_path: upsertedData.file_path,
            size: newFile.size, // Use size from the newFile
            type: newFile.type, // Use type from the newFile
        });
      }
      setNewFile(null); // Clear the new file after successful upload
      
    } catch (error) {
      console.error("Resume upload error:", error)
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "There was an error uploading your resume. Please try again.",
      })
    } finally {
      setUploading(false)
    }
  }
  
  const removeFile = async () => {
    if (!user || !uploadedResumeInfo?.file_path) return
    
    try {
      const { error: storageError } = await supabase.storage
        .from('resumes')
        .remove([uploadedResumeInfo.file_path])
      
      if (storageError) throw storageError
      
      if (uploadedResumeInfo.id) {
        const { error: dbError } = await supabase
          .from('resumes')
          .delete()
          .eq('id', uploadedResumeInfo.id)
          .eq('user_id', user.id)
        
        if (dbError) throw dbError
      }
      
      setUploadedResumeInfo(null)
      setNewFile(null) // Also clear any potential new file
      setProgress(0)
      toast({
        title: "Resume removed",
        description: "Your resume has been removed successfully.",
      })
      
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Removal failed",
        description: "There was an error removing your resume. Please try again.",
      })
    }
  }

  const displayFile = newFile || uploadedResumeInfo;
  
  return (
    <div className="space-y-6">
      {!displayFile && (
        <div 
          {...getRootProps()} 
          className={`border-2 border-dashed rounded-lg p-8 cursor-pointer flex flex-col items-center justify-center space-y-2 transition-colors ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-accent/50'}`}
        >
          <input {...getInputProps()} />
          <Upload className="h-10 w-10 text-muted-foreground" />
          <p className="text-center text-sm text-muted-foreground">
            <span className="font-medium">Click to upload</span> or drag and drop
            <br />
            PDF or Word documents (max 5MB)
          </p>
        </div>
      )}
      
      {displayFile && (
        <div className="bg-muted/50 p-4 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileIcon className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{displayFile.name}</p>
              {displayFile.size !== undefined && displayFile.size > 0 && (
                <p className="text-xs text-muted-foreground">
                  {(displayFile.size / 1024 / 1024).toFixed(2)}MB
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {uploadedResumeInfo ? ( // Show remove if it's an uploaded resume
              <Button variant="ghost" size="icon" onClick={removeFile} className="text-red-500 hover:text-red-600">
                <Trash2 className="h-5 w-5" />
              </Button>
            ) : ( // Show upload/cancel for new file
              <>
                {!uploading && !progress && (
                  <Button variant="ghost" size="icon" onClick={() => setNewFile(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-5 w-5" />
                  </Button>
                )}
                <Button onClick={uploadResume} disabled={uploading} size={uploading ? "default" : "icon"} className="min-w-[36px]">
                  {uploading ? (
                    <div className="flex items-center">
                      {/* <Progress value={progress} className="w-16 h-1.5 mr-2 bg-primary/20" /> */}
                      {/* The above Progress component was causing a build error (SyntaxError in minified code). */}
                      {/* It has been temporarily commented out to allow the build to pass. */}
                      {/* TODO: Investigate Radix UI Progress component build issue or replace component. */}
                      <span className="text-xs">Uploading...</span>
                    </div>
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}