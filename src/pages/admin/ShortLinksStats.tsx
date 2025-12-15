import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link2, TrendingUp, Users, Clock, Search, ExternalLink, Copy, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface ShortLinkStats {
  id: string;
  short_code: string;
  original_url: string;
  campaign: string | null;
  source: string | null;
  lead_id: string | null;
  clicks_count: number;
  unique_ips: string[];
  created_at: string;
  first_clicked_at: string | null;
  last_clicked_at: string | null;
  is_active: boolean;
}

interface AggregateStats {
  totalLinks: number;
  totalClicks: number;
  uniqueClicks: number;
  activeLinks: number;
  avgClickRate: number;
  smsCampaignLinks: number;
  smsCampaignClicks: number;
}

export default function ShortLinksStats() {
  const [links, setLinks] = useState<ShortLinkStats[]>([]);
  const [filteredLinks, setFilteredLinks] = useState<ShortLinkStats[]>([]);
  const [stats, setStats] = useState<AggregateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    fetchShortLinks();
  }, []);

  useEffect(() => {
    // Фильтрация по поисковому запросу
    if (searchQuery.trim() === '') {
      setFilteredLinks(links);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = links.filter(link => 
        link.short_code.toLowerCase().includes(query) ||
        link.original_url.toLowerCase().includes(query) ||
        link.campaign?.toLowerCase().includes(query) ||
        link.source?.toLowerCase().includes(query) ||
        link.lead_id?.toLowerCase().includes(query)
      );
      setFilteredLinks(filtered);
    }
  }, [searchQuery, links]);

  const fetchShortLinks = async () => {
    try {
      setLoading(true);

      // Получаем все короткие ссылки из Supabase
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/supabase/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'short_links',
          select: '*',
          order: { column: 'created_at', ascending: false },
          limit: 500
        })
      });

      if (!response.ok) throw new Error('Failed to fetch short links');

      const data = await response.json();
      const linksData = data.data || [];

      setLinks(linksData);
      setFilteredLinks(linksData);

      // Вычисляем агрегированную статистику
      const totalClicks = linksData.reduce((sum: number, link: ShortLinkStats) => sum + (link.clicks_count || 0), 0);
      const uniqueClicks = linksData.reduce((sum: number, link: ShortLinkStats) => sum + (link.unique_ips?.length || 0), 0);
      const activeLinks = linksData.filter((link: ShortLinkStats) => link.is_active).length;
      const smsCampaignLinks = linksData.filter((link: ShortLinkStats) => link.source === 'sms' || link.campaign === 'proftest').length;
      const smsCampaignClicks = linksData
        .filter((link: ShortLinkStats) => link.source === 'sms' || link.campaign === 'proftest')
        .reduce((sum: number, link: ShortLinkStats) => sum + (link.clicks_count || 0), 0);

      setStats({
        totalLinks: linksData.length,
        totalClicks,
        uniqueClicks,
        activeLinks,
        avgClickRate: linksData.length > 0 ? totalClicks / linksData.length : 0,
        smsCampaignLinks,
        smsCampaignClicks
      });

    } catch (error) {
      console.error('Error fetching short links:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, code: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getShortUrl = (code: string) => `https://onai.academy/l/${code}`;

  const calculateSavings = (originalUrl: string, shortCode: string) => {
    const shortUrl = getShortUrl(shortCode);
    const saved = originalUrl.length - shortUrl.length;
    const percentage = Math.round((saved / originalUrl.length) * 100);
    return { saved, percentage };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка статистики...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">🔗 Статистика коротких ссылок</h1>
        <p className="text-muted-foreground">
          Отслеживание кликов по коротким ссылкам для SMS-рассылок
        </p>
      </div>

      {/* Aggregate Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего ссылок</CardTitle>
              <Link2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLinks}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeLinks} активных
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего кликов</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalClicks}</div>
              <p className="text-xs text-muted-foreground">
                {stats.avgClickRate.toFixed(1)} кликов/ссылка
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Уникальные клики</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.uniqueClicks}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalClicks > 0 
                  ? `${Math.round((stats.uniqueClicks / stats.totalClicks) * 100)}% от всех кликов`
                  : 'Нет данных'
                }
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">SMS Кампания</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.smsCampaignClicks}</div>
              <p className="text-xs text-muted-foreground">
                {stats.smsCampaignLinks} ссылок в SMS
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search Bar */}
      <Card>
        <CardHeader>
          <CardTitle>Поиск ссылок</CardTitle>
          <CardDescription>
            Найдите ссылку по коду, campaign, source или lead_id
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Links Table */}
      <Card>
        <CardHeader>
          <CardTitle>Все короткие ссылки ({filteredLinks.length})</CardTitle>
          <CardDescription>
            Список всех созданных коротких ссылок с детальной статистикой
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredLinks.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Ссылки не найдены
              </p>
            ) : (
              filteredLinks.map((link) => {
                const shortUrl = getShortUrl(link.short_code);
                const savings = calculateSavings(link.original_url, link.short_code);
                const clickRate = link.clicks_count > 0 
                  ? ((link.unique_ips?.length || 0) / link.clicks_count * 100).toFixed(0)
                  : '0';

                return (
                  <div key={link.id} className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <code className="text-lg font-mono font-semibold bg-primary/10 px-2 py-1 rounded">
                            {link.short_code}
                          </code>
                          {copiedCode === link.short_code ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(shortUrl, link.short_code)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                          <a 
                            href={shortUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                        <p className="text-sm text-muted-foreground font-mono break-all">
                          {shortUrl}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        {link.is_active ? (
                          <Badge variant="default">Активна</Badge>
                        ) : (
                          <Badge variant="secondary">Неактивна</Badge>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="space-y-1">
                        <p className="text-muted-foreground">Кликов</p>
                        <p className="font-semibold text-lg">{link.clicks_count}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-muted-foreground">Уникальных</p>
                        <p className="font-semibold text-lg">{link.unique_ips?.length || 0}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-muted-foreground">CTR</p>
                        <p className="font-semibold text-lg">{clickRate}%</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-muted-foreground">Экономия</p>
                        <p className="font-semibold text-lg text-green-600">
                          -{savings.saved} ({savings.percentage}%)
                        </p>
                      </div>
                    </div>

                    {/* Meta Info */}
                    <div className="flex flex-wrap gap-2">
                      {link.campaign && (
                        <Badge variant="outline">
                          Campaign: {link.campaign}
                        </Badge>
                      )}
                      {link.source && (
                        <Badge variant="outline">
                          Source: {link.source}
                        </Badge>
                      )}
                      {link.lead_id && (
                        <Badge variant="outline">
                          Lead: {link.lead_id.substring(0, 8)}...
                        </Badge>
                      )}
                    </div>

                    {/* Original URL */}
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Оригинальная ссылка:</p>
                      <p className="text-xs font-mono bg-muted px-2 py-1 rounded break-all">
                        {link.original_url}
                      </p>
                    </div>

                    {/* Timestamps */}
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <div>
                        Создана: {formatDistanceToNow(new Date(link.created_at), { addSuffix: true, locale: ru })}
                      </div>
                      {link.first_clicked_at && (
                        <div>
                          Первый клик: {formatDistanceToNow(new Date(link.first_clicked_at), { addSuffix: true, locale: ru })}
                        </div>
                      )}
                      {link.last_clicked_at && (
                        <div>
                          Последний клик: {formatDistanceToNow(new Date(link.last_clicked_at), { addSuffix: true, locale: ru })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}




