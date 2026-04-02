// @ts-nocheck
import { useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { useAdmission } from '@/contexts/AdmissionContext';
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
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPage() {
  const { 
    applications, 
    programs, 
    adminSettings, 
    currentSelectionRun,
    updateAdminSettings, 
    triggerSelection, 
    releaseResults 
  } = useAdmission();

  const [deadline, setDeadline] = useState(
    new Date(adminSettings.applicationDeadline).toISOString().slice(0, 16)
  );
  const [scheduledSelection, setScheduledSelection] = useState('');

  const stats = {
    total: applications.length,
    submitted: applications.filter(a => a.status === 'submitted').length,
    pending: applications.filter(a => a.status === 'selection_pending').length,
    admitted: applications.filter(a => a.status === 'admitted').length,
    waitlisted: applications.filter(a => a.status === 'waitlisted').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  const handleUpdateDeadline = () => {
    updateAdminSettings({ applicationDeadline: new Date(deadline).toISOString() });
    toast.success('Application deadline updated');
  };

  const handleLockApplications = () => {
    updateAdminSettings({ applicationsLocked: !adminSettings.applicationsLocked });
    toast.success(adminSettings.applicationsLocked ? 'Applications unlocked' : 'Applications locked');
  };

  const handleTriggerSelection = () => {
    if (applications.filter(a => a.status === 'submitted').length === 0) {
      toast.error('No applications to process');
      return;
    }
    triggerSelection();
    toast.success('Selection process completed! Results are ready for release.');
  };

  const handleReleaseResults = () => {
    if (!currentSelectionRun || currentSelectionRun.status === 'released') {
      toast.error('No results to release');
      return;
    }
    releaseResults();
    toast.success('Results have been released to applicants!');
  };

  const handleScheduleSelection = () => {
    if (!scheduledSelection) {
      toast.error('Please select a date and time');
      return;
    }
    updateAdminSettings({ selectionScheduled: new Date(scheduledSelection).toISOString() });
    toast.success('Selection scheduled successfully');
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1 py-12">
        <div className="container">
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold md:text-4xl">Admin Control Panel</h1>
            <p className="mt-2 text-muted-foreground">
              Manage admission settings, trigger selection, and release results
            </p>
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
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                    />
                    <Button onClick={handleUpdateDeadline}>
                      <Calendar className="h-4 w-4" />
                      Set
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Application Lock Status</Label>
                  <div className="flex items-center gap-4">
                    <div className={`rounded-lg px-4 py-2 text-sm font-medium ${
                      adminSettings.applicationsLocked 
                        ? 'bg-destructive/10 text-destructive' 
                        : 'bg-success/10 text-success'
                    }`}>
                      {adminSettings.applicationsLocked ? 'Locked' : 'Open'}
                    </div>
                    <Button 
                      variant={adminSettings.applicationsLocked ? 'outline' : 'destructive'}
                      onClick={handleLockApplications}
                    >
                      {adminSettings.applicationsLocked ? (
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
                <CardDescription>Schedule or trigger the automated selection</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Schedule Selection Run</Label>
                  <div className="flex gap-2">
                    <Input
                      type="datetime-local"
                      value={scheduledSelection}
                      onChange={(e) => setScheduledSelection(e.target.value)}
                    />
                    <Button variant="outline" onClick={handleScheduleSelection}>
                      <Calendar className="h-4 w-4" />
                      Schedule
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Manual Selection Trigger</Label>
                  <Button 
                    onClick={handleTriggerSelection}
                    className="w-full"
                    disabled={!adminSettings.applicationsLocked || stats.submitted === 0}
                  >
                    <Play className="h-4 w-4" />
                    Run Selection Now
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Applications must be locked before running selection
                  </p>
                </div>

                {currentSelectionRun && (
                  <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
                    <p className="font-medium">Last Selection Run</p>
                    <p className="text-sm text-muted-foreground">
                      Status: <span className="font-medium capitalize">{currentSelectionRun.status}</span>
                    </p>
                    {currentSelectionRun.executedAt && (
                      <p className="text-sm text-muted-foreground">
                        Executed: {new Date(currentSelectionRun.executedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Release Results</Label>
                  <Button 
                    variant="success"
                    onClick={handleReleaseResults}
                    className="w-full"
                    disabled={!currentSelectionRun || currentSelectionRun.status === 'released'}
                  >
                    <Send className="h-4 w-4" />
                    Release Results to Applicants
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
              <CardDescription>View and monitor all submitted applications</CardDescription>
            </CardHeader>
            <CardContent>
              {applications.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No applications submitted yet
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Program</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Rank</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {applications.map((app) => {
                        const program = programs.find(p => p.id === app.programId);
                        return (
                          <TableRow key={app.id}>
                            <TableCell className="font-medium">{app.fullName}</TableCell>
                            <TableCell>{app.email}</TableCell>
                            <TableCell>{program?.code}</TableCell>
                            <TableCell>{app.totalScore.toFixed(1)}</TableCell>
                            <TableCell>{app.rank || '-'}</TableCell>
                            <TableCell>
                              <StatusBadge status={app.status} />
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(app.submittedAt).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        );
                      })}
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

      <Footer />
    </div>
  );
}
