# 🤖 WhatsApp Bot com Anúncios Automáticos

Bot WhatsApp desenvolvido com whatsapp-web.js para gerenciar anúncios automáticos em grupos com integração total ao Laravel.

## 📋 Funcionalidades

- ✅ **Anúncios Automáticos**: Envio programado de mensagens em grupos
- ✅ **Integração Laravel**: Sincronização completa com API Laravel
- ✅ **Conexão por Pairing Code**: Código de 8 dígitos para conexão
- ✅ **Gerenciamento de IDs**: IDs sequenciais crescentes para anúncios
- ✅ **Persistência de Sessão**: Mantém conexão após reinicialização
- ✅ **Sistema de Logs**: Logging completo de atividades
- ✅ **Reconexão Automática**: Reconecta automaticamente em caso de falha

## 🚀 Instalação

### 1. Clonar o Repositório
```bash
git clone <repositorio>
cd whatsapp-bot-ads
```

### 2. Instalar Dependências
```bash
npm install
```

### 3. Configurar o Bot
Edite o arquivo `config.json` com suas configurações:

```json
{
  "numeroBot": "5543996191225",
  "numeroDono": "554191236158",
  "prefix": "!",
  "laravelApi": {
    "enabled": true,
    "baseUrl": "https://painel.botwpp.tech/api",
    "token": "gabriel17"
  }
}
```

### 4. Iniciar o Bot
```bash
npm start
```

## 🔗 Conexão por Pairing Code

### Método 1: Automático (ao iniciar o bot)
```bash
npm start
```
O código será exibido no console automaticamente.

### Método 2: Gerar código específico
```bash
node pairing.js 5543996191225
```

### Instruções de Pareamento:
1. Abra o WhatsApp no seu celular
2. Vá em **Configurações > Aparelhos conectados**
3. Toque em **"Conectar um aparelho"**
4. Digite o código de 8 dígitos quando solicitado
5. ⏰ O código expira em alguns minutos!

## 📱 Comandos Disponíveis

### 🔹 !addads
Cria um anúncio automático no grupo
```
!addads mensagem do anúncio|tempo

Exemplos:
!addads Promoção especial hoje!|30m
!addads Não perca essa oferta|2h
!addads Lembrete diário|1d
```

**Formatos de tempo:**
- `m` = minutos (mínimo: 5m)
- `h` = horas
- `d` = dias

### 🔹 !listads
Lista todos os anúncios ativos do grupo
```
!listads
```

Mostra:
- ID do anúncio (ordem crescente)
- Mensagem (prévia)
- Intervalo de envio
- Quantas vezes foi enviado
- Data do último envio

### 🔹 !rmads
Remove um anúncio pelo ID
```
!rmads [ID]

Exemplo:
!rmads 3
```

### 🔹 !help
Mostra ajuda com todos os comandos
```
!help
```

### 🔹 !stats
Estatísticas do bot (apenas para o dono)
```
!stats
```

## 🌐 Integração Laravel

### Endpoints da API

#### GET /api/ads
Busca todos os anúncios do usuário
```json
{
  "success": true,
  "data": [...]
}
```

#### POST /api/ads
Cria um novo anúncio
```json
{
  "group_id": "120363123456789@g.us",
  "content": "Mensagem do anúncio",
  "interval": 30,
  "unit": "minutos",
  "local_ad_id": "1"
}
```

#### DELETE /api/ads/local/{localAdId}
Remove um anúncio por ID local
```json
{
  "group_id": "120363123456789@g.us"
}
```

#### POST /api/ads/{id}/sent
Marca um anúncio como enviado

### Autenticação
Todas as requisições usam Bearer Token:
```
Authorization: Bearer gabriel17
```

## 📊 Sincronização

### Automática
- **Intervalo**: 30 segundos (configurável)
- **Bidirecional**: Bot ↔ Laravel
- **Fallback**: Sistema local caso API falhe

### Manual
A sincronização acontece automaticamente:
- Na inicialização do bot
- A cada intervalo configurado
- Ao criar/remover anúncios

## 📁 Estrutura do Projeto

```
whatsapp-bot-ads/
├── src/
│   ├── handlers/
│   │   └── commandHandler.js    # Processamento de comandos
│   ├── services/
│   │   ├── apiService.js        # Integração com Laravel API
│   │   └── adsManager.js        # Gerenciamento de anúncios
│   └── utils/
│       └── logger.js            # Sistema de logs
├── data/
│   └── ads.json                 # Dados locais dos anúncios
├── config.json                  # Configurações do bot
├── index.js                     # Arquivo principal
├── pairing.js                   # Gerador de código de pareamento
└── package.json                 # Dependências
```

## 🔧 Configurações Avançadas

### config.json - Seções Principais

#### Bot Settings
```json
{
  "numeroBot": "5543996191225",
  "numeroDono": "554191236158",
  "prefix": "!",
  "timezone": "America/Sao_Paulo"
}
```

#### Laravel API
```json
{
  "laravelApi": {
    "enabled": true,
    "baseUrl": "https://painel.botwpp.tech/api",
    "token": "gabriel17",
    "timeout": 10000,
    "retryAttempts": 3,
    "retryDelay": 2000
  }
}
```

#### Sincronização
```json
{
  "sync": {
    "adsInterval": 30000,
    "messagesInterval": 30000,
    "enableFallback": true,
    "sendNewImmediately": true
  }
}
```

#### Anúncios Locais
```json
{
  "localAds": {
    "enabled": true,
    "dataFile": "data/ads.json",
    "maxAdsPerGroup": 10,
    "defaultInterval": 60
  }
}
```

## 📝 Logs

### Localização
- **Arquivo**: `bot.log`
- **Console**: Saída em tempo real
- **Rotação**: 5MB por arquivo, máximo 5 arquivos

### Tipos de Log
- **Info**: Operações normais
- **Error**: Erros e exceções
- **API**: Requisições para Laravel
- **Debug**: Informações detalhadas

## 🚨 Troubleshooting

### Bot não conecta
1. Verifique se o número está correto
2. Gere um novo código de pareamento
3. Certifique-se que o WhatsApp Web está desconectado

### API não sincroniza
1. Verifique a URL da API
2. Confirme o token de autenticação
3. Teste a conectividade de rede

### Anúncios não são enviados
1. Verifique se o bot está em grupos
2. Confirme se os cron jobs estão ativos
3. Verifique os logs para erros

### Comandos não funcionam
1. Verifique o prefixo configurado
2. Certifique-se que está em um grupo
3. Confirme que o bot está ativo

## 📈 Monitoramento

### Status do Bot
```bash
# Ver logs em tempo real
tail -f bot.log

# Verificar processos
ps aux | grep node

# Status da API
curl -H "Authorization: Bearer gabriel17" https://painel.botwpp.tech/api/ads
```

### Estatísticas
Use o comando `!stats` para ver:
- Número total de anúncios
- Anúncios ativos
- Total de mensagens enviadas
- Status da API Laravel
- Última sincronização

## 🔒 Segurança

- ✅ Token de autenticação para API
- ✅ Validação de comandos
- ✅ Logs de todas as operações
- ✅ Limite de anúncios por grupo
- ✅ Validação de intervalos mínimos

## 🆘 Suporte

Para problemas ou dúvidas:
1. Verifique os logs em `bot.log`
2. Consulte a seção de troubleshooting
3. Verifique a conectividade com a API Laravel

## 📄 Licença

MIT License - Veja o arquivo LICENSE para detalhes.

---

🤖 **Bot Admin v2.0.0** - Bot Administrador de Grupos WhatsApp com Integração Laravel Híbrida