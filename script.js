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

let todosAgendamentos = []; // Armazena uma cópia local de todos agendamentos para validação

// --- EVENT LISTENERS ---

// Mostra/Oculta o campo de local externo
localSelect.addEventListener('change', (e) => {
    localExternoContainer.style.display = e.target.value === 'Externo' ? 'block' : 'none';
});

// Envio do formulário de agendamento principal
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const responsavel = document.getElementById('responsavel').value;
    const data = document.getElementById('data').value;
    let local = localSelect.value;
    if (local === 'Externo') {
        local = document.getElementById('localExterno').value;
    }

    const turnos = Array.from(document.querySelectorAll('input[name="turno"]:checked')).map(cb => cb.value);
    const recursos = Array.from(document.querySelectorAll('input[name="recurso"]:checked')).map(cb => cb.value);

    // Validação de campos
    if (turnos.length === 0) {
        alert("Por favor, selecione pelo menos um turno.");
        return;
    }

    // Lógica de verificação de disponibilidade
    const disponivel = verificarDisponibilidade(data, local, turnos);
    if (!disponivel) {
        alert(`O local "${local}" já está ocupado em um ou mais dos turnos selecionados para esta data. Por favor, escolha outros turnos ou outro local.`);
        return;
    }
    
    const agendamento = { responsavel, data, local, turnos, recursos, status: 'ativo' };

    database.ref('agendamentos').push(agendamento)
        .then(() => {
            alert("Encontro agendado com sucesso!");
            form.reset();
            localExternoContainer.style.display = 'none';
        })
        .catch(error => {
            console.error("Erro ao agendar:", error);
            alert("Ocorreu um erro ao agendar. Tente novamente.");
        });
});

// Fecha a modal
closeModalButton.onclick = () => { modal.style.display = "none"; }
window.onclick = (event) => { if (event.target == modal) modal.style.display = "none"; }

// Processa o formulário de reagendamento
reagendamentoForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('reagendamentoId').value;
    const novaData = document.getElementById('novaData').value;
    const novoLocal = document.getElementById('novoLocal').value;
    const novosTurnos = Array.from(document.querySelectorAll('input[name="novoTurno"]:checked')).map(cb => cb.value);
    const responsavelReagendamento = document.getElementById('responsavelReagendamento').value;

    if (novosTurnos.length === 0) {
        alert("Por favor, selecione pelo menos um turno.");
        return;
    }

    // Verifica disponibilidade, ignorando o próprio agendamento que está sendo editado
    const disponivel = verificarDisponibilidade(novaData, novoLocal, novosTurnos, id);
    if (!disponivel) {
        alert(`O local "${novoLocal}" já está ocupado em um ou mais dos turnos selecionados para esta data. Por favor, escolha outros turnos ou outro local.`);
        return;
    }

    database.ref('agendamentos/' + id).update({
        data: novaData,
        local: novoLocal,
        turnos: novosTurnos,
        reagendadoPor: responsavelReagendamento,
        status: 'ativo'
    });

    modal.style.display = "none";
});

// --- FUNÇÕES PRINCIPAIS ---

/**
 * Verifica se um local está disponível em uma data e turnos específicos.
 * @param {string} data - A data no formato 'YYYY-MM-DD'.
 * @param {string} local - O nome do local.
 * @param {string[]} turnos - Array com os turnos desejados (ex: ['Manhã', 'Tarde']).
 * @param {string|null} idIgnorado - O ID do agendamento a ser ignorado na verificação (útil para reagendamentos).
 * @returns {boolean} - Retorna true se estiver disponível, false caso contrário.
 */
function verificarDisponibilidade(data, local, turnos, idIgnorado = null) {
    if (local === 'Externo') return true; // Locais externos estão sempre disponíveis

    // Filtra os agendamentos relevantes
    const conflitos = todosAgendamentos.filter(ag => {
        // Ignora o agendamento que está sendo reagendado
        if (ag.id === idIgnorado) return false;
        
        // Verifica se a data e o local são os mesmos
        return ag.data === data && ag.local === local &&
               // Verifica se há pelo menos um turno em comum (interseção)
               ag.turnos.some(turnoExistente => turnos.includes(turnoExistente));
    });

    return conflitos.length === 0; // Se não houver conflitos, está disponível
}

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
    
    todosAgendamentos = agendamentos; // Atualiza a cópia local para validação

    // Ordena os agendamentos por data
    agendamentos.sort((a, b) => new Date(a.data) - new Date(b.data));

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    agendamentos.forEach(agendamento => {
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
        } else if (agendamento.reagendadoPor) {
            statusInfo = `<p style="color: #d97706;"><strong>Status:</strong> Reagendado por ${agendamento.reagendadoPor}</p>`;
        }

        div.innerHTML = `
            <div class="agendamento-info">
                <p><strong>Responsável:</strong> ${agendamento.responsavel}</p>
                <p><strong>Data:</strong> ${dataFormatada}</p>
                <p><strong>Turno(s):</strong> ${agendamento.turnos.join(', ')}</p> <p><strong>Local:</strong> ${agendamento.local}</p>
                <p><strong>Recursos:</strong> ${agendamento.recursos ? agendamento.recursos.join(', ') : 'N/A'}</p>
                ${statusInfo}
            </div>
            <div class="agendamento-acoes">
                ${agendamento.status !== 'cancelado' && !(dataAgendamento < hoje) ? `
                    <button class="btn-cancelar" onclick="cancelarAgendamento('${agendamento.id}')">Cancelar</button>
                    <button class="btn-reagendar" onclick="abrirModalReagendamento('${agendamento.id}')">Reagendar</button>
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
function abrirModalReagendamento(id) {
    const agendamento = todosAgendamentos.find(ag => ag.id === id);
    if (!agendamento) return;

    // Preenche os campos da modal com os dados atuais
    document.getElementById('reagendamentoId').value = id;
    document.getElementById('novaData').value = agendamento.data;
    document.getElementById('novoLocal').value = agendamento.local;
    document.getElementById('responsavelReagendamento').value = '';

    // Marca os checkboxes dos turnos atuais
    document.querySelectorAll('input[name="novoTurno"]').forEach(checkbox => {
        checkbox.checked = agendamento.turnos.includes(checkbox.value);
    });

    modal.style.display = "block";
}
