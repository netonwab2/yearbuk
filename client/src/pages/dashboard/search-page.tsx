import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AdvancedSearch from "@/components/ui/advanced-search";
import type { School, User } from "@shared/schema";
import InstagramSchoolProfile from "../instagram-school-profile";


interface SearchPageProps {
  onRegisterReset?: (resetFn: () => void) => void;
  forceSchoolProfile?: string;
  initialProfileTab?: "memories" | "yearbooks" | "alumni";
}

export default function SearchPage({ onRegisterReset, forceSchoolProfile, initialProfileTab = "memories" }: SearchPageProps = {}) {
  const [, setLocation] = useLocation();
  const [activeSearchView, setActiveSearchView] = useState<"results" | "profile">("results");
  const [selectedSchoolUsername, setSelectedSchoolUsername] = useState<string | null>(null);
  const [profileTab, setProfileTab] = useState<"memories" | "yearbooks" | "alumni">(initialProfileTab);
  const [user, setUser] = useState<User | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [resetAlumniFilters, setResetAlumniFilters] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  // Handle forceSchoolProfile prop
  useEffect(() => {
    if (forceSchoolProfile) {
      setSelectedSchoolUsername(forceSchoolProfile);
      setActiveSearchView("profile");
      setProfileTab(initialProfileTab);
    }
  }, [forceSchoolProfile, initialProfileTab]);

  // Register reset function with parent
  useEffect(() => {
    if (onRegisterReset) {
      onRegisterReset(() => {
        if (activeSearchView === "profile") {
          // Trigger alumni filters reset
          setResetAlumniFilters(true);
          // Reset back to false after a brief delay to allow the component to process the reset
          setTimeout(() => setResetAlumniFilters(false), 100);
          handleBackToSearch();
        }
      });
    }
  }, [onRegisterReset, activeSearchView]);

  const { data: schools = [] } = useQuery<School[]>({
    queryKey: ["/api/schools"],
    enabled: !!user,
  });

  // Handle school selection from search results
  const handleSchoolSelect = (schoolUsername: string) => {
    setSelectedSchoolUsername(schoolUsername);
    setActiveSearchView("profile");
    setLocation(`/${schoolUsername}`);
  };

  // Handle back to search results
  const handleBackToSearch = () => {
    setActiveSearchView("results");
    setSelectedSchoolUsername(null);
    setLocation("/search");
  };


  // Render search results view
  const renderSearchResults = () => (
    <div className="space-y-8 transition-opacity duration-300 ease-in-out">
      <Card className="bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl">
        <CardContent className="p-8">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Discover Schools</h2>
              <p className="text-blue-200">Search and explore schools to view yearbooks, memories, and connect with alumni</p>
            </div>
            
            <AdvancedSearch
              schools={schools}
              onSchoolClick={handleSchoolSelect}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render school profile view
  const renderSchoolProfile = () => {
    if (!selectedSchoolUsername) {
      return null;
    }

    return (
      <InstagramSchoolProfile 
        schoolUsername={selectedSchoolUsername}
        initialTab={profileTab}
        onBack={handleBackToSearch}
        showBackButton={true}
        resetAlumniFilters={resetAlumniFilters}
      />
    );
  };

  return (
    <>
      {activeSearchView === "results" && renderSearchResults()}
      {activeSearchView === "profile" && renderSchoolProfile()}

      {/* Login/Signup Modal for Interactive Actions */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent data-testid="dialog-login-prompt">
          <DialogHeader>
            <DialogTitle>Please log in or sign up</DialogTitle>
            <DialogDescription>
              Please log in or sign up to access this feature.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button
              onClick={() => setLocation('/login')}
              className="w-full"
              data-testid="button-modal-login"
            >
              Login
            </Button>
            <Button
              onClick={() => setLocation('/signup')}
              variant="outline"
              className="w-full"
              data-testid="button-modal-signup"
            >
              Sign Up
            </Button>
            <p className="text-sm text-muted-foreground text-center mt-2">
              Creating an account takes less than a minute.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
