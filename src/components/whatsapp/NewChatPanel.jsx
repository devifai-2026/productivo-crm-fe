import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import useClientStore from '../../store/clientStore';
import Avatar from '../ui/Avatar';
import Spinner from '../ui/Spinner';

// Normalise a client's WhatsApp number into the digits-only E.164 form the
// conversation API expects (e.g. countryCode "+91" + "9876543210" → "919876543210").
// Falls back to phoneNumber when no dedicated WhatsApp number is saved.
function toWaPhone(client) {
  const raw = client.whatsappNumber || client.phoneNumber || '';
  const cc = (client.countryCode || '+91').replace(/[^0-9]/g, '');
  const num = String(raw).replace(/[^0-9]/g, '');
  if (!num) return '';
  // If the number already starts with the country code, don't double-prefix it.
  return num.startsWith(cc) ? num : `${cc}${num}`;
}

function prettyPhone(client) {
  const cc = client.countryCode || '+91';
  const num = client.whatsappNumber || client.phoneNumber || '';
  return num ? `${cc} ${num}` : '';
}

// Slide-over directory of every client with a number, plus a raw-number fallback.
// One tap starts (or opens) a conversation.
export default function NewChatPanel({ onClose, onPick }) {
  const { clients, isLoading, fetchClients } = useClientStore();
  const [search, setSearch] = useState('');

  useEffect(() => {
    // Pull the full directory once; the list page paginates but here we want everyone.
    fetchClients({ limit: 1000 });
  }, [fetchClients]);

  // Only clients we can actually message, de-duplicated by resolved number.
  const contacts = useMemo(() => {
    const seen = new Set();
    return clients
      .map((c) => ({ client: c, phone: toWaPhone(c), pretty: prettyPhone(c) }))
      .filter((c) => c.phone)
      .filter((c) => {
        if (seen.has(c.phone)) return false;
        seen.add(c.phone);
        return true;
      })
      .sort((a, b) => (a.client.name || '').localeCompare(b.client.name || ''));
  }, [clients]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    const digits = q.replace(/[^0-9]/g, '');
    return contacts.filter((c) => {
      const byName = (c.client.name || '').toLowerCase().includes(q);
      const byCompany = (c.client.companyName || '').toLowerCase().includes(q);
      // Only match on number when the query actually contains digits — otherwise
      // `''.includes('')` is always true and every contact would "match".
      const byPhone = digits ? c.phone.includes(digits) : false;
      return byName || byCompany || byPhone;
    });
  }, [contacts, search]);

  // Raw-number fallback: if the search is all digits and matches no contact, offer to dial it.
  const rawDigits = search.replace(/[^0-9]/g, '');
  const showRawOption = rawDigits.length >= 7 && !filtered.some((c) => c.phone === rawDigits);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md h-full bg-white dark:bg-gray-950 shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 bg-gradient-to-r from-green-600 to-emerald-500 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">New conversation</h2>
              <p className="text-xs text-green-50/90 mt-0.5">
                {contacts.length} contact{contacts.length === 1 ? '' : 's'} with a number
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/15 transition-colors"
            >
              <Icon icon="lucide:x" className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="relative mt-4">
            <Icon
              icon="lucide:search"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/70"
            />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or number…"
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-white/15 placeholder-white/70 text-white rounded-xl outline-none focus:bg-white/25 focus:ring-2 focus:ring-white/40 transition"
            />
          </div>
        </div>

        {/* Contact list */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {isLoading && contacts.length === 0 ? (
            <div className="flex justify-center items-center h-40">
              <Spinner size="md" />
            </div>
          ) : (
            <>
              {showRawOption && (
                <button
                  onClick={() => onPick(rawDigits)}
                  className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-green-50 dark:hover:bg-green-900/10 border-b border-gray-100 dark:border-gray-800 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white shrink-0">
                    <Icon icon="lucide:message-circle-plus" className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Message +{rawDigits}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Start chat with this number
                    </p>
                  </div>
                </button>
              )}

              {filtered.length === 0 && !showRawOption ? (
                <div className="flex flex-col items-center justify-center h-40 text-center px-6">
                  <Icon icon="lucide:users" className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    {search ? 'No matching contacts' : 'No clients with a number yet'}
                  </p>
                </div>
              ) : (
                filtered.map(({ client, phone, pretty }) => (
                  <button
                    key={client._id}
                    onClick={() => onPick(phone, client)}
                    className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800/60 transition-colors group"
                  >
                    <Avatar name={client.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {client.name || 'Unnamed client'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1.5">
                        <Icon icon="ri:whatsapp-fill" className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        {pretty}
                        {client.companyName && (
                          <span className="text-gray-300 dark:text-gray-600">· {client.companyName}</span>
                        )}
                      </p>
                    </div>
                    <Icon
                      icon="lucide:message-circle"
                      className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-green-500 transition-colors shrink-0"
                    />
                  </button>
                ))
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
