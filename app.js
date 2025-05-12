const API_URL = 'https://script.google.com/macros/s/AKfycbx8xEDhm_ga3jHtwCdOgvclow0fRqS_HvniHc65Am115gpLXpZ7MyLkM_tct7X0W4lH/exec';
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
};

// Função de validação de parâmetros
function validarParametros() {
    if (!LOCATION) {
        mostrarToast('Localização não especificada!', 5000);
        window.location.href = 'index.html';
        return false;
    }
    
    // Maputo não deve ter parâmetro de training
    if (LOCATION === 'maputo' && TRAINING) {
        mostrarToast('Configuração inválida para Maputo', 5000);
        window.location.href = 'index.html';
        return false;
    }
    
    return true;
}

async function carregarDetalhesEmpresa() {
    try {
        const empresaSelecionada = DOM.empresa.value;
        if (!empresaSelecionada) return;

        mostrarLoading(true);
        
        // Construir URL corretamente para Maputo
        let url = `${API_URL}?action=getDetalhes&location=${LOCATION}&empresa=${encodeURIComponent(empresaSelecionada)}`;
        if (LOCATION !== 'maputo' && TRAINING) {
            url += `&training=${TRAINING}`;
        }

        const resposta = await fetch(url);
        
        if (!resposta.ok) throw new Error(`HTTP error! status: ${resposta.status}`);
        
        const detalhes = await resposta.json();
        
        if (!detalhes) {
            throw new Error('Resposta inválida da API');
        }

        // Preencher campos
        DOM.participante.value = detalhes.participante || '';
        DOM.email.value = detalhes.email || '';
        DOM.contacto.value = detalhes.contacto || '';
        DOM.funcao.value = detalhes.funcao || '';
        DOM.genero.value = detalhes.genero || '';

    } catch (error) {
        console.error('Erro ao carregar detalhes:', error);
        mostrarToast(`Erro: ${error.message}`, 5000);
    } finally {
        mostrarLoading(false);
    }
}

async function carregarEmpresas() {
    try {
        if (!validarParametros()) return;
        
        mostrarLoading(true);
        
        // Construir URL correta
        let url = `${API_URL}?action=getEmpresas&location=${LOCATION}&cache=${Date.now()}`;
        if (LOCATION !== 'maputo' && TRAINING) {
            url += `&training=${TRAINING}`;
        }

        console.log('Carregando empresas da URL:', url); // Debug
        
        const resposta = await fetch(url);
        
        if (!resposta.ok) throw new Error(`HTTP error! status: ${resposta.status}`);
        
        const empresas = await resposta.json();
        
        if (!Array.isArray(empresas)) {
            throw new Error('Resposta inválida da API - formato não é array');
        }

        // Atualizar dropdown
        DOM.empresa.innerHTML = empresas
            .map(empresa => `<option value="${empresa}">${empresa}</option>`)
            .join('');

        if (empresas.length === 0) {
            mostrarToast('Nenhuma empresa encontrada!', 3000);
        }

    } catch (error) {
        console.error('Erro ao carregar empresas:', error);
        mostrarToast(`Erro: ${error.message}`, 5000);
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

    // Adicionar training apenas se não for Maputo
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

        // Resetar formulário após sucesso
        DOM.form.reset();
        DOM.correcao.value = '';
        
        // Recarregar empresas atualizadas
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

// Funções auxiliares mantidas conforme necessário
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