class DatabaseManager {
    constructor() {
        this.dbName = 'PassManagerPro';
        this.dbVersion = 2;
        this.db = null;
        this.isInitialized = false;
    }

    // Inicializar o banco de dados
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                console.error('Erro ao abrir banco:', request.error);
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                this.isInitialized = true;
                console.log('✅ Banco de dados inicializado com sucesso');
                
                // Verificar se precisa popular dados iniciais
                this.checkAndSeedInitialData().then(resolve);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const oldVersion = event.oldVersion;
                
                console.log(`Atualizando banco de versão ${oldVersion} para ${this.dbVersion}`);
                
                // Criar object store de alunos
                if (!db.objectStoreNames.contains('alunos')) {
                    const alunoStore = db.createObjectStore('alunos', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    alunoStore.createIndex('matricula', 'matricula', { unique: true });
                    alunoStore.createIndex('nome', 'nome');
                    alunoStore.createIndex('cpf', 'cpf', { unique: false });
                    alunoStore.createIndex('created_at', 'created_at');
                }
                
                // Criar object store de histórico
                if (!db.objectStoreNames.contains('historico')) {
                    const historyStore = db.createObjectStore('historico', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    historyStore.createIndex('aluno_id', 'aluno_id');
                    historyStore.createIndex('codigo', 'codigo');
                    historyStore.createIndex('created_at', 'created_at');
                    historyStore.createIndex('data', 'data');
                }
                
                // Criar object store de configurações
                if (!db.objectStoreNames.contains('configuracoes')) {
                    db.createObjectStore('configuracoes', { keyPath: 'chave' });
                }
            };
        });
    }
    
    // Verificar e popular dados iniciais se necessário
    async checkAndSeedInitialData() {
        const alunos = await this.getAllAlunos();
        
        if (alunos.length === 0) {
            console.log('📚 Populando dados iniciais...');
            const exemplos = [
                { nome: "Ana Beatriz Costa", cpf: "111.222.333-44", matricula: "2024101", curso: "Ensino Médio", serie: "2° Ano B", email: "ana.costa@escola.com" },
                { nome: "Carlos Eduardo Lima", cpf: "555.666.777-88", matricula: "2024102", curso: "Técnico Informática", serie: "3° Módulo", email: "carlos.lima@tec.br" },
                { nome: "Mariana Souza", cpf: "123.456.789-00", matricula: "2023001", curso: "Administração", serie: "1° Ano", email: "mariana@escola.com" },
                { nome: "Isabela Rocha", cpf: "987.654.321-01", matricula: "2023111", curso: "Ciências", serie: "9° Ano", email: "isabela@escola.com" },
                { nome: "Thiago Mendes", cpf: "456.789.123-02", matricula: "2023222", curso: "Matemática", serie: "3° Ano", email: "thiago@escola.com" }
            ];
            
            for (const aluno of exemplos) {
                await this.addAluno(aluno);
            }
            console.log(`✅ ${exemplos.length} alunos de exemplo adicionados`);
        }
        
        // Verificar configurações iniciais
        const theme = await this.getConfig('theme');
        if (!theme) {
            await this.setConfig('theme', 'light');
        }
    }
    
    async addAluno(alunoData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['alunos'], 'readwrite');
            const store = transaction.objectStore('alunos');
            
            const novoAluno = {
                ...alunoData,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            const request = store.add(novoAluno);
            
            request.onsuccess = () => {
                console.log('Aluno adicionado:', novoAluno.nome);
                resolve({ success: true, id: request.result, aluno: novoAluno });
            };
            
            request.onerror = () => {
                console.error('Erro ao adicionar aluno:', request.error);
                reject(request.error);
            };
        });
    }
    
    async getAllAlunos(busca = '') {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['alunos'], 'readonly');
            const store = transaction.objectStore('alunos');
            const request = store.getAll();
            
            request.onsuccess = () => {
                let alunos = request.result || [];
                
                if (busca && busca.trim()) {
                    const term = busca.toLowerCase().trim();
                    alunos = alunos.filter(a => 
                        a.nome.toLowerCase().includes(term) || 
                        a.matricula.includes(term) ||
                        (a.cpf && a.cpf.includes(term))
                    );
                }
                
                // Ordenar por nome
                alunos.sort((a, b) => a.nome.localeCompare(b.nome));
                resolve(alunos);
            };
            
            request.onerror = () => reject(request.error);
        });
    }
    
    async getAlunoById(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['alunos'], 'readonly');
            const store = transaction.objectStore('alunos');
            const request = store.get(id);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    async getAlunoByMatricula(matricula) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['alunos'], 'readonly');
            const store = transaction.objectStore('alunos');
            const index = store.index('matricula');
            const request = index.get(matricula);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    async updateAluno(id, alunoData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['alunos'], 'readwrite');
            const store = transaction.objectStore('alunos');
            
            const alunoAtualizado = {
                ...alunoData,
                id: id,
                updated_at: new Date().toISOString()
            };
            
            const request = store.put(alunoAtualizado);
            
            request.onsuccess = () => {
                console.log('Aluno atualizado:', alunoData.nome);
                resolve({ success: true });
            };
            
            request.onerror = () => reject(request.error);
        });
    }
    
    async deleteAluno(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['alunos', 'historico'], 'readwrite');
            const alunoStore = transaction.objectStore('alunos');
            const historyStore = transaction.objectStore('historico');
            
            // Deletar aluno
            const deleteAluno = alunoStore.delete(id);
            
            // Deletar histórico relacionado
            const historyIndex = historyStore.index('aluno_id');
            const historyRequest = historyIndex.openCursor(IDBKeyRange.only(id));
            
            historyRequest.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    historyStore.delete(cursor.primaryKey);
                    cursor.continue();
                }
            };
            
            deleteAluno.onsuccess = () => {
                console.log('Aluno e histórico removidos');
                resolve({ success: true });
            };
            
            deleteAluno.onerror = () => reject(deleteAluno.error);
        });
    }
    
    
    async addHistorico(registro) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['historico'], 'readwrite');
            const store = transaction.objectStore('historico');
            
            const novoRegistro = {
                ...registro,
                created_at: new Date().toISOString()
            };
            
            const request = store.add(novoRegistro);
            
            request.onsuccess = () => {
                console.log('Passe registrado para:', registro.aluno_nome);
                resolve({ success: true, id: request.result });
            };
            
            request.onerror = () => reject(request.error);
        });
    }
    
    async getAllHistorico(limite = 100) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['historico'], 'readonly');
            const store = transaction.objectStore('historico');
            const index = store.index('created_at');
            const request = index.openCursor(null, 'prev');
            
            const results = [];
            let count = 0;
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor && count < limite) {
                    results.push(cursor.value);
                    count++;
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };
            
            request.onerror = () => reject(request.error);
        });
    }
    
    async getHistoricoPorAluno(alunoId, limite = 50) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['historico'], 'readonly');
            const store = transaction.objectStore('historico');
            const index = store.index('aluno_id');
            const request = index.openCursor(IDBKeyRange.only(alunoId), 'prev');
            
            const results = [];
            let count = 0;
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor && count < limite) {
                    results.push(cursor.value);
                    count++;
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    
    async getConfig(chave) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['configuracoes'], 'readonly');
            const store = transaction.objectStore('configuracoes');
            const request = store.get(chave);
            
            request.onsuccess = () => {
                resolve(request.result ? request.result.valor : null);
            };
            
            request.onerror = () => reject(request.error);
        });
    }
    
    async setConfig(chave, valor) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['configuracoes'], 'readwrite');
            const store = transaction.objectStore('configuracoes');
            const request = store.put({ chave, valor, updated_at: new Date().toISOString() });
            
            request.onsuccess = () => resolve({ success: true });
            request.onerror = () => reject(request.error);
        });
    }
    
    async getStats() {
        const alunos = await this.getAllAlunos();
        const historico = await this.getAllHistorico(1000);
        const hoje = new Date().toDateString();
        
        const passesHoje = historico.filter(h => 
            new Date(h.created_at).toDateString() === hoje
        );
        
        const ultimoPasse = historico.length > 0 ? historico[0] : null;
        
        // Calcular média de passes por aluno
        const alunoIds = new Set(historico.map(h => h.aluno_id));
        const mediaPasses = alunoIds.size > 0 ? (historico.length / alunoIds.size).toFixed(1) : 0;
        
        return {
            total_alunos: alunos.length,
            total_passes: historico.length,
            passes_hoje: passesHoje.length,
            media_passes_por_aluno: mediaPasses,
            ultimo_passe: ultimoPasse,
            alunos_ativos: alunos.length
        };
    }
    
    
    async exportBackup() {
        const alunos = await this.getAllAlunos();
        const historico = await this.getAllHistorico(10000);
        const configs = await this.getAllConfigs();
        
        const backup = {
            versao: '2.0',
            data: new Date().toISOString(),
            alunos: alunos,
            historico: historico,
            configuracoes: configs
        };
        
        return backup;
    }
    
    async getAllConfigs() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['configuracoes'], 'readonly');
            const store = transaction.objectStore('configuracoes');
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }
    
    async importBackup(backup) {
        try {
            // Limpar dados existentes
            await this.clearAllData();
            
            // Importar alunos
            if (backup.alunos && backup.alunos.length) {
                for (const aluno of backup.alunos) {
                    // Remover IDs para evitar conflitos
                    const { id, ...alunoSemId } = aluno;
                    await this.addAluno(alunoSemId);
                }
            }
            
            // Importar histórico
            if (backup.historico && backup.historico.length) {
                for (const item of backup.historico) {
                    const { id, ...itemSemId } = item;
                    await this.addHistorico(itemSemId);
                }
            }
            
            console.log('✅ Backup importado com sucesso');
            return { success: true };
        } catch (error) {
            console.error('Erro ao importar backup:', error);
            throw error;
        }
    }
    
    async clearAllData() {
        const alunos = await this.getAllAlunos();
        for (const aluno of alunos) {
            await this.deleteAluno(aluno.id);
        }
        
        // Limpar configurações
        const configs = await this.getAllConfigs();
        const transaction = this.db.transaction(['configuracoes'], 'readwrite');
        const store = transaction.objectStore('configuracoes');
        
        for (const config of configs) {
            store.delete(config.chave);
        }
        
        return { success: true };
    }
    
    
    async gerarCodigoUnico() {
        let codigo;
        let existe = true;
        
        while (existe) {
            const prefixo = Math.random().toString(36).substring(2, 6).toUpperCase();
            const sufixo = Math.floor(1000 + Math.random() * 9000);
            codigo = `${prefixo}-${sufixo}`;
            
            const historico = await this.getAllHistorico(1000);
            existe = historico.some(h => h.codigo === codigo);
        }
        
        return codigo;
    }
}

// Instância global do banco de dados
const db = new DatabaseManager();
