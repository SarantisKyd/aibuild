import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function Home() {
  const stats = [
    { label: "Open jobs", value: "127" },
    { label: "Paid out", value: "$48k" },
    { label: "AI builders", value: "340" },
    { label: "Avg first bid", value: "4.8h" },
  ];

  const steps = [
    { num: "1", title: "Post your job", desc: "Describe what you need, set a budget and deadline. Takes 2 minutes." },
    { num: "2", title: "Builders bid", desc: "AI-capable builders see your job immediately and submit bids with portfolios." },
    { num: "3", title: "Pick the best fit", desc: "Compare bids, profiles, and past work. Hire with one click." },
    { num: "4", title: "Work delivered", desc: "Payment is held in escrow. Released only when you approve the work." },
  ];

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] pt-12 pb-24 max-w-7xl mx-auto px-4 md:px-8">
      <section className="flex flex-col items-center text-center space-y-6 max-w-3xl mx-auto mt-12 mb-20">
        <Badge variant="secondary" className="px-4 py-1.5 rounded-full text-sm font-medium" data-testid="badge-beta">
          Beta — Join the waitlist
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground leading-tight">
          The marketplace for <br />
          <span className="text-primary">AI-native projects</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
          Post a job with a deadline and budget. AI builders compete for it. The best tool wins. Fast, fair, and built for how AI work actually happens.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 pt-4 w-full sm:w-auto">
          <Link href="/post" data-testid="btn-hero-post">
            <Button size="lg" className="w-full sm:w-auto text-base">Post your first job</Button>
          </Link>
          <Link href="/board" data-testid="btn-hero-browse">
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-base">Browse open jobs</Button>
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-12 border-y border-border mb-20">
        {stats.map((stat, i) => (
          <div key={i} className="flex flex-col items-center justify-center space-y-1">
            <span className="text-3xl font-bold tracking-tight text-foreground">{stat.value}</span>
            <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
          </div>
        ))}
      </div>

      <section className="space-y-10">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="h-full bg-card/50 border-border">
                <CardContent className="p-6 space-y-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                    {step.num}
                  </div>
                  <h3 className="font-semibold text-xl">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.desc}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
