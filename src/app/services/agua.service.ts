import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AguaService {
  
  calcularMeta(peso: number, idade: number, atividade: boolean): number {
    let base = peso * 35; // 35ml por kg
    if (idade > 55) base -= 200;
    if (atividade) base += 500;
    return Math.round(base);
  }
}
