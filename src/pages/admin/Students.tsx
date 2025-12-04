import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function Students() {
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Top Bar */}
      <div className="bg-black/50 backdrop-blur-xl border-b border-emerald-500/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link 
            to="/admin" 
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            Назад в админку
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold text-white mb-4">Студенты</h1>
        <p className="text-gray-400 mb-8">
          Управление студентами и их прогрессом
        </p>

        {/* TODO: Add students list */}
        <div className="bg-gray-800 border border-emerald-500/20 rounded-2xl p-12 text-center">
          <p className="text-gray-400">В разработке... 🚧</p>
        </div>
      </div>
    </div>
  )
}








