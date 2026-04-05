import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useThemeStore from '../store/themeStore';
import { Icon } from '@iconify/react';
import { format, parseISO } from 'date-fns';
import useClientStore from '../store/clientStore';
import useProjectStore from '../store/projectStore';
import useInvoiceStore from '../store/invoiceStore';
import { clientAPI } from '../services/api';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import Modal from '../components/ui/Modal';

const LIQ_KEY = 'pk.d834e6dedfba17aa6c9e976b6843fee8';

function AddressDisplay({ client }) {
  const { address, addressLat, addressLng } = client;
  const { isDark } = useThemeStore();
  const [coords, setCoords] = useState(
    addressLat && addressLng ? { lat: addressLat, lng: addressLng } : null
  );
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    if (coords) return;
    const q = [address?.street, address?.city, address?.state, address?.zipCode, 'India']
      .filter(Boolean).join(', ');
    if (!q) return;
    setGeocoding(true);
    fetch(`https://api.locationiq.com/v1/search?key=${LIQ_KEY}&q=${encodeURIComponent(q)}&format=json&limit=1`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data[0]) {
          setCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
        }
      })
      .catch(() => {})
      .finally(() => setGeocoding(false));
  }, []);

  const mapStyle = isDark ? 'alidade_smooth_dark' : 'alidade_smooth';
  const mapSrc = coords
    ? `https://maps.locationiq.com/v3/staticmap?key=${LIQ_KEY}&center=${coords.lat},${coords.lng}&zoom=15&size=600x300&style=${mapStyle}&markers=icon:large-red-cutout|${coords.lat},${coords.lng}`
    : null;

  return (
    <div className="mt-1">
      <div className="flex items-start gap-3 p-2.5">
        <Icon icon="lucide:map-pin" className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
        <div className="text-sm space-y-0.5">
          {address?.street && <div className="text-gray-700 dark:text-gray-300">{address.street}</div>}
          <div className="text-gray-500 dark:text-gray-400">
            {[address?.city, address?.state, address?.zipCode].filter(Boolean).join(', ')}
          </div>
          {address?.country && (
            <div className="text-gray-400 dark:text-gray-500 text-xs">{address.country}</div>
          )}
        </div>
      </div>
      {geocoding && (
        <div className="mx-2.5 mt-1 h-40 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center gap-2">
          <Icon icon="lucide:loader-2" className="w-4 h-4 text-gray-400 animate-spin" />
          <span className="text-xs text-gray-400">Loading map…</span>
        </div>
      )}
      {mapSrc && (
        <div className="mx-2.5 mt-1">
          <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
            <img
              src={mapSrc}
              alt="Location map"
              className="w-full h-44 object-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
          <a
            href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <Icon icon="lucide:map" className="w-4 h-4" />
            Open in Google Maps
          </a>
        </div>
      )}
    </div>
  );
}

const PIPELINE_STAGES = [
  { key: 'lead', label: 'Lead', color: 'gray' },
  { key: 'contacted', label: 'Contacted', color: 'blue' },
  { key: 'quotation_sent', label: 'Quotation Sent', color: 'yellow' },
  { key: 'quotation_revised', label: 'Quotation Revised', color: 'orange' },
  { key: 'mvp_shared', label: 'MVP Shared', color: 'purple' },
  { key: 'converted', label: 'Converted', color: 'green' },
  { key: 'lost', label: 'Lost', color: 'red' },
  { key: 'inactive', label: 'Inactive', color: 'gray' },
];

