const axios = require('axios');
const config = require('../../config.json');
const logger = require('../utils/logger');

class ApiService {
    constructor() {
        this.baseUrl = config.laravelApi.baseUrl;
        this.token = config.laravelApi.token;
        this.timeout = config.laravelApi.timeout;
        this.retryAttempts = config.laravelApi.retryAttempts;
        this.retryDelay = config.laravelApi.retryDelay;
        
        // Configurar axios
        this.api = axios.create({
            baseURL: this.baseUrl,
            timeout: this.timeout,
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        // Interceptor para logging
        this.api.interceptors.request.use(
            (config) => {
                logger.api(`Requisição: ${config.method?.toUpperCase()} ${config.url}`, {
                    data: config.data
                });
                return config;
            },
            (error) => {
                logger.error('Erro na requisição API', error);
                return Promise.reject(error);
            }
        );
        
        this.api.interceptors.response.use(
            (response) => {
                logger.api(`Resposta: ${response.status} - ${response.config.url}`, {
                    data: response.data
                });
                return response;
            },
            (error) => {
                logger.error('Erro na resposta API', error, {
                    url: error.config?.url,
                    status: error.response?.status,
                    data: error.response?.data
                });
                return Promise.reject(error);
            }
        );
    }
    
    async makeRequest(method, endpoint, data = null, retryCount = 0) {
        try {
            const response = await this.api({
                method,
                url: endpoint,
                data
            });
            
            return response.data;
        } catch (error) {
            if (retryCount < this.retryAttempts) {
                logger.warn(`Tentativa ${retryCount + 1}/${this.retryAttempts} falhou, tentando novamente em ${this.retryDelay}ms`, {
                    endpoint,
                    error: error.message
                });
                
                await this.delay(this.retryDelay);
                return this.makeRequest(method, endpoint, data, retryCount + 1);
            }
            
            throw error;
        }
    }
    
    // Métodos para anúncios
    async getAds() {
        try {
            return await this.makeRequest('GET', '/ads');
        } catch (error) {
            logger.error('Erro ao buscar anúncios da API', error);
            return { success: false, data: [] };
        }
    }
    
    async createAd(adData) {
        try {
            return await this.makeRequest('POST', '/ads', adData);
        } catch (error) {
            logger.error('Erro ao criar anúncio na API', error, { adData });
            throw error;
        }
    }
    
    async deleteAd(localAdId, groupId) {
        try {
            return await this.makeRequest('DELETE', `/ads/local/${localAdId}`, { group_id: groupId });
        } catch (error) {
            logger.error('Erro ao deletar anúncio na API', error, { localAdId, groupId });
            throw error;
        }
    }
    
    async markAdAsSent(adId) {
        try {
            return await this.makeRequest('POST', `/ads/${adId}/sent`);
        } catch (error) {
            logger.error('Erro ao marcar anúncio como enviado', error, { adId });
            return { success: false };
        }
    }
    
    // Método utilitário para delay
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Verificar se API está ativa
    isEnabled() {
        return config.laravelApi.enabled;
    }
    
    // Testar conexão com API
    async testConnection() {
        try {
            const response = await this.makeRequest('GET', '/test');
            logger.info('Conexão com API testada com sucesso', response);
            return true;
        } catch (error) {
            logger.error('Falha no teste de conexão com API', error);
            return false;
        }
    }
}

module.exports = new ApiService();