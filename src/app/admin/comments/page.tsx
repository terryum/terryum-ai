'use client';

import { useCallback, useEffect, useState } from 'react';

type Status = 'visible' | 'hidden' | 'spam';
type Filter = 'all' | Status;

interface AdminComment {
  id: string;
  post_slug: string;
  author_name: string;
  author_email: string;
  content: string;
  status: Status;
  created_at: string;
}

const STATUS_OPTIONS: Filter[] = ['all', 'visible', 'hidden', 'spam'];

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = filter === 'all' ? '' : `?status=${filter}`;
      const res = await fetch(`/api/admin/comments${qs}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { comments: AdminComment[] };
      setComments(data.comments ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async (c: AdminComment, status: Status) => {
    const res = await fetch(`/api/posts/${c.post_slug}/comments/${c.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) void load();
    else alert(`Update failed: HTTP ${res.status}`);
  };

  const remove = async (c: AdminComment) => {
    if (!confirm(`Delete comment by ${c.author_name}?`)) return;
    const res = await fetch(`/api/posts/${c.post_slug}/comments/${c.id}`, { method: 'DELETE' });
    if (res.ok) void load();
    else alert(`Delete failed: HTTP ${res.status}`);
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium">Comments</h1>
        <div className="flex gap-1">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => setFilter(opt)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                filter === opt
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:text-accent border border-line-default'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {loading ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-text-muted">No comments.</p>
      ) : (
        <div className="overflow-x-auto border border-line-default rounded-md">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line-default bg-bg-secondary text-left">
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Slug</th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Content</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {comments.map((c) => (
                <tr key={c.id} className="border-b border-line-default last:border-b-0 align-top">
                  <td className="px-3 py-2 text-text-muted whitespace-nowrap">
                    {new Date(c.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{c.post_slug}</td>
                  <td className="px-3 py-2">{c.author_name}</td>
                  <td className="px-3 py-2 text-text-muted">{c.author_email}</td>
                  <td className="px-3 py-2 max-w-md whitespace-pre-wrap break-words">{c.content}</td>
                  <td className="px-3 py-2">{c.status}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {c.status !== 'visible' && (
                      <button
                        onClick={() => updateStatus(c, 'visible')}
                        className="text-xs px-2 py-0.5 mr-1 border border-line-default rounded hover:text-accent"
                      >
                        show
                      </button>
                    )}
                    {c.status !== 'hidden' && (
                      <button
                        onClick={() => updateStatus(c, 'hidden')}
                        className="text-xs px-2 py-0.5 mr-1 border border-line-default rounded hover:text-accent"
                      >
                        hide
                      </button>
                    )}
                    {c.status !== 'spam' && (
                      <button
                        onClick={() => updateStatus(c, 'spam')}
                        className="text-xs px-2 py-0.5 mr-1 border border-line-default rounded hover:text-accent"
                      >
                        spam
                      </button>
                    )}
                    <button
                      onClick={() => remove(c)}
                      className="text-xs px-2 py-0.5 border border-red-300 text-red-500 rounded hover:bg-red-50"
                    >
                      delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
