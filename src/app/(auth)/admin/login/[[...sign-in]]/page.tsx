import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-kairos-royal-dark">
      <div className="text-center mb-8">
        <div className="mb-8">
          <h1 className="font-heading font-bold text-3xl text-kairos-gold tracking-wide mb-2">
            KAIROS
          </h1>
          <p className="text-sm font-heading text-purple-400 uppercase tracking-widest">
            Platform Administration
          </p>
        </div>
        <SignIn
          forceRedirectUrl="/select-role?portal=super_admin"
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-kairos-card border border-kairos-border shadow-kairos",
              headerTitle: "text-white font-heading",
              headerSubtitle: "text-kairos-silver-dark",
              formButtonPrimary: "bg-kairos-gold hover:bg-kairos-gold-light text-kairos-royal-dark font-heading font-semibold",
              formFieldInput: "bg-kairos-input border-kairos-border text-white",
              formFieldLabel: "text-kairos-silver",
              footerActionLink: "text-kairos-gold hover:text-kairos-gold-light",
            },
          }}
        />
        <div className="mt-6">
          <p className="text-sm text-kairos-silver-dark">
            Not a platform admin?{" "}
            <Link href="/sign-in" className="text-purple-400 hover:text-purple-300 font-semibold">
              Sign in as a client →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
