import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const TABS = ["Pending", "Approved", "Disputes", "Cancelled"] as const;
type Tab = typeof TABS[number];

interface Tool {
  id: number;
  name: string;
  emoji: string;
  description: string;
  targetAudience: string | null;
  toolUrl: string | null;
  accessInstructions: string | null;
  builderEmail: string | null;
  price: string;
  billingType: string | null;
  status: string;
  rejectionReason: string | null;
}

interface Purchase {
  id: number;
  toolId: number;
  buyerEmail: string | null;
  sessionId: string;
  purchasedAt: string;
  disputeWindowEnds: number;
  status: string;
}

interface DisputedJob {
  id: number;
  title: string;
  budget: number;
  clientEmail: string;
  acceptedBid?: { builderEmail: string; price: number } | null;
  deliveryNote: string | null;
  deliveryLink: string | null;
  disputeReason: string | null;
  status: string;
}

interface CancelledJob {
  id: number;
  title: string;
  budget: number;
  clientEmail: string;
  cancelledAt: string | null;
}

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [pwError, setPwError] = useState(false);
  const [checkingPw, setCheckingPw] = useState(false);
  const [tab, setTab] = useState<Tab>("Pending");
  const [tools, setTools] = useState<Tool[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [disputedJobs, setDisputedJobs] = useState<DisputedJob[]>([]);
  const [cancelledJobs, setCancelledJobs] = useState<CancelledJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [, setTick] = useState(0);

  const fetchData = useCallback(async (pw: string) => {
    setLoading(true);
    const [tr, pr, dr, cr] = await Promise.all([
      fetch("/api/admin/tools", { headers: { "x-admin-password": pw } }),
      fetch("/api/admin/purchases", { headers: { "x-admin-password": pw } }),
      fetch("/api/admin/disputed-jobs", { headers: { "x-admin-password": pw } }),
      fetch("/api/admin/cancelled-jobs", { headers: { "x-admin-password": pw } }),
    ]);
    if (tr.ok) setTools(await tr.json() as Tool[]);
    if (pr.ok) setPurchases(await pr.json() as Purchase[]);
    if (dr.ok) setDisputedJobs(await dr.json() as DisputedJob[]);
    if (cr.ok) setCancelledJobs(await cr.json() as CancelledJob[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authed) return;
    void fetchData(adminPassword);
    const interval = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(interval);
  }, [authed, adminPassword, fetchData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckingPw(true);
    const res = await fetch("/api/admin/tools", { headers: { "x-admin-password": pwInput } });
    setCheckingPw(false);
    if (res.ok) {
      setAdminPassword(pwInput);
      setAuthed(true);
      setPwError(false);
    } else {
      setPwError(true);
    }
  };

  const approve = async (id: number) => {
    await fetch(`/api/admin/tools/${id}/approve`, {
      method: "POST",
      headers: { "x-admin-password": adminPassword },
    });
    void fetchData(adminPassword);
  };

  const reject = async (id: number) => {
    const reason = window.prompt("Rejection reason (optional):") ?? "";
    await fetch(`/api/admin/tools/${id}/reject`, {
      method: "POST",
      headers: { "x-admin-password": adminPassword, "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    void fetchData(adminPassword);
  };

  const releasePayout = async (id: number) => {
    await fetch(`/api/admin/purchases/${id}/release`, {
      method: "POST",
      headers: { "x-admin-password": adminPassword },
    });
    alert("Payout released (placeholder — transfer logic to be wired next).");
  };

  const formatCountdown = (endsMs: number) => {
    const diff = endsMs - Date.now();
    if (diff <= 0) return "Window closed";
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m remaining`;
  };

  if (!authed) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Admin access</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="password"
                placeholder="Password"
                value={pwInput}
                onChange={(e) => setPwInput(e.target.value)}
                autoFocus
              />
              {pwError && <p className="text-sm text-destructive">Access denied.</p>}
              <Button type="submit" className="w-full" disabled={checkingPw}>
                {checkingPw ? "Checking…" : "Enter"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pending = tools.filter((t) => t.status === "pending");
  const approved = tools.filter((t) => t.status === "approved");

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin dashboard</h1>
        <Button variant="outline" size="sm" onClick={() => void fetchData(adminPassword)} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      <div className="flex gap-2 border-b">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
            {t === "Pending" && pending.length > 0 && (
              <span className="ml-1.5 bg-orange-100 text-orange-700 text-xs rounded-full px-1.5 py-0.5">
                {pending.length}
              </span>
            )}
            {t === "Disputes" && (purchases.length > 0 || disputedJobs.length > 0) && (
              <span className="ml-1.5 bg-blue-100 text-blue-700 text-xs rounded-full px-1.5 py-0.5">
                {purchases.length + disputedJobs.length}
              </span>
            )}
            {t === "Cancelled" && cancelledJobs.length > 0 && (
              <span className="ml-1.5 bg-gray-100 text-gray-700 text-xs rounded-full px-1.5 py-0.5">
                {cancelledJobs.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "Pending" && (
        <div className="space-y-4">
          {pending.length === 0 && (
            <p className="text-muted-foreground text-sm">No tools pending review.</p>
          )}
          {pending.map((tool) => (
            <ToolCard key={tool.id} tool={tool} onApprove={approve} onReject={reject} />
          ))}
        </div>
      )}

      {tab === "Approved" && (
        <div className="space-y-4">
          {approved.length === 0 && (
            <p className="text-muted-foreground text-sm">No approved tools yet.</p>
          )}
          {approved.map((tool) => (
            <ToolCard key={tool.id} tool={tool} onApprove={approve} onReject={reject} />
          ))}
        </div>
      )}

      {tab === "Disputes" && (
        <div className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Disputed jobs</h2>
            {disputedJobs.length === 0 && (
              <p className="text-muted-foreground text-sm">No disputed jobs.</p>
            )}
            {disputedJobs.map((job) => (
              <Card key={job.id}>
                <CardContent className="pt-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-base">{job.title}</p>
                    <Badge variant="destructive">Disputed</Badge>
                  </div>
                  <p><span className="font-medium">Budget:</span> ${job.budget}</p>
                  <p><span className="font-medium">Client:</span> {job.clientEmail}</p>
                  <p><span className="font-medium">Builder:</span> {job.acceptedBid?.builderEmail ?? "—"}</p>
                  {job.disputeReason && (
                    <p><span className="font-medium">Dispute reason:</span> {job.disputeReason}</p>
                  )}
                  {job.deliveryNote && (
                    <p><span className="font-medium">Delivery note:</span> {job.deliveryNote}</p>
                  )}
                  {job.deliveryLink && (
                    <p>
                      <span className="font-medium">Delivery link:</span>{" "}
                      <a
                        href={job.deliveryLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline break-all"
                      >
                        {job.deliveryLink}
                      </a>
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Tool purchases</h2>
            {purchases.length === 0 && (
              <p className="text-muted-foreground text-sm">No purchases recorded yet.</p>
            )}
            {purchases.map((p) => (
            <Card key={p.id}>
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Tool ID:</span> {p.toolId}</p>
                    <p><span className="font-medium">Buyer:</span> {p.buyerEmail ?? "—"}</p>
                    <p><span className="font-medium">Session:</span> <span className="font-mono text-xs text-muted-foreground">{p.sessionId}</span></p>
                    <p><span className="font-medium">Purchased:</span> {new Date(p.purchasedAt).toLocaleString()}</p>
                    <p>
                      <span className="font-medium">Dispute window:</span>{" "}
                      <span className={p.disputeWindowEnds > Date.now() ? "text-orange-600 font-medium" : "text-green-600 font-medium"}>
                        {formatCountdown(p.disputeWindowEnds)}
                      </span>
                    </p>
                    <p><span className="font-medium">Status:</span> <Badge variant="secondary">{p.status}</Badge></p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => releasePayout(p.id)}
                    disabled={p.status !== "pending_payout"}
                  >
                    Release payout
                  </Button>
                </div>
              </CardContent>
            </Card>
            ))}
          </div>
        </div>
      )}

      {tab === "Cancelled" && (
        <div className="space-y-4">
          {cancelledJobs.length === 0 && (
            <p className="text-muted-foreground text-sm">No cancelled jobs.</p>
          )}
          {cancelledJobs.map((job) => (
            <Card key={job.id}>
              <CardContent className="pt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-base">{job.title}</p>
                  <Badge variant="secondary">Cancelled</Badge>
                </div>
                <p><span className="font-medium">Budget:</span> ${job.budget}</p>
                <p><span className="font-medium">Client:</span> {job.clientEmail}</p>
                <p>
                  <span className="font-medium">Cancelled:</span>{" "}
                  {job.cancelledAt ? new Date(job.cancelledAt).toLocaleString() : "—"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ToolCard({
  tool,
  onApprove,
  onReject,
}: {
  tool: Tool;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3 items-start">
            <span className="text-3xl">{tool.emoji}</span>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold">{tool.name}</p>
                <Badge variant="secondary">{tool.price}</Badge>
                {tool.billingType && (
                  <Badge variant="outline" className="text-xs">{tool.billingType}</Badge>
                )}
                {tool.status === "rejected" && (
                  <Badge variant="destructive">Rejected</Badge>
                )}
                {tool.status === "approved" && (
                  <Badge className="bg-green-100 text-green-800 border-green-200">Approved</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{tool.description}</p>
              {tool.targetAudience && (
                <p className="text-sm"><span className="font-medium">For:</span> {tool.targetAudience}</p>
              )}
              {tool.toolUrl && (
                <p className="text-sm">
                  <span className="font-medium">URL:</span>{" "}
                  <a
                    href={tool.toolUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline break-all"
                  >
                    {tool.toolUrl}
                  </a>
                </p>
              )}
              {tool.accessInstructions && (
                <p className="text-sm"><span className="font-medium">Instructions:</span> {tool.accessInstructions}</p>
              )}
              <p className="text-sm"><span className="font-medium">Builder:</span> {tool.builderEmail ?? "—"}</p>
              {tool.rejectionReason && (
                <p className="text-sm text-destructive"><span className="font-medium">Rejection reason:</span> {tool.rejectionReason}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            {tool.status !== "approved" && (
              <Button size="sm" onClick={() => onApprove(tool.id)} className="bg-green-600 hover:bg-green-700 text-white">
                Approve
              </Button>
            )}
            {tool.status !== "rejected" && (
              <Button size="sm" variant="destructive" onClick={() => onReject(tool.id)}>
                Reject
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
