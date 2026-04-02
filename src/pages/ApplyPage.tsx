// @ts-nocheck
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { StepIndicator } from '@/components/StepIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PassportPhotoUpload } from '@/components/PassportPhotoUpload';
import { supabase } from '@/integrations/supabase/client';
import { AdmissionType } from '@/types/admission';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, CheckCircle, AlertCircle, FileText, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

const steps = [
  { label: 'Personal Info', description: 'Basic details' },
  { label: 'Verification', description: 'NIN & Photo' },
  { label: 'Academic Info', description: 'Grades & scores' },
  { label: 'Program Selection', description: 'Choose program' },
  { label: 'Review & Submit', description: 'Confirm details' },
];

export default function ApplyPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    nin: '',
    passportPhotoUrl: '',
    gpa: '',
    testScore: '',
    programId: '',
    admissionType: 'regular' as AdmissionType,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch programs from database
  const { data: programs = [], isLoading: programsLoading } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch admin settings
  const { data: adminSettings } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('*')
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  const isLocked = adminSettings?.applications_locked;
  const deadline = adminSettings?.application_deadline ? new Date(adminSettings.application_deadline) : null;
  const isDeadlinePassed = deadline ? new Date() > deadline : false;

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateStep = () => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 0) {
      if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
      if (!formData.email.trim()) newErrors.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
      if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
      if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
    }

    if (currentStep === 1) {
      if (!formData.nin.trim()) newErrors.nin = 'NIN is required';
      else if (!/^\d{11}$/.test(formData.nin.replace(/\s/g, ''))) {
        newErrors.nin = 'NIN must be exactly 11 digits';
      }
      if (!formData.passportPhotoUrl) newErrors.passportPhotoUrl = 'Passport photograph is required';
    }

    if (currentStep === 2) {
      const gpa = parseFloat(formData.gpa);
      const testScore = parseFloat(formData.testScore);
      if (!formData.gpa || isNaN(gpa) || gpa < 0 || gpa > 4) {
        newErrors.gpa = 'GPA must be between 0 and 4';
      }
      if (!formData.testScore || isNaN(testScore) || testScore < 0 || testScore > 200) {
        newErrors.testScore = 'Test score must be between 0 and 200';
      }
    }

    if (currentStep === 3) {
      if (!formData.programId) newErrors.programId = 'Please select a program';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setIsSubmitting(true);

    try {
      // Generate a student ID
      const studentId = `STU-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      const { data, error } = await supabase
        .from('applications')
        .insert({
          student_id: studentId,
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          date_of_birth: formData.dateOfBirth,
          nin: formData.nin,
          passport_photo_url: formData.passportPhotoUrl,
          program_id: formData.programId,
          admission_type: formData.admissionType,
          gpa: parseFloat(formData.gpa),
          test_score: parseInt(formData.testScore),
          status: 'submitted',
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Application submitted successfully!', {
        description: `Application ID: ${data.id.slice(0, 8).toUpperCase()}`,
      });

      navigate('/status', { state: { email: formData.email } });
    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error('Failed to submit application', {
        description: error.message || 'Please try again later',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProgram = programs.find((p: any) => p.id === formData.programId);
  const calculatedScore = formData.gpa && formData.testScore 
    ? (parseFloat(formData.gpa) * 25) + parseInt(formData.testScore)
    : 0;

  if (isLocked || isDeadlinePassed) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center py-20">
          <Card className="mx-auto max-w-md text-center">
            <CardHeader>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle>Applications Closed</CardTitle>
              <CardDescription>
                {isLocked 
                  ? 'Applications have been locked for the selection process.'
                  : 'The application deadline has passed.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/')} variant="outline">
                Return Home
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1 py-12">
        <div className="container max-w-4xl">
          <div className="mb-8 text-center">
            <h1 className="font-display text-3xl font-bold md:text-4xl">Application Form</h1>
            <p className="mt-2 text-muted-foreground">
              Complete all steps to submit your application
            </p>
          </div>

          <div className="mb-12">
            <StepIndicator steps={steps} currentStep={currentStep} />
          </div>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {steps[currentStep].label}
              </CardTitle>
              <CardDescription>{steps[currentStep].description}</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Step 0: Personal Information */}
              {currentStep === 0 && (
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => updateField('fullName', e.target.value)}
                      placeholder="Enter your full name"
                      className={errors.fullName ? 'border-destructive' : ''}
                    />
                    {errors.fullName && (
                      <p className="text-sm text-destructive">{errors.fullName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      placeholder="your.email@example.com"
                      className={errors.email ? 'border-destructive' : ''}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                      placeholder="+234 800 000 0000"
                      className={errors.phone ? 'border-destructive' : ''}
                    />
                    {errors.phone && (
                      <p className="text-sm text-destructive">{errors.phone}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => updateField('dateOfBirth', e.target.value)}
                      className={errors.dateOfBirth ? 'border-destructive' : ''}
                    />
                    {errors.dateOfBirth && (
                      <p className="text-sm text-destructive">{errors.dateOfBirth}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 1: Verification (NIN & Photo) */}
              {currentStep === 1 && (
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nin">National Identification Number (NIN) *</Label>
                    <Input
                      id="nin"
                      value={formData.nin}
                      onChange={(e) => updateField('nin', e.target.value.replace(/\D/g, '').slice(0, 11))}
                      placeholder="12345678901"
                      maxLength={11}
                      className={errors.nin ? 'border-destructive' : ''}
                    />
                    {errors.nin && (
                      <p className="text-sm text-destructive">{errors.nin}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Enter your 11-digit NIN for identity verification
                    </p>
                  </div>

                  <PassportPhotoUpload
                    value={formData.passportPhotoUrl}
                    onChange={(url) => updateField('passportPhotoUrl', url)}
                    error={errors.passportPhotoUrl}
                  />
                </div>
              )}

              {/* Step 2: Academic Information */}
              {currentStep === 2 && (
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="gpa">GPA (0-4 scale) *</Label>
                    <Input
                      id="gpa"
                      type="number"
                      step="0.01"
                      min="0"
                      max="4"
                      value={formData.gpa}
                      onChange={(e) => updateField('gpa', e.target.value)}
                      placeholder="3.50"
                      className={errors.gpa ? 'border-destructive' : ''}
                    />
                    {errors.gpa && (
                      <p className="text-sm text-destructive">{errors.gpa}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="testScore">Standardized Test Score (0-200) *</Label>
                    <Input
                      id="testScore"
                      type="number"
                      min="0"
                      max="200"
                      value={formData.testScore}
                      onChange={(e) => updateField('testScore', e.target.value)}
                      placeholder="185"
                      className={errors.testScore ? 'border-destructive' : ''}
                    />
                    {errors.testScore && (
                      <p className="text-sm text-destructive">{errors.testScore}</p>
                    )}
                  </div>

                  {calculatedScore > 0 && (
                    <div className="md:col-span-2">
                      <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
                        <p className="text-sm text-muted-foreground">Calculated Total Score</p>
                        <p className="font-display text-2xl font-bold text-accent-foreground">
                          {calculatedScore.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">/ 300</span>
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Formula: (GPA × 25) + Test Score
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Program Selection */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label>Select Program *</Label>
                    <Select
                      value={formData.programId}
                      onValueChange={(value) => updateField('programId', value)}
                      disabled={programsLoading}
                    >
                      <SelectTrigger className={errors.programId ? 'border-destructive' : ''}>
                        <SelectValue placeholder={programsLoading ? 'Loading programs...' : 'Choose a program'} />
                      </SelectTrigger>
                      <SelectContent>
                        {programs.map((program: any) => (
                          <SelectItem key={program.id} value={program.id}>
                            {program.name} ({program.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.programId && (
                      <p className="text-sm text-destructive">{errors.programId}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Admission Type</Label>
                    <Select
                      value={formData.admissionType}
                      onValueChange={(value) => updateField('admissionType', value as AdmissionType)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="regular">Regular Admission</SelectItem>
                        <SelectItem value="early_decision">Early Decision</SelectItem>
                        <SelectItem value="transfer">Transfer Student</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedProgram && (
                    <div className="rounded-lg border border-border bg-muted/30 p-4">
                      <h4 className="font-semibold">{selectedProgram.name}</h4>
                      <p className="mt-1 text-sm text-muted-foreground">{selectedProgram.description}</p>
                      <div className="mt-3 flex gap-4 text-sm">
                        <span>Available Slots: {selectedProgram.slots}</span>
                        <span>Min. Cutoff: {selectedProgram.cutoff}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Review & Submit */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="rounded-lg border border-border bg-muted/30 p-6">
                    <h4 className="mb-4 font-semibold">Application Summary</h4>
                    
                    <div className="flex gap-6">
                      {formData.passportPhotoUrl && (
                        <div className="flex-shrink-0">
                          <img
                            src={formData.passportPhotoUrl}
                            alt="Passport photo"
                            className="h-32 w-24 rounded-lg object-cover shadow-md"
                          />
                        </div>
                      )}
                      
                      <div className="grid flex-1 gap-4 text-sm md:grid-cols-2">
                        <div>
                          <p className="text-muted-foreground">Full Name</p>
                          <p className="font-medium">{formData.fullName}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Email</p>
                          <p className="font-medium">{formData.email}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Phone</p>
                          <p className="font-medium">{formData.phone}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Date of Birth</p>
                          <p className="font-medium">{formData.dateOfBirth}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">NIN</p>
                          <p className="font-medium">{formData.nin.slice(0, 4)}****{formData.nin.slice(-3)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">GPA</p>
                          <p className="font-medium">{formData.gpa}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Test Score</p>
                          <p className="font-medium">{formData.testScore}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total Score</p>
                          <p className="font-semibold text-accent-foreground">{calculatedScore.toFixed(1)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Program</p>
                          <p className="font-medium">{selectedProgram?.name}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Admission Type</p>
                          <p className="font-medium capitalize">{formData.admissionType.replace('_', ' ')}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-info/20 bg-info/5 p-4">
                    <div className="flex gap-3">
                      <AlertCircle className="h-5 w-5 text-info" />
                      <div>
                        <p className="font-medium">Important Notice</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Once submitted, your application will be locked. Results will be announced on the official result date. 
                          You will receive email notifications about your application status.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="mt-8 flex justify-between">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 0 || isSubmitting}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>

                {currentStep < steps.length - 1 ? (
                  <Button onClick={handleNext}>
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={handleSubmit} variant="success" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Submit Application
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
