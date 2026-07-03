import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  useGetJob,
  useListJobBids,
  useSubmitBid,
  useAcceptBid,
  useDeliverJob,
  useReleaseJobPayment,
  useRequestRevision,
  useDisputeJob,
  useCancelJob,
  getListJobsQueryKey,
  getListJobBidsQueryKey,
  getGetJobQueryKey,
} from "@workspace/api-client-react";
import type { Job, Bid } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api-url";

function getStoredEmail(key: "clientEmail" | "builderEmail"): string {
  if (typeof window === "undefined") return "";
  return (localStorage.getItem(key) ?? "").toLowerCase();
}

export default function JobDetailDialog({
  job,
  onJobUpdated,
}: {
  job: Job;
  onJobUpdated: (job: Job) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: fetchedJob } = useGetJob(job.id, {
    query: { queryKey: getGetJobQueryKey(job.id), initialData: job, staleTime: 0 },
  });
  const currentJob = fetchedJob ?? job;

  const clientEmail = getStoredEmail("clientEmail");
  const builderEmail = getStoredEmail("builderEmail");
  const isClient = !!clientEmail && !!currentJob.clientEmail && clientEmail === currentJob.clientEmail.toLowerCase();
  const isAcceptedBuilder =
    !!builderEmail && !!currentJob.acceptedBid && builderEmail === currentJob.acceptedBid.builderEmail.toLowerCase();

  const [bidPrice, setBidPrice] = useState("");
  const [bidTime, setBidTime] = useState("");
  const [bidNote, setBidNote] = useState("");
  const [bidEmail, setBidEmail] = useState(builderEmail || "");
  const [isVerifiedBuilder, setIsVerifiedBuilder] = useState(false);

  const [deliveryNote, setDeliveryNote] = useState("");
  const [deliveryLink, setDeliveryLink] = useState("");

  const [revisionOpen, setRevisionOpen] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");

  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");

  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelResult, setCancelResult] = useState<{ refunded: boolean; refundAmount?: number; message?: string } | null>(null);

  const [releaseResult, setReleaseResult] = useState<{ builderPaid: number } | null>(null);

  useEffect(() => {
    if (!bidEmail || !bidEmail.includes("@")) {
      setIsVerifiedBuilder(false);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(apiUrl(`/api/builders/${encodeURIComponent(bidEmail.toLowerCase())}`));
        if (res.ok) {
          const data = await res.json();
          setIsVerifiedBuilder(!!data.verified);
        } else {
          setIsVerifiedBuilder(false);
        }
      } catch {
        setIsVerifiedBuilder(false);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [bidEmail]);

  const { data: bids = [] } = useListJobBids(job.id, {
    query: { queryKey: getListJobBidsQueryKey(job.id), enabled: currentJob.status === "open" },
  });

  const invalidateJobs = () => {
    queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListJobBidsQueryKey(job.id) });
  };

  const submitBidMutation = useSubmitBid({
    mutation: {
      onSuccess: () => {
        invalidateJobs();
        toast({ title: "Bid submitted!", description: "The client will review your bid shortly. 💬 Use the chat bubble in the bottom right to message the client directly" });
        setBidPrice("");
        setBidTime("");
        setBidNote("");
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to submit bid. Please try again.", variant: "destructive" });
      },
    },
  });

  const acceptBidMutation = useAcceptBid({
    mutation: {
      onSuccess: (updated) => {
        invalidateJobs();
        onJobUpdated(updated);
        toast({ title: "Builder selected!", description: "Work is now in progress." });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to accept bid. Please try again.", variant: "destructive" });
      },
    },
  });

  const deliverJobMutation = useDeliverJob({
    mutation: {
      onSuccess: (updated) => {
        invalidateJobs();
        onJobUpdated(updated);
        toast({ title: "Work submitted!", description: "The client has been notified to review your work." });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to submit work. Please try again.", variant: "destructive" });
      },
    },
  });

  const releaseMutation = useReleaseJobPayment({
    mutation: {
      onSuccess: (data) => {
        invalidateJobs();
        onJobUpdated({ ...job, status: "complete" });
        setReleaseResult({ builderPaid: data.builderPaid });
      },
      onError: (err) => {
        const message = (err as unknown as { error?: string })?.error ?? "Failed to release payment. Please try again.";
        toast({ title: "Error", description: message, variant: "destructive" });
      },
    },
  });

  const revisionMutation = useRequestRevision({
    mutation: {
      onSuccess: (updated) => {
        invalidateJobs();
        onJobUpdated(updated);
        setRevisionOpen(false);
        setRevisionNote("");
        toast({ title: "Revision requested", description: "The builder has been notified." });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to request revision. Please try again.", variant: "destructive" });
      },
    },
  });

  const disputeMutation = useDisputeJob({
    mutation: {
      onSuccess: (updated) => {
        invalidateJobs();
        onJobUpdated(updated);
        setDisputeOpen(false);
        toast({ title: "Dispute opened", description: "Our team will review and reach out." });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to open dispute. Please try again.", variant: "destructive" });
      },
    },
  });

  const handleSubmitBid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bidPrice || !bidTime || bidNote.length < 10 || !bidEmail.trim()) {
      toast({ title: "Missing fields", description: "Fill in all bid fields (cover note min 10 chars).", variant: "destructive" });
      return;
    }
    const normalizedEmail = bidEmail.trim().toLowerCase();
    localStorage.setItem("builderEmail", normalizedEmail);
    submitBidMutation.mutate({
      id: job.id,
      data: { price: Number(bidPrice), deliveryTime: bidTime, coverNote: bidNote, builderEmail: normalizedEmail },
    });
  };

  const handleAccept = (bid: Bid) => {
    acceptBidMutation.mutate({ id: job.id, bidId: bid.id });
  };

  const handleDeliver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryNote.trim() || !deliveryLink.trim()) {
      toast({ title: "Missing fields", description: "Add a delivery note and a link to your work.", variant: "destructive" });
      return;
    }
    deliverJobMutation.mutate({
      id: job.id,
      data: { builderEmail, deliveryNote: deliveryNote.trim(), deliveryLink: deliveryLink.trim() },
    });
  };

  const handleRelease = () => {
    releaseMutation.mutate({ id: job.id });
  };

  const handleRevisionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionNote.trim()) return;
    revisionMutation.mutate({ id: job.id, data: { revisionNote: revisionNote.trim() } });
  };

  const handleDisputeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeReason.trim()) return;
    disputeMutation.mutate({ id: job.id, data: { reason: disputeReason.trim() } });
  };

  const cancelMutation = useCancelJob({
    mutation: {
      onSuccess: (data) => {
        invalidateJobs();
        setCancelConfirmOpen(false);
        setCancelResult({ refunded: data.refunded, refundAmount: data.refundAmount, message: data.message });
      },
      onError: (err) => {
        const message = (err as unknown as { error?: string })?.error ?? "Failed to cancel job. Please try again.";
        setCancelConfirmOpen(false);
        toast({ title: "Error", description: message, variant: "destructive" });
      },
    },
  });

  const handleCancelConfirm = () => {
    cancelMutation.mutate({ id: job.id });
  };

  if (cancelResult) {
    return (
      <DialogContent className="max-w-lg" data-testid={`modal-job-${job.id}`}>
        <div className="py-8 text-center space-y-3">
          <div className="text-4xl">✅</div>
          <h2 className="text-xl font-bold">Job cancelled</h2>
          <p className="text-muted-foreground">
            {cancelResult.refunded
              ? `Your job has been cancelled and $${cancelResult.refundAmount} has been refunded to your original payment method.`
              : cancelResult.message ?? "Your job has been cancelled. No payment was made so no refund is needed."}
          </p>
        </div>
      </DialogContent>
    );
  }

  if (releaseResult) {
    return (
      <DialogContent className="max-w-lg" data-testid={`modal-job-${job.id}`}>
        <div className="py-8 text-center space-y-3">
          <div className="text-4xl">✅</div>
          <h2 className="text-xl font-bold">Payment released!</h2>
          <p className="text-muted-foreground">
            {currentJob.acceptedBid ? "The builder" : "The builder"} has been paid ${releaseResult.builderPaid}. Thank you for using AIBuild.
          </p>
        </div>
      </DialogContent>
    );
  }

  return (
    <DialogContent className="max-w-2xl" data-testid={`modal-job-${job.id}`}>
      <DialogHeader>
        <div className="flex justify-between items-start gap-4 pr-6">
          <div>
            <DialogTitle className="text-2xl leading-tight mb-2">{currentJob.title}</DialogTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{currentJob.deadline}</Badge>
              <span className="text-sm text-muted-foreground">{currentJob.bids} bids</span>
              <Badge variant="secondary" className="capitalize">{currentJob.status.replace("_", " ")}</Badge>
            </div>
          </div>
          <div className="text-2xl font-bold text-green-600">${currentJob.budget}</div>
        </div>
      </DialogHeader>

      <div className="space-y-6 py-4">
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">Project Description</h3>
          <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">{currentJob.description}</p>
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">Required Skills</h3>
          <div className="flex flex-wrap gap-2">
            {currentJob.skills.map((skill) => (
              <Badge key={skill} variant="secondary">{skill}</Badge>
            ))}
          </div>
        </div>

        {currentJob.status === "open" && (
          <>
            {isClient && bids.length > 0 && (
              <div className="border-t pt-6 space-y-3">
                <h3 className="font-semibold text-lg">Bids received</h3>
                {bids.map((bid) => (
                  <Card key={bid.id}>
                    <CardContent className="pt-4 flex items-start justify-between gap-4">
                      <div className="space-y-1 text-sm">
                        <p className="font-semibold text-base">${bid.price} — {bid.deliveryTime}</p>
                        <p className="text-muted-foreground">{bid.coverNote}</p>
                        <p className="text-xs text-muted-foreground">{bid.builderEmail}</p>
                      </div>
                      <Button
                        size="sm"
                        className="shrink-0"
                        onClick={() => handleAccept(bid)}
                        disabled={acceptBidMutation.isPending}
                        data-testid={`btn-accept-bid-${bid.id}`}
                      >
                        Accept bid
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="border-t pt-6">
              <h3 className="font-semibold text-lg mb-4">Submit your bid</h3>
              <form onSubmit={handleSubmitBid} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bid-email">Your email</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="bid-email"
                      type="email"
                      placeholder="you@example.com"
                      value={bidEmail}
                      onChange={(e) => setBidEmail(e.target.value)}
                      required
                      data-testid="input-bid-email"
                    />
                    {isVerifiedBuilder && (
                      <Badge className="bg-blue-600 hover:bg-blue-700 text-white gap-1 whitespace-nowrap">
                        ✓ Verified
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bid-price">Your bid (USD)</Label>
                    <Input
                      id="bid-price"
                      type="number"
                      required
                      min="1"
                      placeholder={String(currentJob.budget)}
                      value={bidPrice}
                      onChange={(e) => setBidPrice(e.target.value)}
                      data-testid="input-bid-price"
                    />
                    <p className="text-xs text-muted-foreground">Bid at or below the client's budget to stay competitive</p>
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

            {isClient && (
              <div className="border-t pt-6 text-center">
                <Button
                  variant="destructive"
                  onClick={() => setCancelConfirmOpen(true)}
                  data-testid="btn-cancel-job"
                >
                  Cancel job &amp; get refund
                </Button>
              </div>
            )}
          </>
        )}

        {currentJob.status === "in_progress" && (
          <div className="border-t pt-6 space-y-4">
            {isAcceptedBuilder ? (
              <>
                <h3 className="font-semibold text-lg">Submit your work</h3>
                <form onSubmit={handleDeliver} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="delivery-note">Delivery note</Label>
                    <Textarea
                      id="delivery-note"
                      rows={4}
                      placeholder="Summarize what you built and how to use it..."
                      value={deliveryNote}
                      onChange={(e) => setDeliveryNote(e.target.value)}
                      data-testid="input-delivery-note"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="delivery-link">Work link</Label>
                    <Input
                      id="delivery-link"
                      placeholder="Link to your work — Replit URL, GitHub, Google Drive, etc."
                      value={deliveryLink}
                      onChange={(e) => setDeliveryLink(e.target.value)}
                      data-testid="input-delivery-link"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={deliverJobMutation.isPending}
                    data-testid="btn-submit-work"
                  >
                    {deliverJobMutation.isPending ? "Submitting…" : "Submit work"}
                  </Button>
                </form>
              </>
            ) : (
              <p className="text-center text-muted-foreground py-4">Builder selected — work in progress.</p>
            )}

            {isClient && (
              <div className="text-center pt-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span tabIndex={0}>
                        <Button variant="destructive" disabled data-testid="btn-cancel-job-disabled">
                          Cancel job &amp; get refund
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      A builder has already been accepted. Open a dispute instead.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setDisputeOpen((o) => !o)}
                    className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
                    data-testid="btn-open-dispute-in-progress"
                  >
                    Something wrong? Open a dispute
                  </button>
                </div>
                {disputeOpen && (
                  <form onSubmit={handleDisputeSubmit} className="space-y-2 pt-2 text-left">
                    <Textarea
                      placeholder="Describe the issue..."
                      rows={3}
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      data-testid="input-dispute-reason-in-progress"
                    />
                    <Button type="submit" size="sm" variant="destructive" disabled={disputeMutation.isPending} data-testid="btn-submit-dispute-in-progress">
                      {disputeMutation.isPending ? "Submitting…" : "Submit dispute"}
                    </Button>
                  </form>
                )}
              </div>
            )}
          </div>
        )}

        {currentJob.status === "delivered" && (
          <div className="border-t pt-6 space-y-4">
            {isClient ? (
              <>
                <h3 className="font-semibold text-lg">Delivered work</h3>
                <Card>
                  <CardContent className="pt-4 space-y-2 text-sm">
                    <p className="whitespace-pre-wrap">{currentJob.deliveryNote}</p>
                    <p>
                      <span className="font-medium">Link:</span>{" "}
                      <a href={currentJob.deliveryLink ?? "#"} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all">
                        {currentJob.deliveryLink}
                      </a>
                    </p>
                  </CardContent>
                </Card>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleRelease}
                    disabled={releaseMutation.isPending}
                    data-testid="btn-approve-release"
                  >
                    {releaseMutation.isPending ? "Releasing…" : "Approve & release payment"}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setRevisionOpen((o) => !o)}
                    data-testid="btn-request-revision"
                  >
                    Request revision
                  </Button>
                </div>

                {revisionOpen && (
                  <form onSubmit={handleRevisionSubmit} className="space-y-2 pt-2">
                    <Textarea
                      placeholder="What needs to change?"
                      rows={3}
                      value={revisionNote}
                      onChange={(e) => setRevisionNote(e.target.value)}
                      data-testid="input-revision-note"
                    />
                    <Button type="submit" size="sm" disabled={revisionMutation.isPending} data-testid="btn-submit-revision">
                      {revisionMutation.isPending ? "Sending…" : "Send revision request"}
                    </Button>
                  </form>
                )}

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setDisputeOpen((o) => !o)}
                    className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
                    data-testid="btn-open-dispute"
                  >
                    Something wrong? Open a dispute
                  </button>
                </div>

                {disputeOpen && (
                  <form onSubmit={handleDisputeSubmit} className="space-y-2 pt-2">
                    <Textarea
                      placeholder="Describe the issue..."
                      rows={3}
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      data-testid="input-dispute-reason"
                    />
                    <Button type="submit" size="sm" variant="destructive" disabled={disputeMutation.isPending} data-testid="btn-submit-dispute">
                      {disputeMutation.isPending ? "Submitting…" : "Submit dispute"}
                    </Button>
                  </form>
                )}
              </>
            ) : isAcceptedBuilder ? (
              <p className="text-center text-muted-foreground py-4">Work submitted — awaiting client review.</p>
            ) : (
              <p className="text-center text-muted-foreground py-4">This job's work has been delivered and is awaiting client review.</p>
            )}
          </div>
        )}

        {currentJob.status === "complete" && (
          <div className="border-t pt-6 text-center py-4 space-y-1">
            <div className="text-2xl">✅</div>
            <p className="font-semibold">Payment released — job complete.</p>
          </div>
        )}

        {currentJob.status === "disputed" && (
          <div className="border-t pt-6 text-center py-4">
            <p className="text-muted-foreground">This job is under dispute. Our team will review and resolve manually.</p>
          </div>
        )}
      </div>

      <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this job?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this job? Any funds you've paid will be refunded to your original payment method.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="btn-cancel-confirm-dismiss">Keep job</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelConfirm}
              disabled={cancelMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="btn-cancel-confirm"
            >
              {cancelMutation.isPending ? "Cancelling…" : "Yes, cancel & refund"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DialogContent>
  );
}
