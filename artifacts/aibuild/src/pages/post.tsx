import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const ALL_SKILLS = [
  "Python", "JavaScript", "Claude API", "OpenAI API", "Replit", 
  "Stripe", "Web scraping", "Automation", "Chatbot", "Data analysis", "No-code"
];

export default function PostJob() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [budget, setBudget] = useState("");
  const [desc, setDesc] = useState("");

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !budget || !desc.trim()) {
      toast({
        title: "Missing fields",
        description: "Please fill out all required fields.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "✓ Job posted!",
      description: "Builders will bid within hours.",
    });

    setTimeout(() => {
      setLocation("/board");
    }, 1500);
  };

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
                <Label htmlFor="budget">Budget ($)</Label>
                <Input 
                  id="budget" 
                  type="number" 
                  min="10" 
                  placeholder="e.g. 500" 
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  data-testid="input-post-budget"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline</Label>
                <Select required>
                  <SelectTrigger id="deadline" data-testid="select-post-deadline">
                    <SelectValue placeholder="Select deadline" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">24 hours</SelectItem>
                    <SelectItem value="3d">3 days</SelectItem>
                    <SelectItem value="1w">1 week</SelectItem>
                    <SelectItem value="2w">2 weeks</SelectItem>
                    <SelectItem value="none">No rush</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Required Skills / Tech Stack</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_SKILLS.map(skill => (
                  <Badge 
                    key={skill}
                    variant={selectedSkills.includes(skill) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/90 hover:text-primary-foreground py-1.5 px-3 text-sm"
                    onClick={() => toggleSkill(skill)}
                    data-testid={`badge-skill-${skill.toLowerCase().replace(/[^a-z0-9]/g, '')}`}
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t bg-muted/20 px-6 py-4">
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <span className="text-green-600 font-bold">✓</span> Payment held safely in escrow
            </p>
            <Button type="submit" size="lg" className="w-full sm:w-auto" data-testid="btn-post-submit">
              Post job & fund escrow
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
