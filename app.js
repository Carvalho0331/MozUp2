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
    cancelarEmpresa: document.getElementById('cancelarEmpresa')
};

// ================= FUNÇÃO DE PESQUISA ATUALIZADA =================
function setupSearch() {
    const search = DOM.empresaSearch;
    const dropdown = document.querySelector('.dropdown-content');
    let isOpen = false;

    const toggleDropdown = (open) => {
        isOpen = open;
        dropdown.style.display = open ? 'block' : 'none';
        DOM.empresa.size = open ? 5 : 1;
        
        if(open) {
            search.focus();
            [...DOM.empresa.options].forEach(opt => opt.style.display = 'block');
            document.body.style.overflow = 'hidden'; // Bloquear scroll
        } else {
            document.body.style.overflow = 'auto'; // Restaurar scroll
        }
    };

    const handleSelection = (opt) => {
        search.value = opt.textContent;
        DOM.empresa.value = opt.value;
        toggleDropdown(false);
        
        if(opt.value === '__nova__') {
            DOM.empresa.classList.add('hidden');
            DOM.addCompanyBox.classList.add('visible');
            DOM.novaEmpresa.focus();
        } else {
            carregarDetalhesEmpresa();
        }
    };

    // Eventos de abertura
    search.addEventListener('click', () => !isOpen && toggleDropdown(true));
    search.addEventListener('touchend', (e) => {
        e.preventDefault();
        !isOpen && toggleDropdown(true);
    });

    // Eventos de fechamento
    document.addEventListener('click', (e) => {
        if(!e.target.closest('.custom-dropdown')) toggleDropdown(false);
    });
    
    document.addEventListener('touchstart', (e) => {
        if(!e.target.closest('.custom-dropdown')) toggleDropdown(false);
    });

    // Filtro de pesquisa
    search.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        [...DOM.empresa.options].forEach(opt => {
            opt.style.display = opt.text.toLowerCase().includes(term) ? 'block' : 'none';
        });
    });

    // Manipulação de seleção
    const handleInteraction = (e) => {
        if(e.target.tagName === 'OPTION') {
            handleSelection(e.target);
        }
    };

    // Eventos de seleção
    DOM.empresa.addEventListener('click', handleInteraction);
    DOM.empresa.addEventListener('touchend', handleInteraction);

    // Tecla Escape
    search.addEventListener('keydown', (e) => e.key === 'Escape' && toggleDropdown(false));
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
        ).join('') + '<option value="__nova__" style="color:#FF6B00;font-weight:500">✚ Adicionar nova empresa</option>';

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
        setupSearch();
        DOM.form.addEventListener('submit', enviarFormulario);
    } catch (error) {
        mostrarToast('Falha crítica no sistema!', 10000);
        console.error(error);
    }
});

// ================= ESTATÍSTICAS =================
async function carregarEstatisticas() {
  const response = await fetch(`${API_URL}?action=estatisticas&location=${LOCATION}`);
  const data = await response.json();
  
  new Chart(document.getElementById('generoChart'), {
    type: 'pie',
    data: {
      labels: ['Masculino', 'Feminino'],
      datasets: [{
        data: [data.masculino, data.feminino],
        backgroundColor: ['#FF6B00', '#2D3748']
      }]
    }
  });
}