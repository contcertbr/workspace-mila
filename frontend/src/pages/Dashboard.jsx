import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Send, XCircle, ShieldCheck, 
  Smartphone, Mail, Info, MoreVertical, Search, CheckCheck, LayoutDashboard 
} from 'lucide-react';
import { db } from "../firebaseConfig"; // Certifique-se que o db usa getFirestore(app, "db-clientes-contcertbr")
import { 
  collection, onSnapshot, query, orderBy, where, limit, 
  addDoc, serverTimestamp, doc, getDoc, getDocs, deleteDoc 
} from "firebase/firestore";

const AVATAR_CONTCERT = "/contcertbr.jpeg"; 

const DashboardFinal = () => {
  const [conversas, setConversas] = useState([]);
  const [filaPendentes, setFilaPendentes] = useState([]);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [dadosCliente, setDadosCliente] = useState(null);
  const [mensagemInput, setMensagemInput] = useState('');
  
  // URL do seu Cloud Run
  const API_URL = "https://workspace-mila-958667073024.southamerica-east1.run.app";
  const audioICQ = useRef(new Audio('https://www.soundboard.com/handler/DownLoadTrack.ashx?cliptitle=ICQ+Uh+oh&filename=24/241351-789a6915-b6d3-491a-9694-8714658e3852.mp3'));
  const scrollRef = useRef(null);

  const getCorValidade = (dias) => {
    if (dias <= 15) return 'text-red-500 bg-red-50 border-red-200';
    if (dias <= 30) return 'text-amber-500 bg-amber-50 border-amber-200';
    return 'text-emerald-500 bg-emerald-50 border-emerald-200';
  };

  // 1. Monitorar Fila de Espera (Transbordo)
  useEffect(() => {
    const q = query(collection(db, "atendimentos_pendentes"), orderBy("timestamp", "desc"));
    return onSnapshot(q, (snap) => {
      setFilaPendentes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  // 2. Monitorar Histórico de Mensagens do Cliente Selecionado
  useEffect(() => {
    if (!clienteSelecionado) {
      setConversas([]);
      return;
    }

    // Filtra mensagens apenas deste cliente para não misturar no chat
    const q = query(
      collection(db, "conversas"), 
      where("clienteId", "==", clienteSelecionado),
      orderBy("timestamp", "asc") // Ascendente para o chat fluir para baixo
    );

    return onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setConversas(docs);

      // Alerta sonoro se a última mensagem for do cliente e for recente
      const ultimaMsg = docs[docs.length - 1];
      if (ultimaMsg?.origem === 'cliente' && (Date.now() - ultimaMsg.timestamp?.toMillis()) < 3000) {
        audioICQ.current.play().catch(() => {});
      }
    });
  }, [clienteSelecionado]);

  // 3. Buscar Detalhes do Contrato (Coleção Clientes)
  useEffect(() => {
    const buscarDados = async () => {
      if (clienteSelecionado) {
        setDadosCliente(null);
        // Primeiro pegamos o documento do atendimento para saber o CPF/CNPJ
        const pSnap = await getDoc(doc(db, "atendimentos_pendentes", clienteSelecionado));
        
        if (pSnap.exists()) {
          const cpfCnpj = pSnap.data().cpf_cnpj;
          if (cpfCnpj) {
            const q = query(collection(db, "clientes"), where("CNPJCPF", "==", cpfCnpj));
            const cSnap = await getDocs(q);
            if (!cSnap.empty) setDadosCliente(cSnap.docs[0].data());
          }
        }
      }
    };
    buscarDados();
  }, [clienteSelecionado]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [conversas]);

  // Ações: Encerrar e Enviar
  const encerrarAtendimento = async () => {
    if (!clienteSelecionado || !window.confirm("Deseja encerrar este atendimento?")) return;
    try {
      await deleteDoc(doc(db, "atendimentos_pendentes", clienteSelecionado));
      setClienteSelecionado(null);
      setDadosCliente(null);
    } catch (err) { console.error("Erro ao encerrar:", err); }
  };

  const enviarMensagem = async () => {
    if (!mensagemInput.trim() || !clienteSelecionado) return;
    const texto = mensagemInput;
    setMensagemInput('');
    
    try {
      // Grava no Firestore local (Coleção CONVERSAS)
      await addDoc(collection(db, "conversas"), {
        clienteId: clienteSelecionado,
        texto: texto,
        origem: "atendente",
        timestamp: serverTimestamp()
      });

      // Dispara o WhatsApp via Backend
      await fetch(`${API_URL}/webhook`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ 
            numero: clienteSelecionado, 
            mensagem: texto,
            origem: "dashboard" // Para o bot não responder a si mesmo
        }) 
      });
    } catch (err) { console.error("Erro ao enviar:", err); }
  };

  return (
    <div className="flex h-screen bg-[#f0f2f5] overflow-hidden font-sans">
      
      {/* SIDEBAR MINI */}
      <div className="w-16 bg-[#0f172a] flex flex-col items-center py-6 gap-8 text-slate-500">
        <img src={AVATAR_CONTCERT} className="h-10 w-10 rounded-full border border-slate-700 object-cover" alt="Logo" />
        <LayoutDashboard className="text-blue-500 cursor-pointer" size={24} />
        <MessageSquare size={24} className="hover:text-white cursor-pointer transition-colors" />
      </div>

      {/* PAINEL DE FILA */}
      <div className="w-[380px] bg-white border-r border-gray-300 flex flex-col shadow-sm">
        <header className="bg-[#f0f2f5] p-3 px-4 flex justify-between items-center border-b border-gray-300 h-[60px]">
          <h1 className="font-bold text-gray-700">Conversas</h1>
          <MoreVertical size={20} className="text-gray-500 cursor-pointer" />
        </header>
        
        <div className="p-3 bg-white border-b border-gray-100">
          <div className="bg-[#f0f2f5] flex items-center px-4 py-2 rounded-xl gap-3">
            <Search size={16} className="text-gray-400" />
            <input placeholder="Pesquisar na fila..." className="bg-transparent text-sm outline-none w-full" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 text-[11px] font-bold text-[#00a884] tracking-widest uppercase">Fila de Transbordo</div>
          {filaPendentes.length === 0 && (
            <p className="text-center text-gray-400 text-xs mt-10">Nenhum cliente aguardando.</p>
          )}
          {filaPendentes.map(p => (
            <div key={p.id} onClick={() => setClienteSelecionado(p.id)} 
                 className={`flex items-center p-4 gap-4 cursor-pointer hover:bg-[#f5f6f6] border-b border-gray-100 transition-all ${clienteSelecionado === p.id ? 'bg-[#f0f2f5] border-l-4 border-l-blue-500' : ''}`}>
              <div className="h-12 w-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center font-bold">
                {p.id.slice(-2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <h3 className="text-[14px] font-semibold text-gray-800 truncate">{p.id}</h3>
                </div>
                <p className="text-xs text-gray-500 truncate italic">Aguardando Mila...</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CHAT CENTRAL */}
      <div className="flex-1 flex flex-col bg-[#efeae2] relative">
        {clienteSelecionado ? (
          <>
            <header className="bg-[#f0f2f5] p-3 px-4 flex justify-between items-center border-b border-gray-300 h-[60px] z-10">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold uppercase shadow-sm">
                  {dadosCliente?.NOME?.charAt(0) || "C"}
                </div>
                <div>
                  <h2 className="text-[14px] font-bold text-gray-800 leading-none">{dadosCliente?.NOME || clienteSelecionado}</h2>
                  <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-tight">Atendimento Humano Ativo</span>
                </div>
              </div>
              <button onClick={encerrarAtendimento} title="Encerrar Atendimento" className="text-gray-400 hover:text-red-500 transition-all p-2">
                <XCircle size={24}/>
              </button>
            </header>

            {/* Fundo do Chat Estilo WhatsApp */}
            <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-3 flex flex-col scroll-smooth">
              {conversas.map((m, i) => (
                <div key={i} className={`max-w-[70%] p-2 px-3 rounded-lg text-[13.5px] shadow-sm relative animate-in fade-in slide-in-from-bottom-1 ${m.origem === 'cliente' ? 'bg-white self-start rounded-tl-none' : 'bg-[#d9fdd3] self-end rounded-tr-none'}`}>
                  {m.texto}
                  <div className="flex justify-end gap-1 mt-1">
                    <span className="text-[9px] text-gray-400">
                      {m.timestamp?.toMillis ? new Date(m.timestamp.toMillis()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                    </span>
                    {m.origem !== 'cliente' && <CheckCheck size={14} className="text-blue-400" />}
                  </div>
                </div>
              ))}
            </div>

            <footer className="bg-[#f0f2f5] p-3 px-4 flex items-center gap-4 border-t border-gray-200">
              <input 
                className="flex-1 bg-white rounded-xl px-5 py-2.5 text-sm outline-none shadow-sm" 
                placeholder="Escreva uma mensagem..." 
                value={mensagemInput} 
                onChange={e => setMensagemInput(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && enviarMensagem()} 
              />
              <button onClick={enviarMensagem} className="bg-[#00a884] text-white p-2 rounded-full hover:bg-[#008f6f] transition-all shadow-md">
                <Send size={20}/>
              </button>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-20 opacity-40">
            <img src={AVATAR_CONTCERT} className="w-28 h-28 rounded-full mb-6 grayscale shadow-2xl" alt="Logo" />
            <h1 className="text-xl font-bold text-gray-600 uppercase tracking-[0.2em]">Dashboard ContCert</h1>
            <p className="text-sm text-gray-500 mt-2 italic">Selecione um cliente na fila para iniciar o suporte.</p>
          </div>
        )}
      </div>

      {/* PAINEL LATERAL TÉCNICO */}
      <div className="w-[360px] bg-white border-l border-gray-300 flex flex-col shadow-lg">
        <header className="bg-[#f0f2f5] p-4 font-bold text-gray-700 border-b border-gray-300 h-[60px] flex items-center gap-2">
          <Info size={18} className="text-blue-500" /> Detalhes do Cliente
        </header>

        {dadosCliente ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div>
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 block">Status do Certificado</label>
               <div className={`p-8 rounded-[2rem] flex flex-col items-center border-2 transition-all ${getCorValidade(dadosCliente.DIAS_RESTANTES)}`}>
                  <p className="text-6xl font-black">{dadosCliente.DIAS_RESTANTES}</p>
                  <p className="text-[10px] font-black uppercase mt-2">Dias restantes</p>
                  <p className="text-xs mt-4 font-bold border-t border-current pt-2 w-full text-center">Expira em: {dadosCliente.VALIDADE}</p>
               </div>
            </div>

            <div className="bg-[#0f172a] text-white p-6 rounded-[1.5rem] shadow-xl space-y-4">
               <div>
                  <label className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Razão Social</label>
                  <p className="text-xs font-bold leading-tight uppercase">{dadosCliente.NOME}</p>
               </div>
               <div className="grid grid-cols-1 gap-4">
                 <div>
                    <label className="text-[8px] font-black text-blue-400 uppercase">Documento</label>
                    <p className="text-[13px] font-mono text-slate-300">{dadosCliente.CNPJCPF}</p>
                 </div>
                 <div>
                    <label className="text-[8px] font-black text-blue-400 uppercase">E-mail Cadastrado</label>
                    <p className="text-[11px] font-bold truncate text-slate-400">{dadosCliente.EMAIL}</p>
                 </div>
               </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-10 opacity-20 text-center">
             <ShieldCheck size={64} className="mb-4" />
             <p className="text-xs font-black uppercase tracking-widest">Aguardando seleção...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardFinal;
