'use client';

import { useState } from 'react';
import {
  Mail,
  Phone,
  Award,
  Clock,
  Shield,
  Bell,
  Settings,
  Edit,
} from 'lucide-react';

interface CoachProfile {
  name: string;
  initials: string;
  credentials: string[];
  specializations: string[];
  bio: string;
  education: string[];
  certifications: string[];
  yearsExperience: number;
  availableHours: string;
  sessionDuration: number;
  maxClientCapacity: number;
  email: string;
  phone: string;
  totalClients: number;
  activeProtocols: number;
  avgRating: number;
  yearsOnPlatform: number;
  notificationPreferences: {
    email: boolean;
    sms: boolean;
    inApp: boolean;
  };
}

const mockCoachData: CoachProfile = {
  name: 'Dr. Marcus Chen',
  initials: 'MC',
  credentials: ['MD', 'Board Certified'],
  specializations: [
    'Longevity Medicine',
    'Preventive Care',
    'Metabolic Health',
  ],
  bio: 'Dr. Chen is a board-certified physician specializing in longevity medicine with over 15 years of clinical experience. He focuses on evidence-based interventions for healthy aging and optimal wellness.',
  education: [
    'MD from Johns Hopkins University School of Medicine',
    'Residency in Internal Medicine at Mayo Clinic',
    'Fellowship in Preventive Medicine at Stanford University',
  ],
  certifications: [
    'American Board of Internal Medicine',
    'Certified Longevity & Functional Medicine Practitioner',
    'Advanced Health Coach Certification',
  ],
  yearsExperience: 15,
  availableHours: 'Monday - Friday, 9AM - 5PM PST',
  sessionDuration: 45,
  maxClientCapacity: 20,
  email: 'marcus@kairos.health',
  phone: '+1 (415) 555-0123',
  totalClients: 8,
  activeProtocols: 12,
  avgRating: 4.9,
  yearsOnPlatform: 3,
  notificationPreferences: {
    email: true,
    sms: false,
    inApp: true,
  },
};

