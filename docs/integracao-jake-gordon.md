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

O módulo ainda não substitui o renderizador ativo. Abrir o jogo continua exibindo a versão aprovada, com a mesma música e os mesmos saves.

## Próximas etapas

1. Criar o adaptador entre os metros/km/h do Rua Livre e as unidades de segmento do motor original, sem alterar a duração das voltas por acidente.
2. Conectar a projeção à pista e aos nossos sprites; compartilhar profundidade e recorte dos morros entre cenário, rivais e jogador.
3. Adaptar direção, força centrífuga, desaceleração fora da pista e desvio do tráfego. Preservar três rivais, nitro, integridade e colisões sólidas.
4. Integrar garagem, seleção dos três carros, HUD, premiação e saves. Manter `js/audio.js` inalterado.
5. Testar visualmente curvas, cristas, ultrapassagens e linha de chegada. Comparar com a main antes de decidir o merge.

## Proveniência

Fontes consultadas em 10/11/2026, branch `master` do upstream:

- https://github.com/jakesgordon/javascript-racer
- https://github.com/jakesgordon/javascript-racer/blob/master/common.js
- https://github.com/jakesgordon/javascript-racer/blob/master/v4.final.html
- https://github.com/jakesgordon/javascript-racer/blob/master/LICENSE

O código é MIT. O README do upstream informa restrições próprias da música e identifica sprites emprestados de OutRun; esses materiais não fazem parte da importação. As adaptações locais estão identificadas no cabeçalho do módulo.
