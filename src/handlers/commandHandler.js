const config = require('../../config.json');
const logger = require('../utils/logger');
const adsManager = require('../services/adsManager');

class CommandHandler {
    constructor() {
        this.prefix = config.prefix;
        this.ownerNumber = config.numeroDono;
    }
    
    async handleMessage(message, client) {
        try {
            const messageBody = message.body.trim();
            const contact = await message.getContact();
            const chat = await message.getChat();
            
            // Verificar se é um comando
            if (!messageBody.startsWith(this.prefix)) {
                return;
            }
            
            // Extrair comando e argumentos
            const args = messageBody.slice(this.prefix.length).split(' ');
            const command = args.shift().toLowerCase();
            
            logger.info(`Comando recebido: ${command}`, {
                from: contact.number,
                chat: chat.id._serialized,
                isGroup: chat.isGroup
            });
            
            // Verificar se é grupo (comandos de ads só funcionam em grupos)
            if (!chat.isGroup && ['addads', 'listads', 'rmads'].includes(command)) {
                await message.reply('❌ Os comandos de anúncios só funcionam em grupos!');
                return;
            }
            
            // Processar comandos
            switch (command) {
                case 'addads':
                    await this.handleAddAds(message, args, chat);
                    break;
                    
                case 'listads':
                    await this.handleListAds(message, chat);
                    break;
                    
                case 'rmads':
                    await this.handleRemoveAds(message, args, chat);
                    break;
                    
                case 'help':
                case 'ajuda':
                    await this.handleHelp(message);
                    break;
                    
                case 'stats':
                case 'estatisticas':
                    await this.handleStats(message, contact);
                    break;
                    
                default:
                    await message.reply(`❌ Comando "${command}" não encontrado. Use ${this.prefix}help para ver os comandos disponíveis.`);
            }
            
        } catch (error) {
            logger.error('Erro ao processar comando', error, {
                messageBody: message.body,
                from: message.from
            });
            
            await message.reply('❌ Ocorreu um erro ao processar o comando. Tente novamente.');
        }
    }
    
    async handleAddAds(message, args, chat) {
        try {
            // Formato: !addads mensagem da pessoa|tempo definido em m ou h
            const fullArgs = args.join(' ');
            
            if (!fullArgs.includes('|')) {
                await message.reply(`❌ Formato incorreto!\n\n📝 *Uso correto:*\n${this.prefix}addads mensagem do anúncio|tempo\n\n📋 *Exemplos:*\n${this.prefix}addads Promoção especial hoje!|30m\n${this.prefix}addads Não perca essa oferta|2h\n${this.prefix}addads Lembrete diário|1d`);
                return;
            }
            
            const [content, timeStr] = fullArgs.split('|').map(s => s.trim());
            
            if (!content || !timeStr) {
                await message.reply('❌ Mensagem e tempo são obrigatórios!');
                return;
            }
            
            // Extrair número e unidade do tempo
            const timeMatch = timeStr.match(/^(\d+)([mhd]?)$/i);
            if (!timeMatch) {
                await message.reply('❌ Formato de tempo inválido! Use: 30m, 2h, 1d');
                return;
            }
            
            const interval = parseInt(timeMatch[1]);
            let unit = timeMatch[2].toLowerCase() || 'm';
            
            // Normalizar unidade
            const unitMap = {
                'm': 'minutos',
                'h': 'horas', 
                'd': 'dias'
            };
            unit = unitMap[unit] || 'minutos';
            
            // Validar limites
            if (interval < 1) {
                await message.reply('❌ O intervalo deve ser maior que 0!');
                return;
            }
            
            if (unit === 'minutos' && interval < 5) {
                await message.reply('❌ O intervalo mínimo é de 5 minutos!');
                return;
            }
            
            // Verificar limite de anúncios por grupo
            const existingAds = adsManager.getAdsList(chat.id._serialized);
            if (existingAds.length >= config.localAds.maxAdsPerGroup) {
                await message.reply(`❌ Limite máximo de ${config.localAds.maxAdsPerGroup} anúncios por grupo atingido!`);
                return;
            }
            
            // Adicionar anúncio
            const adId = await adsManager.addAd(chat.id._serialized, content, interval, unit);
            
            const unitText = {
                'minutos': interval === 1 ? 'minuto' : 'minutos',
                'horas': interval === 1 ? 'hora' : 'horas',
                'dias': interval === 1 ? 'dia' : 'dias'
            };
            
            await message.reply(`✅ *Anúncio criado com sucesso!*\n\n🆔 *ID:* ${adId}\n📝 *Mensagem:* ${content}\n⏰ *Intervalo:* ${interval} ${unitText[unit]}\n\n🤖 O anúncio será enviado automaticamente no intervalo definido.`);
            
            logger.info(`Anúncio criado via comando`, {
                adId,
                groupId: chat.id._serialized,
                interval,
                unit,
                contentLength: content.length
            });
            
        } catch (error) {
            logger.error('Erro ao adicionar anúncio', error);
            await message.reply('❌ Erro ao criar anúncio. Tente novamente.');
        }
    }
    
