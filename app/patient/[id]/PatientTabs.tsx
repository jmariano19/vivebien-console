'use client';

import { useState } from 'react';
import { 
  UserWithDetails, 
  HealthRoutine, 
  Message, 
  OperatorNote,
  CreditLedgerEntry 
} from '@/lib/db';

interface PatientTabsProps {
  user: UserWithDetails;
  routines: HealthRoutine[];
  messages: Message[];
  notes: OperatorNote[];
  creditHistory: CreditLedgerEntry[];
}

type TabId = 'profile' | 'credits' | 'routines' | 'messages' | 'wellness' | 'notes';

export default function PatientTabs({ user, routines, messages, notes, creditHistory }: PatientTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'credits', label: 'Credits', count: user.credits_balance ?? 0 },
    { id: 'routines', label: 'Routines', count: routines.length },
    { id: 'messages', label: 'Messages', count: messages.length },
    { id: 'wellness', label: 'Wellness' },
    { id: 'notes', label: 'Notes', count: notes.length },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Tab Navigation - Horizontal Scroll on Mobile */}
      <div className="border-b border-ebano/10 -mx-4 px-4 md:mx-0 md:px-0">
        <nav className="tab-container">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-barro/10 text-barro' : 'bg-ebano/5 text-text-muted'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in">
        {activeTab === 'profile' && <ProfileTab user={user} />}
        {activeTab === 'credits' && <CreditsTab user={user} creditHistory={creditHistory} />}
        {activeTab === 'routines' && <RoutinesTab routines={routines} userId={user.id} />}
        {activeTab === 'messages' && <MessagesTab messages={messages} />}
        {activeTab === 'wellness' && <WellnessTab user={user} messages={messages} />}
        {activeTab === 'notes' && <NotesTab notes={notes} userId={user.id} />}
      </div>
    </div>
  );
}

// ============ PROFILE TAB ============
function ProfileTab({ user }: { user: UserWithDetails }) {
  const vault = user.medical_vault || {};

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
      <div className="card">
        <h3 className="font-display font-semibold text-lg text-ebano mb-4">Basic Information</h3>
        <dl className="space-y-3">
          <InfoRow label="Phone" value={user.phone} />
          <InfoRow label="Name" value={user.name || '—'} />
          <InfoRow label="Preferred Name" value={user.preferred_name || '—'} />
          <InfoRow label="Language" value={user.preferred_language?.toUpperCase() || 'ES'} />
          <InfoRow label="Status" value={user.status} />
          <InfoRow label="Created" value={new Date(user.created_at).toLocaleDateString('es-ES', { 
            year: 'numeric', month: 'long', day: 'numeric' 
          })} />
        </dl>
      </div>

      <div className="card">
        <h3 className="font-display font-semibold text-lg text-ebano mb-4">Conversation State</h3>
        <dl className="space-y-3">
          <InfoRow label="Current Topic" value={user.current_topic || '—'} />
          <InfoRow label="Emotional State" value={user.emotional_state || '—'} />
          <InfoRow label="Needs Human" value={user.needs_human ? 'Yes' : 'No'} />
          <InfoRow label="Last Message" value={user.last_message_at 
            ? new Date(user.last_message_at).toLocaleString('es-ES')
            : '—'
          } />
        </dl>
      </div>

      <div className="card lg:col-span-2">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="font-display font-semibold text-lg text-ebano">Medical Vault</h3>
          <span className="sello-confianza text-xs">Protected</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          <VaultSection 
            title="Conditions" 
            items={vault.conditions?.map(c => `${c.name} (${c.status})`) || []} 
            emptyText="No conditions"
          />
          <VaultSection 
            title="Medications" 
            items={vault.medications?.map(m => `${m.name}${m.dosage ? ` - ${m.dosage}` : ''}`) || []} 
            emptyText="No medications"
          />
          <VaultSection 
            title="Allergies" 
            items={vault.allergies?.map(a => a.name) || []} 
            emptyText="No allergies"
          />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-text-muted font-body text-sm">{label}</dt>
      <dd className="font-body font-medium text-ebano text-right text-sm md:text-base">{value}</dd>
    </div>
  );
}

