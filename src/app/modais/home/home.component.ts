import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { AguaService } from '../../services/agua.service';
import { isPlatformBrowser } from '@angular/common';

interface Historico {
  data: string;
  quantidade: number;
}

interface Meta {
  hora: Date;
  volume: number; // ml acumulado até essa meta
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {
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
  registrosDeGoles: Date[] = [];
  historico: Historico[] = [];
  temaEscuro = false;
  carregandoDados = true;
  public msgModal: string = "";
  fraseMotivacional: string = this.sortearFrase();
  modalAberto: 'historico' | 'config' | 'reset' | null = null;
  animandoProgresso = false;
  bolhas: any[] = [];
  mostrarBolhas: boolean = true;
  metasParciais: Meta[] = [];
  tempoDesdeUltimoGolePercent: number = 0;



  private lembreteIntervalId: any = null;
  private intervaloTempoDesdeUltimoGole: any = null;
  sidebarAberta = false;

  constructor(private aguaService: AguaService, @Inject(PLATFORM_ID) private platformId: Object) { }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.carregarLocalStorage();
      this.carregarTema();
      this.carregarHistorico();
      this.iniciarAtualizacaoTempoDesdeUltimoGole();
      this.fraseMotivacional = this.sortearFrase();
      this.enviarMensagemSW({ type: 'ABA_ABERTA' });
      this.metasParciais = this.gerarMetasAleatorias();

      for (let i = 0; i < 20; i++) {
        this.bolhas.push({
          left: Math.random() * 100,
          size: 12 + Math.random() * 28,
          duration: 6 + Math.random() * 6,
          delay: Math.random() * 10,
          opacity: 0.2 + Math.random() * 0.5
        });
      }

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

  abrirModalSettings() {
    document.getElementById('btnModalSettings')?.click();
  }

  criarHora(horas: number, minutos: number): Date {
  const data = new Date();
  data.setHours(horas, minutos, 0, 0);
  return data;
}


  abrirModalEstatisticas() {
    document.getElementById('btnModalEstatisticas')?.click();
  }

  exibirModal(mensagem: string) {
    this.msgModal = mensagem;
    document.getElementById('btnModalAlerta')?.click();
  }

  


  ngOnDestroy() {
    if (this.lembreteIntervalId) clearInterval(this.lembreteIntervalId);
    if (this.intervaloTempoDesdeUltimoGole) clearInterval(this.intervaloTempoDesdeUltimoGole);
  }

  gerarMetasAleatorias(): Meta[] {
  const totalMetas = Math.floor(Math.random() * 3) + 4; // de 4 a 6 metas
  const metas: Meta[] = [];

  const inicio = new Date();
  inicio.setHours(8, 0, 0, 0); // início às 8h
  const fim = new Date();
  fim.setHours(22, 0, 0, 0);   // fim às 22h

  // Gerar horários aleatórios ordenados
  const horarios = [];
  for (let i = 0; i < totalMetas; i++) {
    const randTime = new Date(inicio.getTime() + Math.random() * (fim.getTime() - inicio.getTime()));
    horarios.push(randTime);
  }
  horarios.sort((a,b) => a.getTime() - b.getTime());

  // Gerar volumes aleatórios que somem até metaDiaria
  let volumes = [];
  let acumulado = 0;
  for(let i = 0; i < totalMetas; i++){
    if(i === totalMetas -1){
      volumes.push(this.metaDiaria - acumulado); // último preenche o resto
    } else {
      const restante = this.metaDiaria - acumulado;
      const vol = Math.floor(Math.random() * (restante / (totalMetas - i) * 2));
      volumes.push(vol);
      acumulado += vol;
    }
  }

  // Acumular volumes
  let volumeAcumulado = 0;
  for(let i=0; i < totalMetas; i++){
    volumeAcumulado += volumes[i];
    metas.push({hora: horarios[i], volume: volumeAcumulado});
  }

  return metas;
}

  get ultimoGoleFormatado(): string {
    const ultimo = this.registrosDeGoles[this.registrosDeGoles.length - 1];
    return ultimo
      ? new Date(ultimo).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
      : '—';
  }
  get tempoDesdeUltimoGole(): string {
    const ultimo = this.registrosDeGoles[this.registrosDeGoles.length - 1];
    if (!ultimo) return '—';

    const agora = new Date();
    const diffMs = agora.getTime() - new Date(ultimo).getTime();
    const minutos = Math.floor(diffMs / 60000);
    const segundos = Math.floor((diffMs % 60000) / 1000);
    return `${minutos} min ${segundos} s`;
  }

  private iniciarAtualizacaoTempoDesdeUltimoGole() {
  if (this.intervaloTempoDesdeUltimoGole) clearInterval(this.intervaloTempoDesdeUltimoGole);
  this.intervaloTempoDesdeUltimoGole = setInterval(() => {
    const ultimo = this.registrosDeGoles[this.registrosDeGoles.length - 1];
    if (!ultimo) {
      this.tempoDesdeUltimoGolePercent = 0;
      return;
    }
    const agora = new Date().getTime();
    const diffMs = agora - new Date(ultimo).getTime();
    const intervaloMs = this.intervaloMinutos * 60 * 1000;
    const percent = Math.min((diffMs / intervaloMs) * 100, 100);
    this.tempoDesdeUltimoGolePercent = percent;
  }, 1000);
}

get tempoRestanteFormatado(): string {
  const ultimo = this.registrosDeGoles[this.registrosDeGoles.length - 1];
  if (!ultimo) return '--:--';

  const agora = new Date().getTime();
  const ultimoGole = new Date(ultimo).getTime();
  const diffMs = Math.max(this.intervaloMinutos * 60 * 1000 - (agora - ultimoGole), 0);

  const minutos = Math.floor(diffMs / 60000);
  const segundos = Math.floor((diffMs % 60000) / 1000);

  return `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
}

get corBarraPomodoro(): string {
  const p = this.tempoDesdeUltimoGolePercent;
  if (p >= 90) return 'rgba(255, 0, 0, 0.6)';     // vermelho
  if (p >= 60) return 'rgba(255, 165, 0, 0.5)';   // laranja
  return 'rgba(0, 255, 0, 0.2)';                  // verde
}





  adicionarAgua(quantidade: number) {
    this.quantidadeBebida = Math.min(this.quantidadeBebida + quantidade, this.metaDiaria);
    this.registrosDeGoles.push(new Date());
    this.fraseMotivacional = this.sortearFrase();
    this.salvarLocalStorage();
    this.salvarHistoricoHoje();
  }

  removerAgua(quantidade: number) {
    this.quantidadeBebida = Math.max(this.quantidadeBebida - quantidade, 0);
    this.registrosDeGoles.pop();
    this.salvarLocalStorage();
    this.salvarHistoricoHoje();
  }

  animarGota(event: MouseEvent) {
    const btn = event.currentTarget as HTMLElement;

    // Criar o elemento da gota
    const gota = document.createElement('div');
    gota.classList.add('gota-agua');

    // Posicionar a gota em relação ao botão clicado
    const rect = btn.getBoundingClientRect();

    // Para posicionar a gota, vamos usar posição absoluta na viewport:
    gota.style.position = 'fixed';
    gota.style.left = rect.left + rect.width / 2 + 'px';
    gota.style.top = rect.top + 'px';
    gota.style.transform = 'translateX(-50%)';

    // Adicionar a gota ao body
    document.body.appendChild(gota);

    // Remover a gota após a animação de 1s
    setTimeout(() => {
      gota.remove();
    }, 1000);
  }

  toggleSidebar() {
    this.sidebarAberta = !this.sidebarAberta;
  }


  resetarQuantidade() {
    this.quantidadeBebida = 0;
    this.registrosDeGoles = [];
    this.salvarLocalStorage();
    this.salvarHistoricoHoje();
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
        notificacaoAtiva: this.notificacaoAtiva,
        registrosDeGoles: this.registrosDeGoles.map(d => d.toISOString())
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
        this.notificacaoAtiva = parsed.notificacaoAtiva ?? false;
        const registros = parsed.registrosDeGoles || [];
        this.registrosDeGoles = registros.map((iso: string) => new Date(iso));

        this.configurado = parsed.configurado && parsed.metaDiaria > 0;
        this.verificarData();

        if (this.configurado && this.notificacaoAtiva) {
          this.iniciarLembretes();
        }
      }

      this.carregandoDados = false;
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

  verificarData() {
    const hoje = new Date().toISOString().slice(0, 10);
    if (hoje !== this.ultimaData) {
      this.quantidadeBebida = 0;
      this.registrosDeGoles = [];
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

  frasesMotivacionais: string[] = [
    "Hora de hidratar!",
    "Seu corpo agradece cada gole 💧",
    "Água hoje, saúde amanhã!",
    "Beba mais água e sorria 😊",
    "Você está indo bem, continue!",
    "Mais um gole rumo à sua meta!",
    "Continue! Você está se cuidando."
  ];

  sortearFrase(): string {
    if (!this.frasesMotivacionais || this.frasesMotivacionais.length === 0) {
      return "Lembre-se de beber água!";
    }
    const index = Math.floor(Math.random() * this.frasesMotivacionais.length);
    return this.frasesMotivacionais[index];
  }
}
