'use client';

// Chat-style mentor <-> mentee feedback modal. Same component used on
// /faculty/mentors, /faculty/mentees-sip, and the student side. Author
// role of each message is derived from the response so we can style
// bubbles asymmetrically without extra state.

import { useEffect, useRef, useState } from 'react';
import { FiX, FiSend, FiUser, FiExternalLink, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';
import apiClient from '@/app/lib/apiClient';
import useAuthStore from '@/app/store/authStore';

interface Author {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  approvedRole?: string | null;
}

interface Message {
  id: string;
  body: string;
  createdAt: string;
  mentorUserId: string;
  studentUserId: string;
  authorUserId: string;
  Author?: Author | null;
}

export interface MentorFeedbackModalProps {
  open: boolean;
  onClose: () => void;
  mentorUserId: string;
  studentUserId: string;
  // Displayed at the top of the modal
  headerTitle: string;
  headerSubtitle?: string;
  // Optional URL used by the "View Profile" button in the top-left.
  // Omit to hide the button.
  profileHref?: string | null;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  if (sameDay) return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function authorLabel(a: Author | null | undefined) {
  if (!a) return 'Unknown';
  return `${a.firstName || ''} ${a.lastName || ''}`.trim() || a.email;
}

export default function MentorFeedbackModal({
  open,
  onClose,
  mentorUserId,
  studentUserId,
  headerTitle,
  headerSubtitle,
  profileHref,
}: MentorFeedbackModalProps) {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/mentor-feedback/thread', {
        params: { mentorId: mentorUserId, studentId: studentUserId },
      });
      setMessages(data.messages || []);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mentorUserId, studentUserId]);

  useEffect(() => {
    if (!open) return;
    // scroll to bottom whenever messages change
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      const { data } = await apiClient.post('/mentor-feedback/thread', {
        mentorId: mentorUserId,
        studentId: studentUserId,
        body,
      });
      setMessages((prev) => [...prev, data.message]);
      setText('');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  const myId = user?.id;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col overflow-hidden"
        style={{ maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2 min-w-0">
            {profileHref ? (
              <a
                href={profileHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-blue-700 hover:bg-blue-50 border border-blue-200"
                title="Open profile in new tab"
              >
                <FiExternalLink className="w-3.5 h-3.5" /> View profile
              </a>
            ) : null}
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate">{headerTitle}</div>
              {headerSubtitle && <div className="text-[11px] text-gray-500 truncate">{headerSubtitle}</div>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={load}
              className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100"
              title="Refresh"
            >
              <FiRefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100"
              title="Close"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Thread */}
        <div
          ref={scrollerRef}
          className="flex-1 overflow-y-auto px-3 py-3 bg-gray-50"
        >
          {loading ? (
            <div className="text-xs text-gray-500 text-center py-8">Loading…</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-10">
              <div className="mx-auto w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-2">
                <FiUser className="w-5 h-5" />
              </div>
              <div className="text-sm text-gray-700 font-medium">No messages yet</div>
              <div className="text-xs text-gray-500 mt-1">Start a conversation with your mentee.</div>
            </div>
          ) : (
            <ul className="space-y-2">
              {messages.map((m) => {
                const mine = m.authorUserId === myId;
                const fromMentor = m.authorUserId === m.mentorUserId;
                return (
                  <li key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                      mine
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : (fromMentor
                            ? 'bg-white text-gray-900 border border-gray-200 rounded-bl-sm'
                            : 'bg-emerald-50 text-emerald-900 border border-emerald-100 rounded-bl-sm')
                    }`}>
                      <div className={`text-[10px] font-semibold mb-0.5 ${
                        mine ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {authorLabel(m.Author)}
                        {' · '}
                        {fromMentor ? 'Mentor' : 'Mentee'}
                      </div>
                      <div className="whitespace-pre-wrap break-words">{m.body}</div>
                      <div className={`text-[10px] mt-1 ${mine ? 'text-blue-100' : 'text-gray-400'}`}>
                        {fmtTime(m.createdAt)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-gray-200 p-2 bg-white">
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Write a message… (Enter to send, Shift+Enter for newline)"
              rows={2}
              maxLength={4000}
              className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={send}
              disabled={sending || !text.trim()}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              <FiSend className="w-4 h-4" /> {sending ? '…' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