function VaultSection({ title, items, emptyText }: { title: string; items: string[]; emptyText: string }) {
  return (
    <div className="bg-chamomile/50 rounded-xl p-3 md:p-4">
      <h4 className="font-body font-semibold text-sm text-text-secondary mb-2">{title}</h4>
      {items.length > 0 ? (
        <ul className="space-y-1">
          {items.map((item, i) => (
            <li key={i} className="text-sm text-ebano">• {item}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-text-muted italic">{emptyText}</p>
      )}
    </div>
  );
}

// ============ CREDITS TAB ============
function CreditsTab({ user, creditHistory }: { user: UserWithDetails; creditHistory: CreditLedgerEntry[] }) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleAddCredits = async (isDeduct: boolean) => {
    if (!amount || !reason) return;
    setIsProcessing(true);
    setMessage(null);

    try {
      const res = await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          amount: isDeduct ? -parseInt(amount) : parseInt(amount),
          description: reason,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Credits updated! New balance: ${data.newBalance}` });
        setAmount('');
        setReason('');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update credits' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
      <div className="card">
        <h3 className="font-display font-semibold text-lg text-ebano mb-4">Manage Credits</h3>
        
        <div className="bg-chamomile/50 rounded-xl p-4 text-center mb-4">
          <p className="text-text-muted text-sm">Current Balance</p>
          <p className="font-display font-bold text-4xl text-ebano">{user.credits_balance ?? 0}</p>
        </div>

        {message && (
          <div className={`p-3 rounded-lg mb-4 text-sm ${
            message.type === 'success' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
          }`}>
            {message.text}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-body text-text-secondary mb-1">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter credit amount"
              className="input-field"
              min="1"
            />
          </div>
          
          <div>
            <label className="block text-sm font-body text-text-secondary mb-1">Reason</label>
            <select 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="input-field"
            >
              <option value="">Select reason...</option>
              <option value="Monthly renewal">Monthly renewal</option>
              <option value="Promotional bonus">Promotional bonus</option>
              <option value="Support compensation">Support compensation</option>
              <option value="Manual adjustment">Manual adjustment</option>
            </select>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleAddCredits(false)}
              disabled={isProcessing || !amount || !reason}
              className="flex-1 btn-primary disabled:opacity-50"
            >
              {isProcessing ? '...' : '+ Add'}
            </button>
            <button
              onClick={() => handleAddCredits(true)}
              disabled={isProcessing || !amount || !reason}
              className="flex-1 btn-secondary text-error border-error hover:bg-error/10 disabled:opacity-50"
            >
              − Deduct
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-display font-semibold text-lg text-ebano mb-4">Recent History</h3>
        
        {creditHistory.length === 0 ? (
          <p className="text-text-muted text-center py-8">No credit history</p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {creditHistory.slice(0, 10).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-3 bg-chamomile/30 rounded-lg">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ebano truncate">{entry.description || entry.change_type}</p>
                  <p className="text-xs text-text-muted">
                    {new Date(entry.created_at).toLocaleString('es-ES', { 
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
                <span className={`font-bold ${entry.change_amount > 0 ? 'text-success' : 'text-error'}`}>
                  {entry.change_amount > 0 ? '+' : ''}{entry.change_amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ ROUTINES TAB ============
function RoutinesTab({ routines, userId }: { routines: HealthRoutine[]; userId: string }) {
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const handleStatusChange = async (routineId: string, newStatus: string) => {
    setIsProcessing(routineId);
    try {
      const res = await fetch('/api/routines', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routineId, status: newStatus }),
      });
      if (res.ok) {
        setTimeout(() => window.location.reload(), 500);
      }
    } catch {
      // ignore
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="space-y-4">
      {routines.length === 0 ? (
        <div className="card text-center py-12">
          <svg className="w-16 h-16 text-text-muted/30 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-text-muted">No routines set up yet</p>
        </div>
      ) : (
        routines.map((routine) => (
          <div key={routine.id} className="card">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-display font-semibold text-lg text-ebano capitalize">
                    {routine.type} Routine
                  </h4>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    routine.status === 'active' ? 'bg-success/10 text-success' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {routine.status}
                  </span>
                </div>
                
                <div className="mt-3 space-y-2 text-sm">
                  {routine.configuration?.bedtime && (
                    <p className="text-text-secondary">
                      🌙 Bedtime: <span className="text-ebano font-medium">{routine.configuration.bedtime}</span>
                    </p>
                  )}
                  {routine.configuration?.wake_time && (
                    <p className="text-text-secondary">
                      ☀️ Wake: <span className="text-ebano font-medium">{routine.configuration.wake_time}</span>
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleStatusChange(routine.id, routine.status === 'active' ? 'paused' : 'active')}
                disabled={isProcessing === routine.id}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  routine.status === 'active'
                    ? 'bg-warning/10 text-warning hover:bg-warning/20'
                    : 'bg-success/10 text-success hover:bg-success/20'
                } disabled:opacity-50`}
              >
                {isProcessing === routine.id ? '...' : routine.status === 'active' ? 'Pause' : 'Resume'}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ============ MESSAGES TAB ============
function MessagesTab({ messages }: { messages: Message[] }) {
  const sortedMessages = [...messages].reverse();

  return (
    <div className="card">
      <h3 className="font-display font-semibold text-lg text-ebano mb-4">Conversation History</h3>
      
      {messages.length === 0 ? (
        <p className="text-text-muted text-center py-8">No messages yet</p>
      ) : (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {sortedMessages.map((msg) => (
            <div 
              key={msg.id} 
              className={msg.role === 'user' ? 'bubble-user' : 'bubble-assistant'}
            >
              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-white/70' : 'text-text-muted'}`}>
                {new Date(msg.created_at).toLocaleTimeString('es-ES', { 
                  hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ WELLNESS TAB ============
function WellnessTab({ user, messages }: { user: UserWithDetails; messages: Message[] }) {
  // Analyze emotional patterns from messages
  const emotionalStates = messages
    .filter(m => m.metadata?.emotional_state || m.role === 'user')
    .slice(0, 20);

  const stateEmoji: Record<string, string> = {
    neutral: '😐',
    anxious: '😰',
    grateful: '🙏',
    frustrated: '😤',
    sad: '😢',
    urgent: '🚨',
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="card">
        <h3 className="font-display font-semibold text-lg text-ebano mb-4">Current State</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-chamomile/50 rounded-xl p-4 text-center">
            <p className="text-3xl mb-1">{stateEmoji[user.emotional_state || 'neutral'] || '😐'}</p>
            <p className="text-sm text-text-secondary capitalize">{user.emotional_state || 'neutral'}</p>
          </div>
          <div className="bg-chamomile/50 rounded-xl p-4 text-center">
            <p className="text-3xl mb-1">💬</p>
            <p className="text-sm text-text-secondary capitalize">{user.current_topic || 'general'}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-display font-semibold text-lg text-ebano mb-4">Recent Emotional Timeline</h3>
        
        {emotionalStates.length === 0 ? (
          <p className="text-text-muted text-center py-8">Not enough data yet</p>
        ) : (
          <div className="space-y-2">
            {emotionalStates.slice(0, 10).map((msg, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-chamomile/30">
                <span className="text-lg">{stateEmoji[msg.metadata?.emotional_state] || '💬'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ebano truncate">{msg.content.slice(0, 50)}...</p>
                  <p className="text-xs text-text-muted">
                    {new Date(msg.created_at).toLocaleString('es-ES', { 
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ NOTES TAB ============
function NotesTab({ notes, userId }: { notes: OperatorNote[]; userId: string }) {
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newNote.trim()) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          note: newNote,
          createdBy: 'operator',
        }),
      });

      if (res.ok) {
        setNewNote('');
        setTimeout(() => window.location.reload(), 500);
      }
    } catch {
      // ignore
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="card">
        <h3 className="font-display font-semibold text-lg text-ebano mb-4">Add Note</h3>
        
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Write a note about this patient..."
          className="input-field min-h-[100px] resize-none"
        />
        
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !newNote.trim()}
          className="btn-primary w-full mt-4 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Save Note'}
        </button>
      </div>

      <div className="card">
        <h3 className="font-display font-semibold text-lg text-ebano mb-4">Previous Notes</h3>
        
        {notes.length === 0 ? (
          <p className="text-text-muted text-center py-8">No notes yet</p>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div key={note.id} className="p-4 bg-chamomile/30 rounded-xl">
                <p className="text-ebano whitespace-pre-wrap">{note.note}</p>
                <div className="flex items-center justify-between mt-3 text-xs text-text-muted">
                  <span>{note.created_by}</span>
                  <span>
                    {new Date(note.created_at).toLocaleString('es-ES', { 
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
