function formatarCPF(cpf) {
    let cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length === 11) {
        return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return cpf;
}

function validarCPF(cpf) {
    let numeros = cpf.replace(/\D/g, '');
    if (numeros.length !== 11) return false;
    
    if (/^(\d)\1{10}$/.test(numeros)) return false;
    let soma = 0;
    for (let i = 0; i < 9; i++) {
        soma += parseInt(numeros.charAt(i)) * (10 - i);
    }
    let resto = 11 - (soma % 11);
    let dig1 = resto >= 10 ? 0 : resto;
    if (dig1 !== parseInt(numeros.charAt(9))) return false;
    

    soma = 0;
    for (let i = 0; i < 10; i++) {
        soma += parseInt(numeros.charAt(i)) * (11 - i);
    }
    resto = 11 - (soma % 11);
    let dig2 = resto >= 10 ? 0 : resto;
    return dig2 === parseInt(numeros.charAt(10));
}

function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function formatarData(data, formato = 'completo') {
    const date = new Date(data);
    
    if (formato === 'completo') {
        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } else if (formato === 'data') {
        return date.toLocaleDateString('pt-BR');
    } else if (formato === 'hora') {
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    
    return date.toLocaleString('pt-BR');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function gerarIdUnico() {
    return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function setStorageWithExpiry(key, value, ttl) {
    const now = new Date();
    const item = {
        value: value,
        expiry: now.getTime() + ttl,
    };
    localStorage.setItem(key, JSON.stringify(item));
}

function getStorageWithExpiry(key) {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) return null;
    
    const item = JSON.parse(itemStr);
    const now = new Date();
    
    if (now.getTime() > item.expiry) {
        localStorage.removeItem(key);
        return null;
    }
    return item.value;
}

function exportToCSV(data, filename) {
    if (!data || !data.length) {
        console.warn('Sem dados para exportar');
        return;
    }
    
    const headers = Object.keys(data[0]);
    const csvRows = [];
    
    csvRows.push(headers.join(','));
    
    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header] || '';
            return `"${String(value).replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
    }
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
