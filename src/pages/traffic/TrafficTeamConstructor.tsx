/**
 * Traffic Team Constructor
 * 
 * Admin interface для добавления новых кабинетов и траф команд
 * С выбором компаний под нужное направление
 */

import { useState, useEffect } from 'react';
import { TrafficCabinetLayout } from '@/components/traffic/TrafficCabinetLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Users, Edit2, Trash2, Building2, Target, Save, X, Loader2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.onai.academy';

interface Team {
  id: string;
  name: string;
  company: string;
  direction: string;
  fbAdAccountId?: string;
  color: string;
  emoji: string;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  fullName: string;
  team: string;
  role: 'targetologist' | 'admin';
  created_at: string;
}

const DIRECTIONS = [
  { value: 'nutcab_tripwire', label: 'Nutcab/Tripwire (Kenesary)', icon: '👑' },
  { value: 'arystan', label: 'Arystan', icon: '⚡' },
  { value: 'onai_zapusk', label: 'On AI / Запуск (Muha)', icon: '🚀' },
  { value: 'proftest', label: 'ProfTest / Alex (Traf4)', icon: '🎯' },
  { value: 'custom', label: 'Кастомное направление', icon: '🎨' }
];

const COLORS = [
  { value: '#00FF88', label: 'Неоновый зеленый' },
  { value: '#3B82F6', label: 'Синий' },
  { value: '#F59E0B', label: 'Оранжевый' },
  { value: '#8B5CF6', label: 'Фиолетовый' },
  { value: '#EC4899', label: 'Розовый' },
  { value: '#10B981', label: 'Изумрудный' }
];

const EMOJIS = ['👑', '⚡', '🚀', '🎯', '💎', '🔥', '⭐', '💪', '🎨', '🌟'];

