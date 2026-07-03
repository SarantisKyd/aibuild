import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useCreateJob, getListJobsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api-url";

const ALL_SKILLS = [
  "Python", "JavaScript", "Claude API", "OpenAI API", "Replit",
  "Stripe", "Web scraping", "Automation", "Chatbot", "Data analysis", "No-code",
];

const CATEGORIES = [
  { label: "Web / App", value: "web" },
  { label: "Automation", value: "automation" },
  { label: "AI Agent", value: "agent" },
  { label: "Data", value: "data" },
];

export default function PostJob() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [budget, setBudget] = useState("");
  const [desc, setDesc] = useState("");
  const [deadline, setDeadline] = useState("");
  const [category, setCategory] = useState("");
  const [postedJobId, setPostedJobId] = useState<number | null>(null);
  const [featurePending, setFeaturePending] = useState(false);

  const createJobMutation = useCreateJob({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
        const checkoutUrl = (data as { checkoutUrl?: string | null }).checkoutUrl;
        if (checkoutUrl) {
          window.location.href = checkoutUrl;
        } else {
          const job = (data as { job?: { id: number } }).job;
          setPostedJobId(job?.id ?? (data as { id?: number }).id ?? null);
        }
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to post job. Please try again.", variant: "destructive" });
      },
    },
  });

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !title.trim() || !budget || !desc.trim() || !deadline || !category) {
      toast({ title: "Missing fields", description: "Please fill out all required fields.", variant: "destructive" });
      return;
    }
    localStorage.setItem("clientEmail", email.trim().toLowerCase());
    localStorage.setItem("userEmail", email.trim().toLowerCase());
    createJobMutation.mutate({
      data: {
        title: title.trim(),
        description: desc.trim(),
        budget: Number(budget),
        deadline,
        category: category as "web" | "automation" | "agent" | "data",
        skills: selectedSkills,
        urgent: false,
        isNew: true,
        clientEmail: email.trim().toLowerCase(),
      },
    });
  };

  const handleFeature = async () => {
    if (!postedJobId) return;
    setFeaturePending(true);
    try {
      const res = await fetch(apiUrl(`/api/jobs/${postedJobId}/feature`), { method: "POST" });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        toast({ title: "Error", description: data.error ?? "Could not start checkout.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Could not start checkout.", variant: "destructive" });
    } finally {
      setFeaturePending(false);
    }
  };

  if (postedJobId !== null) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 min-h-[calc(100vh-4rem)]">
        <div className="mb-8 text-center">
          <div className="text-4xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold tracking-tight">Job live!</h1>
          <p className="text-muted-foreground mt-2">Builders will bid shortly. Your payment is held safely — you control when it's released.</p>
          <p className="text-sm text-muted-foreground mt-3">💬 Builders can message you via the chat bubble — check it to stay responsive</p>
        </div>

        <Card className="border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20 mb-6">
          <CardContent className="pt-6 pb-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="text-3xl">⚡</div>
              <div className="flex-1 text-center sm:text-left">
                <p className="font-semibold text-base">Get 3× more bids — feature your job for $15</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Featured jobs appear at the top of the board with a gold badge, seen by every builder.
                </p>
              </div>
              <Button
                onClick={handleFeature}
                disabled={featurePending}
                className="bg-yellow-500 hover:bg-yellow-600 text-white shrink-0"
                data-testid="btn-feature-job"
              >
                {featurePending ? "Loading…" : "Feature for $15"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button variant="outline" onClick={() => setLocation("/board")}>
            Go to job board
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 min-h-[calc(100vh-4rem)]">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Post a job</h1>
        <p className="text-muted-foreground mt-2">Get bids from vetted AI builders in hours.</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2">
              <Label htmlFor="email">Your email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@email.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="input-post-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Job Title</Label>
              <Input
                id="title"
                placeholder="e.g. Build a Stripe-connected chatbot for my Shopify store"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                data-testid="input-post-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea
                id="desc"
                placeholder="Describe what you need built, required integrations, and any specific requirements..."
                rows={6}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                data-testid="input-post-desc"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="budget">Your budget (maximum $)</Label>
                <Input
                  id="budget"
                  type="number"
                  min="10"
                  placeholder="e.g. 500"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  data-testid="input-post-budget"
                />
                <p className="text-xs text-muted-foreground">Builders will bid at or below this amount</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline</Label>
                <Select value={deadline} onValueChange={setDeadline} required>
                  <SelectTrigger id="deadline" data-testid="select-post-deadline">
                    <SelectValue placeholder="Select deadline" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24 hours">24 hours</SelectItem>
                    <SelectItem value="3 days">3 days</SelectItem>
                    <SelectItem value="1 week">1 week</SelectItem>
                    <SelectItem value="2 weeks">2 weeks</SelectItem>
                    <SelectItem value="No rush">No rush</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger id="category" data-testid="select-post-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Required Skills / Tech Stack</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_SKILLS.map((skill) => (
                  <Badge
                    key={skill}
                    variant={selectedSkills.includes(skill) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/90 hover:text-primary-foreground py-1.5 px-3 text-sm"
                    onClick={() => toggleSkill(skill)}
                    data-testid={`badge-skill-${skill.toLowerCase().replace(/[^a-z0-9]/g, "")}`}
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t bg-muted/20 px-6 py-4">
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <span className="text-green-600 font-bold">✓</span> Your money is only released when you're happy with the work
            </p>
            <Button
              type="submit"
              size="lg"
              className="w-full sm:w-auto"
              disabled={createJobMutation.isPending}
              data-testid="btn-post-submit"
            >
              {createJobMutation.isPending ? "Posting…" : "Post job — funds protected until you approve"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
