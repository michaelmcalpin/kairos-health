"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Stethoscope, ArrowRight } from "lucide-react";

export default function SelectRolePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  // On mount, check if user already has a saved role — auto-redirect
  useEffect(() => {
    const savedRole = localStorage.getItem("kairos-role");
    if (savedRole === "coach") {
      router.replace("/coach/dashboard");
    } else if (savedRole === "client") {
      router.replace("/dashboard");
    } else {
      setChecking(false);
    }
  }, [router]);

  function selectRole(role: "client" | "coach") {
    localStorage.setItem("kairos-role", role);
    if (role === "coach") {
      router.push("/coach/dashboard");
    } else {
      router.push("/dashboard");
    }
  }

  // Brief loading while checking saved role
  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-kairos-royal-dark to-kairos-royal flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-heading font-bold text-xl text-kairos-gold tracking-wide mb-2">KAIROS</h1>
          <p className="text-xs font-body text-kairos-silver-dark animate-pulse">Loading your portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-kairos-royal-dark flex flex-col items-center justify-center px-8">
      <div className="max-w-2xl w-full text-center">
        {/* Brand */}
        <div className="mb-12">
          <h1 className="font-heading font-bold text-2xl text-kairos-gold tracking-wide mb-1">KAIROS</h1>
          <p className="text-xs font-heading text-kairos-silver-dark uppercase tracking-widest">
            Private Health Management
          </p>
        </div>

        {/* Welcome */}
        <h2 className="font-heading font-bold text-3xl text-white mb-3">Welcome Back</h2>
        <p className="font-body text-kairos-silver-dark mb-12">
          How would you like to sign in today?
        </p>

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Client */}
          <button
            onClick={() => selectRole("client")}
            className="kairos-card p-8 text-left group hover:border-kairos-gold/40 transition-all duration-300 cursor-pointer"
          >
            <div className="w-14 h-14 rounded-full bg-kairos-gold/15 flex items-center justify-center mb-6 group-hover:bg-kairos-gold/25 transition-colors">
              <User size={28} className="text-kairos-gold" />
            </div>
            <h3 className="font-heading font-bold text-xl text-white mb-2">Client Portal</h3>
            <p className="font-body text-sm text-kairos-silver-dark mb-6 leading-relaxed">
              Access your health dashboard, biometrics, protocols, and communicate with your coach.
            </p>
            <div className="flex items-center gap-2 text-kairos-gold text-sm font-heading font-semibold group-hover:gap-3 transition-all">
              Enter as Client <ArrowRight size={16} />
            </div>
          </button>

          {/* Coach */}
          <button
            onClick={() => selectRole("coach")}
            className="kairos-card p-8 text-left group hover:border-kairos-gold/40 transition-all duration-300 cursor-pointer"
          >
            <div className="w-14 h-14 rounded-full bg-blue-500/15 flex items-center justify-center mb-6 group-hover:bg-blue-500/25 transition-colors">
              <Stethoscope size={28} className="text-blue-400" />
            </div>
            <h3 className="font-heading font-bold text-xl text-white mb-2">Coach Portal</h3>
            <p className="font-body text-sm text-kairos-silver-dark mb-6 leading-relaxed">
              Manage your clients, review alerts, track protocols, and grow your practice.
            </p>
            <div className="flex items-center gap-2 text-blue-400 text-sm font-heading font-semibold group-hover:gap-3 transition-all">
              Enter as Coach <ArrowRight size={16} />
            </div>
          </button>
        </div>

        <p className="text-xs font-body text-kairos-silver-dark">
          Your selection will be remembered for future sessions.
        </p>
      </div>
    </div>
  );
}
