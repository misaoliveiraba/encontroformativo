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
    const recursoCheckboxes = document.querySelectorAll('input[name="recurso"]');
    const nenhumCheckbox = document.getElementById('recurso-nenhum');
    
    // Seções da lista
    const agendamentosHojeDiv = document.getElementById('agendamentosHoje');
    const agendamentosProximosDiv = document.getElementById('agendamentosProximos');
    const agendamentosHistoricoDiv = document.getElementById('agendamentosHistorico');

    // Modais
    const reagendamentoModal = document.getElementById('reagendamentoModal');
    const confirmacaoModal = document.getElementById('confirmacaoModal');
    
    // Formulários das modais
    const reagendamentoForm = document.getElementById('reagendamentoForm');
    const confirmacaoForm = document.getElementById('confirmacaoForm');

    let todosAgendamentos = [];
    const SENHA_ADMIN = "seduc2019ssp@";

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
    
    // Lógica do formulário principal
    localSelect.addEventListener('change', (e) => {
        localExternoContainer.style.display = e.target.value === 'Externo' ? 'block' : 'none';
    });
    
    recursoCheckboxes.forEach(checkbox => { /* ... (lógica dos checkboxes) */ });
    form.addEventListener('submit', (e) => { /* ... (lógica de envio do formulário principal) */ });
    
    // Lógica para fechar as modais
    document.querySelectorAll('.modal .close-button').forEach(button => {
        button.onclick = () => {
            button.closest('.modal').style.display = 'none';
        }
    });
    window.onclick = (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = "none";
        }
    }

    // Lógica do formulário de CONFIRMAÇÃO (NOVO)
    confirmacaoForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const id = document.getElementById('confirmacaoAgendamentoId').value;
        const tipoAcao = document.getElementById('confirmacaoTipoAcao').value;
        const responsavelAcao = document.getElementById('responsavelAcao').value;
        const senha = document.getElementById('senhaAcao').value;

        if (senha !== SENHA_ADMIN) {
            alert("Senha incorreta!");
            return;
        }

        if (tipoAcao === 'cancelar') {
            database.ref('agendamentos/' + id).update({
                status: 'cancelado',
                canceladoPor: responsavelAcao,
                canceladoEm: new Date().toISOString()
            });
            alert("Agendamento cancelado com sucesso!");
        } else if (tipoAcao === 'reagendar') {
            // Prepara a modal de reagendamento, mas não abre ainda
            const agendamento = todosAgendamentos.find(ag => ag.id === id);
            if(agendamento) {
                document.getElementById('reagendamentoId').value = id;
                document.getElementById('novaData').value = agendamento.data;
                document.getElementById('novoLocal').value = agendamento.local;
                // O nome do responsável pelo reagendamento será o que foi digitado na confirmação
                document.getElementById('responsavelReagendamento').value = responsavelAcao;
                document.querySelectorAll('input[name="novoTurno"]').forEach(checkbox => {
                    checkbox.checked = agendamento.turnos.includes(checkbox.value);
                });
                reagendamentoModal.style.display = 'block';
            }
        }
        
        confirmacaoModal.style.display = 'none';
        confirmacaoForm.reset();
    });

    // Lógica do formulário de REAGENDAMENTO
    reagendamentoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('reagendamentoId').value;
        const novaData = document.getElementById('novaData').value;
        const responsavelReagendamento = document.getElementById('responsavelReagendamento').value;

        if (novaData < dataDeHoje) {
            alert("Não é possível reagendar para uma data retroativa.");
            return;
        }

        const novoLocal = document.getElementById('novoLocal').value;
        const novosTurnos = Array.from(document.querySelectorAll('input[name="novoTurno"]:checked')).map(cb => cb.value);

        if (novosTurnos.length === 0) {
            alert("Por favor, selecione pelo menos um turno.");
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
        
        reagendamentoModal.style.display = "none";
        alert("Agendamento reagendado com sucesso!");
    });


    // --- FUNÇÕES PRINCIPAIS ---
    function verificarDisponibilidade(data, local, turnos, idIgnorado = null) { /* ... */ }
    const renderizarAgendamento = (agendamento, classeBorda) => { /* ... */ };

    database.ref('agendamentos').on('value', (snapshot) => {
        // ... (Toda a lógica de renderização e limpeza de agendamentos permanece a mesma)
        
        // Exemplo da parte que renderiza os botões (dentro de renderizarAgendamento)
        // ... innerHTML = ` ...
        // <div class="agendamento-acoes">
        //     ${agendamento.status !== 'cancelado' && !(dataAgendamento < hojeObj) ? `
        //         <button class="btn-cancelar" onclick="solicitarConfirmacao('cancelar', '${agendamento.id}')">Cancelar</button>
        //         <button class="btn-reagendar" onclick="solicitarConfirmacao('reagendar', '${agendamento.id}')">Reagendar</button>
        //     ` : ''}
        // </div>
        // ... `
    });

    // FUNÇÕES GLOBAIS PARA SEREM CHAMADAS PELO HTML (onclick)
    window.solicitarConfirmacao = (tipo, id) => {
        document.getElementById('confirmacaoAgendamentoId').value = id;
        document.getElementById('confirmacaoTipoAcao').value = tipo;
        document.getElementById('confirmacaoTitulo').textContent = tipo === 'cancelar' ? 'Confirmar Cancelamento' : 'Confirmar Reagendamento';
        confirmacaoModal.style.display = 'block';
    }

    // O código omitido (...) é o mesmo da versão anterior para manter a resposta concisa.
    // Cole o script completo para garantir que todas as funções estejam presentes.
});
