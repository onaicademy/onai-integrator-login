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
import { Plus, Users, Edit2, Trash2, Building2, Target, Save, X, Loader2, Mail, Send } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { TeamAvatar, TeamBadge } from '@/components/traffic/TeamAvatar';
import { TRAFFIC_API_URL as API_URL } from '@/config/traffic-api';

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
  isActive?: boolean;
  lastLoginAt?: string;
  created_at: string;
}

// Фиксированные команды (если в БД пусто)
const DEFAULT_TEAMS = [
  { name: 'Kenesary' },
  { name: 'Arystan' },
  { name: 'Traf4' },
  { name: 'Muha' },
];

const DIRECTIONS = [
  { value: 'nutcab_tripwire', label: 'Nutcab/Tripwire (Kenesary)' },
  { value: 'arystan', label: 'Arystan' },
  { value: 'onai_zapusk', label: 'On AI / Запуск (Muha)' },
  { value: 'proftest', label: 'ProfTest / Alex (Traf4)' },
  { value: 'custom', label: 'Кастомное направление' }
];

const COLORS = [
  { value: '#00FF88', label: 'Неоновый зеленый' },
  { value: '#3B82F6', label: 'Синий' },
  { value: '#F59E0B', label: 'Оранжевый' },
  { value: '#8B5CF6', label: 'Фиолетовый' },
  { value: '#EC4899', label: 'Розовый' },
  { value: '#10B981', label: 'Изумрудный' }
];

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
    color: COLORS[0].value
  });
  
  // User Form State
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [userForm, setUserForm] = useState({
    email: '',
    fullName: '',
    team: '',
    customTeam: '',
    password: '',
    role: 'targetologist' as 'targetologist' | 'admin',
    sendEmail: true
  });
  
  useEffect(() => {
    fetchTeamsAndUsers();
  }, []);
  
  const fetchTeamsAndUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('traffic_token');
      
      // Fetch teams - используем constructor API
      const teamsResponse = await axios.get(`${API_URL}/api/traffic-constructor/teams`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeams(teamsResponse.data.teams || []);
      
      // Fetch users - используем constructor API
      const usersResponse = await axios.get(`${API_URL}/api/traffic-constructor/users`, {
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
      
      await axios.post(`${API_URL}/api/traffic-constructor/teams`, {
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
      await axios.delete(`${API_URL}/api/traffic-constructor/teams/${teamId}`, {
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
      
      // Используем customTeam если выбрано 'custom'
      const teamName = userForm.team === 'custom' ? userForm.customTeam : userForm.team;
      
      if (!teamName) {
        toast.error('Укажите название команды');
        return;
      }
      
      const response = await axios.post(`${API_URL}/api/traffic-constructor/users`, {
        email: userForm.email,
        fullName: userForm.fullName,
        team: teamName,
        password: userForm.password,
        role: userForm.role,
        sendEmail: userForm.sendEmail
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.emailSent) {
        toast.success(`Пользователь создан! Email с данными доступа отправлен на ${userForm.email}`);
      } else {
        toast.success(`Пользователь "${userForm.email}" создан!`);
      }
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
      await axios.delete(`${API_URL}/api/traffic-constructor/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`Пользователь "${userEmail}" удален`);
      fetchTeamsAndUsers();
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      toast.error('Ошибка удаления пользователя');
    }
  };
  
  const handleResendCredentials = async (userId: string, userEmail: string) => {
    const newPassword = prompt(`Введите новый пароль для ${userEmail} (или оставьте пустым для автогенерации):`, '');
    if (newPassword === null) return; // Отмена
    
    try {
      const token = localStorage.getItem('traffic_token');
      const response = await axios.post(`${API_URL}/api/traffic-constructor/users/${userId}/send-credentials`, 
        { newPassword: newPassword || undefined },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.emailSent) {
        toast.success(`✉️ Данные доступа отправлены на ${userEmail}`);
      } else {
        toast.error('Пароль обновлен, но email не отправлен (Resend не настроен)');
      }
    } catch (error: any) {
      console.error('Failed to resend credentials:', error);
      toast.error('Ошибка отправки данных доступа');
    }
  };
  
  const resetTeamForm = () => {
    setTeamForm({
      name: '',
      company: '',
      direction: '',
      customDirection: '',
      fbAdAccountId: '',
      color: COLORS[0].value
    });
    setIsAddingTeam(false);
    setEditingTeamId(null);
  };
  
  const resetUserForm = () => {
    setUserForm({
      email: '',
      fullName: '',
      team: '',
      customTeam: '',
      password: '',
      role: 'targetologist',
      sendEmail: true
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
                    {dir.label}
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
                  <TeamAvatar teamName={team.name} size="lg" />
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
                    {/* Сначала команды из БД, затем дефолтные */}
                    {(teams.length > 0 ? teams : DEFAULT_TEAMS.map(t => ({ id: t.name, name: t.name }))).map(team => (
                      <option key={team.id || team.name} value={team.name}>
                        {team.name}
                      </option>
                    ))}
                    <option value="custom">+ Другая команда...</option>
                  </select>
                </div>
                
                {userForm.team === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Название команды</label>
                    <Input
                      value={userForm.customTeam}
                      onChange={(e) => setUserForm({ ...userForm, customTeam: e.target.value })}
                      placeholder="Введите название"
                      className="bg-black/50 border-[#00FF88]/20 text-white"
                    />
                  </div>
                )}
                
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
                
                {/* Отправить Email */}
                <div className="md:col-span-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={userForm.sendEmail}
                      onChange={(e) => setUserForm({ ...userForm, sendEmail: e.target.checked })}
                      className="w-5 h-5 rounded border-[#00FF88]/30 bg-black/50 text-[#00FF88] focus:ring-[#00FF88]/50"
                    />
                    <span className="text-gray-300 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[#00FF88]" />
                      Отправить данные доступа на email
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-8">Пользователь получит письмо с логином и паролем</p>
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
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${user.isActive !== false ? 'bg-[#00FF88]' : 'bg-gray-500'}`} />
                  <div>
                    <h3 className="text-lg font-bold text-white">{user.fullName}</h3>
                    <p className="text-sm text-gray-400">
                      {user.email} • {user.team} • {user.role === 'admin' ? 'Админ' : 'Таргетолог'}
                    </p>
                    {user.lastLoginAt && (
                      <p className="text-xs text-gray-500">
                        Последний вход: {new Date(user.lastLoginAt).toLocaleDateString('ru-RU')}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleResendCredentials(user.id, user.email)}
                    variant="outline"
                    size="sm"
                    className="border-[#00FF88]/20 text-[#00FF88] hover:bg-[#00FF88]/10"
                    title="Отправить данные доступа"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
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
            
            {users.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Пользователи не найдены</p>
                <p className="text-sm">Добавьте первого пользователя</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </TrafficCabinetLayout>
  );
}
