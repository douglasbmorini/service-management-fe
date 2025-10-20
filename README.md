# Gestão Mais - Service Management (Frontend)

Este é o repositório do frontend para o sistema de gerenciamento de serviços da Gestão Mais Consultoria. A aplicação é construída com Angular e permite o controle completo de atendimentos, clientes, colaboradores e finanças.

## ✨ Features

*   **Dashboard de Atendimentos**: Visualização rápida do status de todos os serviços em andamento, com modos de visualização em cards ou linha do tempo.
*   **Painel Gerencial**:
    *   CRUD completo de Atendimentos, Clientes e Usuários.
    *   Fluxo de status de atendimentos (Proposta -> Execução -> Faturado -> Finalizado).
    *   Suporte a faturamento por **Preço Fixo** e **Por Hora**.
*   **Painel Financeiro**:
    *   Visão geral da saúde financeira da empresa (contas a receber, pagamentos vencidos, etc.).
    *   Visão detalhada por colaborador, com cálculo de valores brutos, líquidos e taxas.
    *   Filtros reativos por período e status.
*   **Autenticação e Autorização**: Sistema de login com JWT e controle de acesso baseado em perfis (Admin, Colaborador).
*   **Perfil de Usuário**: Permite que o usuário atualize suas próprias informações e senha.
*   **Tema Dinâmico**: Suporte a temas claro e escuro, com persistência da preferência do usuário.

## 🛠️ Tecnologias Utilizadas

*   **Framework**: Angular v20+ (Standalone Components)
*   **Componentes UI**: Angular Material
*   **Gerenciamento de Estado**: Angular Signals
*   **Estilo**: SCSS
*   **Containerização**: Docker e Docker Compose

## 🚀 Como Executar o Projeto

Existem duas maneiras de executar o projeto: localmente com o Angular CLI ou via Docker (recomendado para simular o ambiente de produção).

### Requisitos

*   Node.js (versão 20 ou superior)
*   Angular CLI (v20 ou superior)
*   Docker e Docker Compose (para o método com container)

### 1. Executando com Docker (Recomendado)

Este método garante um ambiente consistente e isolado.

1.  **Clone o repositório**:
    ```sh
    git clone <url-do-repositorio>
    cd service-management-fe
    ```

2.  **Inicie os containers**:
    O arquivo `docker-compose.yml` está configurado para o ambiente de desenvolvimento, incluindo hot-reload.
    ```sh
    docker-compose up --build
    ```

3.  **Acesse a aplicação**:
    Abra seu navegador e acesse `http://localhost:4200/`.

### 2. Executando Localmente

1.  **Clone o repositório e instale as dependências**:
    ```sh
    git clone <url-do-repositorio>
    cd service-management-fe
    npm install
    ```

2.  **Inicie o servidor de desenvolvimento**:
    ```sh
    npm start
    ```

3.  **Acesse a aplicação**:
    Abra seu navegador e acesse `http://localhost:4200/`. A aplicação irá recarregar automaticamente ao modificar os arquivos.

## 🏗️ Scripts Disponíveis

*   `npm start`: Inicia o servidor de desenvolvimento (exposto na rede local).
*   `npm run build`: Compila o projeto para desenvolvimento.
*   `npm run build:prod`: Compila o projeto para produção, com todas as otimizações.
*   `npm test`: Executa os testes unitários via Karma.
*   `npm run watch`: Compila o projeto em modo de observação para desenvolvimento.
