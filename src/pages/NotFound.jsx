import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-3xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mx-auto mb-6">
          <Icon icon="lucide:file-question" className="w-10 h-10 text-blue-500 dark:text-blue-400" />
        </div>
        <h1 className="text-6xl font-extrabold text-gray-900 dark:text-gray-50 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-3">Page not found</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Icon icon="lucide:arrow-left" className="w-4 h-4" />
            Go back
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Icon icon="lucide:home" className="w-4 h-4" />
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
