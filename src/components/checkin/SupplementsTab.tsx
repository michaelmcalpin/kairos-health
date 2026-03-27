'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Pill, Plus, Clock, Bell, BellOff, Check, X, AlertCircle, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

// ── Types ──
interface SupplementItem {
  id: string;
  name: string;
  dosage: string;
  timing: string;          // Morning | Afternoon | Evening | Bedtime
  category: 'supplement' | 'medication' | 'peptide' | 'injection';
  source: 'trainer' | 'client';
  rationale?: string;
  taken: boolean;
  takenAt?: string;        // ISO timestamp
  skipped: boolean;
  notes?: string;
}

interface ReminderConfig {
  enabled: boolean;
  times: Record<string, string>; // timing → HH:MM
}

interface SupplementsTabProps {
  data: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
}

const TIMINGS = ['Morning', 'Afternoon', 'Evening', 'Bedtime'] as const;

const TIMING_ICONS: Record<string, string> = {
  Morning: '🌅',
  Afternoon: '☀️',
  Evening: '🌆',
  Bedtime: '🌙',
};

const TIMING_DEFAULT_TIMES: Record<string, string> = {
  Morning: '07:00',
  Afternoon: '12:00',
  Evening: '18:00',
  Bedtime: '21:00',
};

const CATEGORY_COLORS: Record<string, string> = {
  supplement: 'text-kairos-gold border-kairos-gold/30 bg-kairos-gold/10',
  medication: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  peptide: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
  injection: 'text-red-400 border-red-500/30 bg-red-500/10',
};

const uid = () => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

