const API_URL = 'https://script.google.com/macros/s/AKfycbyjWIkvDLo5-0UEuUWPtN_7sAwcQX-UIw9G5YcI1tNxkpr_-j4FAGIJJr0-VDL8mcpT/exec';
const urlParams = new URLSearchParams(window.location.search);
const LOCATION = urlParams.get('location');
const TRAINING = urlParams.get('training');

const DOM = {
    form: document.getElementById('presencaForm'),
    empresa: document.getElementById('empresa'),
    empresaSearch: document.getElementById('empresaSearch'),
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
    cancelarEmpresa: document.getElementById('cancelarEmpresa'),
    dropdownEmpresas: document.getElementById('dropdownEmpresas')
};

// ================= SISTEMA DE EVENTOS =================
let isTouchDevice = false;

function initEventListeners() {
    document.addEventListener('touchstart', () => isTouchDevice = true, { once: true });

let lastTouchY = 0;
let isScrolling = false;

function handleInteraction(e) {
    // Verificar se é um scroll
    if(e.type === 'touchstart') {
        lastTouchY = e.touches[0].clientY;
        isScrolling = false;
    }
    
    if(e.type === 'touchmove') {
        const deltaY = Math.abs(e.touches[0].clientY - lastTouchY);
        if(deltaY > 5) isScrolling = true;
        return;
    }

    if(isScrolling) {
        isScrolling = false;
        return;
    }

    const item = e.target.closest('.dropdown-item');
    if(item) {
        e.preventDefault();
        e.stopPropagation();
        selectEmpresa(item.dataset.value);
    }
}


function initEventListeners() {
    DOM.dropdownEmpresas.addEventListener('touchstart', handleInteraction, { passive: true });
    DOM.dropdownEmpresas.addEventListener('touchmove', handleInteraction, { passive: true });
    DOM.dropdownEmpresas.addEventListener('touchend', handleInteraction);
    DOM.dropdownEmpresas.addEventListener('click', handleInteraction);
}
}

// ================= DROPDOWN BUSCÁVEL =================
function setupSearch() {
    const search = DOM.empresaSearch;
    let isOpen = false;

    const toggleDropdown = (show) => {
        isOpen = show;
        DOM.dropdownEmpresas.style.display = show ? 'block' : 'none';
        if(show) search.focus();
    };

    search.addEventListener('focus', () => toggleDropdown(true));
    search.addEventListener('click', () => toggleDropdown(true));
    
    document.addEventListener('click', (e) => {
        if(!e.target.closest('.dropdown-container')) toggleDropdown(false);
    });

    search.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        DOM.dropdownEmpresas.querySelectorAll('.dropdown-item').forEach(item => {
            item.style.display = item.textContent.toLowerCase().includes(term) ? 'block' : 'none';
        });
    });

    search.addEventListener('keydown', (e) => e.key === 'Escape' && toggleDropdown(false));
    DOM.dropdownEmpresas.addEventListener('scroll', () => {
        DOM.dropdownEmpresas.classList.add('scrolling');
        clearTimeout(DOM.dropdownEmpresas.scrollTimer);
        DOM.dropdownEmpresas.scrollTimer = setTimeout(() => {
            DOM.dropdownEmpresas.classList.remove('scrolling');
        }, 100);
    });
}

// ================= FUNÇÕES PRINCIPAIS =================
async function carregarEmpresas() {
    try {
        mostrarLoading(true);
        let url = `${API_URL}?action=getEmpresas&location=${LOCATION}&cache=${Date.now()}`;
        
        if(LOCATION !== 'maputo' && TRAINING) url += `&training=${TRAINING}`;

        const response = await fetch(url);
        if(!response.ok) throw new Error('Erro ao carregar empresas');
        
        const empresas = await response.json();
        atualizarDropdown(empresas);

        if(empresas.length > 0) {
            DOM.empresaSearch.value = empresas[0];
            DOM.empresa.value = empresas[0];
            await carregarDetalhesEmpresa();
        }

    } catch (error) {
        mostrarToast(`Erro: ${error.message}`, 5000);
        console.error(error);
    } finally {
        mostrarLoading(false);
    }
}

function atualizarDropdown(empresas) {
    DOM.dropdownEmpresas.innerHTML = empresas.map(empresa => `
        <div class="dropdown-item" 
             data-value="${empresa}"
             onclick="selectEmpresa('${empresa}')">
            ${empresa}
        </div>
    `).join('') + `
        <div class="dropdown-item" 
             data-value="__nova__" 
             style="color:var(--mozup-orange);font-weight:500"
             onclick="handleAddCompany(event)">
            ✚ Adicionar nova empresa
        </div>
    `;

    DOM.empresa.innerHTML = empresas.map(e => `<option value="${e}">${e}</option>`).join('');
}

