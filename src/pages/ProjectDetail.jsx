import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { format, parseISO } from 'date-fns';
import useProjectStore from '../store/projectStore';
import useTaskStore from '../store/taskStore';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';

export default function ProjectDetail({ onMenuClick }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentProject, isLoading, fetchProject, deleteProject, clearCurrent } = useProjectStore();
  const { tasks, fetchTasks } = useTaskStore();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    fetchProject(id);
    fetchTasks({ projectId: id });
    return () => clearCurrent();
  }, [id]);

  const handleDelete = async () => {
    const result = await deleteProject(id);
    if (result.success) {
      navigate('/projects');
    }
  };

  if (isLoading && !currentProject) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 dark:text-gray-400">Project not found</p>
        <Button variant="ghost" onClick={() => navigate('/projects')} className="mt-4">
          Back to Projects
        </Button>
      </div>
    );
  }

  const project = currentProject;

  // Use only backend-provided stats — never fall back to stale task store
  const total = project.totalTasks ?? 0;
  const doneCount = project.doneTasks ?? 0;
  const inProgressCount = project.inProgressTasks ?? 0;
  const inReviewCount = project.inReviewTasks ?? 0;
  const todoCount = project.todoTasks ?? 0;
  const progress = project.progress ?? 0;

  return (
    <div>
      <Header
        title={project.name}
        breadcrumbs={[
          { label: 'Projects', href: '/projects' },
          { label: project.name },
        ]}
        onMenuClick={onMenuClick}
      >
        <Button
          variant="outline"
          size="sm"
          icon="lucide:pencil"
          onClick={() => navigate(`/projects/${id}/edit`)}
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
          {/* Description */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              About
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
              {project.description || 'No description provided'}
            </p>
          </Card>

          {/* Project Tasks */}
          <Card padding={false}>
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Tasks ({tasks.length})
              </h3>
              <Button
                size="sm"
                variant="ghost"
                icon="lucide:plus"
                onClick={() => navigate('/tasks/new')}
              >
                Add Task
              </Button>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {tasks.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-sm text-gray-400 dark:text-gray-500">No tasks for this project</p>
                </div>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task._id}
                    onClick={() => navigate(`/tasks/${task._id}`)}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge status={task.status} />
                        {task.priority && <Badge status={task.priority} />}
                      </div>
                    </div>
                    <Icon icon="lucide:chevron-right" className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Status</p>
                <Badge status={project.status} size="md" />
              </div>

              {total > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Progress</p>
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{progress}%</span>
                  </div>
                  {/* Single bar: green = done, rest = gray track */}
                  <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {doneCount > 0 && (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                        {doneCount} done
                      </span>
                    )}
                    {inReviewCount > 0 && (
                      <span className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
                        <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
                        {inReviewCount} in review
                      </span>
                    )}
                    {inProgressCount > 0 && (
                      <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                        <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                        {inProgressCount} in progress
                      </span>
                    )}
                    {todoCount > 0 && (
                      <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 inline-block" />
                        {todoCount} todo
                      </span>
                    )}
                  </div>
                </div>
              )}

              {project.clientId && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Client</p>
                  <button
                    onClick={() => navigate(`/clients/${project.clientId._id || project.clientId}`)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {project.clientId.name || 'View Client'}
                  </button>
                </div>
              )}

              {project.startDate && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Start Date</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {format(typeof project.startDate === 'string' ? parseISO(project.startDate) : new Date(project.startDate), 'MMMM d, yyyy')}
                  </p>
                </div>
              )}

              {project.endDate && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">End Date</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {format(typeof project.endDate === 'string' ? parseISO(project.endDate) : new Date(project.endDate), 'MMMM d, yyyy')}
                  </p>
                </div>
              )}

              {project.domain && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Domain</p>
                  <a
                    href={project.domain}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
                  >
                    {project.domain}
                  </a>
                </div>
              )}
            </div>
          </Card>

          {project.envFile && (
            <Card>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">.env File</p>
              <pre className="text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all font-mono leading-relaxed">
                {project.envFile}
              </pre>
            </Card>
          )}
        </div>
      </div>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Project"
        size="sm"
      >
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Are you sure you want to delete "{project.name}"? This action cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
