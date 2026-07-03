import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function BuilderPage() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [pending, setPending] = useState(false);

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
        localStorage.setItem("builderEmail", email.trim().toLowerCase());
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

    </div>
  );
}
