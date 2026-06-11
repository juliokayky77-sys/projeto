class PassManagerApp {
    constructor() {
        this.db = db;
        this.currentPassData = null;
        this.isLoading = false;
        this.init();
    }
    
    async init() {
        console.log('🚀 Inicializando PassManager Pro...');
        
        await this.db.init();

        this.setupEventListeners();
        
        await this.loadInitialData();
        
        await this.loadSavedTheme();
        
        console.log('✅ Sistema pronto!');
    }
    
    async loadInitialData() {
        await this.loadStudentsList();
        await this.loadHistory();
        await this.updateStats();
    }
    
    async loadStudentsList() {
        const searchTerm = document.getElementById('searchStudent')?.value || '';
        const alunos = await this.db.getAllAlunos(searchTerm);
        this.renderStudentsTable(alunos);
    }
    
    renderStudentsTable(alunos) {
        const tbody = document.getElementById('studentsList');
        
        if (!tbody) return;
        
        if (alunos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        <i class="fas fa-user-graduate"></i>
                        <p>Nenhum aluno cadastrado</p>
                        <small>Clique na aba "Cadastro" para adicionar</small>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = alunos.map(aluno => `
            <tr>
                <td>
                    <strong>${escapeHtml(aluno.nome)}</strong>
                    <br>
                    <small style="color: var(--gray-600);">${escapeHtml(aluno.email || '')}</small>
                </td>
                <td><span class="badge">${escapeHtml(aluno.matricula)}</span></td>
                <td>${escapeHtml(aluno.curso)}</td>
                <td>${escapeHtml(aluno.serie)}</td>
                <td class="action-buttons">
                    <button class="action-btn action-pass" onclick="app.emitirPasse(${aluno.id})">
                        <i class="fas fa-ticket-alt"></i> Pass
                    </button>
                    <button class="action-btn action-delete" onclick="app.deleteAluno(${aluno.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }
    
    async loadHistory() {
        const history = await this.db.getAllHistorico(50);
        this.renderHistory(history);
    }
    
    renderHistory(history) {
        const container = document.getElementById('historyList');
        
        if (!container) return;
        
        if (history.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>Nenhum passe emitido ainda</p>
                    <small>Emita um passe na lista de alunos</small>
                </div>
            `;
            return;
        }
        
        container.innerHTML = history.map(item => `
            <div class="history-item">
                <div class="history-icon">
                    <i class="fas fa-ticket-alt"></i>
                </div>
                <div class="history-content">
                    <div class="history-title">
                        ${escapeHtml(item.aluno_nome)}
                        <span class="history-code">${escapeHtml(item.codigo)}</span>
                    </div>
                    <div class="history-meta">
                        <span><i class="fas fa-graduation-cap"></i> ${escapeHtml(item.matricula)}</span>
                        <span><i class="fas fa-calendar"></i> ${formatarData(item.created_at)}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    async emitirPasse(alunoId) {
        try {
            const aluno = await this.db.getAlunoById(alunoId);
            
            if (!aluno) {
                this.showToast('Aluno não encontrado!', 'error');
                return;
            }
            
            const codigo = await this.db.gerarCodigoUnico();
            const dataEmissao = new Date().toISOString();
            
            await this.db.addHistorico({
                aluno_id: aluno.id,
                aluno_nome: aluno.nome,
                matricula: aluno.matricula,
                codigo: codigo,
                data: dataEmissao
            });
            
            this.currentPassData = {
                aluno: aluno,
                codigo: codigo,
                data: dataEmissao
            };
            
            this.showPassModal();
            
            await this.loadHistory();
            await this.updateStats();
            
            this.showToast(`✅ Passe gerado para ${aluno.nome}`, 'success');
            
        } catch (error) {
            console.error('Erro ao emitir passe:', error);
            this.showToast('Erro ao gerar passe', 'error');
        }
    }
    
    showPassModal() {
        if (!this.currentPassData) return;
        
        const { aluno, codigo, data } = this.currentPassData;
        
        document.getElementById('passNome').textContent = aluno.nome;
        document.getElementById('passCpf').textContent = aluno.cpf || 'Não informado';
        document.getElementById('passMatricula').textContent = aluno.matricula;
        document.getElementById('passCurso').textContent = aluno.curso;
        document.getElementById('passSerie').textContent = aluno.serie;
        document.getElementById('passCodigo').textContent = codigo;
        document.getElementById('passData').textContent = formatarData(data);
        
        const modal = document.getElementById('passModal');
        modal.classList.add('active');
    }
    
    async deleteAluno(id) {
        if (confirm('⚠️ Tem certeza que deseja remover este aluno permanentemente?')) {
            try {
                await this.db.deleteAluno(id);
                await this.loadStudentsList();
                await this.updateStats();
                this.showToast('Aluno removido com sucesso', 'success');
            } catch (error) {
                this.showToast('Erro ao remover aluno', 'error');
            }
        }
    }
    
    async cadastrarAluno(event) {
        event.preventDefault();
        
        const alunoData = {
            nome: document.getElementById('nome').value.trim(),
            cpf: document.getElementById('cpf').value.trim(),
            matricula: document.getElementById('matricula').value.trim(),
            curso: document.getElementById('curso').value.trim(),
            serie: document.getElementById('serie').value.trim(),
            email: document.getElementById('email').value.trim()
        };
        
        // Validações
        if (!alunoData.nome || !alunoData.matricula || !alunoData.curso || !alunoData.serie || !alunoData.email) {
            this.showToast('Preencha todos os campos obrigatórios!', 'error');
            return;
        }
        
        if (alunoData.cpf && !validarCPF(alunoData.cpf)) {
            this.showToast('CPF inválido!', 'error');
            return;
        }
        
        if (!validarEmail(alunoData.email)) {
            this.showToast('E-mail inválido!', 'error');
            return;
        }
        
        const existingAluno = await this.db.getAlunoByMatricula(alunoData.matricula);
        if (existingAluno) {
            this.showToast('Matrícula já cadastrada!', 'error');
            return;
        }
        
        try {
            await this.db.addAluno(alunoData);
            this.showToast(`✅ Aluno ${alunoData.nome} cadastrado com sucesso!`, 'success');
            
            document.getElementById('studentForm').reset();
            
            await this.loadStudentsList();
            await this.updateStats();
            
        } catch (error) {
            this.showToast('Erro ao cadastrar aluno', 'error');
        }
    }
    
    async updateStats() {
        const stats = await this.db.getStats();
        
        document.getElementById('statAlunos').textContent = stats.total_alunos;
        document.getElementById('statPasses').textContent = stats.passes_hoje;
        document.getElementById('statTotal').textContent = stats.total_passes;
        
        const totalAlunosEl = document.getElementById('statsTotalAlunos');
        const totalPassesEl = document.getElementById('statsTotalPasses');
        const mediaPassesEl = document.getElementById('statsMediaPasses');
        const ultimoPasseEl = document.getElementById('statsUltimoPasse');
        
        if (totalAlunosEl) totalAlunosEl.textContent = stats.total_alunos;
        if (totalPassesEl) totalPassesEl.textContent = stats.total_passes;
        if (mediaPassesEl) mediaPassesEl.textContent = stats.media_passes_por_aluno;
        if (ultimoPasseEl) {
            ultimoPasseEl.textContent = stats.ultimo_passe 
                ? formatarData(stats.ultimo_passe.created_at) 
                : 'Nenhum';
        }
    }
    
    async exportBackup() {
        try {
            const backup = await this.db.exportBackup();
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `passmanager_backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            this.showToast('Backup exportado com sucesso!', 'success');
        } catch (error) {
            this.showToast('Erro ao exportar backup', 'error');
        }
    }
    
    async importBackup(file) {
        try {
            const text = await file.text();
            const backup = JSON.parse(text);
            await this.db.importBackup(backup);
            
            await this.loadStudentsList();
            await this.loadHistory();
            await this.updateStats();
            
            this.showToast('Backup importado com sucesso!', 'success');
        } catch (error) {
            this.showToast('Erro ao importar backup', 'error');
        }
    }
    
    async loadExamples() {
        const exemplos = [
            { nome: "Ana Beatriz Costa", cpf: "111.222.333-44", matricula: "2024101", curso: "Ensino Médio", serie: "2° Ano B", email: "ana.costa@escola.com" },
            { nome: "Carlos Eduardo Lima", cpf: "555.666.777-88", matricula: "2024102", curso: "Técnico Informática", serie: "3° Módulo", email: "carlos.lima@tec.br" },
            { nome: "Mariana Souza", cpf: "123.456.789-00", matricula: "2023001", curso: "Administração", serie: "1° Ano", email: "mariana@escola.com" },
            { nome: "Isabela Rocha", cpf: "987.654.321-01", matricula: "2023111", curso: "Ciências", serie: "9° Ano", email: "isabela@escola.com" },
            { nome: "Thiago Mendes", cpf: "456.789.123-02", matricula: "2023222", curso: "Matemática", serie: "3° Ano", email: "thiago@escola.com" }
        ];
        
        let adicionados = 0;
        for (const exemplo of exemplos) {
            const exists = await this.db.getAlunoByMatricula(exemplo.matricula);
            if (!exists) {
                await this.db.addAluno(exemplo);
                adicionados++;
            }
        }
        
        if (adicionados > 0) {
            await this.loadStudentsList();
            await this.updateStats();
            this.showToast(`${adicionados} alunos de exemplo adicionados!`, 'success');
        } else {
            this.showToast('Exemplos já existem no sistema', 'info');
        }
    }
    
    async clearAllData() {
        if (confirm('⚠️ ATENÇÃO: Isso irá apagar TODOS os dados! Tem certeza?')) {
            if (confirm('Digite "CONFIRMAR" para prosseguir')) {
                const confirmText = prompt('Digite CONFIRMAR para excluir todos os dados:');
                if (confirmText === 'CONFIRMAR') {
                    await this.db.clearAllData();
                    await this.loadStudentsList();
                    await this.loadHistory();
                    await this.updateStats();
                    this.showToast('Todos os dados foram removidos', 'warning');
                }
            }
        }
    }
    
    async changeTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        await this.db.setConfig('theme', theme);
        this.showToast(`Tema alterado para ${theme}`, 'success');
    }
    
    async loadSavedTheme() {
        const savedTheme = await this.db.getConfig('theme');
        if (savedTheme && savedTheme !== 'auto') {
            document.body.setAttribute('data-theme', savedTheme);
        } else if (savedTheme === 'auto') {
            this.autoTheme();
        }
    }
    
    autoTheme() {
        const darkModeMql = window.matchMedia('(prefers-color-scheme: dark)');
        const setTheme = (e) => {
            document.body.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        };
        darkModeMql.addEventListener('change', setTheme);
        setTheme(darkModeMql);
    }
    
    copyPassCode() {
        if (!this.currentPassData) return;
        
        const code = this.currentPassData.codigo;
        navigator.clipboard.writeText(code);
        this.showToast('Código copiado!', 'success');
    }
    
    simulateEmail() {
        if (!this.currentPassData) return;
        
        const { aluno, codigo } = this.currentPassData;
        
        console.group('📧 SIMULAÇÃO DE E-MAIL');
        console.log(`✅ Destinatário: ${aluno.email}`);
        console.log(`📄 Assunto: Passagem de Intervalo - ${aluno.nome}`);
        console.log(`🔑 Código: ${codigo}`);
        console.log(`📅 Data: ${formatarData(new Date())}`);
        console.groupEnd();
        
        this.showToast(`📨 E-mail simulado para ${aluno.email} (ver console)`, 'info');
    }
    
    printPass() {
        if (!this.currentPassData) return;
        
        const printWindow = window.open('', '_blank');
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>PassManager Pro - Passe de Intervalo</title>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
                <style>
                    body { font-family: 'Inter', sans-serif; padding: 40px; }
                    .pass-print { max-width: 400px; margin: 0 auto; border: 2px solid #3b82f6; border-radius: 16px; padding: 24px; }
                    .pass-header { text-align: center; margin-bottom: 24px; }
                    .pass-code { text-align: center; font-size: 24px; font-family: monospace; background: #f0f0f0; padding: 12px; margin: 16px 0; }
                    @media print { .no-print { display: none; } }
                </style>
            </head>
            <body>
                <div class="pass-print">
                    <div class="pass-header">
                        <i class="fas fa-school" style="font-size: 48px; color: #3b82f6;"></i>
                        <h2>PassManager Pro</h2>
                        <p>Autorização de Saída - Intervalo</p>
                    </div>
                    <div class="pass-details">
                        <p><strong>Aluno:</strong> ${this.currentPassData.aluno.nome}</p>
                        <p><strong>Matrícula:</strong> ${this.currentPassData.aluno.matricula}</p>
                        <p><strong>Curso:</strong> ${this.currentPassData.aluno.curso}</p>
                        <p><strong>Série:</strong> ${this.currentPassData.aluno.serie}</p>
                    </div>
                    <div class="pass-code">
                        <strong>Código de Verificação</strong>
                        <div style="font-size: 28px; letter-spacing: 2px;">${this.currentPassData.codigo}</div>
                    </div>
                    <div class="pass-footer">
                        <p><small>Emissão: ${formatarData(this.currentPassData.data)}</small></p>
                        <p><small><i class="fas fa-signature"></i> Autorizado pelo sistema</small></p>
                    </div>
                </div>
                <div class="no-print" style="text-align: center; margin-top: 20px;">
                    <button onclick="window.print()">Imprimir</button>
                </div>
                <script>window.print();<\/script>
            </body>
            </html>
        `;
        
        printWindow.document.write(html);
        printWindow.document.close();
    }
    
    setupEventListeners() {
        const studentForm = document.getElementById('studentForm');
        if (studentForm) {
            studentForm.addEventListener('submit', (e) => this.cadastrarAluno(e));
        }

        const searchInput = document.getElementById('searchStudent');
        if (searchInput) {
            searchInput.addEventListener('input', debounce(() => this.loadStudentsList(), 300));
        }

        document.getElementById('btnLimparForm')?.addEventListener('click', () => {
            document.getElementById('studentForm').reset();
        });
        
        document.getElementById('btnLoadExamples')?.addEventListener('click', () => this.loadExamples());
        document.getElementById('btnClearAll')?.addEventListener('click', () => this.clearAllData());
        document.getElementById('btnExportBackup')?.addEventListener('click', () => this.exportBackup());
        document.getElementById('btnImportBackup')?.addEventListener('click', () => {
            document.getElementById('fileImport').click();
        });
        
        document.getElementById('fileImport')?.addEventListener('change', (e) => {
            if (e.target.files[0]) this.importBackup(e.target.files[0]);
            e.target.value = '';
        });
        
        document.getElementById('btnExportHistory')?.addEventListener('click', async () => {
            const history = await this.db.getAllHistorico(1000);
            exportToCSV(history, 'historico_passes');
        });
        
        document.getElementById('btnCopyCode')?.addEventListener('click', () => this.copyPassCode());
        document.getElementById('btnSimulateEmail')?.addEventListener('click', () => this.simulateEmail());
        document.getElementById('btnPrintPass')?.addEventListener('click', () => this.printPass());
        document.getElementById('btnCloseModal')?.addEventListener('click', () => {
            document.getElementById('passModal').classList.remove('active');
        });
        
        document.querySelector('.modal-close')?.addEventListener('click', () => {
            document.getElementById('passModal').classList.remove('active');
        });
        
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const theme = btn.dataset.theme;
                this.changeTheme(theme);
            });
        });
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;
                this.switchTab(tabId);
            });
        });
        
        document.getElementById('passModal')?.addEventListener('click', (e) => {
            if (e.target === document.getElementById('passModal')) {
                document.getElementById('passModal').classList.remove('active');
            }
        });
        
        document.getElementById('cpf')?.addEventListener('input', (e) => {
            let raw = e.target.value.replace(/\D/g, '').slice(0, 11);
            let formatted = raw.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
            if (raw.length <= 3) formatted = raw;
            else if (raw.length <= 6) formatted = raw.replace(/(\d{3})(\d{1,3})/, '$1.$2');
            else if (raw.length <= 9) formatted = raw.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
            e.target.value = formatted;
        });
    }
    
    switchTab(tabId) {

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tabId) {
                btn.classList.add('active');
            }
        });
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        const activeTab = document.getElementById(`tab-${tabId}`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
      
        if (tabId === 'lista') {
            this.loadStudentsList();
        } else if (tabId === 'historico') {
            this.loadHistory();
        } else if (tabId === 'config') {
            this.updateStats();
        }
    }
    
    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const messageEl = document.getElementById('toastMessage');
        
        if (!toast || !messageEl) return;
        
        messageEl.textContent = message;
        toast.classList.add('show');
        
        const toastContent = toast.querySelector('.toast-content');
        if (toastContent) {
            toastContent.style.background = type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#0f172a';
        }
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Inicializar aplicação
const app = new PassManagerPro();
