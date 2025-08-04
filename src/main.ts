import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));

// Verifica e pede permissão para notificações
if ('Notification' in window) {
  if (Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        registrarSW();
      }
    });
  } else if (Notification.permission === 'granted') {
    registrarSW();
  }
}

function registrarSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/custom-sw.js')
      .then(registration => {
        console.log('✅ Service Worker registrado:', registration);

        registration.onupdatefound = () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.onstatechange = () => {
              if (newWorker.state === 'activated') {
                window.location.reload();
              }
            };
          }
        };

        navigator.serviceWorker.ready.then(reg => {
          const aguaApp = localStorage.getItem('aguaApp');
          let intervalo = 60;
          if (aguaApp) {
            try {
              const parsed = JSON.parse(aguaApp);
              if (parsed.intervaloMinutos && parsed.intervaloMinutos > 0) {
                intervalo = parsed.intervaloMinutos;
              }
            } catch (e) {
              console.warn('Erro ao ler localStorage:', e);
            }
          }

          const mensagemIntervalo = { type: 'SET_INTERVAL', minutes: Number(intervalo) };
          const mensagemAba = { type: 'ABA_ABERTA' };

          if (reg.active) {
            reg.active.postMessage(mensagemIntervalo);
            reg.active.postMessage(mensagemAba);
          }
        });
      })
      .catch(err => console.error('Erro ao registrar SW:', err));
  }
}
