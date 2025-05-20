const API_URL = 'https://script.google.com/macros/s/AKfycbyjWIkvDLo5-0UEuUWPtN_7sAwcQX-UIw9G5YcI1tNxkpr_-j4FAGIJJr0-VDL8mcpT/exec';
const urlParams = new URLSearchParams(window.location.search);
const LOCATION = urlParams.get('location');
const TRAINING = urlParams.get('training');

// Elementos DOM
const DOM = {
    form: document.getElementById('presencaForm'),
    selectButton: document.getElementById('selectButton'),
    dropdown: document.getElementById('dropdown'),
    searchInput: document.getElementById('searchInput'),
    optionsList: document.getElementById('optionsList'),
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

// Estado do aplicativo
let state = {
    empresas: [],
    selectedCompany: null,
    isDropdownOpen: false,
    isLoading: false
};

// ================= FUNÇÕES PRINCIPAIS =================
async function carregarEmpresas() {
    try {
        mostrarLoading(true);
        let url = `${API_URL}?action=getEmpresas&location=${LOCATION}&cache=${Date.now()}`;
        
        if(LOCATION !== 'maputo' && TRAINING) url += `&training=${TRAINING}`;

        const response = await fetch(url);
        if(!response.ok) throw new Error('Erro ao carregar empresas');
        
        state.empresas = await response.json();
        renderizarOpcoes(state.empresas);
        
        if(state.empresas.length > 0) {
            selecionarEmpresa(state.empresas[0]);
        }

    } catch (error) {
        mostrarToast(`Erro: ${error.message}`, 5000);
        console.error(error);
    } finally {
        mostrarLoading(false);
    }
}

function renderizarOpcoes(empresas) {
    DOM.optionsList.innerHTML = empresas.map(empresa => `
        <li class="option-item" 
            data-value="${empresa}" 
            role="option"
            tabindex="0">
            ${empresa}
        </li>
    `).join('') + `
        <li class="option-item" 
            data-value="__nova__" 
            style="color: var(--mozup-orange); font-weight: 500"
            role="option"
            tabindex="0">
            ✚ Adicionar nova empresa
        </li>
    `;
}

// ================= CONTROLE DO DROPDOWN =================
function toggleDropdown(abrir) {
    state.isDropdownOpen = abrir;
    DOM.dropdown.classList.toggle('visible', abrir);
    DOM.selectButton.setAttribute('aria-expanded', abrir);

    if(abrir) {
        DOM.searchInput.focus();
        window.scrollTo(0, 0);
        adicionarEventosDropdown();
    } else {
        removerEventosDropdown();
    }
}

function adicionarEventosDropdown() {
    document.addEventListener('click', handleClickFora);
    document.addEventListener('keydown', handleTeclado);
    DOM.optionsList.addEventListener('touchstart', handleToque, {passive: true});
}

function removerEventosDropdown() {
    document.removeEventListener('click', handleClickFora);
    document.removeEventListener('keydown', handleTeclado);
    DOM.optionsList.removeEventListener('touchstart', handleToque);
}

function handleClickFora(e) {
    if(!e.target.closest('.select-container')) {
        toggleDropdown(false);
    }
}

function handleTeclado(e) {
    if(e.key === 'Escape') toggleDropdown(false);
}

function handleToque(e) {
    const option = e.target.closest('.option-item');
    if(option) handleSelecao(option);
}

// ================= SELEÇÃO DE EMPRESA =================
function selecionarEmpresa(empresa) {
    state.selectedCompany = empresa;
    DOM.selectButton.textContent = empresa;
    DOM.selectButton.setAttribute('data-value', empresa);
}

function handleSelecao(option) {
    const valor = option.dataset.value;
    
    if(valor === '__nova__') {
        DOM.addCompanyBox.classList.add('visible');
        DOM.novaEmpresa.focus();
        toggleDropdown(false);
    } else {
        selecionarEmpresa(option.textContent);
        carregarDetalhesEmpresa();
        toggleDropdown(false);
    }
}

async function carregarDetalhesEmpresa() {
    try {
        mostrarLoading(true);
        let url = `${API_URL}?action=getDetalhes&location=${LOCATION}&empresa=${encodeURIComponent(state.selectedCompany)}`;
        if(LOCATION !== 'maputo' && TRAINING) url += `&training=${TRAINING}`;

        const response = await fetch(url);
        if(!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
        
        const detalhes = await response.json();
        preencherCampos(detalhes);

    } catch (error) {
        mostrarToast(`Erro: ${error.message}`, 5000);
        console.error(error);
    } finally {
        mostrarLoading(false);
    }
}

function preencherCampos(detalhes) {
    ['participante', 'email', 'contacto', 'funcao'].forEach(id => {
        DOM[id].value = detalhes[id] || '';
    });
    DOM.genero.value = detalhes.genero || '';
}

// ================= NOVA EMPRESA =================
async function adicionarNovaEmpresa() {
    const nome = DOM.novaEmpresa.value.trim();
    if(!nome) return mostrarToast('Digite o nome da empresa');

    try {
        mostrarLoading(true);
        let url = `${API_URL}?action=addEmpresa&location=${LOCATION}&empresa=${encodeURIComponent(nome)}`;
        if(LOCATION !== 'maputo' && TRAINING) url += `&training=${TRAINING}`;

        const response = await fetch(url);
        const resultado = await response.json();
        
        if(resultado.status === 'success') {
            state.empresas.push(nome);
            renderizarOpcoes(state.empresas);
            selecionarEmpresa(nome);
            DOM.addCompanyBox.classList.remove('visible');
            mostrarToast('Empresa adicionada com sucesso!');
        } else {
            throw new Error(resultado.message);
        }
    } catch (error) {
        mostrarToast(`Erro: ${error.message}`);
        console.error(error);
        DOM.novaEmpresa.focus();
    } finally {
        mostrarLoading(false);
    }
}

// ================= ENVIO DO FORMULÁRIO =================
async function enviarFormulario(e) {
    e.preventDefault();
    if(!validarParametros() || !validarFormulario()) return;

    const dados = {
        action: 'salvarDados',
        location: LOCATION,
        empresaOriginal: state.selectedCompany,
        empresa: DOM.correcao.value.trim() || state.selectedCompany,
        participante: DOM.participante.value.trim(),
        email: DOM.email.value.trim(),
        contacto: DOM.contacto.value.trim(),
        funcao: DOM.funcao.value.trim(),
        genero: DOM.genero.value
    };

    if(LOCATION !== 'maputo' && TRAINING) dados.training = TRAINING;

    try {
        alterarEstadoBotao(true);
        mostrarLoading(true);
        
        const params = new URLSearchParams(dados);
        const response = await fetch(`${API_URL}?${params}`);
        const resultado = await response.json();
        
        if(resultado.status !== 'success') throw new Error(resultado.message);

        limparFormulario();
        mostrarToast('Dados salvos com sucesso!');
        setTimeout(carregarEmpresas, 1000);

    } catch (error) {
        mostrarToast(`Erro: ${error.message}`, 5000);
        console.error(error);
    } finally {
        alterarEstadoBotao(false);
        mostrarLoading(false);
    }
}

function limparFormulario() {
    DOM.form.reset();
    DOM.correcao.value = '';
}

// ================= FUNÇÕES AUXILIARES =================
function validarParametros() {
    if(!LOCATION) {
        mostrarToast('Localização não especificada!', 5000);
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

function validarFormulario() {
    if(!state.selectedCompany || state.selectedCompany === 'Selecione uma empresa') {
        mostrarToast('Selecione uma empresa válida');
        return false;
    }
    return true;
}

function mostrarToast(mensagem, duracao = 3000) {
    DOM.toast.textContent = mensagem;
    DOM.toast.classList.add('toast-visible');
    setTimeout(() => DOM.toast.classList.remove('toast-visible'), duracao);
}

function mostrarLoading(ativo) {
    DOM.loading.style.display = ativo ? 'flex' : 'none';
    state.isLoading = ativo;
}

function alterarEstadoBotao(carregando) {
    DOM.btnText.style.display = carregando ? 'none' : 'inline';
    DOM.btnLoading.style.display = carregando ? 'inline' : 'none';
    DOM.form.querySelector('button').disabled = carregando;
}

// ================= EVENT LISTENERS =================
function configurarEventos() {
    // Dropdown
    DOM.selectButton.addEventListener('click', () => toggleDropdown(!state.isDropdownOpen));
    DOM.selectButton.addEventListener('keydown', (e) => {
        if(e.key === 'Enter' || e.key === ' ') toggleDropdown(true);
    });
    
    // Pesquisa
    DOM.searchInput.addEventListener('input', (e) => {
        const termo = e.target.value.toLowerCase();
        const filtradas = state.empresas.filter(empresa => 
            empresa.toLowerCase().includes(termo)
        );
        renderizarOpcoes(filtradas);
    });

    // Seleção de opções
    DOM.optionsList.addEventListener('click', (e) => {
        const option = e.target.closest('.option-item');
        if(option) handleSelecao(option);
    });

    // Nova empresa
    DOM.confirmarEmpresa.addEventListener('click', adicionarNovaEmpresa);
    DOM.cancelarEmpresa.addEventListener('click', () => {
        DOM.addCompanyBox.classList.remove('visible');
        DOM.novaEmpresa.value = '';
    });

    // Formulário
    DOM.form.addEventListener('submit', enviarFormulario);
}

// ================= INICIALIZAÇÃO =================
document.addEventListener('DOMContentLoaded', async () => {
    if(!validarParametros()) return;
    
    try {
        await carregarEmpresas();
        configurarEventos();
    } catch (error) {
        mostrarToast('Falha crítica no sistema!', 10000);
        console.error(error);
    }
});