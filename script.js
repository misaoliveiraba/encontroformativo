// Suas credenciais do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAYQfcsrfabqpZ8AuXeBL2PiR_uDkAHcpY",
  authDomain: "encontroformativo-3ac69.firebaseapp.com",
  // Adicionei a databaseURL, que é necessária para o Realtime Database
  databaseURL: "https://encontroformativo-3ac69-default-rtdb.firebaseio.com",
  projectId: "encontroformativo-3ac69",
  storageBucket: "encontroformativo-3ac69.appspot.com", // corrigido para o formato padrão
  messagingSenderId: "381346392383",
  appId: "1:381346392383:web:ffc768a01f7834a09fcb8a",
  measurementId: "G-CS3TWF65QB"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// O restante do código permanece o mesmo
const form = document.getElementById('agendamentoForm');
const localSelect = document.getElementById('local');
const localExternoContainer = document.getElementById('localExternoContainer');
const listaAgendamentos = document.getElementById('listaAgendamentos');

// Mostra/Oculta o campo de local externo
localSelect.addEventListener('change', (e) => {
    localExternoContainer.style.display = e.target.value === 'Externo' ? 'block' : 'none';
});

// Envio do formulário
form.addEventListener('submit', (e) => {
    e.preventDefault();

    const responsavel = document.getElementById('responsavel').value;
    const data = document.getElementById('data').value;
    let local = localSelect.value;
    if (local === 'Externo') {
        local = document.getElementById('localExterno').value;
    }

    const recursos = [];
    document.querySelectorAll('.checkbox-group input[type="checkbox"]:checked').forEach((checkbox) => {
        recursos.push(checkbox.value);
    });

    if (!responsavel || !data || !local || recursos.length === 0) {
        alert("Por favor, preencha todos os campos obrigatórios.");
        return;
    }

    const agendamento = {
        responsavel,
        data,
        local,
        recursos,
        status: 'ativo'
    };

    database.ref('agendamentos').push(agendamento);
    form.reset();
    localExternoContainer.style.display = 'none';
});

// Carrega e exibe os agendamentos
database.ref('agendamentos').on('value', (snapshot) => {
    listaAgendamentos.innerHTML = '';
    const agendamentos = [];
    snapshot.forEach((childSnapshot) => {
        agendamentos.push({
            id: childSnapshot.key,
            ...childSnapshot.val()
        });
    });

    // Ordena os agendamentos
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

        let statusInfo = '';
        if (agendamento.status === 'cancelado') {
            div.classList.add('cancelado');
            statusInfo = `<p><strong>Status:</strong> Cancelado por ${agendamento.canceladoPor}</p>`;
        } else if (dataAgendamento < hoje) {
            div.classList.add('expirado');
            statusInfo = `<p><strong>Status:</strong> Encontro Expirado</p>`;
        }

        div.innerHTML = `
            <div class="agendamento-info">
                <p><strong>Responsável:</strong> ${agendamento.responsavel}</p>
                <p><strong>Data:</strong> ${new Date(agendamento.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>
                <p><strong>Local:</strong> ${agendamento.local}</p>
                <p><strong>Recursos:</strong> ${agendamento.recursos.join(', ')}</p>
                ${statusInfo}
            </div>
            <div class="agendamento-acoes">
                ${agendamento.status !== 'cancelado' && !(dataAgendamento < hoje) ? `
                    <button class="btn-cancelar" onclick="cancelarAgendamento('${agendamento.id}')">Cancelar Agendamento</button>
                    <button class="btn-reagendar" onclick="reagendarAgendamento('${agendamento.id}', '${agendamento.data}', '${agendamento.local}')">Reagendar</button>
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

// Função para reagendar
function reagendarAgendamento(id, dataAtual, localAtual) {
    const responsavelReagendamento = prompt("Por favor, informe o nome do responsável pelo reagendamento:");
    if (responsavelReagendamento) {
        const novaData = prompt("Informe a nova data (AAAA-MM-DD):", dataAtual);
        const novoLocal = prompt("Informe o novo local:", localAtual);
        if (novaData && novoLocal) {
            database.ref('agendamentos/' + id).update({
                data: novaData,
                local: novoLocal,
                reagendadoPor: responsavelReagendamento
            });
        }
    }
}