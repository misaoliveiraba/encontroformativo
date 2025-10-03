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
    
    const agendamentosHojeDiv = document.getElementById('agendamentosHoje');
    const agendamentosProximosDiv = document.getElementById('agendamentosProximos');
    const agendamentosHistoricoDiv = document.getElementById('agendamentosHistorico');

    const reagendamentoModal = document.getElementById('reagendamentoModal');
    const confirmacaoModal = document.getElementById('confirmacaoModal');
    
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
    
    const getFimDoProximoMesFormatado = () => {
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = hoje.getMonth(); // 0-11
        // O último dia do próximo mês é o dia 0 do mês seguinte a ele (mês + 2)
        const ultimoDiaProximoMes = new Date(ano, mes + 2, 0);
        const offset = ultimoDiaProximoMes.getTimezoneOffset();
        const dataLocal = new Date(ultimoDiaProximoMes.getTime() - (offset * 60 * 1000));
        return dataLocal.toISOString().split('T')[0];
    };

    const dataDeHoje = getHojeFormatado();
    const dataMaxima = getFimDoProximoMesFormatado();

    // Define a data mínima e máxima nos campos de data
    document.getElementById('data').min = dataDeHoje;
    document.getElementById('data').max = dataMaxima;
    document.getElementById('novaData').min = dataDeHoje;
    document.getElementById('novaData').max = dataMaxima;

    // --- EVENT LISTENERS ---
    
    localSelect.addEventListener('change', (e) => {
        localExternoContainer.style.display = e.target.value === 'Externo' ? 'block' : 'none';
    });
    
    recursoCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            if (checkbox === nenhumCheckbox && checkbox.checked) {
                recursoCheckboxes.forEach(cb => {
                    if (cb !== nenhumCheckbox) {
                        cb.checked = false;
                        cb.disabled = true;
                    }
                });
            } else if (checkbox === nenhumCheckbox && !checkbox.checked) {
                recursoCheckboxes.forEach(cb => {
                    if (cb !== nenhumCheckbox) {
                        cb.disabled = false;
                    }
                });
            } else if (checkbox !== nenhumCheckbox && checkbox.checked) {
                nenhumCheckbox.checked = false;
                nenhumCheckbox.disabled = true;
            }
            const algumOutroMarcado = Array.from(recursoCheckboxes).some(cb => cb !== nenhumCheckbox && cb.checked);
            if (!algumOutroMarcado) {
                nenhumCheckbox.disabled = false;
            }
        });
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

        if (data > dataMaxima) {
            alert("Só é possível agendar para o mês atual ou o mês seguinte.");
            return;
        }

        let local = localSelect.value;
        if (local === 'Externo') {
            local = document.getElementById('localExterno').value;
        }

        const turnos = Array.from(document.querySelectorAll('input[name="turno"]:checked')).map(cb => cb.value);
        const recursos = Array.from(document.querySelectorAll('input[name="recurso"]:checked')).map(cb => cb.value);

        if (!responsavel || !setor || !data || !local || turnos.length === 0 || recursos.length === 0) {
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
                document.getElementById('data').max = dataMaxima;
                localExternoContainer.style.display = 'none';
                recursoCheckboxes.forEach(cb => cb.disabled = false);
            })
            .catch(error => console.error("Erro ao agendar:", error));
    });

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
            const agendamento = todosAgendamentos.find(ag => ag.id === id);
            if(agendamento) {
                document.getElementById('reagendamentoId').value = id;
                document.getElementById('novaData').value = agendamento.data;
                document.getElementById('novoLocal').value = agendamento.local;
                document.getElementById('responsavelReagendamento').value = responsavelAcao;
                document.querySelectorAll('input[name="novoTurno"]').forEach(checkbox => {
                    checkbox.checked = (agendamento.turnos && agendamento.turnos.includes(checkbox.value));
                });
                reagendamentoModal.style.display = 'block';
            }
        }
        
        confirmacaoModal.style.display = 'none';
        confirmacaoForm.reset();
    });

    reagendamentoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('reagendamentoId').value;
        const novaData = document.getElementById('novaData').value;
        const responsavelReagendamento = document.getElementById('responsavelReagendamento').value;

        if (novaData < dataDeHoje) {
            alert("Não é possível reagendar para uma data retroativa.");
            return;
        }

        if (novaData > dataMaxima) {
            alert("Só é possível reagendar para o mês atual ou o mês seguinte.");
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

    // --- FUNÇÕES ---
    function verificarDisponibilidade(data, local, turnos, idIgnorado = null) {
        if (local === 'Externo') return true;
        const conflitos = todosAgendamentos.filter(ag => {
            if (ag.id === idIgnorado || ag.status === 'cancelado') return false;
            return ag.data === data && ag.local === local &&
                (ag.turnos && ag.turnos.some(turnoExistente => turnos.includes(turnoExistente)));
        });
        return conflitos.length === 0;
    }

    const renderizarAgendamento = (agendamento) => {
        const div = document.createElement('div');
        div.classList.add('agendamento');

        const hojeObj = new Date(dataDeHoje + 'T00:00:00');
        const dataAgendamento = new Date(agendamento.data + 'T00:00:00');
        const dataFormatada = new Date(agendamento.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

        // **INÍCIO DA CORREÇÃO** - Verificações de segurança
        const turnosTexto = (agendamento.turnos && Array.isArray(agendamento.turnos)) ? agendamento.turnos.join(', ') : 'Não informado';
        const recursosTexto = (agendamento.recursos && Array.isArray(agendamento.recursos) && agendamento.recursos.length > 0) ? agendamento.recursos.join(', ') : 'Nenhum';
        // **FIM DA CORREÇÃO**

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
                <p><strong>Responsável pelo Agendamento:</strong> ${agendamento.responsavel || 'Não informado'}</p>
                <p><strong>Setor / Secretaria solicitante:</strong> ${agendamento.setor || 'Não informado'}</p>
                <p><strong>Data:</strong> ${dataFormatada}</p>
                <p><strong>Turno(s):</strong> ${turnosTexto}</p>
                <p><strong>Local:</strong> ${agendamento.local || 'Não informado'}</p>
                <p><strong>Recursos:</strong> ${recursosTexto}</p>
                ${statusInfo}
            </div>
            <div class="agendamento-acoes">
                ${agendamento.status !== 'cancelado' && !(dataAgendamento < hojeObj) ? `
                    <button class="btn-cancelar" onclick="solicitarConfirmacao('cancelar', '${agendamento.id}')">Cancelar</button>
                    <button class="btn-reagendar" onclick="solicitarConfirmacao('reagendar', '${agendamento.id}')">Reagendar</button>
                ` : ''}
            </div>
        `;
        return div;
    };

    database.ref('agendamentos').on('value', (snapshot) => {
        agendamentosHojeDiv.innerHTML = '';
        agendamentosProximosDiv.innerHTML = '';
        agendamentosHistoricoDiv.innerHTML = '';
        
        const agendamentos = [];
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                agendamentos.push({
                    id: childSnapshot.key, ...childSnapshot.val()
                });
            });
        }

        todosAgendamentos = agendamentos;
        
        const cincoDiasAtras = new Date();
        cincoDiasAtras.setDate(cincoDiasAtras.getDate() - 5);

        agendamentos.forEach(agendamento => {
            const dataAgendamento = new Date(agendamento.data + 'T00:00:00');
            const dataCancelamento = agendamento.canceladoEm ? new Date(agendamento.canceladoEm) : null;
            const isExpiradoAntigo = dataAgendamento < cincoDiasAtras;
            const isCanceladoAntigo = dataCancelamento && dataCancelamento < cincoDiasAtras;

            if (isExpiradoAntigo || isCanceladoAntigo) {
                database.ref('agendamentos/' + agendamento.id).remove();
            }
        });

        agendamentos.sort((a, b) => new Date(a.data) - new Date(b.data));

        agendamentos.forEach(agendamento => {
            const elemento = renderizarAgendamento(agendamento);
            const dataAgendamento = agendamento.data;

            if (agendamento.status === 'cancelado' || new Date(dataAgendamento + 'T00:00:00') < new Date(dataDeHoje + 'T00:00:00')) {
                agendamentosHistoricoDiv.appendChild(elemento);
            } else if (dataAgendamento === dataDeHoje) {
                elemento.classList.add('agendamento-hoje', 'piscar');
                agendamentosHojeDiv.appendChild(elemento);
            } else {
                elemento.classList.add('agendamento-proximo');
                agendamentosProximosDiv.appendChild(elemento);
            }
        });

        setTimeout(() => {
            document.querySelectorAll('.piscar').forEach(el => {
                el.classList.remove('piscar');
            });
        }, 7000);
    });

    window.solicitarConfirmacao = (tipo, id) => {
        document.getElementById('confirmacaoAgendamentoId').value = id;
        document.getElementById('confirmacaoTipoAcao').value = tipo;
        document.getElementById('confirmacaoTitulo').textContent = tipo === 'cancelar' ? 'Confirmar Cancelamento' : 'Confirmar Reagendamento';
        confirmacaoForm.reset();
        confirmacaoModal.style.display = 'block';
    }
});

