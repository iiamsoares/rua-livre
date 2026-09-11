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

## Estrutura

- `js/`: estado, pista, física, renderização, áudio, controles e persistência.
- `css/style.css`: menus, garagem, HUD e adaptação de tela.
- `assets/`: sprites e cenários originais usados pelo jogo.
- `test/`: testes determinísticos com o executor nativo do Node.js.
