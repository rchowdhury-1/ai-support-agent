import { useEffect, useState } from 'react';
import { UserPlus, SlidersHorizontal } from 'lucide-react';
import { api } from '../lib/api';
import { Lead } from '../types';
import clsx from 'clsx';
import toast from 'react-hot-toast';

type StatusFilter = 'all' | 'new' | 'contacted' | 'closed';

const statusClass: Record<string, string> = {
  new: 'status-open',
  contacted: 'status-escalated',
  closed: 'status-closed',
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    api.get('/leads')
      .then((res) => setLeads(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id: string, status: Lead['status']) => {
    try {
      const res = await api.put(`/leads/${id}/status`, { status });
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...res.data } : l)));
      toast.success(`Lead marked as ${status}`);
    } catch {
      toast.error('Failed to update lead');
    }
  };

  const filtered = filter === 'all' ? leads : leads.filter((l) => l.status === filter);

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Leads</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Questions your knowledge base couldn't answer
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <div className="flex rounded-xl p-1 gap-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {(['all', 'new', 'contacted', 'closed'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 capitalize"
                style={filter === s
                  ? { background: 'var(--primary)', color: 'white' }
                  : { color: 'var(--text-muted)', background: 'transparent' }
                }
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid var(--border)' }}>
              <UserPlus className="w-5 h-5" style={{ color: 'var(--primary-light)' }} />
            </div>
            <p className="text-sm font-medium text-white mb-1">No leads yet</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Leads are captured when customers ask questions outside your knowledge base
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Visitor', 'Question', 'Agent', 'Status', 'Date', ''].map((h) => (
                  <th key={h} className="text-left text-xs font-medium uppercase tracking-wider px-6 py-3" style={{ color: 'var(--text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => (
                <tr key={lead.id} className="transition-all duration-150" style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(139,92,246,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-white">{lead.visitor_name ?? 'Anonymous'}</p>
                    {lead.visitor_email && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{lead.visitor_email}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm max-w-xs" style={{ color: 'var(--text-muted)' }}>
                    <p className="truncate">{lead.question}</p>
                  </td>
                  <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-muted)' }}>{lead.agent_name}</td>
                  <td className="px-6 py-4">
                    <span className={clsx('px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', statusClass[lead.status])}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                    {new Date(lead.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    {lead.status !== 'closed' && (
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) updateStatus(lead.id, e.target.value as Lead['status']);
                        }}
                        className="text-xs rounded-lg px-2 py-1.5"
                        style={{ background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                      >
                        <option value="">Update...</option>
                        {lead.status === 'new' && <option value="contacted">Mark Contacted</option>}
                        <option value="closed">Close</option>
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
