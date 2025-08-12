import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  List, 
  Users, 
  Bot, 
  BarChart3, 
  Folder, 
  Settings,
  User,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Listings", href: "/listings", icon: List },
  { name: "Brokers", href: "/brokers", icon: Users },
  { name: "Scraping", href: "/scraping", icon: Bot },
  { name: "KPIs", href: "/kpis", icon: BarChart3 },
  { name: "Files", href: "/files", icon: Folder },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col">
      {/* Logo/Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <TrendingUp className="text-white text-lg" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Broker Tracker</h1>
            <p className="text-xs text-gray-500">Deal Flow Management</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.name} href={item.href}>
              <div className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer",
                isActive 
                  ? "bg-primary text-white" 
                  : "text-gray-600 hover:bg-gray-100"
              )}>
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <User className="text-gray-600 text-sm" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Nils Howland</p>
            <p className="text-xs text-gray-500">Analyst</p>
          </div>
        </div>
      </div>
    </div>
  );
}