function handleAddCompany(e) {
    e.stopPropagation();
    selectEmpresa('__nova__');
}
let lastSelectionTime = 0;
function selectEmpresa(value) {
      const now = Date.now();
    if(now - lastSelectionTime < 300) return;
    lastSelectionTime = now;
    DOM.dropdownEmpresas.style.display = 'none';
    
    if(value === '__nova__') {
        DOM.empresaSearch.value = '';
        DOM.addCompanyBox.classList.add('visible');
        DOM.novaEmpresa.focus();
        if(!isTouchDevice) {
            DOM.addCompanyBox.style.top = `${DOM.empresaSearch.offsetTop + DOM.empresaSearch.offsetHeight + 5}px`;
            DOM.addCompanyBox.style.left = `${DOM.empresaSearch.offsetLeft}px`;
        }
    } else {
        DOM.empresaSearch.value = value;
        DOM.empresa.value = value;
        carregarDetalhesEmpresa();
    }
}

async function carregarDetalhesEmpresa() {
    try {
        const empresa = DOM.empresa.value;
        if(!empresa || empresa === '__nova__') return;

        mostrarLoading(true);
        let url = `${API_URL}?action=getDetalhes&location=${LOCATION}&empresa=${encodeURIComponent(empresa)}`;
        if(LOCATION !== 'maputo' && TRAINING) url += `&training=${TRAINING}`;

        const response = await fetch(url);
        if(!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
        
        const detalhes = await response.json();
        ['participante', 'email', 'contacto', 'funcao', 'genero'].forEach(id => {
            document.getElementById(id).value = detalhes[id] || '';
        });

        DOM.form.style.boxShadow = '0 0 15px rgba(76, 175, 80, 0.3)';
        setTimeout(() => DOM.form.style.boxShadow = 'var(--shadow)', 1000);

    } catch (error) {
        mostrarToast(`Erro: ${error.message}`, 5000);
        console.error(error);
    } finally {
        mostrarLoading(false);
    }
}

async function adicionarNovaEmpresa() {
    const nome = DOM.novaEmpresa.value.trim();
    if(!nome) return mostrarToast('Digite o nome da empresa');

    try {
        mostrarLoading(true);
        let url = `${API_URL}?action=addEmpresa&location=${LOCATION}&empresa=${encodeURIComponent(nome)}&nocache=${Math.random()}`;
        if(LOCATION !== 'maputo' && TRAINING) url += `&training=${TRAINING}`;

        const response = await fetch(url, {
            redirect: 'follow',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            }
        });
        
        const resultado = await response.json();
        
        if(resultado.status === 'success') {
            const newOption = new Option(nome, nome);
            DOM.empresa.insertBefore(newOption, DOM.empresa.lastChild);
            
            const newItem = document.createElement('div');
            newItem.className = 'dropdown-item';
            newItem.setAttribute('data-value', nome);
            newItem.innerHTML = nome;
            newItem.onclick = () => selectEmpresa(nome);
            DOM.dropdownEmpresas.insertBefore(newItem, DOM.dropdownEmpresas.lastChild);
            
            DOM.empresaSearch.value = nome;
            DOM.empresa.value = nome;
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
        DOM.addCompanyBox.classList.add('visible');
        DOM.novaEmpresa.focus();
    } finally {
        mostrarLoading(false);
    }
}

async function enviarFormulario(e) {
    e.preventDefault();
    if(!validarParametros()) return;

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

    if(LOCATION !== 'maputo' && TRAINING) dados.training = TRAINING;

    try {
        alterarEstadoBotao(true);
        mostrarLoading(true);
        
        const params = new URLSearchParams(dados);
        const response = await fetch(`${API_URL}?${params}`);
        const resultado = await response.json();
        
        if(resultado.status !== 'success') throw new Error(resultado.message);

        DOM.form.reset();
        DOM.correcao.value = '';
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

// ================= FUNÇÕES AUXILIARES =================
function validarParametros() {
    if(!LOCATION) {
        mostrarToast('Localização não especificada!', 5000);
        window.location.href = 'index.html';
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
}

function alterarEstadoBotao(carregando) {
    DOM.btnText.style.display = carregando ? 'none' : 'inline';
    DOM.btnLoading.style.display = carregando ? 'inline' : 'none';
    DOM.form.querySelector('button').disabled = carregando;
}

// ================= INICIALIZAÇÃO =================
document.addEventListener('DOMContentLoaded', async () => {
    if(!validarParametros()) return;
    
    try {
        initEventListeners();
        await carregarEmpresas();
        setupSearch();
        DOM.form.addEventListener('submit', enviarFormulario);
        DOM.confirmarEmpresa.addEventListener('click', adicionarNovaEmpresa);
        DOM.cancelarEmpresa.addEventListener('click', () => {
            DOM.addCompanyBox.classList.remove('visible');
            DOM.empresaSearch.value = DOM.empresa.value;
            DOM.novaEmpresa.value = '';
        });
    } catch (error) {
        mostrarToast('Falha crítica no sistema!', 10000);
        console.error(error);
    }
});
