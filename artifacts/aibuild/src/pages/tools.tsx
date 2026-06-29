import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useListTools } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export default function Tools() {
  const { toast } = useToast();
  const { data: tools = [], isLoading } = useListTools();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 min-h-[calc(100vh-4rem)]">
      <div className="space-y-4 max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight">Tool Marketplace</h1>
        <p className="text-muted-foreground text-lg">
          Ready-to-use AI tools and agents built by top creators on the platform. Plug them straight into your workflow.
        </p>
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
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                  <span className="text-yellow-500">★</span>
                  <span className="font-medium text-foreground">{tool.rating}</span>
                  <span>({tool.reviews} reviews)</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <CardDescription className="text-base text-foreground/80 leading-relaxed">
                  {tool.description}
                </CardDescription>
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => toast({ title: `Opening ${tool.name}…`, description: "Starting your 7-day free trial." })}
                  data-testid={`btn-try-${tool.id}`}
                >
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
