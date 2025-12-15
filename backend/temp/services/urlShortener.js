"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createShortLink = createShortLink;
exports.resolveShortLink = resolveShortLink;
exports.trackShortLinkClick = trackShortLinkClick;
exports.getShortLinkStats = getShortLinkStats;
exports.getLeadShortLinksStats = getLeadShortLinksStats;
exports.deactivateShortLink = deactivateShortLink;
const supabase_js_1 = require("@supabase/supabase-js");
const crypto_1 = __importDefault(require("crypto"));
/**
 * 🔗 URL SHORTENER SERVICE
 * Создает короткие ссылки для SMS и отслеживает клики
 */
const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL || 'https://fgrfrkxvmqomqsdqwssh.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
/**
 * Генерирует уникальный короткий код (6 символов)
 * Использует base62 (a-z, A-Z, 0-9) для максимальной компактности
 */
function generateShortCode() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const randomBytes = crypto_1.default.randomBytes(4);
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars[randomBytes[i % 4] % chars.length];
    }
    return code;
}
/**
 * Создает короткую ссылку
 */
async function createShortLink(params) {
    try {
        // Генерируем уникальный короткий код
        let shortCode = generateShortCode();
        let attempts = 0;
        const maxAttempts = 10;
        // Проверяем уникальность кода (крайне маловероятно что будет коллизия, но проверим)
        while (attempts < maxAttempts) {
            const { data: existing } = await supabase
                .from('short_links')
                .select('id')
                .eq('short_code', shortCode)
                .single();
            if (!existing)
                break; // Код уникален
            shortCode = generateShortCode();
            attempts++;
        }
        if (attempts >= maxAttempts) {
            console.error('❌ Failed to generate unique short code after 10 attempts');
            return null;
        }
        // Вычисляем дату истечения, если указано
        let expiresAt = null;
        if (params.expiresInDays) {
            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + params.expiresInDays);
            expiresAt = expirationDate.toISOString();
        }
        // Создаем запись в базе данных
        const { data, error } = await supabase
            .from('short_links')
            .insert({
            id: shortCode, // Используем short_code как ID для простоты
            short_code: shortCode,
            original_url: params.originalUrl,
            lead_id: params.leadId || null,
            campaign: params.campaign || null,
            source: params.source || null,
            expires_at: expiresAt,
            is_active: true,
            clicks_count: 0,
            unique_ips: []
        })
            .select()
            .single();
        if (error) {
            console.error('❌ Error creating short link:', error);
            return null;
        }
        console.log(`✅ Short link created: ${shortCode} -> ${params.originalUrl}`);
        return shortCode;
    }
    catch (error) {
        console.error('❌ Error in createShortLink:', error.message);
        return null;
    }
}
/**
 * Получает оригинальную ссылку по короткому коду
 */
async function resolveShortLink(shortCode) {
    try {
        const { data, error } = await supabase
            .from('short_links')
            .select('original_url, is_active, expires_at')
            .eq('short_code', shortCode)
            .single();
        if (error || !data) {
            console.log(`⚠️ Short link not found: ${shortCode}`);
            return null;
        }
        // Проверяем активность ссылки
        if (!data.is_active) {
            console.log(`⚠️ Short link is inactive: ${shortCode}`);
            return null;
        }
        // Проверяем срок действия
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
            console.log(`⚠️ Short link expired: ${shortCode}`);
            return null;
        }
        return data.original_url;
    }
    catch (error) {
        console.error('❌ Error resolving short link:', error.message);
        return null;
    }
}
/**
 * Отслеживает клик по короткой ссылке
 */
async function trackShortLinkClick(shortCode, ipAddress, userAgent, referer) {
    try {
        // 1. Получаем текущую статистику ссылки
        const { data: linkData, error: fetchError } = await supabase
            .from('short_links')
            .select('clicks_count, unique_ips, first_clicked_at')
            .eq('short_code', shortCode)
            .single();
        if (fetchError || !linkData) {
            console.error('❌ Error fetching short link data:', fetchError);
            return;
        }
        // 2. Проверяем уникальность IP
        const uniqueIps = linkData.unique_ips || [];
        const isUniqueClick = !uniqueIps.includes(ipAddress);
        // 3. Обновляем статистику основной таблицы
        const updatedUniqueIps = isUniqueClick ? [...uniqueIps, ipAddress] : uniqueIps;
        const { error: updateError } = await supabase
            .from('short_links')
            .update({
            clicks_count: (linkData.clicks_count || 0) + 1,
            unique_ips: updatedUniqueIps,
            first_clicked_at: linkData.first_clicked_at || new Date().toISOString(),
            last_clicked_at: new Date().toISOString()
        })
            .eq('short_code', shortCode);
        if (updateError) {
            console.error('❌ Error updating short link stats:', updateError);
        }
        // 4. Записываем детальную информацию о клике
        const { error: clickError } = await supabase
            .from('short_link_clicks')
            .insert({
            short_link_id: shortCode,
            ip_address: ipAddress,
            user_agent: userAgent || null,
            referer: referer || null
        });
        if (clickError) {
            console.error('❌ Error recording click:', clickError);
        }
        console.log(`✅ Click tracked: ${shortCode} (unique: ${isUniqueClick}, total: ${linkData.clicks_count + 1})`);
    }
    catch (error) {
        console.error('❌ Error tracking click:', error.message);
    }
}
/**
 * Получает статистику по короткой ссылке
 */
async function getShortLinkStats(shortCode) {
    try {
        const { data, error } = await supabase
            .from('short_links')
            .select('short_code, original_url, clicks_count, unique_ips, last_clicked_at, created_at')
            .eq('short_code', shortCode)
            .single();
        if (error || !data) {
            return null;
        }
        return {
            shortCode: data.short_code,
            originalUrl: data.original_url,
            clicks: data.clicks_count || 0,
            uniqueClicks: (data.unique_ips || []).length,
            lastClickedAt: data.last_clicked_at,
            createdAt: data.created_at
        };
    }
    catch (error) {
        console.error('❌ Error getting stats:', error.message);
        return null;
    }
}
/**
 * Получает статистику по всем ссылкам для lead_id
 */
async function getLeadShortLinksStats(leadId) {
    try {
        const { data, error } = await supabase
            .from('short_links')
            .select('short_code, original_url, clicks_count, unique_ips, last_clicked_at, created_at')
            .eq('lead_id', leadId)
            .order('created_at', { ascending: false });
        if (error || !data) {
            return [];
        }
        return data.map(item => ({
            shortCode: item.short_code,
            originalUrl: item.original_url,
            clicks: item.clicks_count || 0,
            uniqueClicks: (item.unique_ips || []).length,
            lastClickedAt: item.last_clicked_at,
            createdAt: item.created_at
        }));
    }
    catch (error) {
        console.error('❌ Error getting lead stats:', error.message);
        return [];
    }
}
/**
 * Деактивирует короткую ссылку
 */
async function deactivateShortLink(shortCode) {
    try {
        const { error } = await supabase
            .from('short_links')
            .update({ is_active: false })
            .eq('short_code', shortCode);
        if (error) {
            console.error('❌ Error deactivating short link:', error);
            return false;
        }
        console.log(`✅ Short link deactivated: ${shortCode}`);
        return true;
    }
    catch (error) {
        console.error('❌ Error in deactivateShortLink:', error.message);
        return false;
    }
}