export default function TrafficTeamConstructor() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Team Form State
  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [teamForm, setTeamForm] = useState({
    name: '',
    company: '',
    direction: '',
    customDirection: '',
    fbAdAccountId: '',
    color: COLORS[0].value,
    emoji: EMOJIS[0]
  });
  
  // User Form State
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [userForm, setUserForm] = useState({
    email: '',
    fullName: '',
    team: '',
    password: '',
    role: 'targetologist' as 'targetologist' | 'admin'
  });
  
  useEffect(() => {
    fetchTeamsAndUsers();
  }, []);
  
  const fetchTeamsAndUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('traffic_token');
      
      // Fetch teams
      const teamsResponse = await axios.get(`${API_URL}/api/traffic-admin/teams`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeams(teamsResponse.data.teams || []);
      
      // Fetch users
      const usersResponse = await axios.get(`${API_URL}/api/traffic-admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(usersResponse.data.users || []);
      
    } catch (error: any) {
      console.error('Failed to fetch data:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreateTeam = async () => {
    try {
      const token = localStorage.getItem('traffic_token');
      const direction = teamForm.direction === 'custom' ? teamForm.customDirection : teamForm.direction;
      
      await axios.post(`${API_URL}/api/traffic-admin/teams`, {
        name: teamForm.name,
        company: teamForm.company,
        direction,
        fbAdAccountId: teamForm.fbAdAccountId,
        color: teamForm.color,
        emoji: teamForm.emoji
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`Команда "${teamForm.name}" создана!`);
      resetTeamForm();
      fetchTeamsAndUsers();
    } catch (error: any) {
      console.error('Failed to create team:', error);
      toast.error(error.response?.data?.error || 'Ошибка создания команды');
    }
  };
  
  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!confirm(`Удалить команду "${teamName}"? Это действие необратимо!`)) return;
    
    try {
      const token = localStorage.getItem('traffic_token');
      await axios.delete(`${API_URL}/api/traffic-admin/teams/${teamId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`Команда "${teamName}" удалена`);
      fetchTeamsAndUsers();
    } catch (error: any) {
      console.error('Failed to delete team:', error);
      toast.error('Ошибка удаления команды');
    }
  };
  
  const handleCreateUser = async () => {
    try {
      const token = localStorage.getItem('traffic_token');
      
      await axios.post(`${API_URL}/api/traffic-admin/users`, userForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`Пользователь "${userForm.email}" создан!`);
      resetUserForm();
      fetchTeamsAndUsers();
    } catch (error: any) {
      console.error('Failed to create user:', error);
      toast.error(error.response?.data?.error || 'Ошибка создания пользователя');
    }
  };
  
  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Удалить пользователя "${userEmail}"?`)) return;
    
    try {
      const token = localStorage.getItem('traffic_token');
      await axios.delete(`${API_URL}/api/traffic-admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`Пользователь "${userEmail}" удален`);
      fetchTeamsAndUsers();
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      toast.error('Ошибка удаления пользователя');
    }
  };
  
  const resetTeamForm = () => {
    setTeamForm({
      name: '',
      company: '',
      direction: '',
      customDirection: '',
      fbAdAccountId: '',
      color: COLORS[0].value,
      emoji: EMOJIS[0]
    });
    setIsAddingTeam(false);
    setEditingTeamId(null);
  };
  
  const resetUserForm = () => {
    setUserForm({
      email: '',
      fullName: '',
      team: '',
      password: '',
      role: 'targetologist'
    });
    setIsAddingUser(false);
  };
  
  if (loading) {
    return (
      <TrafficCabinetLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-[#00FF88]" />
        </div>
      </TrafficCabinetLayout>
    );
  }
  
  return (
    <TrafficCabinetLayout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#00FF88]/10 to-transparent border border-[#00FF88]/20 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#00FF88]/20 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-[#00FF88]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Конструктор Команд</h1>
              <p className="text-sm text-[#00FF88]/60">Управление командами и пользователями</p>
            </div>
          </div>
        </div>
        
        {/* Teams Section */}
        <div className="bg-black/40 border border-[#00FF88]/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-[#00FF88]" />
              <h2 className="text-xl font-bold text-white">Команды ({teams.length})</h2>
            </div>
            <Button
              onClick={() => setIsAddingTeam(true)}
              className="bg-[#00FF88] hover:bg-[#00FF88]/90 text-black"
            >
              <Plus className="w-4 h-4 mr-2" />
              Добавить команду
            </Button>
          </div>
          
          {/* Add Team Form */}
          {isAddingTeam && (
            <div className="mb-6 p-6 bg-black/60 border border-[#00FF88]/20 rounded-xl">
              <h3 className="text-lg font-bold text-white mb-4">Новая команда</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Название команды</label>
                  <Input
                    value={teamForm.name}
                    onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                    placeholder="Например: Kenesary"
                    className="bg-black/50 border-[#00FF88]/20 text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Компания</label>
                  <Input
                    value={teamForm.company}
                    onChange={(e) => setTeamForm({ ...teamForm, company: e.target.value })}
                    placeholder="Например: Nutcab"
                    className="bg-black/50 border-[#00FF88]/20 text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Направление</label>
                  <select
                    value={teamForm.direction}
                    onChange={(e) => setTeamForm({ ...teamForm, direction: e.target.value })}
                    className="w-full h-10 px-3 bg-black/50 border border-[#00FF88]/20 text-white rounded-md"
                  >
                    <option value="">Выберите направление</option>
                    {DIRECTIONS.map(dir => (
                      <option key={dir.value} value={dir.value}>
                        {dir.icon} {dir.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                {teamForm.direction === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Кастомное направление</label>
                    <Input
                      value={teamForm.customDirection}
                      onChange={(e) => setTeamForm({ ...teamForm, customDirection: e.target.value })}
                      placeholder="Введите название"
                      className="bg-black/50 border-[#00FF88]/20 text-white"
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">FB Ad Account ID (опционально)</label>
                  <Input
                    value={teamForm.fbAdAccountId}
                    onChange={(e) => setTeamForm({ ...teamForm, fbAdAccountId: e.target.value })}
                    placeholder="act_123456789"
                    className="bg-black/50 border-[#00FF88]/20 text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Цвет</label>
                  <div className="flex gap-2">
                    {COLORS.map(color => (
                      <button
                        key={color.value}
                        onClick={() => setTeamForm({ ...teamForm, color: color.value })}
                        className={`w-8 h-8 rounded-full border-2 ${
                          teamForm.color === color.value ? 'border-white scale-110' : 'border-gray-600'
                        }`}
                        style={{ backgroundColor: color.value }}
                      />
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Эмодзи</label>
                  <div className="flex gap-2 flex-wrap">
                    {EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => setTeamForm({ ...teamForm, emoji })}
                        className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center border-2 ${
                          teamForm.emoji === emoji ? 'border-[#00FF88] bg-[#00FF88]/20' : 'border-gray-600 bg-black/50'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={handleCreateTeam}
                  className="bg-[#00FF88] hover:bg-[#00FF88]/90 text-black"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Создать
                </Button>
                <Button
                  onClick={resetTeamForm}
                  variant="outline"
                  className="border-gray-600 text-gray-300"
                >
                  <X className="w-4 h-4 mr-2" />
                  Отмена
                </Button>
              </div>
            </div>
          )}
          
          {/* Teams List */}
          <div className="space-y-3">
            {teams.map((team) => (
              <div
                key={team.id}
                className="p-4 bg-black/30 border border-[#00FF88]/10 rounded-xl flex items-center justify-between hover:bg-black/50 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${team.color}20`, border: `2px solid ${team.color}` }}
                  >
                    {team.emoji}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{team.name}</h3>
                    <p className="text-sm text-gray-400">
                      {team.company} • {team.direction}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleDeleteTeam(team.id, team.name)}
                    variant="outline"
                    size="sm"
                    className="border-red-500/20 text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Users Section */}
        <div className="bg-black/40 border border-[#00FF88]/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Target className="w-5 h-5 text-[#00FF88]" />
              <h2 className="text-xl font-bold text-white">Пользователи ({users.length})</h2>
            </div>
            <Button
              onClick={() => setIsAddingUser(true)}
              className="bg-[#00FF88] hover:bg-[#00FF88]/90 text-black"
            >
              <Plus className="w-4 h-4 mr-2" />
              Добавить пользователя
            </Button>
          </div>
          
          {/* Add User Form */}
          {isAddingUser && (
            <div className="mb-6 p-6 bg-black/60 border border-[#00FF88]/20 rounded-xl">
              <h3 className="text-lg font-bold text-white mb-4">Новый пользователь</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <Input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    placeholder="user@example.com"
                    className="bg-black/50 border-[#00FF88]/20 text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Полное имя</label>
                  <Input
                    value={userForm.fullName}
                    onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                    placeholder="Иван Иванов"
                    className="bg-black/50 border-[#00FF88]/20 text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Команда</label>
                  <select
                    value={userForm.team}
                    onChange={(e) => setUserForm({ ...userForm, team: e.target.value })}
                    className="w-full h-10 px-3 bg-black/50 border border-[#00FF88]/20 text-white rounded-md"
                  >
                    <option value="">Выберите команду</option>
                    {teams.map(team => (
                      <option key={team.id} value={team.name}>
                        {team.emoji} {team.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Пароль</label>
                  <Input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    placeholder="••••••••"
                    className="bg-black/50 border-[#00FF88]/20 text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Роль</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value as 'targetologist' | 'admin' })}
                    className="w-full h-10 px-3 bg-black/50 border border-[#00FF88]/20 text-white rounded-md"
                  >
                    <option value="targetologist">Таргетолог</option>
                    <option value="admin">Администратор</option>
                  </select>
                </div>
              </div>
              
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={handleCreateUser}
                  className="bg-[#00FF88] hover:bg-[#00FF88]/90 text-black"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Создать
                </Button>
                <Button
                  onClick={resetUserForm}
                  variant="outline"
                  className="border-gray-600 text-gray-300"
                >
                  <X className="w-4 h-4 mr-2" />
                  Отмена
                </Button>
              </div>
            </div>
          )}
          
          {/* Users List */}
          <div className="space-y-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="p-4 bg-black/30 border border-[#00FF88]/10 rounded-xl flex items-center justify-between hover:bg-black/50 transition-all"
              >
                <div>
                  <h3 className="text-lg font-bold text-white">{user.fullName}</h3>
                  <p className="text-sm text-gray-400">
                    {user.email} • {user.team} • {user.role === 'admin' ? 'Админ' : 'Таргетолог'}
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleDeleteUser(user.id, user.email)}
                    variant="outline"
                    size="sm"
                    className="border-red-500/20 text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </TrafficCabinetLayout>
  );
}
