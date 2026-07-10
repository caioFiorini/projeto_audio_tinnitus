# Brisa

Aplicativo de conforto sonoro e mascaramento para zumbido. Gera ruídos rosa e marrom no próprio navegador, oferece paisagens naturais, temporizador, favoritos e diário de percepção local.

> O Brisa é uma ferramenta de apoio e não substitui avaliação médica, otorrinolaringológica ou audiológica.

## Desenvolvimento

Requisitos: Node.js 22.13 ou superior e pnpm.

```bash
pnpm install
pnpm dev
```

Abra `http://localhost:3000`.

## Compilação

```bash
pnpm build
pnpm start
```

## Publicação na Vercel

O projeto usa Next.js com App Router e não precisa de configuração especial na Vercel.

1. Envie o repositório para GitHub, GitLab ou Bitbucket.
2. Importe o repositório na Vercel.
3. Confirme o preset **Next.js** e publique.

Também é possível usar a CLI da Vercel na raiz do projeto.

## Instalação no celular

O projeto já inclui manifesto, ícone, service worker e modo `standalone`. Depois de publicado com HTTPS, navegadores compatíveis podem oferecer **Adicionar à tela de início**.

Para distribuição futura na App Store e Google Play, a mesma interface pode ser empacotada com Capacitor. Essa etapa deve incluir testes específicos de áudio em segundo plano, interrupções por chamadas, Bluetooth, fones e políticas das lojas.

## Privacidade

Favoritos e registros do diário ficam em `localStorage`, somente no aparelho utilizado. O aplicativo não envia esses dados para um servidor.
