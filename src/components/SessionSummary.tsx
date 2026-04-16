interface SessionSummaryProps {
  summary: string;
  totalCompressions: number;
  duration: number;
  averageRate: number;
  cyclesCompleted: number;
  onClose: () => void;
}

export default function SessionSummary({
  summary,
  totalCompressions,
  duration,
  averageRate,
  cyclesCompleted,
  onClose,
}: SessionSummaryProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isOptimalRate = averageRate >= 100 && averageRate <= 120;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Session Complete</h2>
          <p className="text-gray-600">You did an amazing job</p>
        </div>

        {/* AI-Generated Summary */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-3 mb-3">
            <div className="bg-blue-600 text-white rounded-full p-2 flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">AI Assessment</h3>
              <p className="text-gray-700 leading-relaxed">{summary}</p>
            </div>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <div className="text-5xl font-bold text-blue-600 mb-2">{totalCompressions}</div>
            <div className="text-sm text-gray-600 font-medium">Total Compressions</div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <div className="text-5xl font-bold text-purple-600 mb-2">{formatTime(duration)}</div>
            <div className="text-sm text-gray-600 font-medium">Duration</div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <div className="text-5xl font-bold text-green-600 mb-2">{averageRate}</div>
            <div className="text-sm text-gray-600 font-medium">Average BPM</div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <div className="text-5xl font-bold text-orange-600 mb-2">{cyclesCompleted}</div>
            <div className="text-sm text-gray-600 font-medium">Cycles Completed</div>
          </div>
        </div>

        {/* Performance Badge */}
        {isOptimalRate && (
          <div className="bg-green-100 border-2 border-green-500 rounded-lg p-4 mb-8 text-center">
            <div className="text-2xl font-bold text-green-700 flex items-center justify-center gap-2">
              <span>✅</span>
              <span>Excellent Technique</span>
            </div>
            <p className="text-green-600 text-sm mt-1">
              Your compression rate was within the optimal 100-120 BPM range
            </p>
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-blue-700 transition-colors"
        >
          Return to Home
        </button>

        {/* Footer Note */}
        <p className="text-center text-gray-500 text-sm mt-6">
          This was a training session. In a real emergency, always call 911 first.
        </p>
      </div>
    </div>
  );
}
