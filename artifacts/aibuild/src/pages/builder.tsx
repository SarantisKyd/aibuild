import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function BuilderPage() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [pending, setPending] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [verifyPending, setVerifyPending] = useState(false);

  const justSubscribed =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("subscribed") === "true";

  useEffect(() => {
    if (justSubscribed) {
      toast({ title: "Subscribed!", description: "You are now a Verified Builder on AIBuild." });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setPending(true);
    try {
      const res = await fetch("/api/builders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          bio: bio.trim(),
        }),
      });
      const data = await res.json();
      if (data.onboardingUrl) {
        window.location.href = data.onboardingUrl;
      } else {
        toast({
          title: "Error",
          description: data.error ?? "Could not start onboarding.",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setPending(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyEmail.trim()) return;
    setVerifyPending(true);
    try {
      const res = await fetch("/api/builders/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verifyEmail.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        toast({
          title: "Error",
          description: data.error ?? "Could not start checkout.",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setVerifyPending(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-14 min-h-[calc(100vh-4rem)] space-y-10">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Get paid to build AI tools</h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          Sign up in 2 minutes. Bid on jobs. Get paid directly to your bank when clients approve
          your work. Free to join.
        </p>
      </div>

      {/* Signup form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="builder-name">Full name</Label>
          <Input
            id="builder-name"
            placeholder="Jane Smith"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            data-testid="input-builder-name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="builder-email">Email</Label>
          <Input
            id="builder-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            data-testid="input-builder-email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="builder-bio">One sentence bio</Label>
          <Textarea
            id="builder-bio"
            placeholder="e.g. I build Python automation tools and Claude API integrations"
            rows={2}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            data-testid="input-builder-bio"
          />
        </div>

        <div className="space-y-2">
          <Button
            type="submit"
            size="lg"
            className="w-full text-base"
            disabled={pending || !name.trim() || !email.trim()}
            data-testid="btn-builder-signup"
          >
            {pending ? "Setting up your account…" : "Create free account & connect Stripe →"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Stripe Connect lets us pay you directly. We never see your bank details and never charge
            you to bid.
          </p>
        </div>
      </form>

      {/* Divider + optional upgrade */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">
            Optional — after you're set up
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900">
          <CardContent className="pt-5 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base">⚡</span>
              <span className="font-semibold">Go Verified for $9/month</span>
              <Badge className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                ✓ Verified
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Get a blue checkmark, priority placement, and 2hr early access to new jobs.
            </p>

            <button
              type="button"
              onClick={() => setVerifyOpen((o) => !o)}
              className="text-sm text-primary underline underline-offset-2 hover:no-underline"
            >
              {verifyOpen ? "Hide details" : "Learn more"}
            </button>

            {verifyOpen && (
              <div className="space-y-4 pt-1">
                <ul className="space-y-1.5 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold mt-0.5">✓</span>
                    <span><strong>Priority placement</strong> in search results</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold mt-0.5">✓</span>
                    <span><strong>Verified checkmark</strong> on your profile</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold mt-0.5">✓</span>
                    <span><strong>Early access</strong> to new jobs — 2 hours before public</span>
                  </li>
                </ul>

                <form onSubmit={handleVerify} className="space-y-2">
                  <Input
                    type="email"
                    placeholder="your@email.com (must match your account)"
                    value={verifyEmail}
                    onChange={(e) => setVerifyEmail(e.target.value)}
                    required
                  />
                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={verifyPending || !verifyEmail.trim()}
                    data-testid="btn-builder-subscribe"
                  >
                    {verifyPending ? "Loading…" : "Subscribe $9/mo"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Cancel anytime. Redirects to Stripe for secure payment.
                  </p>
                </form>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
