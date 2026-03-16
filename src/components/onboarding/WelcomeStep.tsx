"use client";

interface WelcomeStepProps {
  onContinue: () => void;
}

export function WelcomeStep({ onContinue }: WelcomeStepProps) {
  return (
    <div className="flex flex-col items-center text-center max-w-lg mx-auto">
      {/* KAIROS Logo */}
      <div className="w-24 h-24 rounded-full flex items-center justify-center mb-8"
        style={{ background: "linear-gradient(135deg, #122055 0%, #1a2d6d 100%)" }}>
        <span className="text-4xl font-bold" style={{ color: "#D4AF37" }}>K</span>
      </div>

      <h1 className="text-3xl font-heading font-bold text-white mb-4">
        Welcome to KAIROS
      </h1>

      <p className="text-gray-400 text-lg mb-6 leading-relaxed">
        KAIROS is your private health management platform, designed for those who
        take their longevity and performance seriously. In the next few minutes,
        we&apos;ll personalize your experience.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 w-full">
        {[
          { icon: "📊", title: "Track", desc: "Glucose, sleep, nutrition & more" },
          { icon: "🧠", title: "Analyze", desc: "AI-powered health insights" },
          { icon: "🎯", title: "Optimize", desc: "Personalized protocols" },
        ].map((item) => (
          <div key={item.title} className="kairos-card p-4 text-center">
            <div className="text-2xl mb-2">{item.icon}</div>
            <div className="font-semibold text-white text-sm">{item.title}</div>
            <div className="text-gray-500 text-xs mt-1">{item.desc}</div>
          </div>
        ))}
      </div>

      <button
        onClick={onContinue}
        className="kairos-btn-gold px-10 py-3 rounded-lg font-semibold text-lg transition-all hover:scale-105"
      >
        Get Started
      </button>

      <p className="text-gray-600 text-xs mt-6">
        Setup takes about 3 minutes
      </p>
    </div>
  );
}
