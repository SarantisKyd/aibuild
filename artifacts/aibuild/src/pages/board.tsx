import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const JOBS = [
  { id:1, title:"Build a lead qualification chatbot for my real estate agency", budget:280, deadline:"3 days", bids:7, cat:"agent", urgent:true, isNew:false, desc:"I need a chatbot that asks leads a series of qualification questions (budget, timeline, location preference) and scores them 1–10. Should integrate with my CRM via webhook. Built with Claude API preferred.", skills:["Claude API","JavaScript","Chatbot"] },
  { id:2, title:"Scrape 500 B2B company emails from LinkedIn + enrich with AI", budget:120, deadline:"24 hours", bids:12, cat:"data", urgent:true, isNew:false, desc:"Need a Python script that scrapes company data from LinkedIn Sales Navigator (I'll provide my credentials/cookies) and uses AI to guess and verify the decision-maker emails. Output as CSV.", skills:["Python","Web scraping","Data analysis"] },
  { id:3, title:"AI-powered invoice parser — PDF to structured JSON", budget:350, deadline:"1 week", bids:4, cat:"automation", urgent:false, isNew:true, desc:"I receive hundreds of invoices as PDFs monthly. Need a tool that extracts vendor name, date, line items, totals, and tax into clean JSON. Must handle varied PDF layouts. API or web UI preferred.", skills:["Python","Claude API","Automation"] },
  { id:4, title:"Replit app: auto-post Twitter/X threads from a Google Sheet", budget:90, deadline:"3 days", bids:9, cat:"automation", urgent:false, isNew:true, desc:"Simple tool: reads rows from a Google Sheet (each row = one thread), schedules and posts to Twitter/X via API at times I specify. Should handle images in a separate column.", skills:["Replit","JavaScript","Automation"] },
  { id:5, title:"Build a landing page with AI-generated copy for my SaaS", budget:200, deadline:"1 week", bids:6, cat:"web", urgent:false, isNew:false, desc:"Need a clean, converting landing page. The AI should auto-generate headline variations and body copy based on my product description. Built in HTML/CSS or React, deployed on Vercel.", skills:["JavaScript","Claude API","No-code"] },
  { id:6, title:"Customer support AI agent — integrates with Intercom", budget:500, deadline:"2 weeks", bids:3, cat:"agent", urgent:false, isNew:true, desc:"Build an AI agent that handles tier-1 support tickets in Intercom. Should answer FAQs, escalate complex issues to humans, and log resolutions. Must be trained on our help docs.", skills:["Claude API","Python","Chatbot","Automation"] },
  { id:7, title:"Python script: monitor Amazon prices and alert me via Telegram", budget:75, deadline:"24 hours", bids:15, cat:"automation", urgent:true, isNew:false, desc:"Simple price tracker. Give it a list of Amazon product URLs, check prices every hour, send me a Telegram message when price drops below a threshold I set per product.", skills:["Python","Automation"] },
  { id:8, title:"AI dashboard that summarises my weekly Notion notes", budget:160, deadline:"1 week", bids:5, cat:"data", urgent:false, isNew:true, desc:"Pull notes from my Notion workspace via API, summarise them weekly using Claude, and display in a clean read-only dashboard (web app). Should highlight action items and decisions.", skills:["Claude API","Python","Replit"] },
];

const FILTERS = ["All", "Web / App", "Automation", "AI Agent", "Data"];

export default function Board() {
  const { toast } = useToast();
  const [activeFilter, setActiveFilter] = useState("All");

  const filteredJobs = JOBS.filter(job => {
    if (activeFilter === "All") return true;
    if (activeFilter === "Web / App" && job.cat === "web") return true;
    if (activeFilter === "Automation" && job.cat === "automation") return true;
    if (activeFilter === "AI Agent" && job.cat === "agent") return true;
    if (activeFilter === "Data" && job.cat === "data") return true;
    return false;
  });

  const handleSubmitBid = (e: React.FormEvent, jobId: number) => {
    e.preventDefault();
    toast({
      title: "Bid submitted successfully",
      description: "The client will review your bid shortly.",
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 min-h-[calc(100vh-4rem)]">
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Open jobs</h1>
            <p className="text-muted-foreground mt-1">{JOBS.length} jobs available</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 pt-2">
          {FILTERS.map(f => (
            <Badge 
              key={f} 
              variant={activeFilter === f ? "default" : "secondary"}
              className="cursor-pointer px-4 py-1.5 text-sm"
              onClick={() => setActiveFilter(f)}
              data-testid={`filter-${f.toLowerCase().replace(/[^a-z0-9]/g, '')}`}
            >
              {f}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredJobs.map((job, i) => (
          <Dialog key={job.id}>
            <DialogTrigger asChild>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="cursor-pointer hover:border-primary/50 transition-colors">
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
                          {job.desc}
                        </CardDescription>
                      </div>
                      <div className="text-right shrink-0 space-y-2">
                        <div className="text-2xl font-bold text-green-600">${job.budget}</div>
                        <div className="text-sm text-muted-foreground">{job.bids} bids</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
                      {job.skills.map(skill => (
                        <Badge key={skill} variant="secondary" className="font-normal text-xs">{skill}</Badge>
                      ))}
                    </div>
                  </CardHeader>
                </Card>
              </motion.div>
            </DialogTrigger>
            <DialogContent className="max-w-2xl" data-testid={`modal-job-${job.id}`}>
              <DialogHeader>
                <div className="flex justify-between items-start gap-4 pr-6">
                  <div>
                    <DialogTitle className="text-2xl leading-tight mb-2">{job.title}</DialogTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{job.deadline}</Badge>
                      <span className="text-sm text-muted-foreground">{job.bids} bids</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-green-600">${job.budget}</div>
                </div>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Project Description</h3>
                  <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">{job.desc}</p>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map(skill => (
                      <Badge key={skill} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold text-lg mb-4">Submit your bid</h3>
                  <form onSubmit={(e) => handleSubmitBid(e, job.id)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`price-${job.id}`}>Your price ($)</Label>
                        <Input id={`price-${job.id}`} type="number" required min="10" placeholder="e.g. 200" data-testid="input-bid-price" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`time-${job.id}`}>Delivery time</Label>
                        <Select required>
                          <SelectTrigger id={`time-${job.id}`} data-testid="select-bid-time">
                            <SelectValue placeholder="Select timeframe" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="24h">24 hours</SelectItem>
                            <SelectItem value="3d">3 days</SelectItem>
                            <SelectItem value="1w">1 week</SelectItem>
                            <SelectItem value="2w">2 weeks</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`note-${job.id}`}>Cover note</Label>
                      <Textarea 
                        id={`note-${job.id}`} 
                        required 
                        placeholder="Briefly explain how you'll build this and link relevant past work..." 
                        rows={4}
                        data-testid="input-bid-note"
                      />
                    </div>
                    <Button type="submit" className="w-full" data-testid="btn-submit-bid">Submit Bid</Button>
                  </form>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        ))}
      </div>
    </div>
  );
}
