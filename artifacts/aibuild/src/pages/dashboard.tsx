import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import JobDetailDialog from "@/components/JobDetailDialog";
import { useDashboardClient, useDashboardBuilder, getDashboardClientQueryKey, getDashboardBuilderQueryKey } from "@workspace/api-client-react";
import type { Job, DashboardClientJob, DashboardBuilderJob } from "@workspace/api-client-react";

function statusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "complete") return "default";
  if (status === "disputed" || status === "cancelled") return "destructive";
  if (status === "in_progress" || status === "delivered") return "secondary";
  return "outline";
}

function isAwaitingBids(status: string): boolean {
  return status === "open" || status === "funded";
}

export default function Dashboard() {
  const [email, setEmail] = useState(
    typeof window !== "undefined" ? (localStorage.getItem("userEmail") ?? "") : ""
  );
  const [submittedEmail, setSubmittedEmail] = useState(email);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const normalizedEmail = submittedEmail.trim().toLowerCase();
  const enabled = !!normalizedEmail && normalizedEmail.includes("@");

  const { data: clientJobs = [], isLoading: clientLoading } = useDashboardClient(
    { email: normalizedEmail },
    { query: { queryKey: getDashboardClientQueryKey({ email: normalizedEmail }), enabled } }
  );
  const { data: builderJobs = [], isLoading: builderLoading } = useDashboardBuilder(
    { email: normalizedEmail },
    { query: { queryKey: getDashboardBuilderQueryKey({ email: normalizedEmail }), enabled } }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    const normalized = email.trim().toLowerCase();
    localStorage.setItem("userEmail", normalized);
    localStorage.setItem("clientEmail", normalized);
    localStorage.setItem("builderEmail", normalized);
    setSubmittedEmail(normalized);
  };

  const activeBuilderJobs = builderJobs.filter((j) => j.status !== "open" && j.status !== "funded");
  const pendingBuilderJobs = builderJobs.filter((j) => j.status === "open" || j.status === "funded");

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 min-h-[calc(100vh-4rem)]">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My dashboard</h1>
        <p className="text-muted-foreground mt-1">Track jobs you've posted and jobs you've bid on.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-end gap-3">
            <div className="space-y-2 flex-1 w-full">
              <Label htmlFor="dashboard-email">Your email</Label>
              <Input
                id="dashboard-email"
                type="email"
                placeholder="you@email.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="input-dashboard-email"
              />
            </div>
            <Button type="submit" data-testid="btn-dashboard-submit">
              View dashboard
            </Button>
          </form>
        </CardContent>
      </Card>

      {enabled && (
        <>
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Jobs you've posted</h2>
            {clientLoading && (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            )}
            {!clientLoading && clientJobs.length === 0 && (
              <p className="text-muted-foreground text-sm" data-testid="text-no-client-jobs">
                You haven't posted any jobs with this email yet.
              </p>
            )}
            <div className="space-y-3">
              {clientJobs.map((job) => (
                <ClientJobCard key={job.id} job={job} onView={() => setSelectedJob(job)} />
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Jobs you've bid on</h2>
            {builderLoading && (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            )}
            {!builderLoading && builderJobs.length === 0 && (
              <p className="text-muted-foreground text-sm" data-testid="text-no-builder-jobs">
                You haven't placed any bids with this email yet.
              </p>
            )}
            {!builderLoading && builderJobs.length > 0 && (
              <Tabs defaultValue="active">
                <TabsList>
                  <TabsTrigger value="active" data-testid="tab-active">
                    Active ({activeBuilderJobs.length})
                  </TabsTrigger>
                  <TabsTrigger value="pending" data-testid="tab-pending">
                    Bids placed ({pendingBuilderJobs.length})
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="active" className="space-y-3 pt-4">
                  {activeBuilderJobs.length === 0 && (
                    <p className="text-muted-foreground text-sm">No active jobs yet.</p>
                  )}
                  {activeBuilderJobs.map((job) => (
                    <BuilderJobCard key={job.id} job={job} onView={() => setSelectedJob(job)} />
                  ))}
                </TabsContent>
                <TabsContent value="pending" className="space-y-3 pt-4">
                  {pendingBuilderJobs.length === 0 && (
                    <p className="text-muted-foreground text-sm">No pending bids.</p>
                  )}
                  {pendingBuilderJobs.map((job) => (
                    <BuilderJobCard key={job.id} job={job} onView={() => setSelectedJob(job)} />
                  ))}
                </TabsContent>
              </Tabs>
            )}
          </section>
        </>
      )}

      <Dialog open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
        {selectedJob && (
          <JobDetailDialog job={selectedJob} onJobUpdated={(updated) => setSelectedJob(updated)} />
        )}
      </Dialog>
    </div>
  );
}

function ClientJobCard({ job, onView }: { job: DashboardClientJob; onView: () => void }) {
  return (
    <Card data-testid={`card-client-job-${job.id}`}>
      <CardHeader className="p-5">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusBadgeVariant(job.status)} className="capitalize">
                {job.status.replace("_", " ")}
              </Badge>
              {isAwaitingBids(job.status) && job.bids > 0 && (
                <Badge className="bg-blue-600 hover:bg-blue-700 text-white">
                  {job.bids} bid{job.bids === 1 ? "" : "s"} to review
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg leading-tight">{job.title}</CardTitle>
            <CardDescription>
              Budget: ${job.budget} · {job.bids} bid{job.bids === 1 ? "" : "s"}
              {job.acceptedBuilderName ? ` · Builder: ${job.acceptedBuilderName}` : ""}
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={onView} data-testid={`btn-view-client-job-${job.id}`}>
            View job
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
}

function BuilderJobCard({ job, onView }: { job: DashboardBuilderJob; onView: () => void }) {
  return (
    <Card data-testid={`card-builder-job-${job.id}`}>
      <CardHeader className="p-5">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusBadgeVariant(job.status)} className="capitalize">
                {job.status.replace("_", " ")}
              </Badge>
              <Badge variant="secondary" className="capitalize">
                Your bid: {job.myBid.status}
              </Badge>
            </div>
            <CardTitle className="text-lg leading-tight">{job.title}</CardTitle>
            <CardDescription>
              Your bid: ${job.myBid.price} · {job.myBid.deliveryTime} · Budget: ${job.budget}
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={onView} data-testid={`btn-view-builder-job-${job.id}`}>
            View job
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
}
