import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { AguaService } from '../../services/agua.service';
import { isPlatformBrowser } from '@angular/common';

interface Historico {
  data: string; // YYYY-MM-DD
  quantidade: number; // em ml
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  peso = 70;
  idade = 25;
  atividade = false;
  metaDiaria = 0;
  quantidadeBebida = 0;
  customVolumes = [300, 500, 750];
  intervaloMinutos = 60;
  configurado = false;
  mostrarConfiguracoes = false;
  notificacaoAtiva = false;
  ultimaData = new Date().toDateString();
  historico: Historico[] = [];
  temaEscuro = false;

  constructor(private aguaService: AguaService, @Inject(PLATFORM_ID) private platformId: Object) { }

ngOnInit() {
  if (isPlatformBrowser(this.platformId)) {
    this.carregarLocalStorage();
    this.carregarTema();
    this.carregarHistorico();

    // Garante que o SW seja avisado que a aba foi aberta
    this.enviarMensagemSW({ type: 'ABA_ABERTA' });

    // Detecta quando a aba é ocultada ou visível
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.enviarMensagemSW({ type: 'ABA_ABERTA' });
      } else if (document.visibilityState === 'hidden') {
        this.enviarMensagemSW({ type: 'ABA_FECHADA' });
      }
    });

    // Detecta quando a aba é fechada ou recarregada
    window.addEventListener('beforeunload', () => {
      this.enviarMensagemSW({ type: 'ABA_FECHADA' });
    });

    if (this.configurado && this.notificacaoAtiva) {
      this.iniciarLembretes();
      this.enviarIntervaloAoSW();
    }

    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          this.notificacaoAtiva = true;
          this.salvarLocalStorage();
          this.iniciarLembretes();
          this.enviarIntervaloAoSW();
        }
      });
    }

    if (!this.intervaloMinutos || this.intervaloMinutos <= 0) {
      this.intervaloMinutos = 60;
      this.salvarLocalStorage();
    }

    if (this.notificacaoAtiva) {
      this.enviarIntervaloAoSW();
    }
  }
}

  configurarMeta() {
    this.metaDiaria = this.aguaService.calcularMeta(this.peso, this.idade, this.atividade);
    this.configurado = true;
    this.salvarLocalStorage();
    this.iniciarLembretes();
  }

  atualizarVolumes(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.customVolumes = input.value
      .split(',')
      .map(v => parseInt(v.trim(), 10))
      .filter(v => !isNaN(v) && v > 0);
    this.salvarLocalStorage();
  }

  iniciarLembretes() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SET_INTERVAL',
      minutes: Number(this.intervaloMinutos)
    });
  } else {
    navigator.serviceWorker.ready.then(registration => {
      if (registration.active) {
        registration.active.postMessage({
          type: 'SET_INTERVAL',
          minutes: Number(this.intervaloMinutos)
        });
      }
    });
  }
}


  enviarIntervaloAoSW() {
    const intervaloValido = Number(this.intervaloMinutos);
    if (isNaN(intervaloValido) || intervaloValido <= 0) {
      console.warn('Intervalo inválido, não será enviado ao SW.');
      return;
    }

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SET_INTERVAL',
        minutes: Number(intervaloValido)
      });
      console.log('Intervalo enviado ao SW:', intervaloValido);
    } else {
      console.warn('SW ainda não está pronto ou disponível.');
    }
  }

  adicionarAgua(quantidade: number) {
    this.quantidadeBebida = Math.min(this.quantidadeBebida + quantidade, this.metaDiaria);
    this.salvarLocalStorage();
    this.salvarHistoricoHoje();
  }

  removerAgua(quantidade: number) {
    this.quantidadeBebida = Math.max(this.quantidadeBebida - quantidade, 0);
    this.salvarLocalStorage();
    this.salvarHistoricoHoje();
  }

  cancelarLembretes() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CANCELAR_LEMBRETES' });
    this.notificacaoAtiva = false;
    this.salvarLocalStorage();  // salva no objeto aguaApp
    console.log('Lembretes desativados.');
  }
}

 reativarLembretes() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'REINICIAR_LEMBRETES' });
    this.notificacaoAtiva = true;
    this.salvarLocalStorage();  // salva no objeto aguaApp
    console.log('Lembretes reativados.');
  }
  }

  resetarQuantidade() {
    this.quantidadeBebida = 0;
    this.salvarLocalStorage();
    this.salvarHistoricoHoje();
  }

  verificarData() {
    const hoje = new Date().toDateString();
    if (hoje !== this.ultimaData) {
      this.quantidadeBebida = 0;
      this.ultimaData = hoje;
      this.salvarLocalStorage();
    }
  }

 atualizarIntervalo(novoValor: number) {
  if (novoValor > 0) {
    this.intervaloMinutos = novoValor;
    this.salvarLocalStorage();
    this.enviarIntervaloAoSW();
  }
}



  // Salvar no histórico (localStorage) para a data de hoje
  salvarHistoricoHoje() {
    const hoje = new Date().toISOString().slice(0, 10);
    let historicoRaw = localStorage.getItem('aguaHistorico');
    let historicoObj: Record<string, number> = historicoRaw ? JSON.parse(historicoRaw) : {};

    historicoObj[hoje] = this.quantidadeBebida; // <- salvar o valor atual, sem somar

    localStorage.setItem('aguaHistorico', JSON.stringify(historicoObj));
    this.carregarHistorico();
  }


  carregarHistorico() {
    const historicoRaw = localStorage.getItem('aguaHistorico');
    if (!historicoRaw) {
      this.historico = [];
      return;
    }

    const historicoObj: Record<string, number> = JSON.parse(historicoRaw);

    // Pegar últimos 7 dias, ordenados
    const dias = [];
    const hoje = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoje);
      d.setDate(hoje.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dias.push({
        data: key,
        quantidade: historicoObj[key] || 0
      });
    }

    this.historico = dias;
    // Atualizar quantidadeBebida do dia atual
    this.quantidadeBebida = this.historico[6]?.quantidade || 0;
  }

  toggleTema() {
    this.temaEscuro = !this.temaEscuro;
    if (this.temaEscuro) {
      document.body.classList.add('dark');
      localStorage.setItem('temaEscuro', 'true');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('temaEscuro', 'false');
    }
  }

  carregarTema() {
    const tema = localStorage.getItem('temaEscuro');
    this.temaEscuro = tema === 'true';
    if (this.temaEscuro) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }

  salvarLocalStorage() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('aguaApp', JSON.stringify({
  peso: this.peso,
  idade: this.idade,
  atividade: this.atividade,
  metaDiaria: this.metaDiaria,
  quantidadeBebida: this.quantidadeBebida,
  customVolumes: this.customVolumes,
  intervaloMinutos: this.intervaloMinutos,
  ultimaData: this.ultimaData,
  configurado: this.configurado,
  notificacaoAtiva: this.notificacaoAtiva  // salva aqui
}));

    }
  }

  carregarLocalStorage() {
  if (isPlatformBrowser(this.platformId)) {
    const data = localStorage.getItem('aguaApp');
    if (data) {
      const parsed = JSON.parse(data);
      this.peso = parsed.peso;
      this.idade = parsed.idade;
      this.atividade = parsed.atividade;
      this.metaDiaria = parsed.metaDiaria;
      this.quantidadeBebida = parsed.quantidadeBebida;
      this.customVolumes = parsed.customVolumes;
      this.intervaloMinutos = parsed.intervaloMinutos;
      this.ultimaData = parsed.ultimaData;
      this.configurado = parsed.configurado;
      this.notificacaoAtiva = parsed.notificacaoAtiva ?? false;

      this.verificarData();

      if (this.configurado && this.notificacaoAtiva) {
        this.iniciarLembretes();
      }
    }
  }
}


  get restante(): number {
    return Math.max(this.metaDiaria - this.quantidadeBebida, 0);
  }

  get porcentagem(): number {
    return (this.quantidadeBebida / this.metaDiaria) * 100;
  }

  private enviarMensagemSW(mensagem: any) {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(mensagem);
  } else {
    navigator.serviceWorker.ready.then(reg => {
      if (reg.active) {
        reg.active.postMessage(mensagem);
      }
    });
  }
}


}
