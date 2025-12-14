import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, CheckCircle, X, FileImage, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = 'memory-upload-state';

export default function MemoryUploadPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Memory Upload state - restored from localStorage
  const [uploadCode, setUploadCode] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { uploadCode } = JSON.parse(saved);
        return uploadCode || "";
      }
    } catch (e) {
      console.error('Failed to restore upload code:', e);
    }
    return "";
  });
  
  const [codeValidated, setCodeValidated] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { codeValidated } = JSON.parse(saved);
        return codeValidated || false;
      }
    } catch (e) {
      console.error('Failed to restore validation state:', e);
    }
    return false;
  });
  
  const [linkInfo, setLinkInfo] = useState<any>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { linkInfo } = JSON.parse(saved);
        return linkInfo || null;
      }
    } catch (e) {
      console.error('Failed to restore link info:', e);
    }
    return null;
  });
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  
  const [uploadForm, setUploadForm] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { uploadForm } = JSON.parse(saved);
        return uploadForm || { title: "", description: "" };
      }
    } catch (e) {
      console.error('Failed to restore form data:', e);
    }
    return { title: "", description: "" };
  });
  
  // Multiple upload state
  const [uploadMode, setUploadMode] = useState<'single' | 'multiple'>('single');
  const [multipleUploadForm, setMultipleUploadForm] = useState<{ files: { file: File, title: string, description: string }[] }>({ files: [] });
  
  // Upload loading states
  const [isUploadingMemory, setIsUploadingMemory] = useState(false);
  const [isUploadingMultiple, setIsUploadingMultiple] = useState(false);

  // Persist state to localStorage whenever key state changes
  useEffect(() => {
    try {
      const stateToSave = {
        uploadCode,
        codeValidated,
        linkInfo,
        uploadForm
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      console.error('Failed to save state:', e);
    }
  }, [uploadCode, codeValidated, linkInfo, uploadForm]);

  // Handle URL parameters for upload code
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const codeParam = urlParams.get('code');
    
    if (codeParam) {
      setUploadCode(codeParam);
      // Auto-validate the code when redirected with code parameter
      validateUploadCode(codeParam);
    }
  }, []);

  // Reset to use another code
  const resetUploadForm = () => {
    setUploadCode("");
    setCodeValidated(false);
    setLinkInfo(null);
    setSelectedFile(null);
    setPreviewUrl("");
    setUploadForm({ title: "", description: "" });
    setMultipleUploadForm({ files: [] });
    setUploadMode('single');
    localStorage.removeItem(STORAGE_KEY);
    
    toast({
      className: "bg-blue-600/60 backdrop-blur-lg border border-white/20 shadow-2xl text-white",
      title: "Form Reset",
      description: "You can now enter a new upload code",
    });
  };

  const validateUploadCode = async (codeToValidate?: string) => {
    const code = (codeToValidate || uploadCode).replace(/-/g, ''); // Strip dashes for server validation
    if (!code.trim() || code.length !== 16) {
      toast({
        className: "bg-red-600/60 backdrop-blur-lg border border-white/20 shadow-2xl text-white",
        title: "Invalid Code",
        description: "Please enter a valid 16-character upload code",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`/api/public-upload-links/${code}`);
      
      if (!response.ok) {
        throw new Error('Invalid or expired code');
      }

      const data = await response.json();
      setLinkInfo(data);
      setCodeValidated(true);
      
      toast({
        className: "bg-blue-600/60 backdrop-blur-lg border border-white/20 shadow-2xl text-white",
        title: "Code Validated",
        description: `Upload access granted for ${data.category} memories`,
      });
    } catch (error) {
      toast({
        className: "bg-red-600/60 backdrop-blur-lg border border-white/20 shadow-2xl text-white",
        title: "Validation Failed",
        description: "Invalid or expired upload code. Please check and try again.",
        variant: "destructive"
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          className: "bg-red-600/60 backdrop-blur-lg border border-white/20 shadow-2xl text-white",
          title: "File Too Large",
          description: "Please select a file smaller than 10MB",
          variant: "destructive"
        });
        return;
      }
      
      // Cleanup previous preview URL to prevent memory leaks
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleMultipleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // Filter files that are too large
    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: `${file.name} is larger than 10MB and was skipped`,
          variant: "destructive"
        });
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Create file data with default titles
    const newFiles = validFiles.map(file => {
      // Generate default title: EventType + Year (e.g., "Graduation 2013")
      const eventType = linkInfo?.category || 'Event';
      const year = linkInfo?.year || new Date().getFullYear();
      const defaultTitle = `${eventType} ${year}`;
      
      return {
        file,
        title: defaultTitle,
        description: ''
      };
    });

    setMultipleUploadForm(prev => ({
      ...prev,
      files: [...prev.files, ...newFiles]
    }));

    toast({
      className: "bg-blue-600/60 backdrop-blur-lg border border-white/20 shadow-2xl text-white",
      title: "Files Added",
      description: `${validFiles.length} file(s) added with default titles`,
    });
  };

  const handleMemoryUpload = async () => {
    if (!selectedFile || !linkInfo || isUploadingMemory) return;

    setIsUploadingMemory(true);
    try {
      const formData = new FormData();
      formData.append('memoryFile', selectedFile);
      formData.append('title', uploadForm.title || 'Untitled');
      formData.append('description', uploadForm.description || '');
      formData.append('uploadedBy', user?.fullName || `${user?.firstName} ${user?.lastName}` || 'Unknown User');

      const response = await fetch(`/api/public-uploads/${uploadCode.replace(/-/g, '')}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.id}`
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      toast({
        className: "bg-blue-600/60 backdrop-blur-lg border border-white/20 shadow-2xl text-white",
        title: "Upload Successful",
        description: "Your memory has been uploaded and is pending approval!",
      });

      // Reset form
      setUploadForm({ title: '', description: '' });
      setSelectedFile(null);
      setPreviewUrl('');
      setCodeValidated(false);
      setUploadCode('');
      setLinkInfo(null);

    } catch (error) {
      toast({
        className: "bg-red-600/60 backdrop-blur-lg border border-white/20 shadow-2xl text-white",
        title: "Upload Failed",
        description: "Failed to upload memory. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploadingMemory(false);
    }
  };

  const handleMultipleMemoryUpload = async () => {
    if (multipleUploadForm.files.length === 0 || !linkInfo || isUploadingMultiple) return;

    setIsUploadingMultiple(true);
    const uploadPromises = multipleUploadForm.files.map(async (fileData) => {
      try {
        const formData = new FormData();
        formData.append('memoryFile', fileData.file);
        formData.append('title', fileData.title || 'Untitled');
        formData.append('description', fileData.description || '');
        formData.append('uploadedBy', user?.fullName || `${user?.firstName} ${user?.lastName}` || 'Unknown User');

        const response = await fetch(`/api/public-uploads/${uploadCode.replace(/-/g, '')}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user?.id}`
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed for ${fileData.file.name}`);
        }

        return { success: true, filename: fileData.file.name };
      } catch (error) {
        return { success: false, filename: fileData.file.name, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    try {
      const results = await Promise.all(uploadPromises);
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      if (successful.length > 0) {
        toast({
          className: "bg-blue-600/60 backdrop-blur-lg border border-white/20 shadow-2xl text-white",
          title: "Upload Successful",
          description: `${successful.length} memories uploaded successfully and are pending approval!`,
        });
      }

      if (failed.length > 0) {
        toast({
          className: "bg-red-600/60 backdrop-blur-lg border border-white/20 shadow-2xl text-white",
          title: "Some Uploads Failed",
          description: `${failed.length} files failed to upload. Please try again.`,
          variant: "destructive"
        });
      }

      // Reset form if all uploads were successful
      if (failed.length === 0) {
        setMultipleUploadForm({ files: [] });
        setCodeValidated(false);
        setUploadCode('');
        setLinkInfo(null);
        setUploadMode('single');
      }

    } catch (error) {
      toast({
        className: "bg-red-600/60 backdrop-blur-lg border border-white/20 shadow-2xl text-white",
        title: "Upload Failed",
        description: "Failed to upload memories. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploadingMultiple(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card className="bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Upload className="h-6 w-6 text-yellow-500" />
            <div>
              <h3 className="text-lg font-semibold text-white">Memory Upload</h3>
              <p className="text-sm text-white/70">
                Upload photos and videos using special school codes
              </p>
            </div>
          </div>

          {!codeValidated ? (
            <div className="space-y-4">
              <div>
                <Label className="text-white">Enter Upload Code</Label>
                <p className="text-sm text-white/70 mb-2">
                  Enter the 16-character code provided by your school (XXXX-XXXX-XXXX-XXXX format)
                </p>
                <div className="flex gap-3">
                  <Input
                    value={uploadCode}
                    onChange={(e) => {
                      let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                      if (value.length > 16) value = value.slice(0, 16);
                      // Auto-format with dashes after every 4 characters
                      const formatted = value.replace(/(.{4})/g, '$1-').replace(/-$/, '');
                      setUploadCode(formatted);
                    }}
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    className="bg-white/10 backdrop-blur-lg border border-white/20 text-white placeholder:text-white/50"
                    data-testid="input-upload-code"
                    maxLength={19}
                  />
                  <Button 
                    onClick={() => validateUploadCode()}
                    className="bg-yellow-500 hover:bg-yellow-600 text-black"
                    data-testid="button-validate-code"
                  >
                    Validate
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Code Validated Success */}
              <div className="flex items-center justify-between p-3 bg-green-500/20 border border-green-400/30 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <div>
                    <p className="text-green-200 font-medium">Code Validated Successfully!</p>
                    <p className="text-green-300/80 text-sm">
                      Upload access granted for {linkInfo?.category} memories
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetUploadForm}
                  className="text-white bg-blue-500/20 border border-blue-400/30 rounded-lg hover:bg-blue-500/30 hover:text-white hover:border-blue-400 transition-colors flex items-center gap-2 px-3 py-1 text-xs font-medium shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-blue-500/20"
                  data-testid="button-use-another-code"
                >
                  <RotateCcw className="h-4 w-4 mr-2 text-white" />
                  Use Another Code
                </Button>
              </div>

              {/* Upload Mode Toggle */}
              <div className="flex items-center justify-center space-x-4 p-3 bg-white/5 border border-white/10 rounded-lg">
                <span className="text-white text-sm">Upload Mode:</span>
                <div className="flex items-center space-x-2">
                  <Button
                    variant={uploadMode === 'single' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setUploadMode('single')}
                    className={uploadMode === 'single' ? 'bg-blue-600/60 backdrop-blur-lg border border-white/20 text-white' : 'text-blue-200 border-white/20 border-blue-600/60 bg-white/ backdrop-blur-lg shadow-2xl'}
                    data-testid="button-single-mode"
                  >
                    Single
                  </Button>
                  <Button
                    variant={uploadMode === 'multiple' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setUploadMode('multiple')}
                    className={uploadMode === 'multiple' ? 'bg-yellow-600/60 backdrop-blur-lg border border-white/20 text-white' : 'text-yellow-600 border-yellow-600/60 bg-white/ backdrop-blur-lg shadow-2xl'}
                    data-testid="button-multiple-mode"
                  >
                    Multiple
                  </Button>
                </div>
              </div>

              {/* Single Upload Mode */}
              {uploadMode === 'single' && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-white">Select Photo/Video</Label>
                    <Input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileSelect}
                      className="bg-white/10 backdrop-blur-lg border border-white/20 text-white file:text-white file:bg-white/20 file:border-0 file:mr-4"
                      data-testid="input-file-single"
                    />
                  </div>

                  {previewUrl && (
                    <div className="relative">
                      <img src={previewUrl} alt="Preview" className="w-full h-64 object-cover rounded-lg" />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          setSelectedFile(null);
                          setPreviewUrl('');
                        }}
                        data-testid="button-clear-preview"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  <div>
                    <Label className="text-white">Title</Label>
                    <Input
                      value={uploadForm.title}
                      onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                      placeholder="Enter a title for this memory"
                      className="bg-white/10 backdrop-blur-lg border border-white/20 text-white placeholder:text-white/50"
                      data-testid="input-title"
                    />
                  </div>

                  <div>
                    <Label className="text-white">Description (Optional)</Label>
                    <Textarea
                      value={uploadForm.description}
                      onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                      placeholder="Add a description..."
                      className="bg-white/10 backdrop-blur-lg border border-white/20 text-white placeholder:text-white/50"
                      rows={3}
                      data-testid="textarea-description"
                    />
                  </div>

                  <Button
                    onClick={handleMemoryUpload}
                    disabled={!selectedFile || isUploadingMemory}
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-black"
                    data-testid="button-upload-single"
                  >
                    {isUploadingMemory ? 'Uploading...' : 'Upload Memory'}
                  </Button>
                </div>
              )}

              {/* Multiple Upload Mode */}
              {uploadMode === 'multiple' && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-white">Select Multiple Photos/Videos</Label>
                    <Input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={handleMultipleFileSelect}
                      className="bg-white/10 backdrop-blur-lg border border-white/20 text-white file:text-white file:bg-white/20 file:border-0 file:mr-4"
                      data-testid="input-file-multiple"
                    />
                  </div>

                  {multipleUploadForm.files.length > 0 && (
                    <div className="space-y-4">
                      {multipleUploadForm.files.map((fileData, index) => (
                        <Card key={index} className="bg-white/5 border border-white/10">
                          <CardContent className="p-4">
                            <div className="flex items-start space-x-4">
                              <FileImage className="h-10 w-10 text-white/50 flex-shrink-0 mt-1" />
                              <div className="flex-1 space-y-2">
                                <p className="text-white text-sm font-medium">{fileData.file.name}</p>
                                <Input
                                  value={fileData.title}
                                  onChange={(e) => {
                                    const newFiles = [...multipleUploadForm.files];
                                    newFiles[index].title = e.target.value;
                                    setMultipleUploadForm({ files: newFiles });
                                  }}
                                  placeholder="Title"
                                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                                  data-testid={`input-title-${index}`}
                                />
                                <Textarea
                                  value={fileData.description}
                                  onChange={(e) => {
                                    const newFiles = [...multipleUploadForm.files];
                                    newFiles[index].description = e.target.value;
                                    setMultipleUploadForm({ files: newFiles });
                                  }}
                                  placeholder="Description (optional)"
                                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                                  rows={2}
                                  data-testid={`textarea-description-${index}`}
                                />
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const newFiles = multipleUploadForm.files.filter((_, i) => i !== index);
                                  setMultipleUploadForm({ files: newFiles });
                                }}
                                className="text-white hover:text-red-400"
                                data-testid={`button-remove-${index}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                      <Button
                        onClick={handleMultipleMemoryUpload}
                        disabled={isUploadingMultiple}
                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-black"
                        data-testid="button-upload-multiple"
                      >
                        {isUploadingMultiple ? 'Uploading...' : `Upload ${multipleUploadForm.files.length} Memories`}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
