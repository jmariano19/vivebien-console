'use client';

import { useState } from 'react';
import {
  UserWithDetails,
  Message,
  OperatorNote,
} from '@/lib/db';

interface PatientTabsProps {
  user: UserWithDetails;
  messages: Message[];
  notes: OperatorNote[];
}

type TabId = 'profile' | 'messages' | 'wellness' | 'notes';

export default function PatientTabs({ user, messages, notes }: PatientTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'profile', label: 'Profile' },
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

// ============ MESSAGES TAB ============
function MessagesTab({ messages }: { messages: Message[] }) {
  const sortedMessages = [...messages].reverse();

  // Group messages by date
  const groupedMessages = sortedMessages.reduce((groups: { [key: string]: Message[] }, msg) => {
    const date = new Date(msg.created_at).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {});

  // Check mark component for read receipts
  const ReadReceipt = () => (
    <svg className="w-4 h-4 inline-block ml-1 text-blue-400" viewBox="0 0 16 11" fill="none">
      <path d="M11.071 0.929L4.5 7.5L1.929 4.929" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14.571 0.929L8 7.5M8 7.5L6.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  return (
    <div className="whatsapp-chat-container">
      {/* Chat Header */}
      <div className="whatsapp-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          <div>
            <p className="font-semibold text-white text-sm">Conversation</p>
            <p className="text-xs text-white/70">{messages.length} messages</p>
          </div>
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="whatsapp-messages-area">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center bg-white/90 rounded-lg px-6 py-4 shadow-sm">
              <p className="text-gray-500 text-sm">No messages yet</p>
              <p className="text-xs text-gray-400 mt-1">Messages will appear here</p>
            </div>
          </div>
        ) : (
          <div className="whatsapp-messages-scroll">
            {Object.entries(groupedMessages).map(([date, msgs]) => (
              <div key={date}>
                {/* Date Separator */}
                <div className="flex justify-center my-4">
                  <span className="whatsapp-date-badge">{date}</span>
                </div>

                {/* Messages for this date */}
                {msgs.map((msg, index) => (
                  <div
                    key={msg.id}
                    className={`whatsapp-message-row ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className={msg.role === 'user' ? 'whatsapp-bubble-user' : 'whatsapp-bubble-assistant'}>
                      {/* Message tail */}
                      <div className={msg.role === 'user' ? 'whatsapp-tail-user' : 'whatsapp-tail-assistant'} />

                      {/* Message content */}
                      <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{msg.content}</p>

                      {/* Timestamp and read receipt */}
                      <div className={`flex items-center justify-end gap-1 mt-1 ${msg.role === 'user' ? 'text-white/60' : 'text-gray-400'}`}>
                        <span className="text-[11px]">
                          {new Date(msg.created_at).toLocaleTimeString('es-ES', {
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                        {msg.role === 'user' && <ReadReceipt />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat Input Area (read-only indicator) */}
      <div className="whatsapp-input-area">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>Read-only conversation view</span>
        </div>
      </div>
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
