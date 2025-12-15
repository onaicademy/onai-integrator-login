"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AMOCRM_CONFIG = void 0;
exports.getStageByPaymentMethod = getStageByPaymentMethod;
exports.getProfTestInitialStage = getProfTestInitialStage;
exports.AMOCRM_CONFIG = {
    PIPELINE_ID: 10350882,
    STAGES: {
        НЕРАЗОБРАННОЕ: 81854574, // Неразобранное
        ЗАЯВКА_С_ПРОФТЕСТА: 81856842, // заявка с профтеста
        НАЖАЛ_КАСПИ_ОПЛАТА: 82174958, // нажал "каспи оплата"
        НАЖАЛ_ПРОДАМУС: 81854578, // Нажал "продамус"
        НАЖАЛ_ЧАТ_С_МЕНЕДЖЕРОМ: 81854582, // Нажал "Чат с менеджером"
        ПРОШЕЛ_1Й_УРОК: 82174962, // Прошел 1й урок
        ПРОШЕЛ_2Й_УРОК: 81854586, // Прошел 2й урок
        ПРОШЕЛ_3Й_УРОК: 81854614, // прошел 3й урок
        ПОСМОТРЕЛ_ВЕБИНАР: 81854618, // посмотрел вебинар
        УСПЕШНО_РЕАЛИЗОВАНО: 142, // Успешно реализовано
        ЗАКРЫТО_И_НЕ_РЕАЛИЗОВАНО: 143, // Закрыто и не реализовано
    },
    CUSTOM_FIELDS: {
        UTM_SOURCE: 434731, // utm_source
        UTM_MEDIUM: 434727, // utm_medium (основной)
        UTM_CAMPAIGN: 434729, // utm_campaign (основной)
        UTM_CONTENT: 434725, // utm_content (основной)
        UTM_TERM: 434733, // utm_term
        UTM_REFERRER: 434735, // utm_referrer
        FBCLID: 434761, // fbclid
        // Note: есть дубликаты полей в AmoCRM (522935, 951803, 951805, 951807)
        // используем основные ID выше
    },
};
// Helper function to get stage ID by payment method
function getStageByPaymentMethod(method) {
    switch (method) {
        case 'kaspi':
            return exports.AMOCRM_CONFIG.STAGES.НАЖАЛ_КАСПИ_ОПЛАТА; // 82174958
        case 'card':
            return exports.AMOCRM_CONFIG.STAGES.НАЖАЛ_ПРОДАМУС; // 81854578
        case 'manager':
            return exports.AMOCRM_CONFIG.STAGES.НАЖАЛ_ЧАТ_С_МЕНЕДЖЕРОМ; // 81854582
        default:
            return exports.AMOCRM_CONFIG.STAGES.ЗАЯВКА_С_ПРОФТЕСТА; // 81856842
    }
}
// Helper function to get initial stage for proftest leads
function getProfTestInitialStage() {
    return exports.AMOCRM_CONFIG.STAGES.ЗАЯВКА_С_ПРОФТЕСТА; // 81856842
}
