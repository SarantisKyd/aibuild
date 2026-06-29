import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const TOOLS = [
  { name:"ColdMailGPT", emoji:"✉️", desc:"Generates personalised cold email sequences from a LinkedIn URL. Output: 5-email drip, subject lines, follow-ups.", price:"$29/mo", rating:"4.8", reviews:34, bg:"#e8f4fd" },
  { name:"InvoiceAI", emoji:"📄", desc:"Drag-drop PDF invoices → structured JSON or CSV. Handles 50+ layouts. Webhook output supported.", price:"$19/mo", rating:"4.9", reviews:61, bg:"#f0fdf4" },
  { name:"LeadScorer", emoji:"🎯", desc:"Embed on any site. Asks 6 questions, scores leads 1–10, sends scored leads to your CRM via webhook.", price:"$49/mo", rating:"4.7", reviews:22, bg:"#fdf4ff" },
  { name:"SheetBot", emoji:"📊", desc:"Connect to Google Sheets, ask questions in plain English. Generates charts and summaries instantly.", price:"$15/mo", rating:"4.6", reviews:45, bg:"#fffbeb" },
  { name:"SupportGenie", emoji:"🤖", desc:"Paste your help docs, get an embeddable support widget. Answers Tier 1 questions, escalates the rest.", price:"$39/mo", rating:"4.8", reviews:18, bg:"#fef2f2" },
  { name:"SEO Autopilot", emoji:"🔍", desc:"Give it a keyword, get a full SEO-optimised blog post with internal link suggestions and meta tags.", price:"$25/mo", rating:"4.5", reviews:77, bg:"#f0fdf4" },
];

export default function Tools() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 min-h-[calc(100vh-4rem)]">
      <div className="space-y-4 max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight">Tool Marketplace</h1>
        <p className="text-muted-foreground text-lg">
          Ready-to-use AI tools and agents built by top creators on the platform. Plug them straight into your workflow.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {TOOLS.map((tool, i) => (
          <motion.div
            key={tool.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="h-full flex flex-col overflow-hidden hover:shadow-md transition-shadow">
              <div 
                className="h-32 flex items-center justify-center text-5xl"
                style={{ backgroundColor: tool.bg }}
              >
                {tool.emoji}
              </div>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{tool.name}</CardTitle>
                  <Badge variant="secondary" className="font-mono">{tool.price}</Badge>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                  <span className="text-yellow-500">★</span>
                  <span className="font-medium text-foreground">{tool.rating}</span>
                  <span>({tool.reviews} reviews)</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <CardDescription className="text-base text-foreground/80 leading-relaxed">
                  {tool.desc}
                </CardDescription>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" data-testid={`btn-try-${tool.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`}>
                  Try free for 7 days
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
