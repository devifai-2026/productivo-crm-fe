import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { whatsappAPI } from '../../services/api';
import Spinner from '../ui/Spinner';

// Replace {{1}}, {{2}}… in the template body with the user-supplied values for a live preview.
function fillBody(bodyText, values) {
  return bodyText.replace(/\{\{(\d+)\}\}/g, (_, n) => {
    const v = values[Number(n) - 1];
    return v && v.trim() ? v : `{{${n}}}`;
  });
}

export default function TemplatePicker({ phone, onClose, onSent }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [selected, setSelected]   = useState(null);
  const [values, setValues]       = useState([]);
  const [sending, setSending]     = useState(false);

  useEffect(() => {
    let alive = true;
    whatsappAPI
      .getTemplates()
      .then((res) => {
        if (!alive) return;
        setTemplates(res.data?.data || []);
        setLoading(false);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err.response?.data?.error || 'Failed to load templates');
        setLoading(false);
      });
    return () => { alive = false; };
  }, []);

  const pick = (tpl) => {
    setSelected(tpl);
    setValues(Array.from({ length: tpl.variableCount }, () => ''));
  };

  const canSend = selected && values.every((v) => v.trim().length > 0);

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    setError('');
    const res = await onSent(selected.id, values);
    setSending(false);
    if (res?.success) onClose();
    else setError(res?.error || 'Failed to send template');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Icon icon="lucide:layout-template" className="w-5 h-5 text-green-500" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {selected ? selected.name : 'Send a template'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <Icon icon="lucide:x" className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex justify-center py-10"><Spinner size="md" /></div>
          ) : error && !selected ? (
            <p className="text-sm text-red-500 text-center py-6">{error}</p>
          ) : !selected ? (
            // ── Template list ──
            templates.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                No approved templates yet. Create one in WABridge and wait for approval.
              </p>
            ) : (
              <div className="space-y-2">
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => pick(tpl)}
                    className="w-full text-left p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{tpl.name}</span>
                      <span className="text-[10px] uppercase tracking-wide text-gray-400">{tpl.category}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{tpl.bodyText}</p>
                    {tpl.variableCount > 0 && (
                      <span className="inline-block mt-1 text-[10px] text-green-600 dark:text-green-400">
                        {tpl.variableCount} variable{tpl.variableCount > 1 ? 's' : ''} to fill
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )
          ) : (
            // ── Fill variables + preview ──
            <div className="space-y-4">
              <button
                onClick={() => setSelected(null)}
                className="text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
              >
                <Icon icon="lucide:arrow-left" className="w-3.5 h-3.5" /> Back to templates
              </button>

              {selected.variableCount === 0 ? (
                <p className="text-sm text-gray-500">This template has no variables — ready to send.</p>
              ) : (
                <div className="space-y-3">
                  {values.map((val, i) => (
                    <div key={i}>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Variable {`{{${i + 1}}}`}
                      </label>
                      <input
                        value={val}
                        onChange={(e) => {
                          const next = [...values];
                          next[i] = e.target.value;
                          setValues(next);
                        }}
                        placeholder={`Value for {{${i + 1}}}`}
                        className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-green-500 dark:text-gray-100"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Live preview */}
              <div className="bg-green-50 dark:bg-green-900/10 rounded-xl p-3 border border-green-100 dark:border-green-900/30">
                <p className="text-[10px] uppercase tracking-wide text-green-600 dark:text-green-400 mb-1">Preview</p>
                <p className="text-sm whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                  {fillBody(selected.bodyText, values)}
                </p>
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        {selected && (
          <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={!canSend || sending}
              className="px-4 py-2 text-sm rounded-lg bg-green-500 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium inline-flex items-center gap-1.5"
            >
              {sending ? <Spinner size="sm" color="white" /> : <Icon icon="lucide:send" className="w-4 h-4" />}
              Send template
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
