import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useListJobs, useSubmitBid, getListJobsQueryKey } from "@workspace/api-client-react";
import type { Job, ListJobsCategory } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const FILTER_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Web / App", value: "web" },
  { label: "Automation", value: "automation" },
  { label: "AI Agent", value: "agent" },
  { label: "Data", value: "data" },
];

export default function Board() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [bidPrice, setBidPrice] = useState("");
  const [bidTime, setBidTime] = useState("");
  const [bidNote, setBidNote] = useState("");

  const { data: jobs = [], isLoading } = useListJobs(
    activeFilter !== "all" ? { category: activeFilter as ListJobsCategory } : undefined
  );

  const submitBidMutation = useSubmitBid({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
        toast({ title: "Bid submitted!", description: "The client will review your bid shortly." });
        setSelectedJob(null);
        setBidPrice("");
        setBidTime("");
        setBidNote("");
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to submit bid. Please try again.", variant: "destructive" });
      },
    },
  });

  const handleSubmitBid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob || !bidPrice || !bidTime || bidNote.length < 10) {
      toast({ title: "Missing fields", description: "Fill in all bid fields (cover note min 10 chars).", variant: "destructive" });
      return;
    }
    submitBidMutation.mutate({
      id: selectedJob.id,
      data: { price: Number(bidPrice), deliveryTime: bidTime, coverNote: bidNote },
    });
  };

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
                    <div className="text-2xl font-bold text-green-600" data-testid={`text-budget-${job.id}`}>${job.budget}</div>
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
          <DialogContent className="max-w-2xl" data-testid={`modal-job-${selectedJob.id}`}>
            <DialogHeader>
              <div className="flex justify-between items-start gap-4 pr-6">
                <div>
                  <DialogTitle className="text-2xl leading-tight mb-2">{selectedJob.title}</DialogTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{selectedJob.deadline}</Badge>
                    <span className="text-sm text-muted-foreground">{selectedJob.bids} bids</span>
                  </div>
                </div>
                <div className="text-2xl font-bold text-green-600">${selectedJob.budget}</div>
              </div>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Project Description</h3>
                <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">{selectedJob.description}</p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedJob.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">{skill}</Badge>
                  ))}
                </div>
              </div>
              <div className="border-t pt-6">
                <h3 className="font-semibold text-lg mb-4">Submit your bid</h3>
                <form onSubmit={handleSubmitBid} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bid-price">Your price ($)</Label>
                      <Input
                        id="bid-price"
                        type="number"
                        required
                        min="1"
                        placeholder={String(selectedJob.budget)}
                        value={bidPrice}
                        onChange={(e) => setBidPrice(e.target.value)}
                        data-testid="input-bid-price"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bid-time">Delivery time</Label>
                      <Select value={bidTime} onValueChange={setBidTime} required>
                        <SelectTrigger id="bid-time" data-testid="select-bid-time">
                          <SelectValue placeholder="Select timeframe" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="24 hours">24 hours</SelectItem>
                          <SelectItem value="3 days">3 days</SelectItem>
                          <SelectItem value="1 week">1 week</SelectItem>
                          <SelectItem value="2 weeks">2 weeks</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bid-note">Cover note</Label>
                    <Textarea
                      id="bid-note"
                      required
                      placeholder="Briefly explain how you'll build this and link relevant past work..."
                      rows={4}
                      value={bidNote}
                      onChange={(e) => setBidNote(e.target.value)}
                      data-testid="input-bid-note"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={submitBidMutation.isPending}
                    data-testid="btn-submit-bid"
                  >
                    {submitBidMutation.isPending ? "Submitting…" : "Submit Bid"}
                  </Button>
                </form>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