export default function ClientDetail({ onMenuClick }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentClient, isLoading, fetchClient, deleteClient, clearCurrent } = useClientStore();
  const { projects, fetchProjects } = useProjectStore();
  const { invoices, fetchInvoices } = useInvoiceStore();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    fetchClient(id);
    fetchProjects({ clientId: id });
    fetchInvoices({ clientId: id });
    return () => clearCurrent();
  }, [id]);

  useEffect(() => {
    if (currentClient?.notes) {
      setNotes(currentClient.notes);
    }
  }, [currentClient]);

  const handleDelete = async () => {
    const result = await deleteClient(id);
    if (result.success) {
      navigate('/clients');
    }
  };

  const handleStageChange = async (e) => {
    try {
      await clientAPI.updatePipeline(id, { pipelineStage: e.target.value });
      fetchClient(id);
    } catch {
      // silently fail
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      const res = await clientAPI.addNote(id, { content: newNote.trim() });
      const data = res.data?.data || res.data;
      if (data?.notes) {
        setNotes(data.notes);
      } else {
        // Re-fetch client to get updated notes
        fetchClient(id);
      }
      setNewNote('');
    } catch {
      // silently fail
    }
    setAddingNote(false);
  };

  if (isLoading && !currentClient) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!currentClient) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 dark:text-gray-400">Client not found</p>
        <Button variant="ghost" onClick={() => navigate('/clients')} className="mt-4">
          Back to Clients
        </Button>
      </div>
    );
  }

  const client = currentClient;
  const stageInfo = PIPELINE_STAGES.find((s) => s.key === (client.pipelineStage || 'lead')) || PIPELINE_STAGES[0];

  return (
    <div>
      <Header
        title={client.name}
        breadcrumbs={[
          { label: 'Clients', href: '/clients' },
          { label: client.name },
        ]}
        onMenuClick={onMenuClick}
      >
        <Button
          variant="outline"
          size="sm"
          icon="lucide:pencil"
          onClick={() => navigate(`/clients/${id}/edit`)}
        >
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon="lucide:trash-2"
          onClick={() => setShowDeleteModal(true)}
          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          Delete
        </Button>
      </Header>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Notes Section */}
          <Card padding={false}>
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Notes ({notes.length})
              </h3>
            </div>
            <div className="p-5">
              {/* Add Note Form */}
              <div className="mb-4">
                <textarea
                  rows={3}
                  placeholder="Add a note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm
                    text-gray-900 placeholder-gray-400
                    focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                    dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100
                    dark:placeholder-gray-500 dark:focus:border-blue-400
                    outline-none transition-all duration-150 resize-none"
                />
                <div className="flex justify-end mt-2">
                  <Button
                    size="sm"
                    icon="lucide:plus"
                    onClick={handleAddNote}
                    loading={addingNote}
                    disabled={!newNote.trim()}
                  >
                    Add Note
                  </Button>
                </div>
              </div>

              {/* Notes list */}
              {notes.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                  No notes yet. Add your first note above.
                </p>
              ) : (
                <div className="space-y-3">
                  {notes.map((note, idx) => (
                    <div
                      key={note._id || idx}
                      className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800"
                    >
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {note.content || note.text || note}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {(note.author?.name || note.createdBy?.name) && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {note.author?.name || note.createdBy?.name}
                          </span>
                        )}
                        {note.createdAt && (
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {format(
                              typeof note.createdAt === 'string' ? parseISO(note.createdAt) : new Date(note.createdAt),
                              'MMM d, yyyy h:mm a'
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Projects */}
          <Card padding={false}>
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Projects ({projects.length})
              </h3>
              <Button
                size="sm"
                variant="ghost"
                icon="lucide:plus"
                onClick={() => navigate('/projects/new')}
              >
                Add
              </Button>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {projects.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-sm text-gray-400 dark:text-gray-500">No projects yet</p>
                </div>
              ) : (
                projects.map((project) => (
                  <div
                    key={project._id}
                    onClick={() => navigate(`/projects/${project._id}`)}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {project.name}
                      </p>
                      <Badge status={project.status} />
                    </div>
                    <Icon icon="lucide:chevron-right" className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Invoices */}
          <Card padding={false}>
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Invoices ({invoices.length})
              </h3>
              <Button
                size="sm"
                variant="ghost"
                icon="lucide:plus"
                onClick={() => navigate('/invoices/new')}
              >
                Add
              </Button>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {invoices.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-sm text-gray-400 dark:text-gray-500">No invoices yet</p>
                </div>
              ) : (
                invoices.map((invoice) => (
                  <div
                    key={invoice._id}
                    onClick={() => navigate(`/invoices/${invoice._id}`)}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {invoice.invoiceNumber || invoice.number || `Invoice #${invoice._id?.slice(-6)}`}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge status={invoice.status} />
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ₹{invoice.total?.toLocaleString('en-IN') || '0'}
                        </span>
                      </div>
                    </div>
                    <Icon icon="lucide:chevron-right" className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Client Info Sidebar */}
        <div className="space-y-6">
          <Card>
            <div className="flex flex-col items-center text-center mb-4">
              {client.logo ? (
                <img
                  src={client.logo}
                  alt={client.name}
                  className="w-16 h-16 rounded-2xl object-cover border border-gray-200 dark:border-gray-700"
                />
              ) : (
                <Avatar name={client.name} size="xl" />
              )}
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-3">
                {client.name}
              </h3>
              {client.companyName && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {client.companyName}
                </p>
              )}
            </div>

            {/* Pipeline Stage */}
            <div className="mb-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Stage
                </span>
                <Badge color={stageInfo.color} size="sm">{stageInfo.label}</Badge>
              </div>
              <select
                value={client.pipelineStage || 'lead'}
                onChange={handleStageChange}
                className="w-full text-sm rounded-lg border border-gray-200 bg-white px-3 py-2
                  text-gray-700 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300
                  outline-none focus:border-blue-500 transition-colors appearance-none"
              >
                {PIPELINE_STAGES.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Source */}
            {client.source && (
              <div className="mb-4 flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <Icon icon="lucide:link" className="w-4 h-4 text-gray-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Source</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{client.source}</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {client.email && (
                <a
                  href={`mailto:${client.email}`}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <Icon icon="lucide:mail" className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{client.email}</span>
                </a>
              )}
              {client.phoneNumber && (
                <a
                  href={`tel:${client.countryCode || ''}${client.phoneNumber}`}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <Icon icon="lucide:phone" className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{client.countryCode || '+91'} {client.phoneNumber}</span>
                </a>
              )}
              {client.whatsappNumber && (
                <a
                  href={`https://wa.me/${(client.countryCode || '+91').replace('+', '')}${client.whatsappNumber?.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <Icon icon="lucide:message-circle" className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{client.whatsappNumber}</span>
                </a>
              )}
              {client.website && (
                <a
                  href={client.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <Icon icon="lucide:globe" className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-blue-600 dark:text-blue-400 truncate hover:underline">{client.website}</span>
                </a>
              )}
              {(client.address?.street || client.address?.city || client.address?.state) && (
                <AddressDisplay client={client} />
              )}
              {client.gstNumber && (
                <div className="flex items-center gap-3 p-2.5">
                  <Icon icon="lucide:receipt" className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">GST</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{client.gstNumber}</p>
                  </div>
                </div>
              )}
              {client.cinNumber && (
                <div className="flex items-center gap-3 p-2.5">
                  <Icon icon="lucide:hash" className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">CIN</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{client.cinNumber}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 grid grid-cols-3 gap-2">
              {client.phoneNumber && (
                <a
                  href={`tel:${client.countryCode || ''}${client.phoneNumber}`}
                  className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                >
                  <Icon icon="lucide:phone" className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs text-blue-700 dark:text-blue-400">Call</span>
                </a>
              )}
              {client.email && (
                <a
                  href={`mailto:${client.email}`}
                  className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                >
                  <Icon icon="lucide:mail" className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs text-purple-700 dark:text-purple-400">Email</span>
                </a>
              )}
              {client.whatsappNumber && (
                <a
                  href={`https://wa.me/${(client.countryCode || '+91').replace('+', '')}${client.whatsappNumber?.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                >
                  <Icon icon="lucide:message-circle" className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs text-emerald-700 dark:text-emerald-400">WhatsApp</span>
                </a>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Client"
        size="sm"
      >
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Are you sure you want to delete "{client.name}"? This action cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
