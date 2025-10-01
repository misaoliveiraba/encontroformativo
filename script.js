document.addEventListener('DOMContentLoaded', () => {

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

    let todosAgendamentos = [];

    // --- CONFIGURAÇÃO INICIAL ---
    const getHojeFormatado = () => {
        const hoje = new Date();
        const offset = hoje.getTimezoneOffset();
        const hojeLocal = new Date(hoje.getTime() - (offset * 60 * 1000));
        return hojeLocal.toISOString().split('T')[0];
    };

    const dataDeHoje = getHojeFormatado();

    document.getElementById('data').min = dataDeHoje;
    document.getElementById('novaData').min = dataDeHoje;

    // --- EVENT LISTENERS ---
    localSelect.addEventListener('change', (e) => {
        localExternoContainer.style.display = e.target.value === 'Externo' ? 'block' : 'none';
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const responsavel = document.getElementById('responsavel').value;
        const setor = document.getElementById('setor').value;
        const data = document.getElementById('data').value;

        if (data < dataDeHoje) {
            alert("Não é possível agendar encontros com data retroativa.");
            return;
        }

        let local = localSelect.value;
        if (local === 'Externo') {
            local = document.getElementById('localExterno').value;
        }

        const turnos = Array.from(document.querySelectorAll('input[name="turno"]:checked')).map(cb => cb.value);
        const recursos = Array.from(document.querySelectorAll('input[name="recurso"]:checked')).map(cb => cb.value);

        if (!responsavel || !setor || !data || !local || turnos.length === 0) {
            alert("Por favor, preencha todos os campos obrigatórios.");
            return;
        }

        const disponivel = verificarDisponibilidade(data, local, turnos);
        if (!disponivel) {
            alert(`O local "${local}" já está ocupado nos turnos selecionados para esta data.`);
            return;
        }

        const agendamento = { responsavel, setor, data, local, turnos, recursos, status: 'ativo' };

        database.ref('agendamentos').push(agendamento)
            .then(() => {
                alert("Encontro agendado com sucesso!");
                form.reset();
                document.getElementById('data').min = dataDeHoje;
                localExternoContainer.style.display = 'none';
            })
            .catch(error => console.error("Erro ao agendar:", error));
    });

    closeModalButton.onclick = () => { modal.style.display = "none"; }
    window.onclick = (event) => { if (event.target == modal) modal.style.display = "none"; }

    reagendamentoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('reagendamentoId').value;
        const novaData = document.getElementById('novaData').value;

        if (novaData < dataDeHoje) {
            alert("Não é possível reagendar encontros com data retroativa.");
            return;
        }

        const novoLocal = document.getElementById('novoLocal').value;
        const novosTurnos = Array.from(document.querySelectorAll('input[name="novoTurno"]:checked')).map(cb => cb.value);
        const responsavelReagendamento = document.getElementById('responsavelReagendamento').value;

        if (novosTurnos.length === 0 || !responsavelReagendamento) {
            alert("Por favor, preencha todos os campos para reagendar.");
            return;
        }

        const disponivel = verificarDisponibilidade(novaData, novoLocal, novosTurnos, id);
        if (!disponivel) {
            alert(`O local "${novoLocal}" já está ocupado nos turnos selecionados para esta data.`);
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
    function verificarDisponibilidade(data, local, turnos, idIgnorado = null) {
        if (local === 'Externo') return true;

        const conflitos = todosAgendamentos.filter(ag => {
            if (ag.id === idIgnorado || ag.status === 'cancelado') return false;

            return ag.data === data && ag.local === local &&
                ag.turnos.some(turnoExistente => turnos.includes(turnoExistente));
        });

        return conflitos.length === 0;
    }

    database.ref('agendamentos').on('value', (snapshot) => {
        listaAgendamentos.innerHTML = '';
        const agendamentos = [];
        snapshot.forEach((childSnapshot) => {
            agendamentos.push({
                id: childSnapshot.key,
                ...childSnapshot.val()
            });
        });

        todosAgendamentos = agendamentos;

        agendamentos.sort((a, b) => new Date(a.data) - new Date(b.data));

        const hojeObj = new Date(dataDeHoje + 'T00:00:00');

        agendamentos.forEach(agendamento => {
            const div = document.createElement('div');
            div.classList.add('agendamento');

            const dataAgendamento = new Date(agendamento.data + 'T00:00:00');
            const dataFormatada = new Date(agendamento.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

            let statusInfo = '';
            if (agendamento.status === 'cancelado') {
                div.classList.add('cancelado');
                statusInfo = `<p><strong>Status:</strong> Cancelado por ${agendamento.canceladoPor}</p>`;
            } else if (dataAgendamento < hojeObj) {
                div.classList.add('expirado');
                statusInfo = `<p><strong>Status:</strong> Encontro Expirado</p>`;
            } else if (agendamento.reagendadoPor) {
                statusInfo = `<p style="color: #d97706;"><strong>Status:</strong> Reagendado por ${agendamento.reagendadoPor}</p>`;
            }

            div.innerHTML = `
                <div class="agendamento-info">
                    <p><strong>Responsável pelo Agendamento:</strong> ${agendamento.responsavel}</p>
                    <p><strong>Setor / Secretaria solicitante:</strong> ${agendamento.setor || 'Não informado'}</p>
                    <p><strong>Data:</strong> ${dataFormatada}</p>
                    <p><strong>Turno(s):</strong> ${agendamento.turnos.join(', ')}</p>
                    <p><strong>Local:</strong> ${agendamento.local}</p>
                    <p><strong>Recursos:</strong> ${agendamento.recursos && agendamento.recursos.length > 0 ? agendamento.recursos.join(', ') : 'Nenhum'}</p>
                    ${statusInfo}
                </div>
                <div class="agendamento-acoes">
                    ${agendamento.status !== 'cancelado' && !(dataAgendamento < hojeObj) ? `
                        <button class="btn-cancelar" onclick="cancelarAgendamento('${agendamento.id}')">Cancelar</button>
                        <button class="btn-reagendar" onclick="abrirModalReagendamento('${agendamento.id}')">Reagendar</button>
                    ` : ''}
                </div>
            `;
            listaAgendamentos.appendChild(div);
        });
    });

    // As funções globais precisam ser anexadas ao objeto window
    // quando o script está dentro do DOMContentLoaded
    window.cancelarAgendamento = function(id) {
        const responsavelCancelamento = prompt("Por favor, informe o nome do responsável pelo cancelamento:");
        if (responsavelCancelamento) {
            database.ref('agendamentos/' + id).update({
                status: 'cancelado',
                canceladoPor: responsavelCancelamento
            });
        }
    }

    window.abrirModalReagendamento = function(id) {
        const agendamento = todosAgendamentos.find(ag => ag.id === id);
        if (!agendamento) return;

        document.getElementById('reagendamentoId').value = id;
        document.getElementById('novaData').value = agendamento.data;
        document.getElementById('novoLocal').value = agendamento.local;
        document.getElementById('responsavelReagendamento').value = '';

        document.querySelectorAll('input[name="novoTurno"]').forEach(checkbox => {
            checkbox.checked = agendamento.turnos.includes(checkbox.value);
        });

        modal.style.display = "block";
    }

});

