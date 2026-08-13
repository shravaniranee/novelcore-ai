'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  LayoutDashboard,
  PlusCircle,
  Lightbulb,
  Search,
  Target,
  FileText,
  Scale,
  ClipboardList,
  Settings,
  Bell,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DemoProvider, useDemo } from '@/lib/demo-context';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { RotateCcw } from 'lucide-react';

const navItems = [
  { href: '/app', label: 'Overview', icon: LayoutDashboard },
  { href: '/app/new', label: 'New Analysis', icon: PlusCircle },
  { href: '/app/analysis', label: 'My Ideas', icon: Lightbulb },
  { href: '/app/prior-art', label: 'Prior Art', icon: Search },
  { href: '/app/innovation', label: 'Innovation Gaps', icon: Target },
  { href: '/app/patent', label: 'Patent Workspace', icon: FileText },
  { href: '/app/examiner', label: 'Examiner Review', icon: Scale },
  { href: '/app/report', label: 'Reports', icon: ClipboardList },
];

function SidebarContent() {
  const pathname = usePathname();
  const { resetDemo } = useDemo();
  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <Link href="/app" className="flex h-16 items-center gap-2 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-semibold tracking-tight text-foreground">
          NovelCore<span className="text-primary"> AI</span>
        </span>
      </Link>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                <item.icon className={cn('h-4 w-4', active && 'text-primary')} />
                {item.label}
                {active && (
                  <ChevronRight className="ml-auto h-4 w-4 text-primary" />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Reset + Settings */}
      <div className="border-t border-border/60 px-3 py-4">
        <button
          onClick={() => {
            resetDemo();
            toast.success('Demo reset.', {
              description: 'All scores and progress restored to initial state.',
            });
          }}
          className="mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <RotateCcw className="h-4 w-4" />
          Reset Demo
        </button>
        <Link href="/app">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
            <Settings className="h-4 w-4" />
            Settings
          </div>
        </Link>
      </div>
    </div>
  );
}

function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-muted-foreground hover:bg-secondary lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden items-center gap-2 sm:flex">
          <Badge variant="secondary" className="gap-1 border-warning/30 bg-warning/10 text-xs font-medium text-warning">
            <span className="h-1.5 w-1.5 rounded-full bg-warning" />
            Demo Mode
          </Badge>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden items-center rounded-lg border border-border bg-secondary/50 px-3 py-1.5 md:flex">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            placeholder="Search ideas, patents..."
            className="ml-2 w-48 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="ml-2 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
            ⌘K
          </kbd>
        </div>
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="relative rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
                <Bell className="h-4 w-4" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Notifications</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Avatar className="h-8 w-8 border border-border">
          <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-xs font-semibold text-white">
            IN
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <DemoProvider>
      <div className="min-h-screen bg-background">
        {/* Desktop sidebar */}
        <aside className="fixed left-0 top-0 z-30 hidden h-screen w-60 border-r border-border/60 bg-card lg:block">
          <SidebarContent />
        </aside>

        {/* Mobile sidebar */}
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileOpen(false)}
                className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
              />
              <motion.aside
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed left-0 top-0 z-50 h-screen w-64 border-r border-border bg-card lg:hidden"
              >
                <button
                  onClick={() => setMobileOpen(false)}
                  className="absolute right-3 top-5 rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"
                >
                  <X className="h-4 w-4" />
                </button>
                <SidebarContent />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main content */}
        <div className="lg:pl-60">
          <TopBar onMenuClick={() => setMobileOpen(true)} />
          <main className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
        <Toaster position="bottom-right" richColors />
      </div>
    </DemoProvider>
  );
}
