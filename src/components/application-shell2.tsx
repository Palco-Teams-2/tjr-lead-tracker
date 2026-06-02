"use client";

import {
  ChevronRight,
  ChevronsUpDown,
  HelpCircle,
  PanelLeftIcon,
  Route,
  Settings,
} from "lucide-react";
import * as React from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

type NavItem = {
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  href: string;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const sidebarData = {
  navGroups: [
    {
      title: "Home",
      items: [{ label: "Lead Tracker", icon: Route, href: "/" }],
    },
  ] as NavGroup[],
  footerGroup: {
    title: "Support",
    items: [
      { label: "Help Center", icon: HelpCircle, href: "#" },
      { label: "Settings", icon: Settings, href: "#" },
    ],
  } as NavGroup,
};

const NavMenuItem = ({ item }: { item: NavItem }) => {
  const Icon = item.icon;
  const pathname = usePathname();
  const isActive = pathname === item.href;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
        <a href={item.href}>
          <Icon className="size-4" />
          <span className="ml-1 text-[0.95em]">{item.label}</span>
        </a>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

const WorkspacePicker = () => (
  <SidebarMenu>
    <SidebarMenuItem>
      <SidebarMenuButton size="lg" tooltip="TJR Trades" className="cursor-default">
        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-300 via-blue-400 to-indigo-500">
          <span className="text-xs font-bold text-white">T</span>
        </div>
        <div className="grid flex-1 text-left text-sm leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-semibold">TJR Trades</span>
            <span className="inline-flex items-center rounded-md bg-neutral-800 px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none text-white">
              Admin
            </span>
          </div>
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  </SidebarMenu>
);

const NavUser = () => (
  <SidebarMenu>
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            size="lg"
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-400 via-orange-400 to-amber-400">
              <span className="text-xs font-bold text-white">PL</span>
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">Palco Labs</span>
              <span className="truncate text-xs text-muted-foreground">Lead Tracker</span>
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
          side="bottom"
          align="end"
          sideOffset={4}
        >
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-400 via-orange-400 to-amber-400">
                <span className="text-xs font-bold text-white">PL</span>
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Palco Labs</span>
                <span className="truncate text-xs text-muted-foreground">tjr_mm6</span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>Account</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  </SidebarMenu>
);

const CollapseSidebarButton = () => {
  const { toggleSidebar, state } = useSidebar();
  return (
    <SidebarMenuButton
      onClick={toggleSidebar}
      tooltip="Toggle Sidebar"
      className={state === "expanded" ? "justify-end" : ""}
    >
      <PanelLeftIcon className="size-4" />
    </SidebarMenuButton>
  );
};

const AppSidebar = ({ ...props }: React.ComponentProps<typeof Sidebar>) => (
  <Sidebar variant="inset" collapsible="icon" {...props}>
    <SidebarHeader>
      <div className="rounded-lg border border-gray-200 bg-gray-50/50 shadow-sm">
        <WorkspacePicker />
      </div>
    </SidebarHeader>
    <SidebarContent className="overflow-hidden">
      <ScrollArea className="min-h-0 flex-1">
        {sidebarData.navGroups.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <NavMenuItem key={item.label} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </ScrollArea>
    </SidebarContent>
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <CollapseSidebarButton />
        </SidebarMenuItem>
      </SidebarMenu>
      <div className="rounded-lg border border-gray-200 bg-gray-50/50 shadow-sm">
        <NavUser />
      </div>
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
);

interface ApplicationShell2Props {
  className?: string;
  children?: React.ReactNode;
}

export function ApplicationShell2({ className, children }: ApplicationShell2Props) {
  return (
    <SidebarProvider className={cn(className)}>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 md:hidden">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <div className="flex items-center gap-2">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-300 via-blue-400 to-indigo-500">
              <span className="text-xs font-bold text-white">T</span>
            </div>
            <span className="font-semibold">TJR Trades</span>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-2 p-2">
          <div className="min-h-[100vh] flex-1 rounded-xl bg-white p-6 md:min-h-min">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