export const SupplementsTab: React.FC<SupplementsTabProps> = ({ data, onChange }) => {
  const supplements = (Array.isArray(data.supplementItems) ? data.supplementItems : []) as SupplementItem[];
  const reminders = (data.supplementReminders || { enabled: false, times: {} }) as ReminderConfig;

  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedTiming, setExpandedTiming] = useState<string | null>(null);
  const [showReminderSettings, setShowReminderSettings] = useState(false);
  const [newSupplement, setNewSupplement] = useState<Partial<SupplementItem>>({
    timing: 'Morning',
    category: 'supplement',
    source: 'client',
  });

  const updateSupplements = useCallback((updated: SupplementItem[]) => {
    onChange('supplementItems', updated);
  }, [onChange]);

  const updateReminders = useCallback((updated: ReminderConfig) => {
    onChange('supplementReminders', updated);
  }, [onChange]);

  // ── Group by timing ──
  const grouped = useMemo(() => {
    const groups: Record<string, SupplementItem[]> = {};
    TIMINGS.forEach((t) => {
      groups[t] = supplements.filter((s) => s.timing === t);
    });
    return groups;
  }, [supplements]);

  // ── Stats ──
  const totalCount = supplements.length;
  const takenCount = supplements.filter((s) => s.taken).length;
  const skippedCount = supplements.filter((s) => s.skipped).length;
  const pendingCount = totalCount - takenCount - skippedCount;

  // ── Toggle taken ──
  const markTaken = (id: string) => {
    const updated = supplements.map((s) =>
      s.id === id
        ? { ...s, taken: true, skipped: false, takenAt: new Date().toISOString() }
        : s
    );
    updateSupplements(updated);
  };

  // ── Toggle skipped ──
  const markSkipped = (id: string) => {
    const updated = supplements.map((s) =>
      s.id === id
        ? { ...s, taken: false, skipped: true, takenAt: undefined }
        : s
    );
    updateSupplements(updated);
  };

  // ── Undo ──
  const undoStatus = (id: string) => {
    const updated = supplements.map((s) =>
      s.id === id
        ? { ...s, taken: false, skipped: false, takenAt: undefined }
        : s
    );
    updateSupplements(updated);
  };

  // ── Add supplement ──
  const addSupplement = () => {
    if (!newSupplement.name || !newSupplement.dosage) return;
    const item: SupplementItem = {
      id: uid(),
      name: newSupplement.name || '',
      dosage: newSupplement.dosage || '',
      timing: newSupplement.timing || 'Morning',
      category: (newSupplement.category as SupplementItem['category']) || 'supplement',
      source: 'client',
      rationale: newSupplement.rationale,
      taken: false,
      skipped: false,
    };
    updateSupplements([...supplements, item]);
    setNewSupplement({ timing: 'Morning', category: 'supplement', source: 'client' });
    setShowAddForm(false);
  };

  // ── Remove client-added supplement ──
  const removeSupplement = (id: string) => {
    const item = supplements.find((s) => s.id === id);
    if (item?.source === 'trainer') return; // Can't remove trainer-assigned
    updateSupplements(supplements.filter((s) => s.id !== id));
  };

  // ── Push notification permission ──
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      updateReminders({ ...reminders, enabled: true });
    }
  };

  // ── Schedule reminders (basic implementation using setTimeout for demo) ──
  useEffect(() => {
    if (!reminders.enabled || typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const timers: NodeJS.Timeout[] = [];
    const now = new Date();

    TIMINGS.forEach((timing) => {
      const timeStr = reminders.times[timing] || TIMING_DEFAULT_TIMES[timing];
      const [hours, minutes] = timeStr.split(':').map(Number);
      const reminderTime = new Date();
      reminderTime.setHours(hours, minutes, 0, 0);

      const timingItems = grouped[timing] || [];
      const pendingItems = timingItems.filter((s) => !s.taken && !s.skipped);

      if (pendingItems.length > 0 && reminderTime > now) {
        const delay = reminderTime.getTime() - now.getTime();
        const timer = setTimeout(() => {
          new Notification(`KAIROS - ${timing} Supplements`, {
            body: `${pendingItems.length} supplement${pendingItems.length > 1 ? 's' : ''} to take: ${pendingItems.map((s) => s.name).join(', ')}`,
            icon: '/favicon.ico',
            tag: `supplement-${timing}`,
          });
        }, delay);
        timers.push(timer);
      }
    });

    return () => timers.forEach(clearTimeout);
  }, [reminders, grouped]);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="kairos-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-kairos-gold" />
            <h2 className="font-heading font-semibold text-white">Supplement Protocol</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowReminderSettings(!showReminderSettings)}
              className={`p-2 rounded border transition-colors ${
                reminders.enabled
                  ? 'border-kairos-gold bg-kairos-gold/10 text-kairos-gold'
                  : 'border-kairos-border text-kairos-silver hover:border-kairos-gold/30'
              }`}
              title="Reminder settings"
            >
              {reminders.enabled ? <Bell size={16} /> : <BellOff size={16} />}
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="p-2 rounded border border-kairos-border text-kairos-silver hover:border-kairos-gold/30 hover:text-white transition-colors"
              title="Add your own supplement"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-body">
              <span className="text-kairos-silver">{takenCount}/{totalCount} completed</span>
              {skippedCount > 0 && <span className="text-red-400">{skippedCount} skipped</span>}
              {pendingCount > 0 && <span className="text-yellow-400">{pendingCount} pending</span>}
            </div>
            <div className="h-2 bg-kairos-border rounded-full overflow-hidden flex">
              <div
                className="h-full bg-kairos-gold transition-all"
                style={{ width: `${(takenCount / totalCount) * 100}%` }}
              />
              <div
                className="h-full bg-red-500/50 transition-all"
                style={{ width: `${(skippedCount / totalCount) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Reminder Settings */}
      {showReminderSettings && (
        <div className="kairos-card space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-kairos-gold" />
            <h3 className="text-sm font-heading font-semibold text-white">Push Notifications</h3>
          </div>
          {typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted' ? (
            <div className="p-3 rounded border border-yellow-500/30 bg-yellow-500/5">
              <p className="text-xs font-body text-yellow-400 mb-2">
                Enable push notifications to get reminders when supplements are due.
              </p>
              <button
                onClick={requestNotificationPermission}
                className="kairos-btn-gold text-xs px-3 py-1.5"
              >
                Enable Notifications
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <button
                  onClick={() => updateReminders({ ...reminders, enabled: !reminders.enabled })}
                  className={`w-10 h-5 rounded-full transition-colors relative ${
                    reminders.enabled ? 'bg-kairos-gold' : 'bg-kairos-border'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      reminders.enabled ? 'left-5' : 'left-0.5'
                    }`}
                  />
                </button>
                <span className="text-sm font-body text-kairos-silver">
                  {reminders.enabled ? 'Reminders active' : 'Reminders off'}
                </span>
              </label>
              {reminders.enabled && (
                <div className="grid grid-cols-2 gap-3">
                  {TIMINGS.map((timing) => (
                    <div key={timing} className="space-y-1">
                      <label className="text-xs font-body text-kairos-silver-dark">
                        {TIMING_ICONS[timing]} {timing}
                      </label>
                      <input
                        type="time"
                        value={reminders.times[timing] || TIMING_DEFAULT_TIMES[timing]}
                        onChange={(e) =>
                          updateReminders({
                            ...reminders,
                            times: { ...reminders.times, [timing]: e.target.value },
                          })
                        }
                        className="kairos-input w-full text-xs"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Supplement Form */}
      {showAddForm && (
        <div className="kairos-card space-y-4">
          <h3 className="text-sm font-heading font-semibold text-white">Add Your Own Supplement</h3>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={newSupplement.name || ''}
              onChange={(e) => setNewSupplement({ ...newSupplement, name: e.target.value })}
              placeholder="Supplement name"
              className="kairos-input col-span-2"
              autoFocus
            />
            <input
              type="text"
              value={newSupplement.dosage || ''}
              onChange={(e) => setNewSupplement({ ...newSupplement, dosage: e.target.value })}
              placeholder="Dosage (e.g., 500mg)"
              className="kairos-input"
            />
            <select
              value={newSupplement.timing || 'Morning'}
              onChange={(e) => setNewSupplement({ ...newSupplement, timing: e.target.value })}
              className="kairos-input"
            >
              {TIMINGS.map((t) => (
                <option key={t} value={t}>{TIMING_ICONS[t]} {t}</option>
              ))}
            </select>
            <select
              value={newSupplement.category || 'supplement'}
              onChange={(e) => setNewSupplement({ ...newSupplement, category: e.target.value as SupplementItem['category'] })}
              className="kairos-input"
            >
              <option value="supplement">Supplement</option>
              <option value="medication">Medication</option>
              <option value="peptide">Peptide</option>
              <option value="injection">Injection</option>
            </select>
            <input
              type="text"
              value={newSupplement.rationale || ''}
              onChange={(e) => setNewSupplement({ ...newSupplement, rationale: e.target.value })}
              placeholder="Reason (optional)"
              className="kairos-input"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={addSupplement}
              disabled={!newSupplement.name || !newSupplement.dosage}
              className="kairos-btn-gold text-xs px-3 py-1.5 disabled:opacity-50"
            >
              Add Supplement
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-xs font-body text-kairos-silver border border-kairos-border rounded hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Grouped by Timing */}
      {TIMINGS.map((timing) => {
        const items = grouped[timing] || [];
        if (items.length === 0) return null;

        const timingTaken = items.filter((s) => s.taken).length;
        const allDone = timingTaken === items.length;
        const isExpanded = expandedTiming === timing || expandedTiming === null;

        return (
          <div key={timing} className="kairos-card space-y-3">
            <button
              onClick={() => setExpandedTiming(expandedTiming === timing ? null : timing)}
              className="flex items-center justify-between w-full"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{TIMING_ICONS[timing]}</span>
                <h3 className="text-sm font-heading font-semibold text-white">{timing}</h3>
                <span className="text-xs font-body text-kairos-silver-dark">
                  {timingTaken}/{items.length}
                </span>
                {allDone && <Check size={14} className="text-kairos-gold" />}
              </div>
              {isExpanded ? <ChevronUp size={16} className="text-kairos-silver" /> : <ChevronDown size={16} className="text-kairos-silver" />}
            </button>

            {isExpanded && (
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded border transition-colors ${
                      item.taken
                        ? 'border-kairos-gold/30 bg-kairos-gold/5'
                        : item.skipped
                        ? 'border-red-500/30 bg-red-500/5 opacity-60'
                        : 'border-kairos-border'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Status indicator */}
                      <div className="flex flex-col gap-1 pt-0.5">
                        {item.taken || item.skipped ? (
                          <button
                            onClick={() => undoStatus(item.id)}
                            className="text-xs text-kairos-silver-dark hover:text-white"
                            title="Undo"
                          >
                            {item.taken ? (
                              <div className="w-5 h-5 rounded-full bg-kairos-gold/20 border border-kairos-gold flex items-center justify-center">
                                <Check size={12} className="text-kairos-gold" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-red-500/20 border border-red-500 flex items-center justify-center">
                                <X size={12} className="text-red-400" />
                              </div>
                            )}
                          </button>
                        ) : (
                          <div className="flex gap-1">
                            <button
                              onClick={() => markTaken(item.id)}
                              className="w-5 h-5 rounded-full border border-kairos-gold/50 hover:bg-kairos-gold/20 flex items-center justify-center transition-colors"
                              title="Mark as taken"
                            >
                              <Check size={10} className="text-kairos-gold" />
                            </button>
                            <button
                              onClick={() => markSkipped(item.id)}
                              className="w-5 h-5 rounded-full border border-red-500/50 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                              title="Skip"
                            >
                              <X size={10} className="text-red-400" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-body font-semibold ${
                            item.taken ? 'text-kairos-gold line-through' : item.skipped ? 'text-red-400 line-through' : 'text-white'
                          }`}>
                            {item.name}
                          </p>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-body border ${CATEGORY_COLORS[item.category]}`}>
                            {item.category}
                          </span>
                          {item.source === 'trainer' && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-body border border-purple-500/30 bg-purple-500/10 text-purple-400">
                              trainer
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-body text-kairos-silver-dark">{item.dosage}</p>
                        {item.rationale && (
                          <p className="text-xs font-body text-kairos-silver-dark mt-1 italic">{item.rationale}</p>
                        )}
                        {item.taken && item.takenAt && (
                          <p className="text-[10px] font-body text-kairos-gold mt-1">
                            <Clock size={10} className="inline mr-1" />
                            Taken at {new Date(item.takenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>

                      {/* Remove (client-added only) */}
                      {item.source === 'client' && (
                        <button
                          onClick={() => removeSupplement(item.id)}
                          className="p-1 text-red-400/50 hover:text-red-400 transition-colors"
                          title="Remove"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Empty state */}
      {supplements.length === 0 && (
        <div className="kairos-card p-8 text-center">
          <Pill size={32} className="text-kairos-silver-dark mx-auto mb-3" />
          <p className="text-sm font-body text-kairos-silver">No supplement protocol loaded</p>
          <p className="text-xs font-body text-kairos-silver-dark mt-1">
            Your trainer can assign a protocol, or you can add your own supplements above.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-3 kairos-btn-gold text-xs px-4 py-2"
          >
            <Plus size={14} className="inline mr-1" />
            Add Supplement
          </button>
        </div>
      )}

      {/* Overdue alert */}
      {pendingCount > 0 && supplements.some((s) => !s.taken && !s.skipped && s.timing === 'Morning') && (
        <div className="p-3 rounded border border-yellow-500/30 bg-yellow-500/5 flex items-start gap-2">
          <AlertCircle size={16} className="text-yellow-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs font-body text-yellow-400">
            You have {pendingCount} pending supplement{pendingCount > 1 ? 's' : ''} for today. Remember to log them!
          </p>
        </div>
      )}
    </div>
  );
};
