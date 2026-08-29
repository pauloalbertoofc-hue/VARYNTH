# Configuração do Ambiente de Desenvolvimento — VARYNTH OS

## 1. Requisitos do Sistema
- **Node.js**: v20.x ou superior
- **Gerenciador de Pacotes**: `npm` (v10+)
- **Sistema Operacional**: Windows 11 / Linux / macOS
- **Ollama (Opcional)**: Instalado localmente em `http://127.0.0.1:11434` para inferência neural local.

---

## 2. Instalação e Execução

```bash
# 1. Clonar o repositório
git clone https://github.com/pauloalbertoofc-hue/VARYNTH.git
cd VARYNTH

# 2. Instalar dependências
npm install

# 3. Iniciar servidor de desenvolvimento (Turbopack)
npm run dev

# 4. Executar os Quality Gates e Suíte de Regressão da Athena
npm run test:athena

# 5. Executar build de produção para validação
npm run build
```

---

## 3. Variáveis de Ambiente
O VARYNTH OS **não requer nenhuma chave de API comercial** (`OPENAI_API_KEY`, etc.). Todas as configurações operam em modo Local-First por padrão.

