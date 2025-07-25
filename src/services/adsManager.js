const fs = require('fs-extra');
const path = require('path');
const moment = require('moment-timezone');
const { CronJob } = require('cron');
const config = require('../../config.json');
const logger = require('../utils/logger');
const apiService = require('./apiService');

class AdsManager {
    constructor() {
        this.dataFile = path.join(__dirname, '../../', config.localAds.dataFile);
        this.ads = new Map();
        this.cronJobs = new Map();
        this.lastSyncTime = null;
        this.whatsappClient = null;
        
        // Garantir que o diretório existe
        this.ensureDataDirectory();
        
        // Carregar anúncios locais
        this.loadLocalAds();
        
        // Configurar sincronização periódica
        this.setupPeriodicSync();
    }
    
    setWhatsappClient(client) {
        this.whatsappClient = client;
    }
    
    async ensureDataDirectory() {
        const dir = path.dirname(this.dataFile);
        await fs.ensureDir(dir);
    }
    
    async loadLocalAds() {
        try {
            if (await fs.pathExists(this.dataFile)) {
                const data = await fs.readJson(this.dataFile);
                this.ads = new Map(Object.entries(data));
                logger.info(`Carregados ${this.ads.size} anúncios locais`);
                
                // Recriar cron jobs
                this.recreateCronJobs();
            }
        } catch (error) {
            logger.error('Erro ao carregar anúncios locais', error);
            this.ads = new Map();
        }
    }
    
    async saveLocalAds() {
        try {
            const data = Object.fromEntries(this.ads);
            await fs.writeJson(this.dataFile, data, { spaces: 2 });
        } catch (error) {
            logger.error('Erro ao salvar anúncios locais', error);
        }
    }
    
    generateLocalAdId() {
        const existingIds = Array.from(this.ads.keys()).map(key => {
            const ad = this.ads.get(key);
            return ad.localId ? parseInt(ad.localId) : 0;
        }).filter(id => !isNaN(id));
        
        return existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    }
    
    async addAd(groupId, content, interval, unit) {
        const localId = this.generateLocalAdId();
        const adKey = `${groupId}_${localId}`;
        
        const adData = {
            localId: localId,
            groupId: groupId,
            content: content,
            interval: interval,
            unit: unit,
            active: true,
            createdAt: moment().tz(config.timezone).format(),
            lastSent: null,
            sentCount: 0
        };
        
        // Salvar localmente primeiro
        this.ads.set(adKey, adData);
        await this.saveLocalAds();
        
        // Criar cron job
        this.createCronJob(adKey, adData);
        
        logger.info(`Anúncio adicionado localmente`, { localId, groupId, interval, unit });
        
        // Sincronizar com API se habilitada
        if (apiService.isEnabled()) {
            try {
                const apiData = {
                    group_id: groupId,
                    content: content,
                    interval: interval,
                    unit: unit,
                    local_ad_id: localId.toString()
                };
                
                const response = await apiService.createAd(apiData);
                
                if (response.success) {
                    // Atualizar com ID da API
                    adData.apiId = response.data.id;
                    this.ads.set(adKey, adData);
                    await this.saveLocalAds();
                    
                    logger.info(`Anúncio sincronizado com API`, { localId, apiId: response.data.id });
                }
            } catch (error) {
                logger.error('Erro ao sincronizar anúncio com API', error, { localId });
            }
        }
        
        return localId;
    }
    
    async removeAd(groupId, localId) {
        const adKey = `${groupId}_${localId}`;
        const ad = this.ads.get(adKey);
        
        if (!ad) {
            return false;
        }
        
        // Remover cron job
        this.removeCronJob(adKey);
        
        // Remover localmente
        this.ads.delete(adKey);
        await this.saveLocalAds();
        
        logger.info(`Anúncio removido localmente`, { localId, groupId });
        
        // Sincronizar com API se habilitada
        if (apiService.isEnabled()) {
            try {
                await apiService.deleteAd(localId.toString(), groupId);
                logger.info(`Anúncio removido da API`, { localId, groupId });
            } catch (error) {
                logger.error('Erro ao remover anúncio da API', error, { localId, groupId });
            }
        }
        
        return true;
    }
    
    getAdsList(groupId) {
        const groupAds = Array.from(this.ads.entries())
            .filter(([key, ad]) => ad.groupId === groupId && ad.active)
            .map(([key, ad]) => ({
                id: ad.localId,
                content: ad.content.substring(0, 50) + (ad.content.length > 50 ? '...' : ''),
                interval: ad.interval,
                unit: ad.unit,
                sentCount: ad.sentCount,
                lastSent: ad.lastSent,
                createdAt: ad.createdAt
            }))
            .sort((a, b) => a.id - b.id);
        
        return groupAds;
    }
    
