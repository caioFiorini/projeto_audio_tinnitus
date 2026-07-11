# Brisa - MVP de avaliação guiada

## Arquitetura

- `tinnitus/domain/types.ts`: contratos estritos de dados e recomendações.
- `tinnitus/domain/config.ts`: versão de regras, pesos e conteúdo clínico centralizado.
- `tinnitus/domain/rules.ts`: bloqueio, classificação multi-perfil e recomendação determinística, sem IA.
- `tinnitus/audio/SafeAudioEngine.ts`: Web Audio API com ganho inicial zero, fade de entrada/saída, limitador e uma única fonte por vez.
- `app/page.tsx`: jornada acessível e local-first.

## Decisões de segurança

Nenhum áudio é exibido antes da triagem. Zumbido pulsátil, perda auditiva súbita, sintomas neurológicos, trauma relevante, dor/secreção/sangramento e risco de autoagressão bloqueiam o fluxo de áudio. Unilateralidade, assimetria auditiva e vertigem destacam encaminhamento e bloqueiam tons e banda estreita.

O aplicativo não mede dBA real, não solicita microfone, não armazena áudio ambiente, não faz diagnóstico e não sugere alterar medicamentos. Os registros ficam em `localStorage` e podem ser apagados no cabeçalho.

## Limitações conhecidas

Este MVP não inclui pitch matching, sessões de 5-60 minutos com retomada, gráficos de acompanhamento, arquivos naturais gravados, backend/sincronização, exportação de dados ou relatório clínico. Tons puros, notched sound, AM/FM e binaural beats permanecem fora do player deste MVP; as duas primeiras categorias aparecem apenas bloqueadas nas regras para perfis de risco. A avaliação e as recomendações não substituem profissionais de saúde.
