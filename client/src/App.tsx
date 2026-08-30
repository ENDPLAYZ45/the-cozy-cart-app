/** Quiet Signal app shell: a light editorial foundation with clear, accessible routes. */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import AdminCatalog from "./pages/AdminCatalog";
import AdminAnalytics from "./pages/AdminAnalytics";
import Shop from "./pages/Shop";
import Categories from "./pages/Categories";
import CategoryDetail from "./pages/CategoryDetail";
import Fashion from "./pages/Fashion";
import Deals from "./pages/Deals";
import Cart from "./pages/Cart";
import { CartProvider } from "./contexts/CartContext";
import StorefrontAnalytics from "./components/StorefrontAnalytics";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/shop" component={Shop} />
      <Route path="/categories" component={Categories} />
      <Route path="/category/:name" component={CategoryDetail} />
      <Route path="/fashion" component={Fashion} />
      <Route path="/deals" component={Deals} />
      <Route path="/cart" component={Cart} />
      <Route path="/admin" component={AdminCatalog} />
      <Route path="/admin/analytics" component={AdminAnalytics} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
            <CartProvider>
              <Toaster richColors position="top-right" />
              <StorefrontAnalytics />
              <Router />
          </CartProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
