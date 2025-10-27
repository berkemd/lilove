import { Button } from "@/components/ui/button";
import { Moon, Sun, Brain, Sparkles } from "lucide-react";
import { useState } from "react";

export default function Header() {
  const [darkMode, setDarkMode] = useState(true);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
    console.log('Theme toggled:', darkMode ? 'light' : 'dark');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-sidebar-border bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Brain className="h-8 w-8 text-sidebar-primary animate-pulse-slow" />
            <Sparkles className="h-4 w-4 text-sidebar-accent absolute -top-1 -right-1 animate-glow" />
          </div>
          <h1 className="text-2xl font-display font-bold bg-gradient-to-r from-sidebar-primary to-sidebar-accent bg-clip-text text-transparent">
            LiLove
          </h1>
        </div>

        <nav className="hidden md:flex items-center space-x-8">
          <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
            Features
          </a>
          <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
            Pricing
          </a>
          <a href="#coaching" className="text-muted-foreground hover:text-foreground transition-colors">
            Coaching
          </a>
        </nav>

        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="hover-elevate"
            data-testid="button-theme-toggle"
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          
          <Button 
            variant="default" 
            className="bg-gradient-to-r from-sidebar-primary to-sidebar-accent hover-elevate"
            data-testid="button-get-started"
          >
            Get Started
          </Button>
        </div>
      </div>
    </header>
  );
}