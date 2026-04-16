import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl w-full mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-4">
            AR CPR Assistant
          </h1>
          <p className="text-xl md:text-2xl text-white opacity-90">
            Real-time AR guidance powered by Google Gemini AI
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl md:rounded-3xl shadow-2xl p-6 sm:p-8 md:p-12 mb-8">
          {/* Emergency Notice */}
          <div className="bg-red-100 border-2 border-red-500 rounded-xl p-4 sm:p-5 md:p-6 mb-6 md:mb-8">
            <div className="flex items-start gap-3 md:gap-4">
              <div className="text-3xl md:text-4xl flex-shrink-0">⚠️</div>
              <div className="flex-1">
                <h3 className="font-bold text-red-900 text-base md:text-lg mb-2">
                  IMPORTANT: Call 911 First!
                </h3>
                <p className="text-red-800 text-sm md:text-base leading-relaxed">
                  In a real emergency, always call emergency services before starting CPR.
                  This app is for training and guidance purposes.
                </p>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8">
            <div className="text-center p-5 md:p-6 bg-blue-50 rounded-xl transition-transform hover:scale-105">
              <div className="text-4xl mb-3">📹</div>
              <h3 className="font-bold text-gray-900 mb-2 text-base md:text-lg">AR Guidance</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Real-time visual overlay shows exactly where to place your hands
              </p>
            </div>

            <div className="text-center p-5 md:p-6 bg-purple-50 rounded-xl transition-transform hover:scale-105">
              <div className="text-4xl mb-3">🤖</div>
              <h3 className="font-bold text-gray-900 mb-2 text-base md:text-lg">AI Coaching</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Google Gemini AI provides personalized encouragement and feedback
              </p>
            </div>

            <div className="text-center p-5 md:p-6 bg-pink-50 rounded-xl transition-transform hover:scale-105 sm:col-span-2 md:col-span-1">
              <div className="text-4xl mb-3">🎵</div>
              <h3 className="font-bold text-gray-900 mb-2 text-base md:text-lg">Perfect Rhythm</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Audio metronome keeps you at the optimal 110 BPM compression rate
              </p>
            </div>
          </div>

          {/* How it Works */}
          <div className="mb-8">
            <h3 className="font-bold text-2xl text-gray-900 mb-6 text-center">
              How It Works
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="bg-blue-600 text-white rounded-full min-w-[32px] w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold text-sm">
                  1
                </div>
                <p className="text-gray-700 pt-1 flex-1 leading-relaxed">
                  Grant camera access and position your phone to see the person needing CPR
                </p>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-blue-600 text-white rounded-full min-w-[32px] w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold text-sm">
                  2
                </div>
                <p className="text-gray-700 pt-1 flex-1 leading-relaxed">
                  AI detects body position and shows AR overlay for hand placement
                </p>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-blue-600 text-white rounded-full min-w-[32px] w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold text-sm">
                  3
                </div>
                <p className="text-gray-700 pt-1 flex-1 leading-relaxed">
                  Follow the rhythm and voice guidance for perfect CPR technique
                </p>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-blue-600 text-white rounded-full min-w-[32px] w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold text-sm">
                  4
                </div>
                <p className="text-gray-700 pt-1 flex-1 leading-relaxed">
                  Receive AI-powered feedback and session summary when complete
                </p>
              </div>
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={() => navigate('/ar-session')}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-5 md:py-6 rounded-xl font-bold text-xl md:text-2xl hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg active:scale-95"
          >
            Start AR CPR Session
          </button>
        </div>

        {/* Tech Stack */}
        <div className="text-center text-white opacity-90 mt-6">
          <p className="text-sm md:text-base mb-3 font-medium">Powered by Google Technologies</p>
          <div className="flex flex-wrap justify-center gap-3 md:gap-4 text-xs md:text-sm">
            <span className="bg-white/10 px-3 py-1 rounded-full">Google Gemini AI</span>
            <span className="bg-white/10 px-3 py-1 rounded-full">MediaPipe Pose</span>
            <span className="bg-white/10 px-3 py-1 rounded-full">Web Audio API</span>
            <span className="bg-white/10 px-3 py-1 rounded-full">Web Speech API</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-white opacity-75 mt-6 text-xs md:text-sm">
          <p>Built for Google Gemini Hackathon</p>
        </div>
      </div>
    </div>
  );
}
