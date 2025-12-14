import { useParams, useRoute } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import UnifiedDashboard from "@/pages/unified-dashboard";
import StandaloneSchoolProfileWrapper from "@/pages/standalone-school-profile-wrapper";
import LoadingSplash from "@/components/LoadingSplash";

export default function DynamicProfileHandler() {
  const { schoolUsername } = useParams();
  const { user, isLoading } = useAuth();

  // Check which tab we're on based on the URL
  const [matchMemories] = useRoute("/:schoolUsername/memories");
  const [matchYearbooks] = useRoute("/:schoolUsername/yearbooks");
  const [matchAlumni] = useRoute("/:schoolUsername/alumni");

  const initialTab = matchYearbooks ? "yearbooks" : matchAlumni ? "alumni" : "memories";

  if (isLoading) {
    return <LoadingSplash />;
  }

  if (user) {
    // For logged-in users, show within the unified dashboard
    return <UnifiedDashboard forceSchoolProfile={schoolUsername} initialTab={initialTab} />;
  } else {
    // For non-logged-in users, show standalone profile
    return <StandaloneSchoolProfileWrapper schoolUsername={schoolUsername!} initialTab={initialTab} />;
  }
}
