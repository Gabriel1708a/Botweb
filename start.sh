#!/bin/bash

# Script de inicialização do WhatsApp Bot
echo "🚀 Iniciando WhatsApp Bot com Anúncios Automáticos"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Por favor, instale o Node.js primeiro."
    exit 1
fi

# Verificar se npm está instalado
if ! command -v npm &> /dev/null; then
    echo "❌ npm não encontrado. Por favor, instale o npm primeiro."
    exit 1
fi

# Verificar se as dependências estão instaladas
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
fi

# Criar diretório de dados se não existir
if [ ! -d "data" ]; then
    echo "📁 Criando diretório de dados..."
    mkdir -p data
fi

# Verificar se arquivo de configuração existe
if [ ! -f "config.json" ]; then
    echo "❌ Arquivo config.json não encontrado!"
    echo "📋 Por favor, configure o bot antes de iniciar."
    exit 1
fi

# Mostrar informações do bot
echo "📋 Configuração carregada:"
echo "   • Arquivo: config.json"
echo "   • Dados: data/"
echo "   • Logs: bot.log"

echo ""
echo "🔗 Para conectar o bot:"
echo "   1. Um código de pareamento será exibido"
echo "   2. Abra WhatsApp > Configurações > Aparelhos conectados"
echo "   3. Toque em 'Conectar um aparelho'"
echo "   4. Digite o código de 8 dígitos"

echo ""
echo "📱 Comandos disponíveis:"
echo "   • !addads mensagem|tempo - Criar anúncio"
echo "   • !listads - Listar anúncios"
echo "   • !rmads ID - Remover anúncio"
echo "   • !help - Ajuda"

echo ""
echo "🛑 Para parar o bot: Ctrl+C"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Iniciar o bot
node index.js