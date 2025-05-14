const API_URL = 'https://script.google.com/macros/s/AKfycbyjWIkvDLo5-0UEuUWPtN_7sAwcQX-UIw9G5YcI1tNxkpr_-j4FAGIJJr0-VDL8mcpT/exec';
const urlParams = new URLSearchParams(window.location.search);
const LOCATION = urlParams.get('location');
const TRAINING = urlParams.get('training');

const DOM = {
    form: document.getElementById('presencaForm'),
    empresa: document.getElementById('empresa'),
    correcao: document.getElementById('correcao'),
    participante: document.getElementById('participante'),
    email: document.getElementById('email'),
    contacto: document.getElementById('contacto'),
    funcao: document.getElementById('funcao'),
    genero: document.getElementById('genero'),
    toast: document.getElementById('toast'),
    loading: document.getElementById('loading'),
    btnText: document.getElementById('btnText'),
    btnLoading: document.getElementById('btnLoading'),
    addCompanyBox: document.querySelector('.add-company-box'),
    novaEmpresa: document.getElementById('novaEmpresa'),
    confirmarEmpresa: document.getElementById('confirmarEmpresa'),
    cancelarEmpresa: document.getElementById('cancelarEmpresa')
};

// Função de validação de parâmetros
function validarParametros() {
    if (!LOCATION) {
        mostrarToast('Localização não especificada!', 5000);
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

async function carregarDetalhesEmpresa() {
    try {
        const empresaSelecionada = DOM.empresa.value;
        if (!empresaSelecionada || empresaSelecionada === "__nova__") return;

        mostrarLoading(true);
        
        let url = `${API_URL}?action=getDetalhes&location=${LOCATION}&empresa=${encodeURIComponent(empresaSelecionada)}`;
        if (LOCATION !== 'maputo' && TRAINING) {
            url += `&training=${TRAINING}`;
        }

        const resposta = await fetch(url);
        
        if (!resposta.ok) throw new Error(`HTTP error! status: ${resposta.status}`);
        
        const detalhes = await resposta.json();
        
        if (!detalhes) throw new Error('Resposta inválida da API');

        // Preencher campos
        DOM.participante.value = detalhes.participante || '';
        DOM.email.value = detalhes.email || '';
        DOM.contacto.value = detalhes.contacto || '';
        DOM.funcao.value = detalhes.funcao || '';
        DOM.genero.value = detalhes.genero || '';

        DOM.form.style.boxShadow = '0 0 15px rgba(76, 175, 80, 0.3)';
        setTimeout(() => DOM.form.style.boxShadow = 'var(--shadow)', 1000);

    } catch (error) {
        console.error('Erro ao carregar detalhes:', error);
        mostrarToast(`Erro: ${error.message}`, 5000);
    } finally {
        mostrarLoading(false);
    }
}

async function carregarEmpresas() {
    try {
        mostrarLoading(true);
        let url = `${API_URL}?action=getEmpresas&location=${LOCATION}&cache=${Date.now()}`;
        
        if (LOCATION !== 'maputo' && TRAINING) {
            url += `&training=${TRAINING}`;
        }

        const resposta = await fetch(url);
        
        if (!resposta.ok) throw new Error('Falha ao carregar empresas');
        
        const empresas = await resposta.json();

        // Atualizar dropdown - mantendo apenas a opção de adicionar nova empresa
        if (empresas.length > 0) {
            DOM.empresa.innerHTML = empresas
                .map(empresa => `<option value="${empresa}">${empresa}</option>`)
                .join('') +
                '<option value="__nova__">✚ Adicionar nova empresa</option>';
            
            DOM.empresa.value = empresas[0];
            await carregarDetalhesEmpresa();
        } else {
            // Se não houver empresas, mostrar apenas a opção de adicionar
            DOM.empresa.innerHTML = '<option value="__nova__">✚ Adicionar nova empresa</option>';
        }

    } catch (error) {
        console.error('Erro ao carregar empresas:', error);
        mostrarToast(`Erro: ${error.message}`, 5000);
        DOM.empresa.innerHTML = '<option value="__nova__">✚ Adicionar nova empresa</option>';
    } finally {
        mostrarLoading(false);
    }
}

// Função para adicionar nova empresa
async function adicionarNovaEmpresa() {
    const novaEmpresa = DOM.novaEmpresa.value.trim();
    
    if (!novaEmpresa) {
        mostrarToast('Digite o nome da empresa');
        return;
    }

    try {
        mostrarLoading(true);
        
        let url = `${API_URL}?action=addEmpresa` + 
                 `&location=${LOCATION}` + 
                 `&empresa=${encodeURIComponent(novaEmpresa)}`;
        
        if (LOCATION !== 'maputo' && TRAINING) {
            url += `&training=${TRAINING}`;
        }

        const resposta = await fetch(url);
        
        const resultado = await resposta.json();
        
        if (resultado.status === 'success') {
            // Atualizar UI
            const newOption = new Option(novaEmpresa, novaEmpresa);
            DOM.empresa.insertBefore(newOption, DOM.empresa.lastChild);
            DOM.empresa.value = novaEmpresa;
            
            DOM.empresa.classList.remove('hidden');
            DOM.addCompanyBox.classList.remove('visible');
            DOM.novaEmpresa.value = '';
            
            mostrarToast('Empresa adicionada com sucesso!');
            await carregarDetalhesEmpresa();
        } else {
            throw new Error(resultado.message);
        }
        
    } catch (error) {
        mostrarToast(`Erro: ${error.message}`);
        console.error(error);
    } finally {
        mostrarLoading(false);
    }
}

async function enviarFormulario(e) {
    e.preventDefault();
    
    if (!validarParametros()) return;

    const dados = {
        action: 'salvarDados',
        location: LOCATION,
        empresaOriginal: DOM.empresa.value.trim(),
        empresa: DOM.correcao.value.trim() || DOM.empresa.value.trim(),
        participante: DOM.participante.value.trim(),
        email: DOM.email.value.trim(),
        contacto: DOM.contacto.value.trim(),
        funcao: DOM.funcao.value.trim(),
        genero: DOM.genero.value
    };

    if (LOCATION !== 'maputo' && TRAINING) {
        dados.training = TRAINING;
    }

    try {
        alterarEstadoBotao(true);
        mostrarLoading(true);
        
        const params = new URLSearchParams(dados);
        const resposta = await fetch(`${API_URL}?${params}`);
        
        if (!resposta.ok) throw new Error(`HTTP error! status: ${resposta.status}`);
        
        const resultado = await resposta.json();

        if (resultado.status !== 'success') {
            throw new Error(resultado.message || 'Erro desconhecido');
        }

        DOM.form.reset();
        DOM.correcao.value = '';
        setTimeout(() => carregarEmpresas(), 1000);
        mostrarToast(resultado.message || 'Dados salvos com sucesso!');

    } catch (error) {
        console.error('Erro ao enviar formulário:', error);
        mostrarToast(`Erro: ${error.message}`, 5000);
    } finally {
        alterarEstadoBotao(false);
        mostrarLoading(false);
    }
}

// Funções auxiliares
function mostrarToast(mensagem, duracao = 3000) {
    DOM.toast.textContent = mensagem;
    DOM.toast.classList.add('toast-visible');
    setTimeout(() => DOM.toast.classList.remove('toast-visible'), duracao);
}

function mostrarLoading(ativo) {
    DOM.loading.style.display = ativo ? 'flex' : 'none';
}

function alterarEstadoBotao(carregando) {
    DOM.btnText.style.display = carregando ? 'none' : 'inline';
    DOM.btnLoading.style.display = carregando ? 'inline' : 'none';
    DOM.form.querySelector('button').disabled = carregando;
}

// Event Listeners
DOM.empresa.addEventListener('change', function() {
    if (this.value === '__nova__') {
        this.classList.add('hidden');
        DOM.addCompanyBox.classList.add('visible');
        DOM.novaEmpresa.focus();
    } else {
        carregarDetalhesEmpresa();
    }
});

DOM.confirmarEmpresa.addEventListener('click', adicionarNovaEmpresa);
DOM.cancelarEmpresa.addEventListener('click', () => {
    DOM.empresa.classList.remove('hidden');
    DOM.addCompanyBox.classList.remove('visible');
    DOM.novaEmpresa.value = '';
    DOM.empresa.value = '';
});

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    if (!validarParametros()) return;
    
    try {
        await carregarEmpresas();
        DOM.empresa.addEventListener('change', carregarDetalhesEmpresa);
        DOM.form.addEventListener('submit', enviarFormulario);
    } catch (error) {
        console.error('Erro na inicialização:', error);
        mostrarToast('Falha crítica no sistema!', 10000);
    }
});
