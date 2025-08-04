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
  carregandoDados = true; // <- flag nova aqui
  private lembreteIntervalId: any = null;

  constructor(private aguaService: AguaService, @Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.carregarLocalStorage();
      this.carregarTema();
      this.carregarHistorico();

      this.enviarMensagemSW({ type: 'ABA_ABERTA' });

      document.addEventListener('visibilitychange', () => {
        this.enviarMensagemSW({ type: document.visibilityState === 'visible' ? 'ABA_ABERTA' : 'ABA_FECHADA' });
      });

      window.addEventListener('beforeunload', () => {
        this.enviarMensagemSW({ type: 'ABA_FECHADA' });
      });

      if (!this.intervaloMinutos || this.intervaloMinutos <= 0) {
        this.intervaloMinutos = 60;
        this.salvarLocalStorage();
      }

      if ('Notification' in window && Notification.permission !== 'granted') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            this.notificacaoAtiva = true;
            this.salvarLocalStorage();
            this.iniciarLembretes();
          }
        });
      } else if (Notification.permission === 'granted' && this.configurado && this.notificacaoAtiva) {
        this.iniciarLembretes();
      }

      navigator.serviceWorker?.ready?.then(reg => {
        if (this.notificacaoAtiva && reg?.active) {
          reg.active.postMessage({
            type: 'SET_INTERVAL',
            minutes: this.intervaloMinutos
          });
        }
      });
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
        this.notificacaoAtiva = parsed.notificacaoAtiva ?? false;

        this.configurado = parsed.configurado && parsed.metaDiaria > 0;
        this.verificarData();

        if (this.configurado && this.notificacaoAtiva) {
          this.iniciarLembretes();
        }
      }

      this.carregandoDados = false; // <- libera renderização
    }
  }

  configurarMeta() {
    this.metaDiaria = this.aguaService.calcularMeta(this.peso, this.idade, this.atividade);
    this.configurado = true;

    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission().then(permission => {
        this.notificacaoAtiva = permission === 'granted';
        this.salvarLocalStorage();
        if (this.notificacaoAtiva) this.iniciarLembretes();
      });
    } else if (Notification.permission === 'granted') {
      this.notificacaoAtiva = true;
      this.salvarLocalStorage();
      this.iniciarLembretes();
    } else {
      this.salvarLocalStorage();
    }
  }

  iniciarLembretes() {
    if (!isPlatformBrowser(this.platformId) || Notification.permission !== 'granted') return;

    const intervaloValido = Number(this.intervaloMinutos);
    if (isNaN(intervaloValido) || intervaloValido <= 0) return;

    if (this.lembreteIntervalId) clearInterval(this.lembreteIntervalId);

    this.lembreteIntervalId = setInterval(() => {
      this.dispararNotificacao();
    }, intervaloValido * 60 * 1000);

    console.log(`✅ Lembretes ativados: ${intervaloValido} min`);
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

  resetarQuantidade() {
    this.quantidadeBebida = 0;
    this.salvarLocalStorage();
    this.salvarHistoricoHoje();
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
        notificacaoAtiva: this.notificacaoAtiva
      }));
    }
  }

  carregarTema() {
    const tema = localStorage.getItem('temaEscuro');
    this.temaEscuro = tema === 'true';
    document.body.classList.toggle('dark', this.temaEscuro);
  }

  toggleTema() {
    this.temaEscuro = !this.temaEscuro;
    localStorage.setItem('temaEscuro', String(this.temaEscuro));
    document.body.classList.toggle('dark', this.temaEscuro);
  }

  cancelarLembretes() {
    if (this.lembreteIntervalId) {
      clearInterval(this.lembreteIntervalId);
      this.lembreteIntervalId = null;
    }
    this.notificacaoAtiva = false;
    this.salvarLocalStorage();
    console.log('Lembretes desativados.');
  }

  reativarLembretes() {
    this.notificacaoAtiva = true;
    this.salvarLocalStorage();
    this.iniciarLembretes();
    console.log('Lembretes reativados.');
  }

  verificarData() {
    const hoje = new Date().toDateString();
    if (hoje !== this.ultimaData) {
      this.quantidadeBebida = 0;
      this.ultimaData = hoje;
      this.salvarLocalStorage();
    }
  }

  atualizarVolumes(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.customVolumes = input.value
      .split(',')
      .map(v => parseInt(v.trim(), 10))
      .filter(v => !isNaN(v) && v > 0);
    this.salvarLocalStorage();
  }

  atualizarIntervalo(novoValor: number) {
    if (novoValor > 0) {
      this.intervaloMinutos = novoValor;
      this.salvarLocalStorage();
      this.enviarIntervaloAoSW();
    }
  }

  salvarHistoricoHoje() {
    const hoje = new Date().toISOString().slice(0, 10);
    let historicoRaw = localStorage.getItem('aguaHistorico');
    let historicoObj: Record<string, number> = historicoRaw ? JSON.parse(historicoRaw) : {};
    historicoObj[hoje] = this.quantidadeBebida;
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
    const dias = [];
    const hoje = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoje);
      d.setDate(hoje.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dias.push({ data: key, quantidade: historicoObj[key] || 0 });
    }

    this.historico = dias;
    this.quantidadeBebida = this.historico[6]?.quantidade || 0;
  }

  enviarIntervaloAoSW() {
    const intervaloValido = Number(this.intervaloMinutos);
    if (isNaN(intervaloValido) || intervaloValido <= 0) return;

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SET_INTERVAL',
        minutes: intervaloValido
      });
    }
  }

  private enviarMensagemSW(mensagem: any) {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(mensagem);
    } else {
      navigator.serviceWorker.ready.then(reg => {
        if (reg.active) reg.active.postMessage(mensagem);
      });
    }
  }

  private dispararNotificacao() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SHOW_NOTIFICATION' });
    }
  }

  get restante(): number {
    return Math.max(this.metaDiaria - this.quantidadeBebida, 0);
  }

  get porcentagem(): number {
    return (this.quantidadeBebida / this.metaDiaria) * 100;
  }
}
