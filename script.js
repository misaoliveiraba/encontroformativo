// Suas credenciais do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAYQfcsrfabqpZ8AuXeBL2PiR_uDkAHcpY",
  authDomain: "encontroformativo-3ac69.firebaseapp.com",
  databaseURL: "https://encontroformativo-3ac69-default-rtdb.firebaseio.com",
  projectId: "encontroformativo-3ac69",
  storageBucket: "encontroformativo-3ac69.appspot.com",
  messagingSenderId: "381346392383",
  appId: "1:381346392383:web:ffc768a01f7834a09fcb8a",
  measurementId: "G-CS3TWF65QB"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// --- MAPEAMENTO DE ELEMENTOS DO DOM ---
const form = document.getElementById('agendamentoForm');
const localSelect = document.getElementById('local');
const localExternoContainer = document.getElementById('localExternoContainer');
const listaAgendamentos = document.getElementById('listaAgendamentos');

// Elementos da Modal
const modal = document.getElementById('reagendamentoModal');
const closeModalButton = document.querySelector('.close-button');
const reagendamentoForm = document.getElementById('reagendamentoForm');

// --- EVENT LISTENERS ---

// Mostra/Oculta o campo de local externo no formulário principal
localSelect.addEventListener('change', (e) => {
    localExternoContainer.style.display = e.target.value === 'Externo' ? 'block' : 'none';
});

// Envio do formulário de agendamento
form.addEventListener('submit', (e) => {
    e.preventDefault();
    // ... (código para adicionar agendamento permanece o mesmo)
});

// Fecha a modal ao clicar no 'X'
closeModalButton.onclick = () => {
    modal.style.display = "none";
}

// Fecha a modal ao clicar fora dela
window.onclick = (event) => {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

// Processa o formulário de reagendamento
reagendamentoForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('reagendamentoId').value;
    const novaData = document.getElementById('novaData').value;
    const novoLocal = document.getElementById('novoLocal').value;
    const responsavelReagendamento = document.getElementById('responsavelReagendamento').value;

    database.ref('agendamentos/' + id).update({
        data: novaData,
        local: novoLocal,
        reagendadoPor: responsavelReagendamento,
        status: 'ativo' // Garante que o status volte para ativo caso tenha sido alterado
    });

    modal.style.display = "none";
});


// --- FUNÇÕES PRINCIPAIS ---

// Carrega e exibe os agendamentos do Firebase
database.ref('agendamentos').on('value', (snapshot) => {
    listaAgendamentos.innerHTML = '';
    const agendamentos = [];
    snapshot.forEach((childSnapshot) => {
        agendamentos.push({
            id: childSnapshot.key,
            ...childSnapshot.val()
        });
    });

    // Ordena os agendamentos por data
    agendamentos.sort((a, b) => new Date(a.data) - new Date(b.data));

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const agendamentosAtivos = [];
    const agendamentosPassados = [];

    agendamentos.forEach(agendamento => {
        const dataAgendamento = new Date(agendamento.data);
        if (dataAgendamento < hoje && agendamento.status !== 'cancelado') {
            agendamentosPassados.push(agendamento);
        } else {
            agendamentosAtivos.push(agendamento);
        }
    });

    const agendamentosOrdenados = [...agendamentosAtivos, ...agendamentosPassados];

    agendamentosOrdenados.forEach(agendamento => {
        const div = document.createElement('div');
        div.classList.add('agendamento');

        const dataAgendamento = new Date(agendamento.data);
        const dataFormatada = new Date(agendamento.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

        let statusInfo = '';
        if (agendamento.status === 'cancelado') {
            div.classList.add('cancelado');
            statusInfo = `<p><strong>Status:</strong> Cancelado por ${agendamento.canceladoPor}</p>`;
        } else if (dataAgendamento < hoje) {
            div.classList.add('expirado');
            statusInfo = `<p><strong>Status:</strong> Encontro Expirado</p>`;
        } else if (agendamento.reagendadoPor) { // <-- NOVO: Verifica se foi reagendado
            statusInfo = `<p style="color: #d97706;"><strong>Status:</strong> Reagendado por ${agendamento.reagendadoPor}</p>`;
        }

        div.innerHTML = `
            <div class="agendamento-info">
                <p><strong>Responsável:</strong> ${agendamento.responsavel}</p>
                <p><strong>Data:</strong> ${dataFormatada}</p>
                <p><strong>Local:</strong> ${agendamento.local}</p>
                <p><strong>Recursos:</strong> ${agendamento.recursos.join(', ')}</p>
                ${statusInfo}
            </div>
            <div class="agendamento-acoes">
                ${agendamento.status !== 'cancelado' && !(dataAgendamento < hoje) ? `
                    <button class="btn-cancelar" onclick="cancelarAgendamento('${agendamento.id}')">Cancelar Agendamento</button>
                    <button class="btn-reagendar" onclick="abrirModalReagendamento('${agendamento.id}', '${agendamento.data}', '${agendamento.local}')">Reagendar</button>
                ` : ''}
            </div>
        `;
        listaAgendamentos.appendChild(div);
    });
});

// Função para cancelar agendamento
function cancelarAgendamento(id) {
    const responsavelCancelamento = prompt("Por favor, informe o nome do responsável pelo cancelamento:");
    if (responsavelCancelamento) {
        database.ref('agendamentos/' + id).update({
            status: 'cancelado',
            canceladoPor: responsavelCancelamento
        });
    }
}

// Função para ABRIR A MODAL de reagendamento
function abrirModalReagendamento(id, dataAtual, localAtual) {
    // Preenche os campos da modal com os dados atuais
    document.getElementById('reagendamentoId').value = id;
    document.getElementById('novaData').value = dataAtual;
    document.getElementById('novoLocal').value = localAtual;
    document.getElementById('responsavelReagendamento').value = ''; // Limpa o campo do responsável

    // Exibe a modal
    modal.style.display = "block";
}