    createCronJob(adKey, adData) {
        if (this.cronJobs.has(adKey)) {
            this.cronJobs.get(adKey).destroy();
        }
        
        const cronExpression = this.getCronExpression(adData.interval, adData.unit);
        
        const job = new CronJob(
            cronExpression,
            () => this.sendAd(adKey, adData),
            null,
            true,
            config.timezone
        );
        
        this.cronJobs.set(adKey, job);
        logger.debug(`Cron job criado para anúncio ${adData.localId}`, { cronExpression });
    }
    
    removeCronJob(adKey) {
        if (this.cronJobs.has(adKey)) {
            this.cronJobs.get(adKey).destroy();
            this.cronJobs.delete(adKey);
        }
    }
    
    recreateCronJobs() {
        // Limpar jobs existentes
        this.cronJobs.forEach(job => job.destroy());
        this.cronJobs.clear();
        
        // Recriar jobs para anúncios ativos
        this.ads.forEach((adData, adKey) => {
            if (adData.active) {
                this.createCronJob(adKey, adData);
            }
        });
    }
    
    getCronExpression(interval, unit) {
        switch (unit.toLowerCase()) {
            case 'minutos':
            case 'minutes':
            case 'm':
                return `*/${interval} * * * *`;
            case 'horas':
            case 'hours':
            case 'h':
                return `0 */${interval} * * *`;
            case 'dias':
            case 'days':
            case 'd':
                return `0 0 */${interval} * *`;
            default:
                return `*/${interval} * * * *`; // Default para minutos
        }
    }
    
    async sendAd(adKey, adData) {
        if (!this.whatsappClient) {
            logger.warn('Cliente WhatsApp não disponível para envio de anúncio', { adKey });
            return;
        }
        
        try {
            await this.whatsappClient.sendMessage(adData.groupId, adData.content);
            
            // Atualizar estatísticas
            adData.lastSent = moment().tz(config.timezone).format();
            adData.sentCount = (adData.sentCount || 0) + 1;
            
            this.ads.set(adKey, adData);
            await this.saveLocalAds();
            
            logger.info(`Anúncio enviado automaticamente`, {
                localId: adData.localId,
                groupId: adData.groupId,
                sentCount: adData.sentCount
            });
            
            // Marcar como enviado na API
            if (apiService.isEnabled() && adData.apiId) {
                await apiService.markAdAsSent(adData.apiId);
            }
            
        } catch (error) {
            logger.error('Erro ao enviar anúncio automático', error, {
                localId: adData.localId,
                groupId: adData.groupId
            });
        }
    }
    
    setupPeriodicSync() {
        if (!apiService.isEnabled()) {
            return;
        }
        
        // Sincronização a cada intervalo configurado
        setInterval(async () => {
            await this.syncWithApi();
        }, config.sync.adsInterval);
        
        logger.info(`Sincronização periódica configurada: ${config.sync.adsInterval}ms`);
    }
    
    async syncWithApi() {
        if (!apiService.isEnabled()) {
            return;
        }
        
        try {
            const apiResponse = await apiService.getAds();
            
            if (apiResponse.success && apiResponse.data) {
                // Processar anúncios da API
                for (const apiAd of apiResponse.data) {
                    if (apiAd.local_ad_id) {
                        const adKey = `${apiAd.group_id}_${apiAd.local_ad_id}`;
                        const localAd = this.ads.get(adKey);
                        
                        if (localAd) {
                            // Atualizar ID da API se necessário
                            if (!localAd.apiId) {
                                localAd.apiId = apiAd.id;
                                this.ads.set(adKey, localAd);
                            }
                        } else if (config.sync.sendNewImmediately) {
                            // Adicionar novo anúncio da API localmente
                            const newAdData = {
                                localId: parseInt(apiAd.local_ad_id),
                                groupId: apiAd.group_id,
                                content: apiAd.content,
                                interval: apiAd.interval,
                                unit: apiAd.unit,
                                active: apiAd.active,
                                apiId: apiAd.id,
                                createdAt: apiAd.created_at,
                                lastSent: apiAd.last_sent_at,
                                sentCount: 0
                            };
                            
                            this.ads.set(adKey, newAdData);
                            this.createCronJob(adKey, newAdData);
                        }
                    }
                }
                
                await this.saveLocalAds();
                this.lastSyncTime = moment().tz(config.timezone).format();
                
                logger.info(`Sincronização com API concluída`, {
                    adsCount: apiResponse.data.length,
                    lastSync: this.lastSyncTime
                });
            }
            
        } catch (error) {
            logger.error('Erro na sincronização com API', error);
        }
    }
    
    // Método para obter estatísticas
    getStats() {
        const totalAds = this.ads.size;
        const activeAds = Array.from(this.ads.values()).filter(ad => ad.active).length;
        const totalSent = Array.from(this.ads.values()).reduce((sum, ad) => sum + (ad.sentCount || 0), 0);
        
        return {
            totalAds,
            activeAds,
            totalSent,
            lastSync: this.lastSyncTime,
            cronJobsActive: this.cronJobs.size
        };
    }
}

module.exports = new AdsManager();