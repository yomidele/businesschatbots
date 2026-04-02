// @ts-nocheck
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/StatusBadge';
import { AdmissionLetter } from '@/components/AdmissionLetter';
import { generateAdmissionLetterPDF } from '@/lib/generatePdf';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Settings, 
  Play, 
  Lock, 
  Unlock, 
  Send, 
  Users, 
  BarChart3, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  LogOut,
  FileText,
  Download,
  Eye,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, signOut, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const letterRef = useRef<HTMLDivElement>(null);

  const [deadline, setDeadline] = useState('');
  const [scheduledSelection, setScheduledSelection] = useState('');
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [showLetterPreview, setShowLetterPreview] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Fetch applications
  const { data: applications = [], isLoading: applicationsLoading } = useQuery({
    queryKey: ['admin-applications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          programs:program_id (
            id,
            name,
            code,
            slots,
            cutoff
          )
        `)
        .order('submitted_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Fetch programs
  const { data: programs = [] } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('*');
      
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

  // Update deadline mutation
  const updateDeadlineMutation = useMutation({
    mutationFn: async (newDeadline: string) => {
      const { error } = await supabase
        .from('admin_settings')
        .update({ application_deadline: newDeadline })
        .eq('id', adminSettings?.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success('Application deadline updated');
    },
    onError: (error: any) => {
      toast.error('Failed to update deadline', { description: error.message });
    },
  });

  // Lock/unlock applications mutation
  const toggleLockMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('admin_settings')
        .update({ applications_locked: !adminSettings?.applications_locked })
        .eq('id', adminSettings?.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success(adminSettings?.applications_locked ? 'Applications unlocked' : 'Applications locked');
    },
    onError: (error: any) => {
      toast.error('Failed to toggle lock', { description: error.message });
    },
  });

  // Selection mutation
  const selectionMutation = useMutation({
    mutationFn: async () => {
      // Get submitted applications grouped by program
      const submittedApps = applications.filter((a: any) => a.status === 'submitted');
      
      if (submittedApps.length === 0) {
        throw new Error('No applications to process');
      }

      // Process each program
      for (const program of programs) {
        const programApps = submittedApps
          .filter((a: any) => a.program_id === program.id)
          .sort((a: any, b: any) => b.total_score - a.total_score);

        let slotsRemaining = program.slots;
        const cutoffs = [180, 170, 160, 150];

        for (let roundIndex = 0; roundIndex < cutoffs.length && slotsRemaining > 0; roundIndex++) {
          const cutoff = cutoffs[roundIndex];
          
          for (const app of programApps) {
            if (slotsRemaining <= 0) break;
            if (app.total_score < cutoff) continue;
            if (app.status !== 'submitted') continue;

            // Generate matriculation number
            const { data: matricNum } = await supabase.rpc('generate_matriculation_number', {
              p_program_id: program.id
            });

            // Update application
            await supabase
              .from('applications')
              .update({
                status: 'selection_pending',
                rank: program.slots - slotsRemaining + 1,
                admission_round: roundIndex + 1,
                matriculation_number: matricNum,
                scholarship_status: app.total_score >= 190 ? 'eligible' : 'not_eligible',
              })
              .eq('id', app.id);

            slotsRemaining--;
            app.status = 'selection_pending'; // Mark as processed
          }
        }

        // Mark remaining as selection pending (will be waitlisted/rejected on release)
        for (const app of programApps) {
          if (app.status === 'submitted') {
            await supabase
              .from('applications')
              .update({ status: 'selection_pending' })
              .eq('id', app.id);
          }
        }
      }

      // Create selection run record
      await supabase.from('selection_runs').insert({
        scheduled_at: new Date().toISOString(),
        executed_at: new Date().toISOString(),
        status: 'completed',
        created_by: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-applications'] });
      toast.success('Selection process completed! Results are ready for release.');
    },
    onError: (error: any) => {
      toast.error('Selection failed', { description: error.message });
    },
  });

  // Release results mutation
  const releaseMutation = useMutation({
    mutationFn: async () => {
      const pendingApps = applications.filter((a: any) => a.status === 'selection_pending');
      
      for (const app of pendingApps) {
        const program = programs.find((p: any) => p.id === app.program_id);
        let newStatus: 'admitted' | 'waitlisted' | 'rejected' = 'rejected';
        let scholarshipStatus = app.scholarship_status;

        if (app.rank && program && app.rank <= program.slots) {
          newStatus = 'admitted';
          if (app.total_score >= 190) {
            scholarshipStatus = 'awarded';
          }
        } else if (app.total_score >= 150) {
          newStatus = 'waitlisted';
        }

        await supabase
          .from('applications')
          .update({ 
            status: newStatus,
            scholarship_status: scholarshipStatus,
          })
          .eq('id', app.id);
      }

      // Update selection run status
      await supabase
        .from('selection_runs')
        .update({ status: 'released' })
        .eq('status', 'completed');

      // Update admin settings
      await supabase
        .from('admin_settings')
        .update({ result_release_date: new Date().toISOString() })
        .eq('id', adminSettings?.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-applications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success('Results have been released to applicants!');
    },
    onError: (error: any) => {
      toast.error('Release failed', { description: error.message });
    },
  });

  const stats = {
    total: applications.length,
    submitted: applications.filter((a: any) => a.status === 'submitted').length,
    pending: applications.filter((a: any) => a.status === 'selection_pending').length,
    admitted: applications.filter((a: any) => a.status === 'admitted').length,
    waitlisted: applications.filter((a: any) => a.status === 'waitlisted').length,
    rejected: applications.filter((a: any) => a.status === 'rejected').length,
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const handleDownloadPDF = async (app: any) => {
    if (!app.matriculation_number) {
      toast.error('No matriculation number assigned');
      return;
    }

    setGeneratingPdf(true);
    try {
      const pdfBlob = await generateAdmissionLetterPDF({
        studentName: app.full_name,
        programName: app.programs?.name || 'Unknown Program',
        programCode: app.programs?.code || 'N/A',
        matriculationNumber: app.matriculation_number,
        passportPhotoUrl: app.passport_photo_url,
        admissionBatch: app.admission_round,
        scholarshipStatus: app.scholarship_status,
        dateOfAdmission: app.updated_at || new Date().toISOString(),
      });

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Admission_Letter_${app.matriculation_number.replace(/\//g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Admission letter downloaded');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleViewLetter = (app: any) => {
    setSelectedApplication(app);
    setShowLetterPreview(true);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1 py-12">
        <div className="container">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold md:text-4xl">Admin Dashboard</h1>
              <p className="mt-2 text-muted-foreground">
                Manage admission settings, trigger selection, and release results
              </p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>

          {/* Stats Overview */}
          <div className="mb-8 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-info/10 p-2">
                    <Clock className="h-5 w-5 text-info" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.submitted}</p>
                    <p className="text-xs text-muted-foreground">Submitted</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-purple-500/10 p-2">
                    <BarChart3 className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.pending}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-success/10 p-2">
                    <CheckCircle className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.admitted}</p>
                    <p className="text-xs text-muted-foreground">Admitted</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-warning/10 p-2">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.waitlisted}</p>
                    <p className="text-xs text-muted-foreground">Waitlisted</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-destructive/10 p-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.rejected}</p>
                    <p className="text-xs text-muted-foreground">Rejected</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Settings */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Admission Settings
                </CardTitle>
                <CardDescription>Configure deadlines and application status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Application Deadline</Label>
                  <div className="flex gap-2">
                    <Input
                      type="datetime-local"
                      value={deadline || (adminSettings?.application_deadline ? new Date(adminSettings.application_deadline).toISOString().slice(0, 16) : '')}
                      onChange={(e) => setDeadline(e.target.value)}
                    />
                    <Button 
                      onClick={() => updateDeadlineMutation.mutate(new Date(deadline).toISOString())}
                      disabled={updateDeadlineMutation.isPending}
                    >
                      <Calendar className="h-4 w-4" />
                      Set
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Application Lock Status</Label>
                  <div className="flex items-center gap-4">
                    <div className={`rounded-lg px-4 py-2 text-sm font-medium ${
                      adminSettings?.applications_locked 
                        ? 'bg-destructive/10 text-destructive' 
                        : 'bg-success/10 text-success'
                    }`}>
                      {adminSettings?.applications_locked ? 'Locked' : 'Open'}
                    </div>
                    <Button 
                      variant={adminSettings?.applications_locked ? 'outline' : 'destructive'}
                      onClick={() => toggleLockMutation.mutate()}
                      disabled={toggleLockMutation.isPending}
                    >
                      {adminSettings?.applications_locked ? (
                        <>
                          <Unlock className="h-4 w-4" />
                          Unlock
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4" />
                          Lock
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Lock applications before running the selection process
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Selection Control */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Selection Control
                </CardTitle>
                <CardDescription>Trigger the automated selection process</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Manual Selection Trigger</Label>
                  <Button 
                    onClick={() => selectionMutation.mutate()}
                    className="w-full"
                    disabled={!adminSettings?.applications_locked || stats.submitted === 0 || selectionMutation.isPending}
                  >
                    {selectionMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Running Selection...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Run Selection Now
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Applications must be locked before running selection
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Release Results</Label>
                  <Button 
                    variant="success"
                    onClick={() => releaseMutation.mutate()}
                    className="w-full"
                    disabled={stats.pending === 0 || releaseMutation.isPending}
                  >
                    {releaseMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Releasing...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Release Results to Applicants
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Applications Table */}
          <Card className="mt-8 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                All Applications
              </CardTitle>
              <CardDescription>View and manage all submitted applications</CardDescription>
            </CardHeader>
            <CardContent>
              {applicationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : applications.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No applications submitted yet
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Photo</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>NIN</TableHead>
                        <TableHead>Program</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Rank</TableHead>
                        <TableHead>Matric No.</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {applications.map((app: any) => (
                        <TableRow key={app.id}>
                          <TableCell>
                            {app.passport_photo_url ? (
                              <img
                                src={app.passport_photo_url}
                                alt={app.full_name}
                                className="h-10 w-8 rounded object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-8 items-center justify-center rounded bg-muted text-xs">
                                N/A
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{app.full_name}</TableCell>
                          <TableCell>{app.email}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {app.nin?.slice(0, 4)}****{app.nin?.slice(-3)}
                          </TableCell>
                          <TableCell>{app.programs?.code}</TableCell>
                          <TableCell>{app.total_score}</TableCell>
                          <TableCell>{app.rank || '-'}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {app.matriculation_number || '-'}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={app.status} />
                          </TableCell>
                          <TableCell>
                            {app.status === 'admitted' && app.matriculation_number && (
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleViewLetter(app)}
                                  title="View Letter"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDownloadPDF(app)}
                                  disabled={generatingPdf}
                                  title="Download PDF"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Audit Log Notice */}
          <Card className="mt-6 border-info/20 bg-info/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-info" />
                <div>
                  <p className="font-medium">Audit & Transparency Notice</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    All selection runs, cutoffs used, and result releases are logged for transparency. 
                    Once results are released, they become final and cannot be modified.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Admission Letter Preview Modal */}
      <Dialog open={showLetterPreview} onOpenChange={setShowLetterPreview}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Admission Letter Preview
            </DialogTitle>
            <DialogDescription>
              Preview the admission letter for {selectedApplication?.full_name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedApplication && (
            <>
              <div className="border rounded-lg overflow-hidden">
                <AdmissionLetter
                  ref={letterRef}
                  studentName={selectedApplication.full_name}
                  programName={selectedApplication.programs?.name || 'Unknown Program'}
                  programCode={selectedApplication.programs?.code || 'N/A'}
                  matriculationNumber={selectedApplication.matriculation_number || 'N/A'}
                  passportPhotoUrl={selectedApplication.passport_photo_url}
                  admissionBatch={selectedApplication.admission_round}
                  scholarshipStatus={selectedApplication.scholarship_status}
                  dateOfAdmission={selectedApplication.updated_at || new Date().toISOString()}
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowLetterPreview(false)}>
                  Close
                </Button>
                <Button 
                  onClick={() => handleDownloadPDF(selectedApplication)}
                  disabled={generatingPdf}
                >
                  {generatingPdf ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Download PDF
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
