import { LayoutDashboard, Building2, Shield, FileText, ChevronDown, GraduationCap, BarChart3, Target, Users, ShieldCheck, List, ClipboardCheck, TrendingUp } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const navigationStructure = [
  {
    title: "MSP Hub",
    url: "/dashboard", // Default route
    icon: LayoutDashboard,
    items: [
      { title: "AI Inventory", url: "/msp/ai-inventory" },
      { title: "AI Engagement", url: "/msp/ai-engagement" },
      { title: "Compliance", url: "/msp/compliance" },
      { title: "Policy Center", url: "/policies" },
    ],
  },
  {
    title: "Single Client",
    url: "/client", // Default route
    icon: Building2,
    items: [
      { title: "AI Control Center", url: "/client/ai-control", icon: ShieldCheck },
      { title: "AI Inventory", url: "/client/ai-inventory", icon: List },
      { title: "AI Compliance", url: "/client/compliance", icon: ClipboardCheck },
      { title: "AI Engagement", url: "/client/ai-engagement", icon: TrendingUp },
      { title: "Client-Facing Dashboard", url: "/client/client-facing" },
    ],
  },
];

const separatedSections = [
  {
    title: "Reports",
    url: "/reports/msp", // Default route
    icon: BarChart3,
    items: [
      { title: "MSP Reports", url: "/reports/msp" },
      { title: "Client Reports", url: "/reports/client" },
    ],
  },
];

export function AppSidebar() {
  // Force refresh - sidebar navigation structure
  const [openSections, setOpenSections] = useState<string[]>([]);
  const location = useLocation();

  // Keep parent sections open based on current route
  useEffect(() => {
    const currentPath = location.pathname;
    const sectionsToOpen: string[] = [];

    // Check which sections should be open based on current route
    [...navigationStructure, ...separatedSections].forEach((section) => {
      if (section.items) {
        const hasActiveItem = section.items.some(item => item.url === currentPath);
        if (hasActiveItem) {
          sectionsToOpen.push(section.title);
        }
      }
    });

    setOpenSections(prev => {
      const combined = [...prev, ...sectionsToOpen];
      return Array.from(new Set(combined)); // Remove duplicates
    });
  }, [location.pathname]);

  const toggleSection = (title: string) => {
    setOpenSections(prev => 
      prev.includes(title) 
        ? prev.filter(section => section !== title)
        : [...prev, title]
    );
  };

  const getNavClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "bg-sidebar-accent text-sidebar-primary-foreground border-l-2 border-cybercept-teal shadow-sm"
      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";

  return (
    <Sidebar className="border-r-0 shadow-lg">
      <SidebarHeader className="border-b border-sidebar-border p-6">
        <div className="flex items-center gap-3">
          <img 
            src="/lovable-uploads/42131043-90cb-4cf8-ab0d-edaef436b907.png" 
            alt="Cybercept Shield Logo" 
            className="h-10 w-10 object-contain"
          />
          <div>
            <h2 className="text-xl font-bold text-white uppercase tracking-wide">
              CYBERCEPT
            </h2>
            <p className="text-xs text-sidebar-foreground/70 leading-tight">
              MSP AI Governance<br />& Security Platform
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-6">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {navigationStructure.map((section) => (
                <SidebarMenuItem key={section.title}>
                  <Collapsible 
                    open={openSections.includes(section.title)} 
                    onOpenChange={() => toggleSection(section.title)}
                  >
                    <div className="flex items-center">
                      {section.url ? (
                        <SidebarMenuButton asChild className="h-12 rounded-xl flex-1">
                          <NavLink to={section.url} className={getNavClass}>
                            <section.icon className="h-5 w-5 flex-shrink-0" />
                            {section.title === "Reports" ? (
                              <div className="flex flex-col items-start">
                                <span className="font-medium whitespace-normal text-left leading-tight break-words">{section.title}</span>
                                <span className="text-xs italic text-muted-foreground">coming soon</span>
                              </div>
                            ) : (
                              <span className="font-medium whitespace-normal text-left leading-tight break-words">{section.title}</span>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                        ) : (
                          <SidebarMenuButton className="h-12 rounded-xl flex-1">
                            <section.icon className="h-5 w-5 flex-shrink-0" />
                            <span className="font-medium whitespace-normal text-left leading-tight break-words">{section.title}</span>
                          </SidebarMenuButton>
                        )}
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="h-12 w-8 rounded-xl ml-2">
                          <ChevronDown className={`h-4 w-4 transition-transform ${
                            openSections.includes(section.title) ? "rotate-180" : ""
                          }`} />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent className="pl-6 mt-2">
                      <SidebarMenu className="space-y-1">
                        {section.items.map((item) => (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild className="h-10 rounded-lg">
                              <NavLink to={item.url} className={getNavClass}>
                                {item.icon && <item.icon className="h-4 w-4 flex-shrink-0" />}
                                <span className="text-sm whitespace-normal text-left leading-tight break-words">{item.title}</span>
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
            
            <SidebarSeparator className="my-6 bg-white/20 h-px" />
            
            {/* Separated sections - Reports and Education Hub */}
            <SidebarMenu className="space-y-2">
              {separatedSections.map((section) => (
                <SidebarMenuItem key={section.title}>
                  <Collapsible 
                    open={openSections.includes(section.title)} 
                    onOpenChange={() => toggleSection(section.title)}
                  >
                    <div className="flex items-center">
                      <SidebarMenuButton asChild className="h-12 rounded-xl flex-1">
                        <NavLink to={section.url} className={getNavClass}>
                          <section.icon className="h-5 w-5 flex-shrink-0" />
                          {section.title === "Reports" ? (
                            <div className="flex flex-col items-start">
                              <span className="font-medium whitespace-normal text-left leading-tight break-words">{section.title}</span>
                              <span className="text-xs italic text-muted-foreground">coming soon</span>
                            </div>
                          ) : (
                            <span className="font-medium whitespace-normal text-left leading-tight break-words">{section.title}</span>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="h-12 w-8 rounded-xl ml-2">
                          <ChevronDown className={`h-4 w-4 transition-transform ${
                            openSections.includes(section.title) ? "rotate-180" : ""
                          }`} />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent className="pl-6 mt-2">
                      <SidebarMenu className="space-y-1">
                        {section.items.map((item) => (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild className="h-10 rounded-lg">
                              <NavLink to={item.url} className={getNavClass}>
                                <span className="text-sm whitespace-normal text-left leading-tight break-words">{item.title}</span>
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenuItem>
              ))}
              
              {/* Education Hub */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-12 rounded-xl">
                  <NavLink to="/education" className={getNavClass}>
                    <GraduationCap className="h-5 w-5" />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Education Hub</span>
                      <span className="text-xs italic text-muted-foreground">coming soon</span>
                    </div>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}