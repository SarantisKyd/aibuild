import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NavBar } from "@/components/NavBar";

import Home from "@/pages/home";
import Board from "@/pages/board";
import PostJob from "@/pages/post";
import Tools from "@/pages/tools";
import Builder from "@/pages/builder";
import ToolAccess from "@/pages/tool-access";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/board" component={Board} />
      <Route path="/post" component={PostJob} />
      <Route path="/tools" component={Tools} />
      <Route path="/builder" component={Builder} />
      <Route path="/tool-access" component={ToolAccess} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <div className="min-h-screen bg-background font-sans text-foreground">
            <NavBar />
            <main>
              <Router />
            </main>
          </div>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
