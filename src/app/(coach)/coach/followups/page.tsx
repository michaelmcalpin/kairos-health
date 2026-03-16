'use client';

import { useState } from 'react';
import {
  ClipboardList,
  CheckCircle,
  AlertTriangle,
  Calendar,
} from 'lucide-react';

interface FollowUp {
  id: string;
  clientName: string;
  clientInitials: string;
  description: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  completed: boolean;
  createdAt: string;
}

const MOCK_FOLLOWUPS: FollowUp[] = [
  {
    id: '1',
    clientName: 'Sarah Mitchell',
    clientInitials: 'SM',
    description: 'Review latest blood work results and discuss lipid levels',
    dueDate: '2026-03-08',
    priority: 'high',
    category: 'Lab Review',
    completed: false,
    createdAt: '2026-03-01',
  },
  {
    id: '2',
    clientName: 'James Chen',
    clientInitials: 'JC',
    description: 'Prescription renewal for cardiovascular support protocol',
    dueDate: '2026-03-07',
    priority: 'high',
    category: 'Prescription Renewal',
    completed: false,
    createdAt: '2026-02-28',
  },
  {
    id: '3',
    clientName: 'Margaret Rodriguez',
    clientInitials: 'MR',
    description: 'Monthly check-in call to review progress and adjust nutrition plan',
    dueDate: '2026-03-10',
    priority: 'medium',
    category: 'Check-in Call',
    completed: false,
    createdAt: '2026-03-02',
  },
  {
    id: '4',
    clientName: 'David Park',
    clientInitials: 'DP',
    description: 'Protocol compliance check - verify supplement adherence',
    dueDate: '2026-03-12',
    priority: 'medium',
    category: 'Protocol Check',
    completed: false,
    createdAt: '2026-03-03',
  },
  {
    id: '5',
    clientName: 'Elizabeth Thompson',
    clientInitials: 'ET',
    description: 'Schedule and conduct biometric assessment',
    dueDate: '2026-03-15',
    priority: 'low',
    category: 'Assessment',
    completed: false,
    createdAt: '2026-03-04',
  },
  {
    id: '6',
    clientName: 'Robert Johnson',
    clientInitials: 'RJ',
    description: 'Review genetic testing results and personalized recommendations',
    dueDate: '2026-03-06',
    priority: 'high',
    category: 'Lab Review',
    completed: false,
    createdAt: '2026-02-25',
  },
  {
    id: '7',
    clientName: 'Amanda Foster',
    clientInitials: 'AF',
    description: 'Quarterly wellness review and goal setting session',
    dueDate: '2026-03-20',
    priority: 'medium',
    category: 'Check-in Call',
    completed: true,
    createdAt: '2026-02-20',
  },
  {
    id: '8',
    clientName: 'Thomas Wheeler',
    clientInitials: 'TW',
    description: 'Follow up on insulin sensitivity protocol modifications',
    dueDate: '2026-03-09',
    priority: 'medium',
    category: 'Protocol Check',
    completed: false,
    createdAt: '2026-03-05',
  },
  {
    id: '9',
    clientName: 'Patricia Wong',
    clientInitials: 'PW',
    description: 'Prescription renewal for sleep optimization medication',
    dueDate: '2026-03-11',
    priority: 'low',
    category: 'Prescription Renewal',
    completed: false,
    createdAt: '2026-03-03',
  },
  {
    id: '10',
    clientName: 'Michael Stanford',
    clientInitials: 'MS',
    description: 'Lab review - metabolic panel and inflammation markers',
    dueDate: '2026-03-08',
    priority: 'high',
    category: 'Lab Review',
    completed: false,
    createdAt: '2026-03-01',
  },
];

type FilterTab = 'All' | 'Due Today' | 'Overdue' | 'Upcoming' | 'Completed';

