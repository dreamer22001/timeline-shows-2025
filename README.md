# Timeline de Shows 🎸

Uma aplicação React moderna que exibe uma linha do tempo interativa de shows de bandas, incluindo nome da banda, turnê, data do show e imagem.

## 🚀 Funcionalidades

- **Linha do tempo visual**: Interface elegante com linha vertical central
- **Nós interativos**: Cada show é exibido como um nó na timeline
- **Informações completas**: 
  - Nome da banda
  - Nome da turnê
  - Data do show (formatada em português)
  - Imagem do show
- **Design responsivo**: Funciona perfeitamente em desktop e mobile
- **Animações suaves**: Efeitos de hover e transições

## 📦 Instalação

```bash
npm install
```

## 🎯 Como usar

1. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

2. Abra seu navegador em `http://localhost:5173`

## 📝 Adicionando novos shows

Edite o arquivo `src/data/shows.js` e adicione novos objetos seguindo este formato:

```javascript
{
  id: 6,
  banda: "Nome da Banda",
  turnê: "Nome da Turnê",
  data: "YYYY-MM-DD",
  imagem: "URL da imagem"
}
```

## 🛠️ Tecnologias

- React 19
- Vite
- CSS3 (com gradientes e animações)

## 📁 Estrutura do Projeto

```
timeline-shows/
├── src/
│   ├── components/
│   │   ├── Timeline.jsx
│   │   ├── Timeline.css
│   │   ├── TimelineNode.jsx
│   │   └── TimelineNode.css
│   ├── data/
│   │   └── shows.js
│   ├── App.jsx
│   ├── App.css
│   └── index.css
└── package.json
```

## 🎨 Personalização

Você pode personalizar as cores editando os arquivos CSS:
- `src/components/Timeline.css` - Estilos da linha do tempo
- `src/components/TimelineNode.css` - Estilos dos nós
- `src/App.css` - Estilos do fundo

## 🚀 Deploy no GitHub Pages

O projeto está configurado para deploy automático no GitHub Pages.

### Configuração Inicial

1. **Ative o GitHub Pages no seu repositório:**
   - Vá em Settings > Pages
   - Em "Source", selecione "GitHub Actions"

2. **Ajuste o base path no `vite.config.js`:**
   - Se o repositório for `username.github.io`, use `base: '/'`
   - Se for um repositório normal (ex: `timeline-shows`), use `base: '/timeline-shows/'`
   - Ou defina a variável de ambiente `VITE_BASE_PATH` no workflow

3. **Faça push para a branch `main`:**
   ```bash
   git push origin main
   ```

4. **O GitHub Actions fará o deploy automaticamente!**

### Deploy Manual (Alternativa)

Se preferir fazer deploy manual:

```bash
# Build do projeto
npm run build

# A pasta dist/ será criada com os arquivos estáticos
# Faça upload da pasta dist/ para o GitHub Pages
```

### Acessando o Site

Após o deploy, seu site estará disponível em:
- `https://seu-usuario.github.io/timeline-shows/` (repositório normal)
- `https://seu-usuario.github.io/` (se for username.github.io)
