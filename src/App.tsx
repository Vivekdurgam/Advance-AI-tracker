import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TicketProvider } from "@/context/TicketContext";
import { AppLayout } from "@/components/AppLayout";
import { DashboardPage } from "@/pages/Dashboard";
import { SubmitTicketPage } from "@/pages/SubmitTicket";
import { TicketListPage } from "@/pages/TicketList";
import { DirectoryPage } from "@/pages/Directory";
import { AnalyticsPage } from "@/pages/Analytics";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <TicketProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppLayout>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/submit" element={<SubmitTicketPage />} />
              <Route path="/tickets" element={<TicketListPage />} />
              <Route path="/directory" element={<DirectoryPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </TicketProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
