const { Client, LocalAuth } = require('whatsapp-web.js');
const config = require('./config.json');

async function generatePairingCode() {
    const phoneNumber = process.argv[2] || config.numeroBot;
    
    if (!phoneNumber) {
        console.log('❌ Número de telefone não fornecido!');
        console.log('📝 Uso: node pairing.js [numero]');
        console.log('📋 Exemplo: node pairing.js 5543996191225');
        process.exit(1);
    }
    
    // Limpar número
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    console.log('🚀 Iniciando geração de código de pareamento...');
    console.log(`📱 Número: ${cleanNumber}\n`);
    
    const client = new Client({
        authStrategy: new LocalAuth({
            clientId: 'pairing-client',
            dataPath: './.wwebjs_pairing'
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
        }
    });
    
    client.on('qr', (qr) => {
        console.log('📱 QR Code gerado (alternativo):');
        console.log(qr);
        console.log('\n');
    });
    
    client.on('code', (code) => {
        console.log('🔗 CÓDIGO DE PAREAMENTO GERADO:');
        console.log(`📱 Número: ${cleanNumber}`);
        console.log(`🔢 Código: ${code}`);
        console.log('\n📋 INSTRUÇÕES:');
        console.log('1. Abra o WhatsApp no seu celular');
        console.log('2. Vá em Configurações > Aparelhos conectados');
        console.log('3. Toque em "Conectar um aparelho"');
        console.log('4. Digite o código acima quando solicitado');
        console.log('\n⏰ O código expira em alguns minutos!\n');
    });
    
    client.on('authenticated', () => {
        console.log('✅ Autenticado com sucesso!');
    });
    
    client.on('ready', () => {
        console.log('🤖 Cliente conectado e pronto!');
        console.log('✅ Pareamento concluído com sucesso!');
        
        setTimeout(() => {
            client.destroy();
            process.exit(0);
        }, 3000);
    });
    
    client.on('auth_failure', (message) => {
        console.log('❌ Falha na autenticação:', message);
        process.exit(1);
    });
    
    client.on('error', (error) => {
        console.log('❌ Erro:', error.message);
        process.exit(1);
    });
    
    try {
        await client.initialize();
        
        // Solicitar código de pareamento
        setTimeout(async () => {
            try {
                const code = await client.requestPairingCode(cleanNumber);
                console.log(`\n🔄 Código solicitado: ${code}`);
            } catch (error) {
                console.log('❌ Erro ao solicitar código:', error.message);
            }
        }, 5000);
        
    } catch (error) {
        console.log('❌ Erro ao inicializar cliente:', error.message);
        process.exit(1);
    }
}

// Manipular Ctrl+C
process.on('SIGINT', () => {
    console.log('\n🛑 Processo interrompido pelo usuário');
    process.exit(0);
});

generatePairingCode();