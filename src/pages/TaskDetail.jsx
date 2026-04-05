import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import useTaskStore from '../store/taskStore';
import useAuthStore from '../store/authStore';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import Modal from '../components/ui/Modal';

const statusOptions = ['backlog', 'todo', 'in_progress', 'in_review', 'done'];

export default function TaskDetail({ onMenuClick }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentTask, isLoading, fetchTask, updateTask, deleteTask, clearCurrent } = useTaskStore();
  const { user } = useAuthStore();
  const canDelete = user?.role === 'superadmin' || user?.role === 'org_admin';
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  useEffect(() => {
    fetchTask(id);
    return () => clearCurrent();
  }, [id]);

  const handleStatusChange = async (status) => {
    const result = await updateTask(id, { status });
    setShowStatusMenu(false);
    if (result.success) {
      toast.success('Status updated');
    } else {
      toast.error(result.error || 'Failed to update status');
    }
  };

  const handleDelete = async () => {
    const result = await deleteTask(id);
    if (result.success) {
      toast.success('Task deleted');
      navigate('/tasks');
    } else {
      toast.error(result.error || 'Failed to delete task');
      setShowDeleteModal(false);
    }
  };

  if (isLoading && !currentTask) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!currentTask) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 dark:text-gray-400">Task not found</p>
        <Button variant="ghost" onClick={() => navigate('/tasks')} className="mt-4">
          Back to Tasks
        </Button>
      </div>
    );
  }

  const task = currentTask;

  return (
    <div>
      <Header
        title={task.title}
        breadcrumbs={[
          { label: 'Tasks', href: '/tasks' },
          { label: task.title },
        ]}
        onMenuClick={onMenuClick}
      >
        <Button
          variant="outline"
          size="sm"
          icon="lucide:pencil"
          onClick={() => navigate(`/tasks/${id}/edit`)}
        >
          Edit
        </Button>
        {canDelete && (
          <Button
            variant="ghost"
            size="sm"
            icon="lucide:trash-2"
            onClick={() => setShowDeleteModal(true)}
            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            Delete
          </Button>
        )}
      </Header>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Description
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
              {task.description || 'No description provided'}
            </p>
          </Card>

          {/* Subtasks */}
          {task.subtasks && task.subtasks.length > 0 && (
            <Card>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Subtasks ({task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length})
              </h3>
              <div className="space-y-2">
                {task.subtasks.map((subtask, i) => (
                  <label
                    key={subtask._id || i}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={subtask.completed}
                      onChange={async () => {
                        const updated = task.subtasks.map((s, idx) =>
                          idx === i ? { ...s, completed: !s.completed } : s
                        );
                        const result = await updateTask(id, { subtasks: updated });
                        if (!result.success) toast.error(result.error || 'Failed to update subtask');
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
                    />
                    <span
                      className={`text-sm ${
                        subtask.completed
                          ? 'text-gray-400 dark:text-gray-500 line-through'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {subtask.title}
                    </span>
                  </label>
                ))}
              </div>
            </Card>
          )}

          {/* Attachments */}
          {task.attachments && task.attachments.length > 0 && (
            <Card>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Attachments
              </h3>
              <div className="space-y-2">
                {task.attachments.map((att, i) => (
                  <a
                    key={i}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <Icon icon="lucide:paperclip" className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      {att.name || att.filename || 'Attachment'}
                    </span>
                  </a>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Status
                </p>
                <div className="relative">
                  <button
                    onClick={() => setShowStatusMenu(!showStatusMenu)}
                    className="flex items-center gap-2"
                  >
                    <Badge status={task.status} size="md" />
                    <Icon icon="lucide:chevron-down" className="w-3 h-3 text-gray-400" />
                  </button>
                  {showStatusMenu && (
                    <div className="absolute top-full left-0 mt-2 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-10 min-w-[140px]">
                      {statusOptions.map((status) => (
                        <button
                          key={status}
                          onClick={() => handleStatusChange(status)}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <Badge status={status} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {task.priority && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Priority
                  </p>
                  <Badge status={task.priority} size="md" />
                </div>
              )}

              {task.dueDate && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Due Date
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Icon icon="lucide:calendar" className="w-4 h-4 text-gray-400" />
                    {format(typeof task.dueDate === 'string' ? parseISO(task.dueDate) : new Date(task.dueDate), 'MMM d, yyyy')}
                  </p>
                </div>
              )}

              {task.project && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Project
                  </p>
                  <button
                    onClick={() => navigate(`/projects/${task.project._id || task.project}`)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2"
                  >
                    <Icon icon="lucide:folder" className="w-4 h-4" />
                    {task.project.name || 'View Project'}
                  </button>
                </div>
              )}

              {task.categories?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Categories
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {task.categories.map((cat) => (
                      <span key={cat._id} className="text-xs px-2 py-1 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium">
                        {cat.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Assignees */}
          {task.assignees && task.assignees.length > 0 && (
            <Card>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Assignees
              </p>
              <div className="space-y-2">
                {task.assignees.map((assignee, i) => (
                  <div key={assignee._id || i} className="flex items-center gap-3">
                    <Avatar name={assignee.name} size="sm" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {assignee.name}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Task" size="sm">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Are you sure you want to delete "{task.title}"? This action cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
