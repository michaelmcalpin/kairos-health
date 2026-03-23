import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Shield, Activity, Brain, Zap, Droplets, Moon, FlaskConical, Timer, Check, Star, ArrowRight, ChevronRight } from "lucide-react";

export default async function HomePage() {
  const { userId } = await auth();

  // Authenticated users go to role selection (client-side will check saved role)
  if (userId) {
    redirect("/select-role");
  }

  return (
    <div className="min-h-screen bg-kairos-royal-dark flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 border-b border-kairos-border bg-kairos-royal-dark/95 backdrop-blur-sm">
        <div>
          <h1 className="font-heading font-bold text-xl text-kairos-gold tracking-wide">KAIROS</h1>
          <p className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-widest">
            Private Health Management
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Show when="signed-out">
            <SignInButton>
              <button className="kairos-btn-outline text-sm">Sign In</button>
            </SignInButton>
            <SignUpButton>
              <button className="kairos-btn-gold text-sm">Get Started</button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-8">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-block mb-6 px-4 py-1.5 rounded-full bg-kairos-gold/10 border border-kairos-gold/20">
            <span className="text-xs font-heading font-semibold text-kairos-gold tracking-wide">
              INVITATION-ONLY LONGEVITY PLATFORM
            </span>
          </div>
          <h2 className="font-heading font-bold text-5xl md:text-6xl lg:text-7xl text-white mb-6 leading-tight">
            Your Health,{" "}
            <span className="text-kairos-gold">Elevated</span>
          </h2>
          <p className="font-body text-kairos-silver text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed">
            Clinical-grade biometric tracking, personalized longevity protocols, and AI-powered
            insights — all managed by your dedicated health team.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Show when="signed-out">
              <SignUpButton>
                <button className="kairos-btn-gold text-base px-10 py-4 flex items-center gap-2">
                  Begin Your Journey <ArrowRight size={18} />
                </button>
              </SignUpButton>
              <SignInButton>
                <button className="kairos-btn-outline text-base px-8 py-4">
                  Member Sign In
                </button>
              </SignInButton>
            </Show>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-8 text-kairos-silver-dark text-xs font-body">
            <span className="flex items-center gap-1.5"><Shield size={14} className="text-kairos-gold" /> HIPAA Compliant</span>
            <span className="flex items-center gap-1.5"><Shield size={14} className="text-kairos-gold" /> SOC 2 Type II</span>
            <span className="flex items-center gap-1.5"><Shield size={14} className="text-kairos-gold" /> End-to-End Encrypted</span>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-8 border-t border-kairos-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="font-heading font-bold text-3xl text-white mb-4">Everything Your Health Demands</h3>
            <p className="font-body text-kairos-silver-dark max-w-xl mx-auto">
              A complete platform designed for those who refuse to settle for average health outcomes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: <Droplets size={28} />, title: "Glucose Monitoring", desc: "Continuous glucose tracking with meal impact analysis and trend detection" },
              { icon: <Moon size={28} />, title: "Sleep Analysis", desc: "Deep, REM, and light sleep tracking with circadian rhythm optimization" },
              { icon: <FlaskConical size={28} />, title: "Lab Integration", desc: "16+ longevity biomarkers with optimal ranges and trend tracking" },
              { icon: <Timer size={28} />, title: "Fasting Protocols", desc: "Live fasting timers with metabolic zone tracking and streak analytics" },
              { icon: <Brain size={28} />, title: "AI Insights", desc: "Personalized correlations and recommendations powered by your data" },
              { icon: <Activity size={28} />, title: "Biometric Dashboard", desc: "Real-time health score with all your vitals in one unified view" },
              { icon: <Zap size={28} />, title: "Protocol Engine", desc: "Supplements, workouts, and nutrition protocols with adherence tracking" },
              { icon: <Shield size={28} />, title: "Trainer Connection", desc: "Direct messaging with your dedicated longevity health trainer" },
            ].map((feature) => (
              <div key={feature.title} className="kairos-card p-6 group hover:border-kairos-gold/30 transition-all duration-300">
                <div className="text-kairos-gold mb-4 group-hover:scale-110 transition-transform duration-300">{feature.icon}</div>
                <h4 className="font-heading font-bold text-white mb-2">{feature.title}</h4>
                <p className="text-xs font-body text-kairos-silver-dark leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tiers Section */}
      <section className="py-20 px-8 border-t border-kairos-border bg-kairos-royal/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="font-heading font-bold text-3xl text-white mb-4">Choose Your Path</h3>
            <p className="font-body text-kairos-silver-dark max-w-xl mx-auto">
              Three tiers of service designed to match your goals and commitment level.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Tier 3 */}
            <div className="kairos-card p-8 flex flex-col">
              <div className="mb-6">
                <span className="text-xs font-heading font-semibold text-kairos-silver-dark uppercase tracking-widest">Tier 3</span>
                <h4 className="font-heading font-bold text-2xl text-white mt-1">AI-Guided</h4>
                <div className="mt-3">
                  <span className="text-3xl font-heading font-bold text-white">$99</span>
                  <span className="text-sm font-body text-kairos-silver-dark">/month</span>
                </div>
              </div>
              <ul className="space-y-3 flex-1 mb-8">
                {["AI-powered health insights", "Biometric dashboard", "Supplement protocols", "Community access", "Monthly health report"].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm font-body text-kairos-silver">
                    <Check size={16} className="text-kairos-silver-dark flex-shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
              <Show when="signed-out">
                <SignUpButton>
                  <button className="kairos-btn-outline w-full py-3">Get Started</button>
                </SignUpButton>
              </Show>
            </div>

            {/* Tier 2 - Featured */}
            <div className="kairos-card p-8 flex flex-col border-kairos-gold/40 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="px-4 py-1 bg-kairos-gold text-kairos-royal-dark text-xs font-heading font-bold rounded-full">
                  MOST POPULAR
                </span>
              </div>
              <div className="mb-6">
                <span className="text-xs font-heading font-semibold text-kairos-gold uppercase tracking-widest">Tier 2</span>
                <h4 className="font-heading font-bold text-2xl text-white mt-1">Associate</h4>
                <div className="mt-3">
                  <span className="text-3xl font-heading font-bold text-kairos-gold">$249</span>
                  <span className="text-sm font-body text-kairos-silver-dark">/month</span>
                </div>
              </div>
              <ul className="space-y-3 flex-1 mb-8">
                {["Everything in AI-Guided", "Dedicated associate trainer", "Bi-weekly video sessions", "Custom supplement protocol", "Priority alert response", "Quarterly lab review"].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm font-body text-kairos-silver">
                    <Check size={16} className="text-kairos-gold flex-shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
              <Show when="signed-out">
                <SignUpButton>
                  <button className="kairos-btn-gold w-full py-3">Get Started</button>
                </SignUpButton>
              </Show>
            </div>

            {/* Tier 1 */}
            <div className="kairos-card p-8 flex flex-col">
              <div className="mb-6">
                <span className="text-xs font-heading font-semibold text-kairos-gold uppercase tracking-widest">Tier 1</span>
                <h4 className="font-heading font-bold text-2xl text-white mt-1">Private</h4>
                <div className="mt-3">
                  <span className="text-3xl font-heading font-bold text-white">$499</span>
                  <span className="text-sm font-body text-kairos-silver-dark">/month</span>
                </div>
              </div>
              <ul className="space-y-3 flex-1 mb-8">
                {["Everything in Associate", "Senior longevity physician", "Weekly 1-on-1 sessions", "Bespoke protocol design", "24/7 direct messaging", "Monthly comprehensive labs", "Concierge health services"].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm font-body text-kairos-silver">
                    <Check size={16} className="text-kairos-gold flex-shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
              <Show when="signed-out">
                <SignUpButton>
                  <button className="kairos-btn-outline w-full py-3 border-kairos-gold/30 text-kairos-gold hover:bg-kairos-gold/10">
                    Apply Now
                  </button>
                </SignUpButton>
              </Show>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-8 border-t border-kairos-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="font-heading font-bold text-3xl text-white mb-4">Trusted by Those Who Demand More</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { quote: "KAIROS transformed my approach to longevity. The data-driven insights are unmatched.", name: "James T.", role: "Tech Executive", stars: 5 },
              { quote: "Having a dedicated coach who sees all my biometrics in real time is a game-changer.", name: "Sarah M.", role: "Venture Partner", stars: 5 },
              { quote: "The glucose tracking alone has changed how I eat. My metabolic health has never been better.", name: "David K.", role: "Entrepreneur", stars: 5 },
            ].map((t) => (
              <div key={t.name} className="kairos-card p-6">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} size={14} className="fill-kairos-gold text-kairos-gold" />
                  ))}
                </div>
                <p className="font-body text-kairos-silver text-sm mb-6 leading-relaxed italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div>
                  <p className="font-heading font-bold text-white text-sm">{t.name}</p>
                  <p className="font-body text-kairos-silver-dark text-xs">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-8 border-t border-kairos-border bg-gradient-to-b from-kairos-royal/50 to-kairos-royal-dark">
        <div className="max-w-2xl mx-auto text-center">
          <h3 className="font-heading font-bold text-3xl text-white mb-4">
            Ready to Take Control?
          </h3>
          <p className="font-body text-kairos-silver-dark mb-8">
            Join the select few who have chosen to optimize their healthspan with clinical precision.
          </p>
          <Show when="signed-out">
            <SignUpButton>
              <button className="kairos-btn-gold text-base px-12 py-4 flex items-center gap-2 mx-auto">
                Start Your Health Journey <ChevronRight size={18} />
              </button>
            </SignUpButton>
          </Show>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-kairos-border px-8 py-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-heading font-bold text-kairos-gold tracking-wide">KAIROS</span>
            <span className="text-xs font-body text-kairos-silver-dark ml-2">Private Health Management</span>
          </div>
          <div className="flex gap-6 text-xs font-body text-kairos-silver-dark">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Contact</span>
          </div>
          <p className="text-xs font-body text-kairos-silver-dark">
            &copy; {new Date().getFullYear()} KAIROS. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
