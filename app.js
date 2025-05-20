const API_URL = 'https://script.google.com/macros/s/AKfycbyjWIkvDLo5-0UEuUWPtN_7sAwcQX-UIw9G5YcI1tNxkpr_-j4FAGIJJr0-VDL8mcpT/exec';
const urlParams = new URLSearchParams(window.location.search);
const LOCATION = urlParams.get('location');
const TRAINING = urlParams.get('training');

const DOM = {
    form: document.getElementById('presencaForm'),
    empresa: document.getElementById('empresa'),
    empresaSearch: document.getElementById('empresaSearch'),
    empresaList: document.getElementById('empresaList'),
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

// ================= SISTEMA DE DROPDOWN =================
let dropdownOpen = false;
const dropdownOverlay = document.createElement('div');
dropdownOverlay.className = 'dropdown-overlay';
document.body.appendChild(dropdownOverlay);

function initDropdown() {
    const createOptions = () => {
        DOM.empresaList.innerHTML = '';
        [...DOM.empresa.options].forEach(option => {
            const li = document.createElement('li');
            li.textContent = option.text;
            li.dataset.value = option.value;
            li.setAttribute('role', 'option');
            li.addEventListener('click', () => handleSelect(option.value));
            DOM.empresaList.appendChild(li);
        });
    };

    const handleSelect = (value) => {
        const option = DOM.empresa.querySelector(`option[value="${value}"]`);
        if (!option) return;

        DOM.empresa.value = value;
        DOM.empresaSearch.value = option.text;
        toggleDropdown(false);
        
        if (value === '__nova__') {
            showNewCompany();
        } else {
            carregarDetalhesEmpresa();
        }
    };

    const toggleDropdown = (open) => {
        dropdownOpen = open;
        DOM.empresaList.setAttribute('aria-expanded', open);
        dropdownOverlay.style.display = open ? 'block' : 'none';
        document.body.classList.toggle('dropdown-open', open);

        if (open) {
            createOptions();
            DOM.empresaList.style.display = 'block';
            DOM.empresaList.scrollTop = 0;
        } else {
            DOM.empresaList.style.display = 'none';
        }
    };

    // Event Listeners
    DOM.empresaSearch.addEventListener('click', () => toggleDropdown(!dropdownOpen));
    DOM.empresaSearch.addEventListener('touchend', (e) => {
        e.preventDefault();
        toggleDropdown(!dropdownOpen);
    });

    dropdownOverlay.addEventListener('click', () => toggleDropdown(false));
    dropdownOverlay.addEventListener('touchend', (e) => {
        e.preventDefault();
        toggleDropdown(false);
    });

    DOM.empresaSearch.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        [...DOM.empresaList.children].forEach(li => {
            li.style.display = li.textContent.toLowerCase().includes(term) ? 'block' : 'none';
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && dropdownOpen) toggleDropdown(false);
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
        DOM.empresa.innerHTML = empresas.map(e => 
            `<option value="${e}">${e}</option>`
        ).join('') + '<option value="__nova__">✚ Adicionar nova empresa</option>';

        initDropdown();

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

function showNewCompany() {
    DOM.empresa.classList.add('hidden');
    DOM.addCompanyBox.classList.add('visible');
    DOM.novaEmpresa.focus();
}

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
            const newOption = new Option(nome, nome);
            DOM.empresa.insertBefore(newOption, DOM.empresa.lastChild);
            initDropdown();
            
            DOM.empresaSearch.value = nome;
            DOM.empresa.value = nome;
            DOM.addCompanyBox.classList.remove('visible');
            DOM.empresa.classList.remove('hidden');
            
            mostrarToast('Empresa adicionada com sucesso!');
            await carregarDetalhesEmpresa();
        } else {
            throw new Error(resultado.message);
        }
    } catch (error) {
        mostrarToast(`Erro: ${error.message}`);
        console.error(error);
        DOM.empresa.classList.add('hidden');
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

// ================= EVENT LISTENERS =================
DOM.confirmarEmpresa.addEventListener('click', adicionarNovaEmpresa);
DOM.cancelarEmpresa.addEventListener('click', () => {
    DOM.empresa.classList.remove('hidden');
    DOM.addCompanyBox.classList.remove('visible');
    DOM.novaEmpresa.value = '';
    DOM.empresa.value = '';
    DOM.empresaSearch.value = '';
});

// ================= INICIALIZAÇÃO =================
document.addEventListener('DOMContentLoaded', async () => {
    if(!validarParametros()) return;
    
    try {
        await carregarEmpresas();
        DOM.form.addEventListener('submit', enviarFormulario);

        // Fix para iOS
        if(/iPhone|iPad/i.test(navigator.userAgent)) {
            document.querySelectorAll('input, select').forEach(el => {
                el.addEventListener('focus', () => {
                    setTimeout(() => {
                        el.scrollIntoView({behavior: 'smooth', block: 'center'});
                    }, 300);
                });
            });
        }
    } catch (error) {
        mostrarToast('Falha crítica no sistema!', 10000);
        console.error(error);
    }
});