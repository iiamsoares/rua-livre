# Rua Livre

Vertical slice de um jogo de corrida arcade pseudo-3D inspirado nos clássicos de 16 bits e ambientado em circuitos brasileiros.

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

## Fluxo da garagem

O fluxo jogável segue `Menu → Modo → Garagem → Preparação → Corrida`. No modo versus, a garagem mantém uma seleção independente para cada jogador; a preparação continua compartilhada, como no sistema original.

O cenário limpo da oficina fica em `assets/scenery/Garagem Pixel Art Rua Livre.png`. O caminho usado pela interface está centralizado na variável `--workshop-background`, no início de `css/garage.css`. Para trocar o cenário posteriormente, coloque a nova imagem em `assets/scenery` e altere apenas essa variável. A imagem deve conter somente o cenário: carro, textos, botões e HUD são sobrepostos pela aplicação.

Os carros atuais continuam definidos em `PLAYER_CARS`, dentro de `js/config.js`. Um veículo futuro pode receber `price` para usar o fluxo de compra e precisa informar os mesmos assets de frente e spritesheet dos demais. Enquanto o Onix RS não possui sprites, o catálogo preserva UP TSI, Chevette e Vectra GLS.

Os estágios existentes permanecem de 1/3 a 3/3, com preços de R$ 500 e R$ 900. A tela mostra 0/3 como indisponível, pois o save original começa no estágio 1. Motor e pneus representam os efeitos reais do pacote atual; acerto individual está identificado como implementação futura e não altera a física.

## Objetivo

### Versus local com tela dividida

Na garagem, escolha o carro principal, o carro do jogador 2 e pressione **VERSUS LOCAL · 2 JOGADORES**. O jogador 1 ocupa a metade superior (WASD e Espaço para nitro); o jogador 2 ocupa a inferior (setas e Enter para nitro). P ou Esc pausa a partida inteira.

Os dois disputam na mesma pista com três rivais e trânsito compartilhado, câmeras independentes e colisões entre os jogadores. Nitro, integridade, itens e impactos em buracos são individuais. Ambos usam o mesmo estágio de preparação. Vence quem completar primeiro as três voltas ou sobreviver à perda de integridade do adversário; chegadas no mesmo passo de simulação empatam. O amistoso não altera créditos nem recordes do modo solo.

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
- Trânsito civil com 12 veículos, separado dos três rivais, com velocidades entre 60 e 147 km/h. Os carros ultrapassados reaparecem além da câmera, com espaçamento de entrada na mesma faixa.
- Trilha sintetizada original em quatro compassos, com baixo, melodia e pulso rítmico. O botão SOM controla música e efeitos; a pausa silencia ambos.

## Cenários dinâmicos

Brasília — Circuito do Cerrado usa objetos laterais presos a posições reais da pista. Árvores, ipês, vegetação, postes, placas, defensas e marcos arquitetônicos passam pela mesma projeção pseudo-3D dos carros e acompanham curvas e relevo. A distribuição é determinística: a mesma pista e semente sempre produzem o mesmo ambiente.

A volta é dividida em cinco zonas contínuas: Cerrado (0–18%), Avenida dos Ipês (18–40%), Eixo Monumental (40–65%), Orla do Paranoá (65–85%) e Reta da Capital (85–100%). Nos 20% finais de cada zona, pesos, densidade, espaçamento e afastamento lateral são interpolados com a próxima região. Todos os objetos são gerados antes da corrida, portanto não mudam enquanto estão visíveis e a sequência permanece igual no solo e no versus.

- `js/scenery/manifest.js`: atlas centralizado, recortes verificados, âncoras e dimensões visuais.
- `js/scenery/brasilia-zones.js`: limites, densidades, pesos, espaçamentos, marcos e efeitos das cinco zonas.
- `js/scenery/environments.js`: panorama, atlas, semente, densidades e qualidade de cada mapa.
- `js/scenery/generator.js`: distribuição determinística e cache das instâncias por pista.
- `js/renderer.js`: projeção, recorte de morros, descarte fora da tela e ordem de profundidade.

Para adicionar outro mapa, registre o panorama e o atlas em `ENVIRONMENTS`, crie seu manifesto de sprites e forneça um `environmentId` na criação da pista. A lógica central do renderizador não precisa ser alterada. Mapas sem configuração dinâmica continuam aceitos pelo cadastro, mas Salvador e Manaus ainda dependem de seus próprios assets e regras de distribuição.

O modo de diagnóstico pode ser ativado acrescentando `?debugScenery=1` ao endereço do jogo. Ele exibe trecho atual, progresso da volta, objetos visíveis e FPS sem alterar a simulação.

### Assets ambientais pendentes

- Partículas próprias de pétalas amarelas e roxas; a intensidade já está declarada por zona, mas o efeito permanece desativado até existir um PNG adequado.
- Poeira pixel art opcional para o Cerrado; a configuração de intensidade está preparada, sem adicionar partículas artificiais ao renderizador.
- Salvador e Manaus ainda precisam de panorama, spritesheet e configuração de zonas próprios.

O panorama atual de Brasília já contém o Lago Paranoá e marcos arquitetônicos. Por isso a Orla não repete esses elementos como sprites distantes; ela usa apenas guarda-corpos, placas, bancos e vegetação lateral.

### HUD, obstáculos e efeitos em sprites

Os PNGs fornecidos em `assets/ui` e `assets/scenery` substituem os desenhos provisórios sem alterar suas regras: buracos continuam projetados na pista e causando o mesmo dano, a garrafa de turbo usa a coleta existente, poeira aparece em derrapagens e saídas de pista, e pétalas são ativadas na Avenida dos Ipês. Velocímetro, barras de nitro e integridade e minimapa permanecem dinâmicos, inclusive no modo versus local.

### Referências e materiais

A referência de linguagem visual é Top Gear/Top Racer; esta implementação não inclui código, sprites ou músicas extraídos desses jogos. A abordagem pseudo-3D foi estudada nos [artigos de Jake Gordon](https://jakesgordon.com/writing/javascript-racer-v2-curves/) e no [JavaScript Racer](https://github.com/jakesgordon/javascript-racer). Os assets existentes do Rua Livre foram mantidos, e os efeitos e a trilha são gerados pelo código do projeto.

Na branch `feat/motor-jake-gordon`, a corrida usa a projeção, o acúmulo de curvas, o recorte de morros e o modelo de direção adaptados do código MIT de Jake Gordon. O adaptador em `js/engines/rua-livre-adapter.js` conecta esse motor aos nossos sprites e à pista de 1,68 km, sem alterar os saves ou a música. A indicação **MOTOR JAKE GORDON** aparece abaixo da pista. Consulte o [estado da integração](docs/integracao-jake-gordon.md) e a [licença original](vendor/javascript-racer/LICENSE). Música e sprites do exemplo não foram importados.

## Estrutura

- `js/`: estado, pista, física, renderização, áudio, controles e persistência.
- `css/style.css`: menus, garagem, HUD e adaptação de tela.
- `assets/`: sprites e cenários originais usados pelo jogo.
- `test/`: testes determinísticos com o executor nativo do Node.js.
