const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs-extra');
const path = require('path');
const config = require('./config.json');
const logger = require('./src/utils/logger');
const commandHandler = require('./src/handlers/commandHandler');
const adsManager = require('./src/services/adsManager');
const apiService = require('./src/services/apiService');

class WhatsAppBot {
    constructor() {
        this.client = null;
        this.isReady = false;
        this.pairingCode = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.sessionPath = path.join(__dirname, '.wwebjs_auth');
        
        this.initializeBot();
    }
    
    async initializeBot() {
        try {
            logger.info('Inicializando WhatsApp Bot...', {
                version: config.botInfo.versao,
                numero: config.numeroBot
            });
            
            // Configurar cliente WhatsApp
            this.client = new Client({
                authStrategy: new LocalAuth({
                    clientId: 'bot-ads-client',
                    dataPath: this.sessionPath
                }),
                puppeteer: {
                    headless: true,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--no-zygote',
                        '--single-process',
                        '--disable-gpu'
                    ]
                },
                webVersionCache: {
                    type: 'remote',
                    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
                }
            });
            
            this.setupEventHandlers();
            
            // Inicializar cliente
            await this.client.initialize();
            
            // Solicitar código de pareamento após inicialização
            setTimeout(async () => {
                if (!this.isReady) {
                    await this.requestPairingCode(config.numeroBot);
                }
            }, 5000);
            
        } catch (error) {
            logger.error('Erro ao inicializar bot', error);
            await this.handleReconnection();
        }
    }
    
    setupEventHandlers() {
        // QR Code para pareamento
        this.client.on('qr', async (qr) => {
            logger.info('QR Code gerado, tentando obter código de pareamento');
            console.log('\n⚠️ QR Code gerado, tentando obter código de pareamento...\n');
            
            // Tentar solicitar código de pareamento
            try {
                await this.requestPairingCode(config.numeroBot);
            } catch (error) {
                console.log('📱 Não foi possível obter código de pareamento, use o QR Code:');
                console.log(qr);
                console.log('\n');
            }
        });
        
        // Código de pareamento
        this.client.on('code', (code) => {
            this.pairingCode = code;
            logger.info('Código de pareamento gerado', { code });
            console.log('\n🔗 CÓDIGO DE PAREAMENTO:', code);
            console.log('📱 Digite este código no seu WhatsApp Web\n');
        });
        
        // Cliente autenticado
        this.client.on('authenticated', () => {
            logger.info('Cliente autenticado com sucesso');
            console.log('✅ Autenticado com sucesso!');
        });
        
        // Falha na autenticação
        this.client.on('auth_failure', (message) => {
            logger.error('Falha na autenticação', new Error(message));
            console.log('❌ Falha na autenticação:', message);
        });
        
        // Cliente pronto
        this.client.on('ready', async () => {
            this.isReady = true;
            this.reconnectAttempts = 0;
            
            const clientInfo = this.client.info;
            logger.info('Bot conectado e pronto!', {
                numero: clientInfo.wid.user,
                nome: clientInfo.pushname,
                plataforma: clientInfo.platform
            });
            
            console.log('\n🤖 BOT CONECTADO E PRONTO!');
            console.log(`📱 Número: ${clientInfo.wid.user}`);
            console.log(`👤 Nome: ${clientInfo.pushname}`);
            console.log(`💻 Plataforma: ${clientInfo.platform}`);
            console.log(`🕐 Horário: ${new Date().toLocaleString('pt-BR')}\n`);
            
            // Configurar cliente no gerenciador de anúncios
            adsManager.setWhatsappClient(this.client);
            
            // Testar conexão com API
            if (apiService.isEnabled()) {
                const apiConnected = await apiService.testConnection();
                logger.info('Status da conexão com API', { connected: apiConnected });
                
                if (apiConnected) {
                    console.log('🌐 Conexão com API Laravel: ✅ Ativa');
                    // Sincronizar anúncios na inicialização
                    await adsManager.syncWithApi();
                } else {
                    console.log('🌐 Conexão com API Laravel: ❌ Falha');
                }
            } else {
                console.log('🌐 API Laravel: ⚠️ Desabilitada');
            }
            
            // Enviar mensagem de inicialização para o dono
            await this.sendStartupMessage();
        });
        
        // Mensagens recebidas
        this.client.on('message', async (message) => {
            try {
                // Ignorar mensagens de status e próprias mensagens
                if (message.from === 'status@broadcast' || message.fromMe) {
                    return;
                }
                
                // Processar comando
                await commandHandler.handleMessage(message, this.client);
                
            } catch (error) {
                logger.error('Erro ao processar mensagem', error, {
                    from: message.from,
                    body: message.body
                });
            }
        });
        
        // Desconexão
        this.client.on('disconnected', async (reason) => {
            this.isReady = false;
            logger.warn('Cliente desconectado', { reason });
            console.log('⚠️ Cliente desconectado:', reason);
            
            if (config.autoReconnect) {
                await this.handleReconnection();
            }
        });
        
        // Erro no cliente
        this.client.on('error', (error) => {
            logger.error('Erro no cliente WhatsApp', error);
            console.log('❌ Erro no cliente:', error.message);
        });
        
        // Loading screen
        this.client.on('loading_screen', (percent, message) => {
            if (percent < 100) {
                console.log(`📱 Carregando WhatsApp Web: ${percent}% - ${message}`);
            }
        });
    }
    
    async handleReconnection() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            logger.error('Máximo de tentativas de reconexão atingido');
            console.log('❌ Máximo de tentativas de reconexão atingido. Bot será encerrado.');
            process.exit(1);
        }
        
        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        
        logger.info(`Tentativa de reconexão ${this.reconnectAttempts}/${this.maxReconnectAttempts} em ${delay}ms`);
        console.log(`🔄 Tentando reconectar em ${delay/1000}s... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        setTimeout(async () => {
            try {
                if (this.client) {
                    await this.client.destroy();
                }
                await this.initializeBot();
            } catch (error) {
                logger.error('Erro na tentativa de reconexão', error);
                await this.handleReconnection();
            }
        }, delay);
    }
    
    async sendStartupMessage() {
        try {
            const ownerNumber = config.numeroDono + '@c.us';
            const stats = adsManager.getStats();
            
            const startupMessage = `🤖 *${config.botInfo.nome}* iniciado!\n\n` +
                                 `🕐 *Horário:* ${new Date().toLocaleString('pt-BR')}\n` +
                                 `📱 *Número:* ${config.numeroBot}\n` +
                                 `🆔 *Versão:* ${config.botInfo.versao}\n\n` +
                                 `📊 *Status:*\n` +
                                 `• Anúncios ativos: ${stats.activeAds}\n` +
                                 `• API Laravel: ${apiService.isEnabled() ? '✅' : '❌'}\n` +
                                 `• Timezone: ${config.timezone}\n\n` +
                                 `💡 Use *${config.prefix}help* para ver os comandos.`;
            
            await this.client.sendMessage(ownerNumber, startupMessage);
            logger.info('Mensagem de inicialização enviada para o dono');
            
        } catch (error) {
            logger.error('Erro ao enviar mensagem de inicialização', error);
        }
    }
    
    // Método para obter código de pareamento para um número específico
    async requestPairingCode(phoneNumber) {
        try {
            if (!phoneNumber) {
                phoneNumber = config.numeroBot;
            }
            
            // Limpar número (remover caracteres não numéricos)
            const cleanNumber = phoneNumber.replace(/\D/g, '');
            
            logger.info('Solicitando código de pareamento', { numero: cleanNumber });
            
            const code = await this.client.requestPairingCode(cleanNumber);
            this.pairingCode = code;
            
            console.log('\n🔗 CÓDIGO DE PAREAMENTO SOLICITADO:');
            console.log(`📱 Número: ${cleanNumber}`);
            console.log(`🔢 Código: ${code}`);
            console.log('📋 Digite este código no WhatsApp Web do número informado\n');
            
            return code;
            
        } catch (error) {
            logger.error('Erro ao solicitar código de pareamento', error);
            throw error;
        }
    }
    
    // Método para obter status do bot
    getStatus() {
        return {
            isReady: this.isReady,
            pairingCode: this.pairingCode,
            reconnectAttempts: this.reconnectAttempts,
            clientInfo: this.client?.info || null,
            adsStats: adsManager.getStats(),
            apiEnabled: apiService.isEnabled()
        };
    }
    
    // Método para parar o bot graciosamente
    async stop() {
        try {
            logger.info('Parando bot...');
            console.log('🛑 Parando bot...');
            
            if (this.client) {
                await this.client.destroy();
            }
            
            logger.info('Bot parado com sucesso');
            console.log('✅ Bot parado com sucesso');
            
        } catch (error) {
            logger.error('Erro ao parar bot', error);
        }
    }
}

// Inicializar bot
const bot = new WhatsAppBot();

// Manipular sinais do sistema para parada graciosa
process.on('SIGINT', async () => {
    console.log('\n🛑 Recebido sinal de interrupção...');
    await bot.stop();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Recebido sinal de terminação...');
    await bot.stop();
    process.exit(0);
});

// Manipular erros não capturados
process.on('uncaughtException', (error) => {
    logger.error('Erro não capturado', error);
    console.error('❌ Erro não capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Promise rejeitada não tratada', reason);
    console.error('❌ Promise rejeitada:', reason);
});

// Exportar instância do bot para uso externo
module.exports = bot;

// Log de inicialização
console.log('🚀 Iniciando WhatsApp Bot...');
console.log(`📋 Configuração: ${config.botInfo.nome} v${config.botInfo.versao}`);
console.log(`📱 Número do Bot: ${config.numeroBot}`);
console.log(`👤 Dono: ${config.numeroDono}`);
console.log(`🔧 Prefixo: ${config.prefix}`);
console.log(`🌐 API Laravel: ${config.laravelApi.enabled ? 'Habilitada' : 'Desabilitada'}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');