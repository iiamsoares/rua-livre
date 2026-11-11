# Integração do motor de Jake Gordon

Branch: `feat/motor-jake-gordon`. Base preservada na `main`: `1919cfd`.

## Escopo aprovado

Aproveitar o código de jogabilidade e projeção do JavaScript Racer, mantendo os carros, a identidade visual e a música sintetizada do Rua Livre. Não importar os sprites de OutRun nem as faixas de áudio distribuídas no exemplo.

## Primeira etapa — concluída

- Extração adaptada de `Util.project`, interpolação e easing de `common.js`.
- Gerador de seções e projeção com acúmulo de curvas e recorte de morros, adaptados de `v4.final.html`.
- Módulo ES isolado em `js/engines/jake-gordon.js`, sem dependências externas, DOM ou variáveis globais.
- Proteção contra divisão por zero na câmera, suporte a projeção além de uma volta e testes determinísticos.
- Licença e atribuição preservadas em `vendor/javascript-racer/LICENSE`.

## Segunda etapa — motor conectado à corrida

- `RaceRenderer.makeRoad()` agora chama o adaptador do motor importado; a projeção antiga foi removida.
- A pista é convertida para 840 segmentos de 200 unidades, usando 100 unidades por metro. As três voltas continuam com 1,68 km cada.
- Câmera, profundidade e recorte de morros são compartilhados pela pista, carros e cenário. O desenho final mantém a resolução interna de 320 × 180.
- Direção proporcional à velocidade e força centrífuga usam o modelo adaptado de `update()` de Jake Gordon.
- Nossos carros, HUD, garagem, nitro, recompensas, colisões sólidas e saves permanecem conectados. `js/audio.js` não foi alterado.
- A indicação **MOTOR JAKE GORDON** abaixo da pista identifica esta versão para teste.

Esta é uma integração adaptada: a pista, o comportamento dos três rivais, a penalidade fora da pista e as regras de corrida continuam sendo do Rua Livre. Não é uma cópia integral do demo upstream.

## Próximas etapas

1. Receber feedback de pilotagem e ajustar câmera/curvas se necessário.
2. Avaliar o desvio antecipado de tráfego do demo como uma melhoria separada.
3. Comparar com a main e decidir o merge após aprovação.

## Proveniência

Fontes consultadas em 10/11/2026, branch `master` do upstream:

- https://github.com/jakesgordon/javascript-racer
- https://github.com/jakesgordon/javascript-racer/blob/master/common.js
- https://github.com/jakesgordon/javascript-racer/blob/master/v4.final.html
- https://github.com/jakesgordon/javascript-racer/blob/master/LICENSE

O código é MIT. O README do upstream informa restrições próprias da música e identifica sprites emprestados de OutRun; esses materiais não fazem parte da importação. As adaptações locais estão identificadas no cabeçalho do módulo.
