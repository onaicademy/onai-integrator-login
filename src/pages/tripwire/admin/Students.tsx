import { useQuery } from '@tanstack/react-query';
import { getAuthToken } from '@/utils/apiClient';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Calendar, Clock, Search, User } from 'lucide-react';
import { useState } from 'react';

interface Student {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  enrolled_at: string;
  total_modules: number;
  completed_modules: number;
  progress_percent: number;
}

export default function TripwireStudents() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading } = useQuery<{ students: Student[] }>({
    queryKey: ['tripwire', 'admin', 'students'],
      queryFn: async () => {
      const response = await fetch('/api/tripwire/admin/students', {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch students');
      return response.json();
    }
  });

  const filteredStudents = data?.students.filter(student => 
    (student.email?.toLowerCase().includes(searchQuery.toLowerCase()) || 
     student.full_name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen relative overflow-hidden rounded-3xl bg-[#030303] border border-white/5">
      {/* ✅ BACKGROUND GRID */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* ✅ HEADER (NOT FIXED) */}
      <div className="relative z-10 px-8 py-8 border-b border-white/5">
        <Link 
          to="/tripwire/admin" 
          className="inline-flex items-center gap-2 text-[#9CA3AF] hover:text-[#00FF94] transition-colors"
        >
          <ArrowLeft size={20} />
          Назад в админку
        </Link>
      </div>

      {/* ✅ MAIN CONTENT */}
      <div className="relative z-10 px-8 py-12">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Студенты
            </h1>
            <p className="text-[#9CA3AF]">
              {isLoading ? 'Загрузка...' : `Всего зарегистрировано: ${data?.students.length || 0}`}
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={20} />
            <input 
              type="text" 
              placeholder="Поиск по email или имени..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[rgba(20,20,20,0.6)] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-[#00FF94]/50 transition-colors"
            />
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-[rgba(20,20,20,0.6)] backdrop-blur-xl rounded-3xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="px-8 py-5 text-left text-xs font-bold text-[#9CA3AF] uppercase tracking-wider">Студент</th>
                  <th className="px-8 py-5 text-left text-xs font-bold text-[#9CA3AF] uppercase tracking-wider">Прогресс обучения</th>
                  <th className="px-8 py-5 text-left text-xs font-bold text-[#9CA3AF] uppercase tracking-wider">Дата регистрации</th>
                  <th className="px-8 py-5 text-left text-xs font-bold text-[#9CA3AF] uppercase tracking-wider">Активность</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-12 text-center text-[#9CA3AF]">
                      Загрузка списка студентов...
                    </td>
                  </tr>
                ) : filteredStudents?.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-12 text-center text-[#9CA3AF]">
                      Студенты не найдены
                    </td>
                  </tr>
                ) : (
                  filteredStudents?.map((student) => (
                    <tr key={student.id} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-[#00FF94]/10 border border-[#00FF94]/20 flex items-center justify-center">
                            <User size={18} className="text-[#00FF94]" />
                          </div>
                          <div>
                            <p className="text-white font-medium mb-1">{student.full_name || 'Без имени'}</p>
                            <p className="text-sm text-[#9CA3AF] flex items-center gap-1.5">
                              <Mail size={12} />
                              {student.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="max-w-[200px]">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-white">{student.progress_percent}%</span>
                            <span className="text-xs text-[#9CA3AF]">
                              {student.completed_modules} / {student.total_modules} модулей
                            </span>
                          </div>
                          <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-[#00FF94] h-full rounded-full transition-all duration-500"
                              style={{ width: `${student.progress_percent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-sm text-[#9CA3AF] flex items-center gap-2">
                          <Calendar size={14} />
                          {new Date(student.created_at).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-sm text-[#9CA3AF] flex items-center gap-2">
                          <Clock size={14} />
                          {student.last_sign_in_at 
                            ? new Date(student.last_sign_in_at).toLocaleDateString('ru-RU', {
                                day: 'numeric',
                                month: 'long',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'Никогда'}
                        </p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
