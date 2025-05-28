"use client"

import { useState, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, File, X, CheckCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { toast } from '@/hooks/use-toast'
import { Progress } from '@/components/ui/progress'

interface ResumeFile extends File {
  id?: string;
  file_path?: string;
}

export default function ResumeUploader() {
  const [file, setFile] = useState<ResumeFile | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploaded, setUploaded] = useState(false)
  const [user, setUser] = useState<any>(null)
  
  const supabase = createClientComponentClient()
  
  useEffect(() => {
    async function getUser() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setUser(session.user)
        // Fetch existing resume if any
        const { data: resumeData } = await supabase
          .from('resumes')
          .select('file_name, file_path, id')
          .eq('user_id', session.user.id)
          .single()
        
        if (resumeData) {
          setFile({
            name: resumeData.file_name,
            size: 0, // We don't have size from DB, can be fetched if needed
            type: '', // We don't have type from DB, can be set if needed
            lastModified: 0,
            id: resumeData.id,
            file_path: resumeData.file_path,
            arrayBuffer: async () => new ArrayBuffer(0),
            slice: () => new Blob(),
            stream: () => new ReadableStream(),
            text: async () => ''
          })
          setUploaded(true)
        }
      }
    }
    getUser()
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
        setFile(selectedFile)
        setUploaded(false)
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
    if (!file || !user) {
      console.error("Upload error: File or user is missing.", { file, user });
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
      const filePath = `${user.id}/${file.name}`
      
      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          onUploadProgress: (event) => {
            if (event.lengthComputable) {
              setProgress(Math.round((event.loaded / event.total) * 100))
            }
          }
        })
      
      if (uploadError) {
        console.error("Supabase Storage upload error object:", uploadError);
        throw uploadError;
      }
      
      const resumeMetadata = {
        user_id: user.id,
        file_name: file.name,
        file_type: file.type,
        file_path: filePath,
        updated_at: new Date().toISOString()
      };
      console.log("Attempting to upsert resume metadata:", resumeMetadata);

      // Store resume metadata in the database
      const { error: dbError } = await supabase
        .from('resumes')
        .upsert(resumeMetadata, { onConflict: 'user_id' })
      
      if (dbError) {
        console.error("Database error during resume upsert:", dbError);
        throw dbError;
      }
      
      toast({
        title: "Resume uploaded",
        description: "Your resume has been uploaded successfully.",
      })
      
      setUploaded(true)
      const { data: resumeData } = await supabase
        .from('resumes')
        .select('id, file_path')
        .eq('user_id', user.id)
        .single()
      if(resumeData) {
        setFile(prevFile => prevFile ? ({ ...prevFile, id: resumeData.id, file_path: resumeData.file_path }) : null)
      }
      
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
    if (!user || !file?.file_path) return
    
    try {
      // Delete from Supabase Storage
      const { error: storageError } = await supabase.storage
        .from('resumes')
        .remove([file.file_path])
      
      if (storageError) throw storageError
      
      // Delete from database
      if (file.id) {
        const { error: dbError } = await supabase
          .from('resumes')
          .delete()
          .eq('id', file.id)
          .eq('user_id', user.id)
        
        if (dbError) throw dbError
      }
      
      setFile(null)
      setUploaded(false)
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
  
  return (
    <div className="space-y-6">
      {!file && (
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
      
      {file && (
        <div className="bg-muted/50 p-4 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <File className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{file.name}</p>
              {file.size > 0 && (
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)}MB
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {uploaded ? (
              <Button variant="ghost" size="icon" onClick={removeFile} className="text-red-500 hover:text-red-600">
                <Trash2 className="h-5 w-5" />
              </Button>
            ) : (
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => {
                  setFile(null)
                  setUploaded(false)
                  setProgress(0)
                }}
                className="rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
      
      {file && uploading && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-center text-muted-foreground">
            Uploading... {progress}%
          </p>
        </div>
      )}
      
      {file && !uploaded && !uploading && (
        <Button onClick={uploadResume} className="w-full" disabled={!user}>
          Upload Resume
        </Button>
      )}
      
      {uploaded && file && (
        <div className="p-4 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-lg text-sm flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          Resume uploaded and saved!
        </div>
      )}
    </div>
  )
}