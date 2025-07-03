import { getCurrentUser } from "@/actions/onboarding";
import { redirect } from "next/navigation";

export const metadata = {
  title: "DOCTOR a PATIENT Onboarding - MediMeet",
  description: "Complete your profile to get started with DOCTO",
};

export default async function OnboardingLayout({ children }) {
  // Get complete user profile
  const user = await getCurrentUser();

  // Redirect users who have already completed onboarding
  if (user) {
    if (user.role === "PATIENT") {
      redirect("/doctors");
    } else if (user.role === "DOCTOR") {
      // Check verification status for doctors
      if (user.verificationStatus === "VERIFIED") {
        redirect("/doctor");
      } else {
        redirect("/doctor/verification");
      }
    } else if (user.role === "ADMIN") {
      redirect("/admin");
    }
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        {/* Modern header with background and shadow */}
        <div className="text-center mb-8 bg-emerald-950/80 rounded-xl shadow-lg py-8 px-4 border border-emerald-900/40">
          <h1 className="text-4xl font-extrabold text-emerald-300 mb-2 tracking-tight drop-shadow-lg">
            Welcome to MediMeet
          </h1>
          <p className="text-muted-foreground text-lg">
            Tell us how you want to use the platform
          </p>
        </div>

        {/* Card style for onboarding content */}
        <div className="bg-zinc-900/80 rounded-xl shadow-lg p-6 border border-zinc-800">
          {children}
        </div>
      </div>
    </div>
  );
}