export default function Page() {
  const [followUps, setFollowUps] = useState<FollowUp[]>(MOCK_FOLLOWUPS);
  const [activeTab, setActiveTab] = useState<FilterTab>('All');

  const today = new Date('2026-03-08');

  const getFilteredFollowUps = () => {
    return followUps.filter((item) => {
      const itemDate = new Date(item.dueDate);

      switch (activeTab) {
        case 'Due Today':
          return !item.completed && itemDate.toDateString() === today.toDateString();
        case 'Overdue':
          return !item.completed && itemDate < today;
        case 'Upcoming':
          return !item.completed && itemDate > today;
        case 'Completed':
          return item.completed;
        case 'All':
        default:
          return true;
      }
    });
  };

  const toggleComplete = (id: string) => {
    setFollowUps(
      followUps.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const isOverdue = (item: FollowUp) => {
    return !item.completed && new Date(item.dueDate) < today;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-400';
      case 'medium':
        return 'text-kairos-gold';
      case 'low':
        return 'text-kairos-silver-dark';
      default:
        return 'text-kairos-silver-dark';
    }
  };

  const getPriorityBgColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-900 bg-opacity-30';
      case 'medium':
        return 'bg-yellow-900 bg-opacity-20';
      case 'low':
        return 'bg-gray-700 bg-opacity-20';
      default:
        return 'bg-gray-700 bg-opacity-20';
    }
  };

  const filteredItems = getFilteredFollowUps();
  const pendingCount = followUps.filter(
    (item) => !item.completed && new Date(item.dueDate) >= today
  ).length;
  const overdueCount = followUps.filter(
    (item) => !item.completed && new Date(item.dueDate) < today
  ).length;
  const dueCount = followUps.filter(
    (item) => !item.completed && new Date(item.dueDate).toDateString() === today.toDateString()
  ).length;
  const completedThisWeek = followUps.filter((item) => {
    if (!item.completed) return false;
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(item.createdAt) >= weekAgo;
  }).length;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-kairos-card rounded-kairos-sm border border-kairos-border">
            <ClipboardList className="w-6 h-6 text-kairos-gold" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-3xl text-white">Follow-ups</h1>
            <p className="text-sm text-kairos-silver-dark mt-1">
              Manage client follow-ups and tasks
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="kairos-card p-4 border border-kairos-border">
            <p className="text-xs text-kairos-silver-dark font-body mb-2">Pending</p>
            <p className="font-heading font-bold text-2xl text-white">{pendingCount}</p>
          </div>
          <div className="kairos-card p-4 border border-kairos-border">
            <p className="text-xs text-kairos-silver-dark font-body mb-2">Overdue</p>
            <p className="font-heading font-bold text-2xl text-red-400">{overdueCount}</p>
          </div>
          <div className="kairos-card p-4 border border-kairos-border">
            <p className="text-xs text-kairos-silver-dark font-body mb-2">Due Today</p>
            <p className="font-heading font-bold text-2xl text-kairos-gold">{dueCount}</p>
          </div>
          <div className="kairos-card p-4 border border-kairos-border">
            <p className="text-xs text-kairos-silver-dark font-body mb-2">Completed (Week)</p>
            <p className="font-heading font-bold text-2xl text-green-400">{completedThisWeek}</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {(['All', 'Due Today', 'Overdue', 'Upcoming', 'Completed'] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-kairos-sm font-body text-sm font-semibold transition-all ${
              activeTab === tab
                ? 'kairos-btn-gold text-black'
                : 'kairos-btn-outline text-kairos-silver-dark hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Follow-ups List */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="kairos-card p-8 text-center border border-kairos-border">
            <CheckCircle className="w-12 h-12 text-kairos-gold mx-auto mb-4 opacity-50" />
            <p className="text-kairos-silver-dark font-body">
              {activeTab === 'Completed'
                ? 'No completed follow-ups yet'
                : 'No follow-ups in this category'}
            </p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className={`kairos-card border rounded-kairos-sm p-5 transition-all ${
                isOverdue(item)
                  ? 'border-red-500 border-opacity-50 bg-kairos-card-hover'
                  : 'border-kairos-border'
              } ${item.completed ? 'opacity-60' : ''}`}
            >
              <div className="flex gap-4">
                {/* Checkbox */}
                <button
                  onClick={() => toggleComplete(item.id)}
                  className="flex-shrink-0 mt-1"
                >
                  <div
                    className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                      item.completed
                        ? 'bg-kairos-gold border-kairos-gold'
                        : 'border-kairos-silver-dark hover:border-kairos-gold'
                    }`}
                  >
                    {item.completed && (
                      <CheckCircle className="w-4 h-4 text-black" strokeWidth={3} />
                    )}
                  </div>
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                    {/* Client Info */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-kairos-gold flex items-center justify-center flex-shrink-0">
                        <span className="text-black font-heading font-bold text-sm">
                          {item.clientInitials}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <h3
                          className={`font-heading font-semibold ${
                            item.completed
                              ? 'text-kairos-silver-dark line-through'
                              : 'text-white'
                          }`}
                        >
                          {item.clientName}
                        </h3>
                        <p className="text-xs text-kairos-silver-dark font-body">
                          {item.category}
                        </p>
                      </div>
                    </div>

                    {/* Priority Badge */}
                    <div className={`flex-shrink-0 px-3 py-1 rounded-kairos-sm text-xs font-semibold kairos-label ${getPriorityBgColor(item.priority)} ${getPriorityColor(item.priority)}`}>
                      {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                    </div>
                  </div>

                  {/* Description */}
                  <p className={`font-body text-sm mb-3 ${item.completed ? 'text-kairos-silver-dark line-through' : 'text-kairos-silver-dark'}`}>
                    {item.description}
                  </p>

                  {/* Due Date Info */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-kairos-gold" />
                      <span
                        className={`text-xs font-body font-semibold ${
                          isOverdue(item)
                            ? 'text-red-400'
                            : new Date(item.dueDate).toDateString() === today.toDateString()
                              ? 'text-kairos-gold'
                              : 'text-kairos-silver-dark'
                        }`}
                      >
                        {item.dueDate}
                      </span>
                    </div>
                    {isOverdue(item) && (
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        <span className="text-xs font-semibold text-red-400 font-body">
                          Overdue
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
