import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { useListJobs } from "@workspace/api-client-react";
import type { Job, ListJobsCategory } from "@workspace/api-client-react";
import JobDetailDialog from "@/components/JobDetailDialog";

const FILTER_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Web / App", value: "web" },
  { label: "Automation", value: "automation" },
  { label: "AI Agent", value: "agent" },
  { label: "Data", value: "data" },
];

export default function Board() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const { data: jobs = [], isLoading } = useListJobs(
    activeFilter !== "all" ? { category: activeFilter as ListJobsCategory } : undefined
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 min-h-[calc(100vh-4rem)]">
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Open jobs</h1>
            <p className="text-muted-foreground mt-1">{jobs.length} jobs available</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          {FILTER_OPTIONS.map((f) => (
            <Badge
              key={f.value}
              variant={activeFilter === f.value ? "default" : "secondary"}
              className="cursor-pointer px-4 py-1.5 text-sm"
              onClick={() => setActiveFilter(f.value)}
              data-testid={`filter-${f.value}`}
            >
              {f.label}
            </Badge>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      )}

      <div className="space-y-4">
        {jobs.map((job, i) => (
          <motion.div
            key={job.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Card
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setSelectedJob(job)}
              data-testid={`card-job-${job.id}`}
            >
              <CardHeader className="p-6">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {job.featured && <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs">⭐ Featured</Badge>}
                      {job.urgent && <Badge variant="destructive" className="text-xs">Urgent</Badge>}
                      {job.isNew && <Badge className="bg-green-600 hover:bg-green-700 text-xs">New</Badge>}
                      <Badge variant="outline" className="text-xs">{job.deadline}</Badge>
                    </div>
                    <CardTitle className="text-xl leading-tight">{job.title}</CardTitle>
                    <CardDescription className="line-clamp-2 text-base mt-2">
                      {job.description}
                    </CardDescription>
                  </div>
                  <div className="text-right shrink-0 space-y-2">
                    <div className="text-2xl font-bold text-green-600" data-testid={`text-budget-${job.id}`}>Budget: ${job.budget}</div>
                    <div className="text-sm text-muted-foreground">{job.bids} bids</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
                  {job.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="font-normal text-xs">{skill}</Badge>
                  ))}
                </div>
              </CardHeader>
            </Card>
          </motion.div>
        ))}
      </div>

      <Dialog open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
        {selectedJob && (
          <JobDetailDialog
            job={selectedJob}
            onJobUpdated={(updated) => setSelectedJob(updated)}
          />
        )}
      </Dialog>
    </div>
  );
}
