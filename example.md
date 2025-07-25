# 📋 Exemplos Práticos de Uso

## 🚀 Como Iniciar o Bot

### 1. Primeira Execução
```bash
npm start
```

Você verá algo como:
```
🚀 Iniciando WhatsApp Bot...
📋 Configuração: Bot Admin v2.0.0
📱 Número do Bot: 5543996191225
👤 Dono: 554191236158
🔧 Prefixo: !
🌐 API Laravel: Habilitada
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔗 CÓDIGO DE PAREAMENTO: 12345678
📱 Digite este código no seu WhatsApp Web
```

### 2. Pareamento
1. Abra WhatsApp no celular
2. Vá em **Configurações > Aparelhos conectados**
3. Toque em **"Conectar um aparelho"**
4. Digite o código: **12345678**

## 📱 Exemplos de Comandos

### ➕ Criar Anúncios

#### Promoção de 30 minutos
```
!addads 🔥 PROMOÇÃO RELÂMPAGO! 50% OFF em todos os produtos! Corre que é por tempo limitado! 🏃‍♂️💨|30m
```

#### Lembrete de 2 horas
```
!addads 📢 Lembrete: Nossa live começa em 2 horas! Não percam! 🎥✨|2h
```

#### Anúncio diário
```
!addads 🌅 Bom dia, grupo! Que tal começar o dia com energia positiva? ☕️😊|1d
```

#### Ofertas especiais
```
!addads 💎 OFERTA ESPECIAL: Kit completo por apenas R$ 99,90! Últimas unidades! 📦|45m
```

### 📋 Listar Anúncios

Comando:
```
!listads
```

Resultado esperado:
```
📋 Lista de Anúncios Ativos

🆔 ID: 1
📝 Mensagem: 🔥 PROMOÇÃO RELÂMPAGO! 50% OFF em todos os pr...
⏰ Intervalo: 30 minutos
📊 Enviado: 5 vezes
🕐 Último envio: 15/01/2024 14:30:25

━━━━━━━━━━━━━━━━━━━━━━━━━━

🆔 ID: 2
📝 Mensagem: 📢 Lembrete: Nossa live começa em 2 horas! N...
⏰ Intervalo: 2 horas
📊 Enviado: 3 vezes
🕐 Último envio: 15/01/2024 12:00:00

━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 Total: 2 anúncio(s) ativo(s)
💡 Use !rmads [ID] para remover um anúncio
```

### ❌ Remover Anúncios

```
!rmads 1
```

Resultado:
```
✅ Anúncio removido com sucesso!

🆔 ID removido: 1

📋 Use !listads para ver os anúncios restantes.
```

### ℹ️ Ajuda
```
!help
```

### 📊 Estatísticas (apenas dono)
```
!stats
```

Resultado para o dono:
```
📊 Estatísticas do Bot

🤖 Bot: Bot Admin
📱 Número: 5543996191225
🆔 Versão: 2.0.0

📋 Anúncios:
• Total: 5
• Ativos: 3
• Enviados: 127
• Cron Jobs: 3

🔄 Sincronização:
• API: ✅ Ativa
• Última Sync: 15/01/2024 14:35:12

🕐 Timezone: America/Sao_Paulo
```

## 🌐 Integração com Laravel

### Exemplo de Sincronização

Quando você cria um anúncio no bot:
```
!addads Produto em destaque hoje!|1h
```

O bot automaticamente:
1. ✅ Salva localmente
2. ✅ Cria cron job
3. ✅ Envia para API Laravel
4. ✅ Recebe confirmação com ID da API

### Exemplo de Requisição para API

```bash
curl -X POST https://painel.botwpp.tech/api/ads \
  -H "Authorization: Bearer gabriel17" \
  -H "Content-Type: application/json" \
  -d '{
    "group_id": "120363123456789@g.us",
    "content": "Produto em destaque hoje!",
    "interval": 1,
    "unit": "horas",
    "local_ad_id": "3"
  }'
```

## 🕒 Cronograma de Anúncios

### Exemplo de Programação Semanal

**Segunda-feira:**
```
!addads 🌟 Segunda-feira de ofertas! Confira nossos produtos em destaque! 🛍️|4h
```

**Meio da semana:**
```
!addads 🚀 Quarta-feira de inovação! Novidades chegando! 💡|6h
```

**Sexta-feira:**
```
!addads 🎉 SEXTOU! Promoções especiais para o fim de semana! 🍻|3h
```

## 📊 Monitoramento

### Ver logs em tempo real
```bash
tail -f bot.log
```

### Verificar se o bot está rodando
```bash
ps aux | grep node
```

### Testar API Laravel
```bash
curl -H "Authorization: Bearer gabriel17" https://painel.botwpp.tech/api/ads
```

## 🔧 Configurações Personalizadas

### Para Lojas
```json
{
  "localAds": {
    "maxAdsPerGroup": 15,
    "defaultInterval": 45
  }
}
```

### Para Comunidades
```json
{
  "localAds": {
    "maxAdsPerGroup": 5,
    "defaultInterval": 120
  }
}
```

### Para Suporte
```json
{
  "sync": {
    "adsInterval": 15000,
    "sendNewImmediately": true
  }
}
```

## ⚠️ Casos de Erro

### Erro: Intervalo muito baixo
```
!addads Teste|2m
```
Resposta:
```
❌ O intervalo mínimo é de 5 minutos!
```

### Erro: Formato incorreto
```
!addads Mensagem sem tempo
```
Resposta:
```
❌ Formato incorreto!

📝 Uso correto:
!addads mensagem do anúncio|tempo

📋 Exemplos:
!addads Promoção especial hoje!|30m
!addads Não perca essa oferta|2h
!addads Lembrete diário|1d
```

### Erro: Limite atingido
```
!addads Mais um anúncio|1h
```
Resposta (se já tiver 10 anúncios):
```
❌ Limite máximo de 10 anúncios por grupo atingido!
```

## 🎯 Dicas de Uso

### ✅ Boas Práticas
- Use intervalos maiores que 5 minutos
- Mensagens claras e objetivas
- Teste em grupos pequenos primeiro
- Monitore os logs regularmente

### ❌ Evite
- Intervalos muito curtos (spam)
- Mensagens muito longas
- Muitos anúncios simultâneos
- Usar em grupos sem permissão

## 🔄 Fluxo Completo

1. **Iniciar bot**: `npm start`
2. **Parear dispositivo**: Código de 8 dígitos
3. **Entrar em grupo**: Adicionar bot ao grupo
4. **Criar anúncio**: `!addads Mensagem|tempo`
5. **Verificar lista**: `!listads`
6. **Monitorar envios**: Logs automáticos
7. **Remover se necessário**: `!rmads ID`

## 📞 Suporte

Se algo não funcionar:
1. Verifique os logs: `tail -f bot.log`
2. Confirme a conexão: Status no console
3. Teste a API: Requisição manual
4. Reinicie se necessário: Ctrl+C e `npm start`