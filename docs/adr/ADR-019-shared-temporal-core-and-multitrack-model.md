# ADR-019: Núcleo Temporal Compartilhado (TemporalCore) e Modelo Multipistas

## Status
ACCEPTED

## Contexto
O VARYNTH OS possui estúdios com dimensão temporal explícita: **Audio Studio (Studio 4)** e **Video Studio (Studio 5)**.
Para evitar duplicação divergente de lógica temporal e inconsistências entre taxas de quadros fracionárias reais (23.976fps, 29.97fps, 59.94fps) e amostragem de áudio, tornou-se imperativo extrair um núcleo compartilhado (`TemporalCore`) sem quebrar a suíte de testes do Audio Studio.

## Decisão
1. **Rational Frame Rates**: Definir taxas de quadros como frações canônicas de inteiros (`numerator / denominator`) para evitar erro de ponto flutuante acumulado ao longo de projetos extensos.
2. **Master Timeline Clock**: Unificar a base temporal em milissegundos inteiros, mapeando determinística e bidirecionalmente para frames de vídeo e samples de áudio (44.1kHz / 48kHz).
3. **Zero Regressão**: Extração modular que preserva 100% de compatibilidade com os tipos e testes do Audio Studio.

## Consequências
### Positivas
* Sincronização rigorosa sem drift perceptível entre áudio, vídeo, legendas e marcadores.
* Reutilização do mesmo mecanismo de snapping magnético e timecode em todos os estúdios temporais.
### Negativas / Mitigações
* Conversões de taxas não inteiras exigem funções utilitárias centralizadas em vez de multiplicações ad-hoc.

