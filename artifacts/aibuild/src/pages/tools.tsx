import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { useListTools } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListToolsQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export default function Tools() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: tools = [], isLoading } = useListTools();

  const [listOpen, setListOpen] = useState(false);
  const [listPending, setListPending] = useState(false);
  const [formEmoji, setFormEmoji] = useState("");
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formBilling, setFormBilling] = useState<"one_off" | "monthly" | "">("");
  const [formEmail, setFormEmail] = useState("");

  const resetForm = () => {
    setFormEmoji(""); setFormName(""); setFormDesc("");
    setFormPrice(""); setFormBilling(""); setFormEmail("");
  };

  const handleList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBilling) return;
    setListPending(true);
    try {
      const res = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emoji: formEmoji || "🔧",
          name: formName,
          description: formDesc,
          price: Math.round(Number(formPrice) * 100),
          billingType: formBilling,
          builderEmail: formEmail,
        }),
      });
      if (res.ok) {
        toast({ title: "Tool listed!", description: `${formName} is now live on the marketplace.` });
        queryClient.invalidateQueries({ queryKey: getListToolsQueryKey() });
        setListOpen(false);
        resetForm();
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.error ?? "Could not list tool.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Could not list tool.", variant: "destructive" });
    } finally {
      setListPending(false);
    }
  };

  const handleBuy = async (toolId: number, toolName: string) => {
    try {
      const res = await fetch(`/api/tools/${toolId}/buy`, { method: "POST" });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        toast({ title: "Error", description: data.error ?? "Could not start checkout.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: `Could not start checkout for ${toolName}.`, variant: "destructive" });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 min-h-[calc(100vh-4rem)]">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight">Tool Marketplace</h1>
          <p className="text-muted-foreground text-lg">
            Ready-to-use AI tools and agents built by top creators on the platform.
          </p>
        </div>
        <Button onClick={() => setListOpen(true)} data-testid="btn-list-tool">
          + List your tool
        </Button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-72 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool, i) => (
          <motion.div
            key={tool.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Card className="h-full flex flex-col overflow-hidden hover:shadow-md transition-shadow" data-testid={`card-tool-${tool.id}`}>
              <div
                className="h-32 flex items-center justify-center text-5xl"
                style={{ backgroundColor: tool.bgColor }}
              >
                {tool.emoji}
              </div>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{tool.name}</CardTitle>
                  <Badge variant="secondary" className="font-mono">{tool.price}</Badge>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <span className="text-yellow-500">★</span>
                    <span className="font-medium text-foreground">{tool.rating}</span>
                    <span>({tool.reviews} reviews)</span>
                  </div>
                  {tool.sales > 0 && (
                    <span className="text-xs text-muted-foreground">{tool.sales} sales</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <CardDescription className="text-base text-foreground/80 leading-relaxed">
                  {tool.description}
                </CardDescription>
              </CardContent>
              <CardFooter className="flex gap-2">
                {tool.priceAmount ? (
                  <Button
                    className="flex-1"
                    onClick={() => handleBuy(tool.id, tool.name)}
                    data-testid={`btn-buy-${tool.id}`}
                  >
                    {tool.billingType === "monthly" ? "Subscribe" : "Buy"}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => toast({ title: `Opening ${tool.name}…`, description: "Starting your 7-day free trial." })}
                    data-testid={`btn-try-${tool.id}`}
                  >
                    Try free for 7 days
                  </Button>
                )}
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* List your tool modal */}
      <Dialog open={listOpen} onOpenChange={(o) => { setListOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-lg" data-testid="modal-list-tool">
          <DialogHeader>
            <DialogTitle>List your tool</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleList} className="space-y-4 pt-2">
            <div className="grid grid-cols-[5rem_1fr] gap-3">
              <div className="space-y-2">
                <Label htmlFor="tool-emoji">Emoji</Label>
                <Input
                  id="tool-emoji"
                  placeholder="🤖"
                  value={formEmoji}
                  onChange={(e) => setFormEmoji(e.target.value)}
                  className="text-center text-2xl"
                  data-testid="input-tool-emoji"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tool-name">Tool name</Label>
                <Input
                  id="tool-name"
                  placeholder="Lead Qualifier Bot"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  data-testid="input-tool-name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tool-desc">Description</Label>
              <Textarea
                id="tool-desc"
                placeholder="What does it do? Who is it for?"
                rows={3}
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                required
                data-testid="input-tool-desc"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="tool-price">Price ($)</Label>
                <Input
                  id="tool-price"
                  type="number"
                  min="0.50"
                  step="0.01"
                  placeholder="29.00"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  required
                  data-testid="input-tool-price"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tool-billing">Billing type</Label>
                <Select
                  value={formBilling}
                  onValueChange={(v) => setFormBilling(v as "one_off" | "monthly")}
                  required
                >
                  <SelectTrigger id="tool-billing" data-testid="select-tool-billing">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_off">One-off</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tool-email">Your email</Label>
              <Input
                id="tool-email"
                type="email"
                placeholder="you@example.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                required
                data-testid="input-tool-email"
              />
              <p className="text-xs text-muted-foreground">
                Revenue share (75%) goes to your connected Stripe account on file.
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={listPending || !formBilling}>
              {listPending ? "Listing…" : "List tool"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
