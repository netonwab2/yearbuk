import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import DashboardHome from "@/pages/dashboard/home";
import SearchPage from "@/pages/dashboard/search-page";
import LibraryPage from "@/pages/dashboard/library";
import ProfilePage from "@/pages/dashboard/profile";
import MemoryUploadPage from "@/pages/dashboard/memory-upload";
import SchoolDashboardHome from "@/pages/school-dashboard-tabs/home";
import SchoolYearbooks from "@/pages/school-dashboard-tabs/yearbooks";
import SchoolMemories from "@/pages/school-dashboard-tabs/memories";
import SchoolOrders from "@/pages/school-dashboard-tabs/orders";
import SchoolSettingsTab from "@/pages/school-dashboard-tabs/settings";
import SchoolAlumni from "@/pages/school-dashboard-tabs/alumni";
import InstagramSchoolProfile from "@/pages/instagram-school-profile";
import { useQuery } from "@tanstack/react-query";

interface UnifiedDashboardProps {
  forceSchoolProfile?: string;
  initialTab?: "memories" | "yearbooks" | "alumni";
}

export default function UnifiedDashboard({ forceSchoolProfile, initialTab = "memories" }: UnifiedDashboardProps = {}) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("home");
  const [searchResetKey, setSearchResetKey] = useState(0);
  const searchTabRef = useRef<(() => void) | null>(null);
  const [forcedProfile, setForcedProfile] = useState<string | undefined>(forceSchoolProfile);
  const [profileTab, setProfileTab] = useState<"memories" | "yearbooks" | "alumni">(initialTab);

  // Determine user type
  const userType = user?.userType === "school" ? "school" : "viewer";

  // If forceSchoolProfile is provided, switch to search tab and load profile
  useEffect(() => {
    if (forceSchoolProfile) {
      setActiveTab("search");
      setForcedProfile(forceSchoolProfile);
      setProfileTab(initialTab);
      // Don't update location here, let the component handle it
    }
  }, [forceSchoolProfile, initialTab]);

  // Determine which tab to show based on URL
  useEffect(() => {
    // Handle path-based navigation
    if (location === "/") setActiveTab("home");
    else if (location === "/search") {
      setActiveTab("search");
      setForcedProfile(undefined);
    }
    else if (location === "/library") setActiveTab("library");
    else if (location === "/profile") setActiveTab("profile");
    else if (location === "/memory-upload") setActiveTab("memory-upload");
    else if (location === "/yearbooks") setActiveTab("yearbooks");
    else if (location === "/memories") setActiveTab("memories");
    else if (location === "/alumni") setActiveTab("alumni");
    else if (location === "/orders") setActiveTab("orders");
    else if (location === "/settings") setActiveTab("settings");
    else if (location === "/school-profile") setActiveTab("profile");
    else if (location.startsWith("/") && location !== "/") {
      // Dynamic school profile route
      const username = location.substring(1);
      if (!username.includes("/")) {
        setActiveTab("search");
        setForcedProfile(username);
      }
    }
  }, [location, userType]);

  // Handle search tab click reset
  const handleSearchTabReset = (resetFn: () => void) => {
    searchTabRef.current = resetFn;
  };

  // Fetch school data for profile tab (only for school users)
  const { data: schoolData } = useQuery<{ id: string; username: string }>({
    queryKey: ["/api/schools", user?.id],
    enabled: !!user && userType === "school" && activeTab === "profile",
  });

  // Render content based on user type and active tab
  const renderContent = () => {
    if (userType === "school") {
      switch (activeTab) {
        case "home":
          return <SchoolDashboardHome user={user} />;
        case "yearbooks":
          return <SchoolYearbooks />;
        case "memories":
          return <SchoolMemories />;
        case "alumni":
          return <SchoolAlumni />;
        case "orders":
          return <SchoolOrders user={user} />;
        case "settings":
          return <SchoolSettingsTab user={user} />;
        case "profile":
          return schoolData?.username ? (
            <InstagramSchoolProfile 
              schoolUsername={schoolData.username} 
              initialTab="memories"
              inDashboard={true}
            />
          ) : null;
        default:
          return <SchoolDashboardHome user={user} />;
      }
    } else {
      switch (activeTab) {
        case "home":
          return <DashboardHome />;
        case "search":
          return (
            <SearchPage 
              key={searchResetKey} 
              onRegisterReset={handleSearchTabReset}
              forceSchoolProfile={forcedProfile}
              initialProfileTab={profileTab}
            />
          );
        case "library":
          return <LibraryPage />;
        case "profile":
          return <ProfilePage />;
        case "memory-upload":
          return <MemoryUploadPage />;
        default:
          return <DashboardHome />;
      }
    }
  };

  return (
    <DashboardLayout 
      userType={userType}
      onSearchTabClick={() => {
        if (activeTab === "search" && searchTabRef.current) {
          searchTabRef.current();
          setForcedProfile(undefined);
        }
      }}
    >
      {renderContent()}
    </DashboardLayout>
  );
}
