"use client";

import { useState } from "react";
import type { ProfileFormData } from "@/lib/onboarding/types";
import { validateProfile } from "@/lib/onboarding/machine";

interface ProfileStepProps {
  data: Partial<ProfileFormData>;
  onChange: (data: Partial<ProfileFormData>) => void;
  onContinue: () => void;
  onBack: () => void;
}

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non_binary", label: "Non-binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

export function ProfileStep({ data, onChange, onContinue, onBack }: ProfileStepProps) {
  const [errors, setErrors] = useState<string[]>([]);
  const [touched, setTouched] = useState(false);

  function handleChange(field: keyof ProfileFormData, value: string | number) {
    onChange({ [field]: value });
    if (touched) {
      const validation = validateProfile({ ...data, [field]: value });
      setErrors(validation.errors);
    }
  }

  function handleSubmit() {
    setTouched(true);
    const validation = validateProfile(data);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    setErrors([]);
    onContinue();
  }

  const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="max-w-md mx-auto w-full">
      <h2 className="text-2xl font-heading font-bold text-white mb-2">Your Profile</h2>
      <p className="text-gray-400 mb-6">Tell us about yourself so we can personalize your experience.</p>

      <div className="space-y-4">
        {/* Name Row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">First Name</label>
            <input
              type="text"
              value={data.firstName ?? ""}
              onChange={(e) => handleChange("firstName", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-[#D4AF37] focus:outline-none transition"
              placeholder="John"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Last Name</label>
            <input
              type="text"
              value={data.lastName ?? ""}
              onChange={(e) => handleChange("lastName", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-[#D4AF37] focus:outline-none transition"
              placeholder="Doe"
            />
          </div>
        </div>

        {/* Date of Birth */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Date of Birth</label>
          <input
            type="date"
            value={data.dateOfBirth ?? ""}
            onChange={(e) => handleChange("dateOfBirth", e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-[#D4AF37] focus:outline-none transition"
          />
        </div>

        {/* Gender */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Gender</label>
          <div className="grid grid-cols-2 gap-2">
            {GENDER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleChange("gender", opt.value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition border ${
                  data.gender === opt.value
                    ? "border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]"
                    : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Height */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Height</label>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <input
                type="number"
                value={data.heightFeet ?? ""}
                onChange={(e) => handleChange("heightFeet", parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-[#D4AF37] focus:outline-none transition"
                placeholder="5"
                min={3}
                max={8}
              />
              <span className="absolute right-3 top-2 text-gray-500 text-sm">ft</span>
            </div>
            <div className="relative">
              <input
                type="number"
                value={data.heightInches ?? ""}
                onChange={(e) => handleChange("heightInches", parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-[#D4AF37] focus:outline-none transition"
                placeholder="10"
                min={0}
                max={11}
              />
              <span className="absolute right-3 top-2 text-gray-500 text-sm">in</span>
            </div>
          </div>
        </div>

        {/* Timezone */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Timezone</label>
          <div className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 text-sm">
            {data.timezone ?? detectedTimezone}
            <span className="text-gray-600 ml-2">(auto-detected)</span>
          </div>
        </div>
      </div>

      {/* Errors */}
      {touched && errors.length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-red-900/20 border border-red-800/30">
          {errors.map((err) => (
            <p key={err} className="text-red-400 text-sm">{err}</p>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between mt-8">
        <button
          onClick={onBack}
          className="px-6 py-2 rounded-lg text-gray-400 hover:text-white transition"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          className="kairos-btn-gold px-8 py-2 rounded-lg font-semibold transition hover:scale-105"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