    async handleListAds(message, chat) {
        try {
            const ads = adsManager.getAdsList(chat.id._serialized);
            
            if (ads.length === 0) {
                await message.reply('📋 *Lista de Anúncios*\n\n❌ Nenhum anúncio ativo neste grupo.\n\n💡 Use !addads para criar um anúncio.');
                return;
            }
            
            let response = '📋 *Lista de Anúncios Ativos*\n\n';
            
            ads.forEach(ad => {
                const unitText = {
                    'minutos': ad.interval === 1 ? 'minuto' : 'minutos',
                    'horas': ad.interval === 1 ? 'hora' : 'horas', 
                    'dias': ad.interval === 1 ? 'dia' : 'dias'
                };
                
                response += `🆔 *ID:* ${ad.id}\n`;
                response += `📝 *Mensagem:* ${ad.content}\n`;
                response += `⏰ *Intervalo:* ${ad.interval} ${unitText[ad.unit]}\n`;
                response += `📊 *Enviado:* ${ad.sentCount || 0} vezes\n`;
                
                if (ad.lastSent) {
                    const lastSent = new Date(ad.lastSent).toLocaleString('pt-BR');
                    response += `🕐 *Último envio:* ${lastSent}\n`;
                }
                
                response += '\n━━━━━━━━━━━━━━━━━━━━\n\n';
            });
            
            response += `📈 *Total:* ${ads.length} anúncio(s) ativo(s)\n`;
            response += `💡 Use !rmads [ID] para remover um anúncio`;
            
            await message.reply(response);
            
        } catch (error) {
            logger.error('Erro ao listar anúncios', error);
            await message.reply('❌ Erro ao buscar lista de anúncios.');
        }
    }
    
    async handleRemoveAds(message, args, chat) {
        try {
            if (args.length === 0) {
                await message.reply(`❌ ID do anúncio é obrigatório!\n\n📝 *Uso:* ${this.prefix}rmads [ID]\n📋 Use ${this.prefix}listads para ver os IDs disponíveis.`);
                return;
            }
            
            const adId = parseInt(args[0]);
            
            if (isNaN(adId)) {
                await message.reply('❌ ID deve ser um número válido!');
                return;
            }
            
            const removed = await adsManager.removeAd(chat.id._serialized, adId);
            
            if (removed) {
                await message.reply(`✅ *Anúncio removido com sucesso!*\n\n🆔 *ID removido:* ${adId}\n\n📋 Use ${this.prefix}listads para ver os anúncios restantes.`);
                
                logger.info(`Anúncio removido via comando`, {
                    adId,
                    groupId: chat.id._serialized
                });
            } else {
                await message.reply(`❌ Anúncio com ID ${adId} não encontrado!\n\n📋 Use ${this.prefix}listads para ver os IDs disponíveis.`);
            }
            
        } catch (error) {
            logger.error('Erro ao remover anúncio', error);
            await message.reply('❌ Erro ao remover anúncio. Tente novamente.');
        }
    }
    
    async handleHelp(message) {
        const helpText = `🤖 *${config.botInfo.nome} - v${config.botInfo.versao}*\n\n` +
                        `📋 *Comandos Disponíveis:*\n\n` +
                        `🔹 *${this.prefix}addads* mensagem|tempo\n` +
                        `   Cria um anúncio automático\n` +
                        `   Exemplo: ${this.prefix}addads Promoção!|30m\n\n` +
                        `🔹 *${this.prefix}listads*\n` +
                        `   Lista todos os anúncios ativos\n\n` +
                        `🔹 *${this.prefix}rmads* [ID]\n` +
                        `   Remove um anúncio pelo ID\n\n` +
                        `🔹 *${this.prefix}help*\n` +
                        `   Mostra esta ajuda\n\n` +
                        `🔹 *${this.prefix}stats*\n` +
                        `   Estatísticas do bot (apenas dono)\n\n` +
                        `⏰ *Formatos de tempo:*\n` +
                        `• m = minutos (mín: 5m)\n` +
                        `• h = horas\n` +
                        `• d = dias\n\n` +
                        `💡 *Nota:* Comandos de anúncios funcionam apenas em grupos!`;
        
        await message.reply(helpText);
    }
    
    async handleStats(message, contact) {
        try {
            // Verificar se é o dono
            if (contact.number !== this.ownerNumber.replace(/\D/g, '')) {
                await message.reply('❌ Comando disponível apenas para o administrador.');
                return;
            }
            
            const stats = adsManager.getStats();
            
            const statsText = `📊 *Estatísticas do Bot*\n\n` +
                             `🤖 *Bot:* ${config.botInfo.nome}\n` +
                             `📱 *Número:* ${config.numeroBot}\n` +
                             `🆔 *Versão:* ${config.botInfo.versao}\n\n` +
                             `📋 *Anúncios:*\n` +
                             `• Total: ${stats.totalAds}\n` +
                             `• Ativos: ${stats.activeAds}\n` +
                             `• Enviados: ${stats.totalSent}\n` +
                             `• Cron Jobs: ${stats.cronJobsActive}\n\n` +
                             `🔄 *Sincronização:*\n` +
                             `• API: ${config.laravelApi.enabled ? '✅ Ativa' : '❌ Desativa'}\n` +
                             `• Última Sync: ${stats.lastSync || 'Nunca'}\n\n` +
                             `🕐 *Timezone:* ${config.timezone}`;
            
            await message.reply(statsText);
            
        } catch (error) {
            logger.error('Erro ao mostrar estatísticas', error);
            await message.reply('❌ Erro ao buscar estatísticas.');
        }
    }
}

module.exports = new CommandHandler();