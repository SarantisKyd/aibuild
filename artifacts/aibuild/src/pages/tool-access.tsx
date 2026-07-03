import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion } from "framer-motion";
import { apiUrl } from "@/lib/api-url";

interface Tool {
  id: number;
  name: string;
  emoji: string;
  description: string;
  price: string;
  billingType: string | null;
  bgColor: string;
}

export default function ToolAccess() {
  const params = new URLSearchParams(window.location.search);
  const toolId = params.get("id");

  const [tool, setTool] = useState<Tool | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!toolId) {
      setError("No tool specified.");
      setLoading(false);
      return;
    }
    fetch(apiUrl(`/api/tools/${toolId}`))
      .then((r) => {
        if (!r.ok) throw new Error("Tool not found");
        return r.json() as Promise<Tool>;
      })
      .then((data) => {
        setTool(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load tool details. Please contact support.");
        setLoading(false);
      });
  }, [toolId]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">
        Loading your tool…
      </div>
    );
  }

  if (error || !tool) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-8 pb-8 text-center">
            <p className="text-lg font-semibold text-destructive mb-2">Something went wrong</p>
            <p className="text-muted-foreground">{error ?? "Tool not found."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-lg w-full"
      >
        <Card className="shadow-lg border-0">
          <div
            className="rounded-t-xl py-10 flex flex-col items-center gap-3"
            style={{ backgroundColor: tool.bgColor }}
          >
            <span className="text-6xl">{tool.emoji}</span>
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-green-700 mb-1">
                ✓ Payment confirmed
              </p>
              <h1 className="text-2xl font-bold text-gray-900">{tool.name}</h1>
            </div>
          </div>

          <CardHeader className="pb-2">
            <CardTitle className="text-lg">You now have access</CardTitle>
            <CardDescription>{tool.description}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="rounded-lg bg-muted p-4 text-sm space-y-2">
              <p className="font-medium text-foreground">How to access your tool</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Check your email for a confirmation and access link from the builder.</li>
                <li>If you don't see it within a few minutes, check your spam folder.</li>
                <li>Still nothing? Use the chat bubble in the bottom-right to get help.</li>
              </ol>
            </div>

            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Bookmark this page</p>
              <p>
                Save this URL so you can return here anytime to find your access instructions and
                support contact.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => (window.location.href = "/tools")}
              >
                Browse more tools
              </Button>
              <Button
                className="flex-1"
                onClick={() => (window.location.href = "/board")}
              >
                View job board
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
