import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type BuilderProfile = {
  id: number;
  email: string;
  name: string;
  verified: boolean;
};

export default function BuilderPage() {
  const [search] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [profile, setProfile] = useState<BuilderProfile | null>(null);
  const [lookupDone, setLookupDone] = useState(false);
  const [subscribePending, setSubscribePending] = useState(false);

  const justSubscribed = typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("subscribed") === "true";

  useEffect(() => {
    if (justSubscribed) {
      toast({ title: "Subscribed!", description: "You are now a Verified Builder on AIBuild." });
    }
  }, []);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      const res = await fetch(`/api/builders/${encodeURIComponent(email.trim().toLowerCase())}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      } else {
        setProfile(null);
      }
    } catch {
      setProfile(null);
    }
    setLookupDone(true);
  };

  const handleSubscribe = async () => {
    if (!email.trim()) return;
    setSubscribePending(true);
    try {
      const res = await fetch("/api/builders/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), name: name.trim() }),
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        toast({ title: "Error", description: data.error ?? "Could not start checkout.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Could not start checkout.", variant: "destructive" });
    } finally {
      setSubscribePending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 min-h-[calc(100vh-4rem)] space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Builder profile</h1>
        <p className="text-muted-foreground mt-2">Look up your profile or get verified to stand out.</p>
      </div>

      {/* Profile lookup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Find your profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLookup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Your email</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setLookupDone(false); setProfile(null); }}
                  required
                  data-testid="input-builder-email"
                />
                <Button type="submit" variant="outline">Look up</Button>
              </div>
            </div>

            {lookupDone && profile && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                <div className="flex-1">
                  <p className="font-medium">{profile.name || profile.email}</p>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                </div>
                {profile.verified ? (
                  <Badge className="bg-blue-600 hover:bg-blue-700 text-white gap-1">
                    ✓ Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">Not verified</Badge>
                )}
              </div>
            )}

            {lookupDone && !profile && (
              <p className="text-sm text-muted-foreground">No profile found — subscribe below to create one.</p>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Subscription upsell */}
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            Go Verified — $9/month
            <Badge className="bg-blue-600 hover:bg-blue-700 text-white text-xs">✓ Verified</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <ul className="space-y-2 text-sm">
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

          {!(profile?.verified) && (
            <div className="space-y-3 pt-1">
              {!profile && (
                <div className="space-y-2">
                  <Label htmlFor="builder-name">Your name</Label>
                  <Input
                    id="builder-name"
                    placeholder="Jane Smith"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    data-testid="input-builder-name"
                  />
                </div>
              )}
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleSubscribe}
                disabled={subscribePending || !email.trim()}
                data-testid="btn-builder-subscribe"
              >
                {subscribePending ? "Loading…" : "Subscribe $9/mo"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Cancel anytime. You'll be redirected to Stripe for secure payment.
              </p>
            </div>
          )}

          {profile?.verified && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
              <span className="font-semibold text-sm">✓ You are already a Verified Builder</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
