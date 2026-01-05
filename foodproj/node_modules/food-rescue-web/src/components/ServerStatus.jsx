import { useAuth } from '../contexts/AuthContext';

export default function ServerStatus() {
  const { serverOnline, checkServer } = useAuth();

  if (serverOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] animate-slide-down">
      <div className="bg-gradient-to-r from-red-500 via-red-600 to-rose-600 text-white px-4 py-3 shadow-xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <span className="text-xl animate-pulse">⚠️</span>
            </div>
            <div>
              <div className="font-semibold">Connection Lost</div>
              <div className="text-red-100 text-sm">Unable to reach the server. Please check if the backend is running.</div>
            </div>
          </div>
          <button
            onClick={checkServer}
            className="flex items-center gap-2 bg-white text-red-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-50 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}
