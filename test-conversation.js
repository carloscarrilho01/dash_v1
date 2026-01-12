#!/usr/bin/env node

/**
 * Script de teste para simular uma conversa completa
 * Execute: node test-conversation.js
 */

const API_URL = 'http://localhost:3001/api/webhook/message';

// Função para enviar mensagem
async function sendMessage(userId, userName, message, isBot = false) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        userName,
        message,
        isBot,
        timestamp: new Date().toISOString(),
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`✅ ${isBot ? 'BOT' : 'USER'}: ${message}`);
      return data;
    } else {
      console.error(`❌ Erro: ${data.error}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Erro ao enviar mensagem: ${error.message}`);
    console.log('⚠️  Certifique-se de que o servidor está rodando (npm run dev)');
    return null;
  }
}

// Função para esperar
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Conversas de exemplo
const conversations = {
  suporte: {
    userId: 'user_001',
    userName: 'João Silva',
    messages: [
      { text: 'Olá, preciso de ajuda com meu pedido', isBot: false },
      { text: 'Olá João! Claro, vou te ajudar. Qual é o número do seu pedido?', isBot: true },
      { text: 'É o pedido #12345', isBot: false },
      { text: 'Encontrei seu pedido! Status: Em trânsito. Previsão de entrega: 15/01/2025', isBot: true },
      { text: 'Ótimo, obrigado!', isBot: false },
      { text: 'De nada! Se precisar de mais alguma coisa, estou à disposição! 😊', isBot: true },
    ]
  },
  vendas: {
    userId: 'user_002',
    userName: 'Maria Santos',
    messages: [
      { text: 'Gostaria de informações sobre os planos', isBot: false },
      { text: 'Claro! Temos 3 planos disponíveis: Básico (R$ 29/mês), Pro (R$ 79/mês) e Enterprise (R$ 199/mês)', isBot: true },
      { text: 'Qual a diferença entre o Pro e o Enterprise?', isBot: false },
      { text: 'O Pro inclui até 100 usuários e 50GB de armazenamento. O Enterprise tem usuários ilimitados, 500GB e suporte prioritário 24/7', isBot: true },
      { text: 'Perfeito! Vou com o plano Pro', isBot: false },
      { text: 'Excelente escolha! Vou te enviar o link de pagamento por email.', isBot: true },
    ]
  },
  tecnico: {
    userId: 'user_003',
    userName: 'Carlos Oliveira',
    messages: [
      { text: 'Estou com problema para fazer login', isBot: false },
      { text: 'Vou te ajudar com isso. Você está recebendo alguma mensagem de erro?', isBot: true },
      { text: 'Sim, aparece "Senha inválida" mas tenho certeza que está correta', isBot: false },
      { text: 'Entendo. Vou resetar sua senha. Verifique seu email em alguns instantes.', isBot: true },
      { text: 'Recebi o email! Já consegui fazer login. Obrigado!', isBot: false },
      { text: 'Que bom que resolvemos! Qualquer coisa, estou por aqui.', isBot: true },
    ]
  }
};

// Menu interativo
function showMenu() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  🧪 Simulador de Conversas - n8n      ║');
  console.log('╚════════════════════════════════════════╝\n');
  console.log('Escolha uma opção:');
  console.log('1. Simular conversa de Suporte');
  console.log('2. Simular conversa de Vendas');
  console.log('3. Simular conversa Técnica');
  console.log('4. Simular TODAS as conversas');
  console.log('5. Enviar mensagem personalizada');
  console.log('0. Sair\n');
}

// Simula uma conversa
async function simulateConversation(conversationKey) {
  const conv = conversations[conversationKey];
  console.log(`\n🎬 Iniciando conversa: ${conv.userName}\n`);

  for (const msg of conv.messages) {
    await sendMessage(conv.userId, conv.userName, msg.text, msg.isBot);
    await sleep(1500); // Pausa de 1.5s entre mensagens
  }

  console.log(`\n✅ Conversa finalizada!\n`);
}

// Simula todas as conversas
async function simulateAllConversations() {
  console.log('\n🎬 Simulando todas as conversas...\n');

  for (const key of Object.keys(conversations)) {
    await simulateConversation(key);
    await sleep(2000); // Pausa entre conversas
  }

  console.log('✅ Todas as conversas foram simuladas!\n');
}

// Enviar mensagem personalizada
async function customMessage() {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const prompt = (question) => new Promise((resolve) => {
    readline.question(question, resolve);
  });

  console.log('\n📝 Mensagem Personalizada\n');

  const userId = await prompt('User ID: ');
  const userName = await prompt('Nome do Usuário: ');
  const message = await prompt('Mensagem: ');
  const isBot = (await prompt('É mensagem do bot? (s/n): ')).toLowerCase() === 's';

  await sendMessage(userId, userName, message, isBot);

  readline.close();
}

// Modo não interativo (argumentos de linha de comando)
async function runNonInteractive() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log('Uso: node test-conversation.js [suporte|vendas|tecnico|all]');
    console.log('Exemplo: node test-conversation.js suporte');
    process.exit(0);
  }

  if (command === 'all') {
    await simulateAllConversations();
  } else if (conversations[command]) {
    await simulateConversation(command);
  } else {
    console.log(`❌ Conversa "${command}" não encontrada`);
    console.log('Conversas disponíveis: suporte, vendas, tecnico, all');
    process.exit(1);
  }
}

// Modo interativo
async function runInteractive() {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const prompt = (question) => new Promise((resolve) => {
    readline.question(question, resolve);
  });

  while (true) {
    showMenu();
    const choice = await prompt('Digite sua opção: ');

    switch (choice) {
      case '1':
        await simulateConversation('suporte');
        break;
      case '2':
        await simulateConversation('vendas');
        break;
      case '3':
        await simulateConversation('tecnico');
        break;
      case '4':
        await simulateAllConversations();
        break;
      case '5':
        await customMessage();
        break;
      case '0':
        console.log('\n👋 Até logo!\n');
        readline.close();
        process.exit(0);
      default:
        console.log('\n❌ Opção inválida!\n');
    }

    await sleep(1000);
  }
}

// Detecta se foi chamado com argumentos ou interativo
if (process.argv.length > 2) {
  runNonInteractive().then(() => process.exit(0));
} else {
  runInteractive();
}
