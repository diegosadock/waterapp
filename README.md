# 💧 Lembrete de Hidratação

Aplicativo desenvolvido com **Angular** que ajuda você a manter-se hidratado ao longo do dia, com lembretes automáticos via **Service Worker** e notificações push.

![Banner](./src/assets/banner.png) <!-- Substitua por uma imagem se quiser -->

## 🚀 Funcionalidades

- ✅ Cálculo automático da **meta diária de água** com base no peso, idade e nível de atividade física.
- ✅ **Notificações recorrentes** configuráveis com lembretes para beber água.
- ✅ Histórico de consumo dos **últimos 7 dias**.
- ✅ Suporte ao **modo escuro** 🌙.
- ✅ Armazenamento local (LocalStorage) para persistência de dados.
- ✅ Totalmente funcional mesmo **offline** graças ao Service Worker.

---

## 🧠 Como funciona

- Ao abrir o app, o usuário informa peso, idade e se pratica atividade física.
- O sistema calcula a meta de ingestão hídrica diária.
- O usuário define o intervalo dos lembretes (em minutos).
- O Service Worker envia notificações em segundo plano, mesmo com o app fechado.

---

## 🛠️ Tecnologias

- [Angular](https://angular.io/)
- [TypeScript](https://www.typescriptlang.org/)
- [Service Workers](https://developer.mozilla.org/pt-BR/docs/Web/API/Service_Worker_API)
- LocalStorage API
- Bootstrap 5

---

## 📦 Instalação

1. Clone o repositório:

```bash
git clone https://github.com/seu-usuario/lembrete-hidratacao.git
cd lembrete-hidratacao
```

2. Instale as Dependências

```bash
npm install
```

3. Inicie o servidor de desenvolvimento
```bash
ng serve
```

Acesse em: http://localhost:4200

⚠️ Importante
O navegador deve permitir notificações. A permissão será solicitada na primeira vez que abrir o app.

O Service Worker não funciona em localhost em todos os navegadores, então para testes reais, é recomendável rodar com um servidor HTTPS ou usar o ng build e servir via http-server.

```bash
npm install -g http-server
ng build --configuration production
cd dist/lembrete-hidratacao
http-server -p 8080
```

Acesse: http://localhost:8080

📁 Estrutura de Arquivos

```css
📁 src/
 ┣ 📁 app/
 ┃ ┣ 📄 home.component.ts
 ┃ ┣ 📄 agua.service.ts
 ┣ 📄 custom-sw.js        ← Service Worker personalizado
 ┣ 📄 index.html
 ┗ 📄 main.ts
```

🧑‍💻 Código Principal
home.component.ts (resumo dos pontos chave)
Cálculo da meta diária com peso, idade e atividade.

Armazenamento em LocalStorage.

Envio da configuração de intervalo para o Service Worker.

Controle de notificações e tema escuro.

custom-sw.js (Service Worker)
```js
let intervalo = null;       // Tempo entre notificações em minutos
let lembreteTimeout = null; // Referência para cancelamento de setTimeout

self.addEventListener('message', event => {
  const data = event.data;

  if (data?.type === 'SET_INTERVAL') {
    intervalo = data.minutes;
    cancelarNotificacoes();
    iniciarNotificacoes();
  }

  if (data?.type === 'CANCELAR_LEMBRETES') {
    cancelarNotificacoes();
  }

  if (data?.type === 'REINICIAR_LEMBRETES') {
    cancelarNotificacoes();
    iniciarNotificacoes();
  }
});

function cancelarNotificacoes() {
  if (lembreteTimeout !== null) {
    clearTimeout(lembreteTimeout);
    lembreteTimeout = null;
  }
}

function iniciarNotificacoes() {
  if (!intervalo || intervalo <= 0) return;

  const agendarNotificacao = () => {
    lembreteTimeout = setTimeout(() => {
      self.registration.showNotification('💧 Hora de beber água!', {
        body: 'Mantenha-se hidratado! Beba um copo de água agora.',
        icon: 'assets/icons/icon-72x72.png',
        badge: 'assets/icons/icon-72x72.png'
      });
      agendarNotificacao();
    }, intervalo * 60 * 1000);
  };

  agendarNotificacao();
}

self.addEventListener('install', event => self.skipWaiting());
self.addEventListener('activate', event => clients.claim());
```

🧪 Testes

Você pode verificar o status do Service Worker e notificações pelo console do navegador:

```js
navigator.serviceWorker.getRegistrations().then(console.log)
Notification.permission // "granted", "default" ou "denied"
```

## Agradecimentos:
Inspirado pela necessidade de cuidar melhor da saúde e lembrar de beber água diariamente. 💙
Código livre para você adaptar e melhorar como quiser!

### Autor: 
Diego Sadock
