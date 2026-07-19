import { SignIn } from "@clerk/nextjs";
import { kairosClerkAppearance } from "@/lib/clerk-appearance";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-kairos-royal-dark">
      <div className="text-center mb-8">
        <div className="mb-8">
          <h1 className="font-heading font-bold text-3xl text-kairos-gold tracking-wide mb-2">
            EVERIST.ai
          </h1>
          <p className="text-sm font-heading text-kairos-silver-dark uppercase tracking-widest">
            Private Health Management
          </p>
        </div>
        <SignIn
          forceRedirectUrl="/select-role"
          appearance={kairosClerkAppearance}
        />
      </div>
    </div>
  );
}
