# Rua Livre

Vertical slice de um jogo de corrida arcade pseudo-3D inspirado nos clássicos de 16 bits e ambientado em uma metrópole costeira brasileira fictícia.

## Executar

O jogo usa módulos JavaScript nativos e deve ser servido por HTTP:

```powershell
node tools/dev-server.mjs
```

Depois, abra `http://127.0.0.1:4173`. Também é possível usar `npm.cmd run dev` no Windows.

## Controles

- `↑` ou `W`: acelerar
- `↓` ou `S`: frear e iniciar derrapagem durante uma curva
- `←` `→` ou `A` `D`: virar
- `Espaço` ou `Shift`: nitro
- `P` ou `Esc`: pausar

## Objetivo

Escolha entre UP TSI, Chevette e Vectra GLS, complete três voltas e termine entre os três primeiros. O prêmio da corrida pode ser usado para evoluir a preparação do carro. Uma corrida sem colisões recebe bônus adicional.

## Testes

```powershell
node --test
```

Os testes cobrem pista, física, largada, pausa, chegada, premiação e migração do save anterior.

## Direção retrô da corrida

- Renderização interna em 320 × 180, ampliada sem suavização, com pista desenhada linha a linha para evitar frestas entre polígonos.
- Curvas interpoladas, relevo suave e skyline com deslocamento ligado às curvas. A câmera permite movimento lateral do carro.
- HUD de alto contraste, zebras largas, placas de curva, palmeiras e efeitos de derrapagem/nitro.
- Três rivais com aceleração de largada; aceleração e direção do jogador mais rápidas. Carros, garagem, colisões e saves preservados.
- Trilha sintetizada original em quatro compassos, com baixo, melodia e pulso rítmico. O botão SOM controla música e efeitos; a pausa silencia ambos.

### Referências e materiais

A referência de linguagem visual é Top Gear/Top Racer; esta implementação não inclui código, sprites ou músicas extraídos desses jogos. A abordagem pseudo-3D foi estudada nos [artigos de Jake Gordon](https://jakesgordon.com/writing/javascript-racer-v2-curves/) e no [JavaScript Racer](https://github.com/jakesgordon/javascript-racer). Nenhum arquivo desse repositório foi incorporado: o README dele restringe o reuso da música incluída. Os assets existentes do Rua Livre foram mantidos, e os novos efeitos e a trilha são gerados pelo código do projeto. Não foi identificado um pacote específico de Godenot para incorporar.

## Estrutura

- `js/`: estado, pista, física, renderização, áudio, controles e persistência.
- `css/style.css`: menus, garagem, HUD e adaptação de tela.
- `assets/`: sprites e cenários originais usados pelo jogo.
- `test/`: testes determinísticos com o executor nativo do Node.js.
