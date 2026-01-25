export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 relative">
          <div className="absolute inset-0 border-4 border-chamomile rounded-full"></div>
          <div className="absolute inset-0 border-4 border-barro border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-text-muted font-body">Loading...</p>
      </div>
    </div>
  );
}