export default function CoachProfilePage() {
  const [coach, setCoach] = useState<CoachProfile>(mockCoachData);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [notificationPrefs, setNotificationPrefs] = useState(
    coach.notificationPreferences
  );

  const startEditing = (field: string, value: string) => {
    setEditingField(field);
    setEditValues({ ...editValues, [field]: value });
  };

  const saveEdit = (field: string) => {
    const value = editValues[field];
    if (value) {
      setCoach({
        ...coach,
        [field]: isNaN(Number(value)) ? value : Number(value),
      });
      setEditingField(null);
    }
  };

  const toggleNotification = (type: 'email' | 'sms' | 'inApp') => {
    const updated = {
      ...notificationPrefs,
      [type]: !notificationPrefs[type],
    };
    setNotificationPrefs(updated);
    setCoach({
      ...coach,
      notificationPreferences: updated,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Profile Header */}
      <div className="kairos-card">
        <div className="flex items-center gap-6 mb-6">
          <div className="w-24 h-24 rounded-kairos-sm bg-gradient-to-br from-kairos-gold/30 to-kairos-gold/10 border border-kairos-gold/20 flex items-center justify-center">
            <span className="text-3xl font-heading font-bold text-kairos-gold">
              {coach.initials}
            </span>
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-heading font-bold text-white mb-2">
              {coach.name}
            </h1>
            <div className="flex gap-2 mb-3">
              {coach.credentials.map((cred) => (
                <span
                  key={cred}
                  className="kairos-badge-gold text-sm font-body"
                >
                  {cred}
                </span>
              ))}
            </div>
            <p className="text-kairos-silver-dark font-body text-sm">
              {coach.specializations.join(' • ')}
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 pt-6 border-t border-kairos-border">
          <div className="text-center">
            <p className="text-2xl font-heading font-bold text-kairos-gold mb-1">
              {coach.totalClients}
            </p>
            <p className="text-xs font-body text-kairos-silver-dark uppercase tracking-wide">
              Total Clients
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-heading font-bold text-kairos-gold mb-1">
              {coach.activeProtocols}
            </p>
            <p className="text-xs font-body text-kairos-silver-dark uppercase tracking-wide">
              Active Protocols
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-heading font-bold text-kairos-gold mb-1">
              {coach.avgRating}
            </p>
            <p className="text-xs font-body text-kairos-silver-dark uppercase tracking-wide">
              Avg Rating
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-heading font-bold text-kairos-gold mb-1">
              {coach.yearsOnPlatform}
            </p>
            <p className="text-xs font-body text-kairos-silver-dark uppercase tracking-wide">
              Years on Platform
            </p>
          </div>
        </div>
      </div>

      {/* Professional Information */}
      <div className="kairos-card">
        <h2 className="text-xl font-heading font-bold text-white mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-kairos-gold" />
          Professional Information
        </h2>

        <div className="space-y-4">
          {/* Bio */}
          <div>
            <label className="kairos-label mb-2 block">Bio</label>
            {editingField === 'bio' ? (
              <div className="flex gap-2">
                <textarea
                  className="kairos-input flex-1"
                  rows={3}
                  value={editValues.bio}
                  onChange={(e) =>
                    setEditValues({ ...editValues, bio: e.target.value })
                  }
                />
                <button
                  onClick={() => saveEdit('bio')}
                  className="kairos-btn-gold px-4 h-fit"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="flex gap-2 items-start">
                <p className="text-kairos-silver-dark font-body text-sm flex-1">
                  {coach.bio}
                </p>
                <button
                  onClick={() => startEditing('bio', coach.bio)}
                  className="text-kairos-gold hover:text-kairos-gold/80 transition mt-1"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Education */}
          <div>
            <label className="kairos-label mb-2 block">Education</label>
            <ul className="space-y-2">
              {coach.education.map((edu, idx) => (
                <li
                  key={idx}
                  className="text-kairos-silver-dark font-body text-sm flex items-start gap-2"
                >
                  <span className="text-kairos-gold mt-1">•</span>
                  {edu}
                </li>
              ))}
            </ul>
          </div>

          {/* Certifications */}
          <div>
            <label className="kairos-label mb-2 block">Certifications</label>
            <ul className="space-y-2">
              {coach.certifications.map((cert, idx) => (
                <li
                  key={idx}
                  className="text-kairos-silver-dark font-body text-sm flex items-start gap-2"
                >
                  <span className="text-kairos-gold mt-1">•</span>
                  {cert}
                </li>
              ))}
            </ul>
          </div>

          {/* Years of Experience */}
          <div>
            <label className="kairos-label mb-2 block">Years of Experience</label>
            <p className="text-kairos-silver-dark font-body text-sm">
              {coach.yearsExperience} years
            </p>
          </div>
        </div>
      </div>

      {/* Practice Settings */}
      <div className="kairos-card">
        <h2 className="text-xl font-heading font-bold text-white mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-kairos-gold" />
          Practice Settings
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Available Hours */}
          <div>
            <label className="kairos-label mb-2 block flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Available Hours
            </label>
            {editingField === 'availableHours' ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  className="kairos-input flex-1"
                  value={editValues.availableHours}
                  onChange={(e) =>
                    setEditValues({
                      ...editValues,
                      availableHours: e.target.value,
                    })
                  }
                />
                <button
                  onClick={() => saveEdit('availableHours')}
                  className="kairos-btn-gold px-4"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                <p className="text-kairos-silver-dark font-body text-sm flex-1">
                  {coach.availableHours}
                </p>
                <button
                  onClick={() =>
                    startEditing('availableHours', coach.availableHours)
                  }
                  className="text-kairos-gold hover:text-kairos-gold/80 transition"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Session Duration */}
          <div>
            <label className="kairos-label mb-2 block flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Session Duration (minutes)
            </label>
            {editingField === 'sessionDuration' ? (
              <div className="flex gap-2">
                <input
                  type="number"
                  className="kairos-input flex-1"
                  value={editValues.sessionDuration}
                  onChange={(e) =>
                    setEditValues({
                      ...editValues,
                      sessionDuration: e.target.value,
                    })
                  }
                />
                <button
                  onClick={() => saveEdit('sessionDuration')}
                  className="kairos-btn-gold px-4"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                <p className="text-kairos-silver-dark font-body text-sm flex-1">
                  {coach.sessionDuration} minutes
                </p>
                <button
                  onClick={() =>
                    startEditing('sessionDuration', coach.sessionDuration.toString())
                  }
                  className="text-kairos-gold hover:text-kairos-gold/80 transition"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Max Client Capacity */}
          <div>
            <label className="kairos-label mb-2 block flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Max Client Capacity
            </label>
            {editingField === 'maxClientCapacity' ? (
              <div className="flex gap-2">
                <input
                  type="number"
                  className="kairos-input flex-1"
                  value={editValues.maxClientCapacity}
                  onChange={(e) =>
                    setEditValues({
                      ...editValues,
                      maxClientCapacity: e.target.value,
                    })
                  }
                />
                <button
                  onClick={() => saveEdit('maxClientCapacity')}
                  className="kairos-btn-gold px-4"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                <p className="text-kairos-silver-dark font-body text-sm flex-1">
                  {coach.maxClientCapacity} clients
                </p>
                <button
                  onClick={() =>
                    startEditing(
                      'maxClientCapacity',
                      coach.maxClientCapacity.toString()
                    )
                  }
                  className="text-kairos-gold hover:text-kairos-gold/80 transition"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Contact Info */}
          <div>
            <label className="kairos-label mb-2 block flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email
            </label>
            <p className="text-kairos-silver-dark font-body text-sm">
              {coach.email}
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="kairos-label mb-2 block flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Phone
            </label>
            <p className="text-kairos-silver-dark font-body text-sm">
              {coach.phone}
            </p>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="kairos-card">
        <h2 className="text-xl font-heading font-bold text-white mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5 text-kairos-gold" />
          Notification Preferences
        </h2>

        <div className="space-y-4">
          {/* Email Notifications */}
          <div className="flex items-center justify-between p-4 rounded-kairos-sm bg-kairos-card border border-kairos-border/50">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-kairos-gold" />
              <div>
                <p className="font-body font-semibold text-white">Email</p>
                <p className="text-xs text-kairos-silver-dark">
                  Receive email notifications
                </p>
              </div>
            </div>
            <button
              onClick={() => toggleNotification('email')}
              className={`relative w-12 h-6 rounded-full transition ${
                notificationPrefs.email
                  ? 'bg-kairos-gold'
                  : 'bg-kairos-silver-dark/20'
              }`}
            >
              <div
                className={`absolute w-5 h-5 bg-white rounded-full transition ${
                  notificationPrefs.email ? 'right-0.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {/* SMS Notifications */}
          <div className="flex items-center justify-between p-4 rounded-kairos-sm bg-kairos-card border border-kairos-border/50">
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-kairos-gold" />
              <div>
                <p className="font-body font-semibold text-white">SMS</p>
                <p className="text-xs text-kairos-silver-dark">
                  Receive SMS notifications
                </p>
              </div>
            </div>
            <button
              onClick={() => toggleNotification('sms')}
              className={`relative w-12 h-6 rounded-full transition ${
                notificationPrefs.sms
                  ? 'bg-kairos-gold'
                  : 'bg-kairos-silver-dark/20'
              }`}
            >
              <div
                className={`absolute w-5 h-5 bg-white rounded-full transition ${
                  notificationPrefs.sms ? 'right-0.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {/* In-App Notifications */}
          <div className="flex items-center justify-between p-4 rounded-kairos-sm bg-kairos-card border border-kairos-border/50">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-kairos-gold" />
              <div>
                <p className="font-body font-semibold text-white">In-App</p>
                <p className="text-xs text-kairos-silver-dark">
                  Receive in-app notifications
                </p>
              </div>
            </div>
            <button
              onClick={() => toggleNotification('inApp')}
              className={`relative w-12 h-6 rounded-full transition ${
                notificationPrefs.inApp
                  ? 'bg-kairos-gold'
                  : 'bg-kairos-silver-dark/20'
              }`}
            >
              <div
                className={`absolute w-5 h-5 bg-white rounded-full transition ${
                  notificationPrefs.inApp ? 'right-0.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
