import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Send, XCircle, ShieldCheck, 
  Smartphone, Mail, Info, MoreVertical, Search, CheckCheck, LayoutDashboard 
} from 'lucide-react';
import { db } from "../firebaseConfig";
import { 
  collection, onSnapshot, query, orderBy, where, limit, 
  addDoc, serverTimestamp, doc, getDoc, getDocs, deleteDoc 
} from "firebase/firestore";

// Certifique-se de que a imagem está em /public/contcertbr.jpeg
const AVATAR_CONTCERT = "/contcertbr.jpeg"; 

const DashboardFinal = () => {
  const [conversas, setConversas] = useState([]);
  const [filaPendentes, setFilaPendentes] = useState([]);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [dadosCliente, setDadosCliente] = useState(null);
  const [mensagemInput, setMensagemInput] = useState('');
  
  const API_URL = "https://workspace-mila-958667073024.southamerica-east1.run.app";
  const audioICQ = useRef(new Audio('https://www.soundboard.com/handler/DownLoadTrack.ashx?cliptitle=ICQ+Uh+oh&filename=24/241351-789a6915-b6d3-491a-9694-8714658e3852.mp3'));
  const scrollRef = useRef(null);

  // Cores dinâmicas para a validade
  const getCorValidade = (dias) => {
    if (dias <= 15) return 'text-red-500 bg-red-50 border-red-200';
    if (dias <= 30) return 'text-amber-500 bg-amber-50 border-amber-200';
    return 'text-emerald-500 bg-emerald-50 border-emerald-200';
  };

  // 1. Monitorar Fila de Espera
  useEffect(() => {
    const q = query(collection(db, "atendimentos_pendentes"), orderBy("timestamp", "desc"));
    return onSnapshot(q, (snap) => {
      setFilaPendentes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  // 2. Monitorar Mensagens + Alerta Sonoro
  useEffect(() => {
    const q = query(collection(db, "conversas"), orderBy("timestamp", "desc"), limit(100));
    return onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setConversas(docs);
      if (docs[0]?.origem === 'cliente' && (Date.now() - docs[0].timestamp?.toMillis()) < 3000) {
        audioICQ.current.play().catch(() => {});
      }
    });
  }, []);

  // 3. Buscar Dados Técnicos (CNPJCPF) ao selecionar cliente
  useEffect(() => {
    const buscarDados = async () => {
      if (clienteSelecionado) {
        setDadosCliente(null);
        const pSnap = await getDoc(doc(db, "atendimentos_pendentes", clienteSelecionado));
        if (pSnap.exists()) {
          const cpfCnpj = pSnap.data().cpf_cnpj;
          const q = query(collection(db, "clientes"), where("CNPJCPF", "==", cpfCnpj));
          const cSnap = await getDocs(q);
          if (!cSnap.empty) setDadosCliente(cSnap.docs[0].data());
        }
      }
    };
    buscarDados();
  }, [clienteSelecionado]);

  // 4. Auto-scroll do Chat
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [conversas, clienteSelecionado]);

  // Ações
  const encerrarAtendimento = async () => {
    if (!clienteSelecionado) return;
    await deleteDoc(doc(db, "atendimentos_pendentes", clienteSelecionado));
    setClienteSelecionado(null);
    setDadosCliente(null);
  };

  const enviarMensagem = async () => {
    if (!mensagemInput.trim()) return;
    const texto = mensagemInput;
    setMensagemInput('');
    
    await addDoc(collection(db, "conversas"), {
      clienteId: clienteSelecionado, texto, origem: "atendente", timestamp: serverTimestamp()
    });

    await fetch(`${API_URL}/api/enviar-whatsapp`, { 
      method: "POST", headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ numero: clienteSelecionado, mensagem: texto }) 
    });
  };

  return (
    <div className="flex h-screen bg-[#f0f2f5] overflow-hidden font-sans">
      
      {/* SIDEBAR MINI (DARK) */}
      <div className="w-16 bg-[#0f172a] flex flex-col items-center py-6 gap-8 text-slate-500">
        <img src={AVATAR_CONTCERT} className="h-10 w-10 rounded-full border border-slate-700" alt="Logo" />
        <LayoutDashboard className="text-blue-500" size={24} />
        <MessageSquare size={24} />
      </div>

      {/* PAINEL DE CONVERSAS */}
      <div className="w-[380px] bg-white border-r border-gray-300 flex flex-col">
        <header className="bg-[#f0f2f5] p-3 px-4 flex justify-between items-center border-b border-gray-300 h-[60px]">
          <h1 className="font-bold text-gray-700">Conversas</h1>
          <MoreVertical size={20} className="text-gray-500" />
        </header>
        
        <div className="p-3 bg-white border-b border-gray-100">
          <div className="bg-[#f0f2f5] flex items-center px-4 py-2 rounded-xl gap-3">
            <Search size={16} className="text-gray-400" />
            <input placeholder="Pesquisar fila..." className="bg-transparent text-sm outline-none w-full" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 text-[11px] font-bold text-[#00a884] tracking-widest uppercase">Fila de Transbordo</div>
          {filaPendentes.map(p => (
            <div key={p.id} onClick={() => setClienteSelecionado(p.id)} 
                 className={`flex items-center p-4 gap-4 cursor-pointer hover:bg-[#f5f6f6] border-b border-gray-100 transition-all ${clienteSelecionado === p.id ? 'bg-[#f0f2f5]' : ''}`}>
              <div className="h-12 w-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center font-bold">#</div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <h3 className="text-[14px] font-semibold text-gray-800 truncate">{p.id}</h3>
                  <span className="text-[10px] text-gray-400">Novo</span>
                </div>
                <p className="text-xs text-gray-500 truncate italic">Aguardando atendimento humano...</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CHAT CENTRAL */}
      <div className="flex-1 flex flex-col bg-[#efeae2] border-r border-gray-300">
        {clienteSelecionado ? (
          <>
            <header className="bg-[#f0f2f5] p-3 px-4 flex justify-between items-center border-b border-gray-300 h-[60px]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold uppercase">
                  {dadosCliente?.NOME?.charAt(0) || "C"}
                </div>
                <div>
                  <h2 className="text-[14px] font-bold text-gray-800 leading-none">{dadosCliente?.NOME || clienteSelecionado}</h2>
                  <span className="text-[10px] text-emerald-600 font-bold uppercase">Online para suporte</span>
                </div>
              </div>
              <button onClick={encerrarAtendimento} className="text-gray-400 hover:text-red-500 transition-all">
                <XCircle size={24}/>
              </button>
            </header>

            <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-3 flex flex-col">
              {conversas.filter(c => c.clienteId === clienteSelecionado).slice().reverse().map((m, i) => (
                <div key={i} className={`max-w-[75%] p-2 px-3 rounded-lg text-[13.5px] shadow-sm relative ${m.origem === 'cliente' ? 'bg-white self-start rounded-tl-none' : 'bg-[#d9fdd3] self-end rounded-tr-none'}`}>
                  {m.texto}
                  <div className="flex justify-end gap-1 mt-1">
                    {m.origem !== 'cliente' && <CheckCheck size={14} className="text-blue-400" />}
                  </div>
                </div>
              ))}
            </div>

            <footer className="bg-[#f0f2f5] p-3 px-4 flex items-center gap-4 border-t border-gray-200">
              <input className="flex-1 bg-white rounded-xl px-5 py-2.5 text-sm outline-none shadow-sm" placeholder="Escreva uma mensagem..." value={mensagemInput} onChange={e => setMensagemInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && enviarMensagem()} />
              <button onClick={enviarMensagem} className="text-gray-500 hover:text-[#00a884] transition-colors"><Send size={24}/></button>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-20 opacity-40">
            <img src={AVATAR_CONTCERT} className="w-28 h-28 rounded-full mb-6 grayscale" alt="Logo" />
            <h1 className="text-xl font-bold text-gray-600 uppercase tracking-[0.2em]">Dashboard ContCert</h1>
            <p className="text-sm text-gray-500 mt-2">Mantenha o seu WhatsApp Web aberto para<br/>gerir os atendimentos da Mila.</p>
          </div>
        )}
      </div>

      {/* PAINEL TÉCNICO (DETALHES) */}
      <div className="w-[360px] bg-white flex flex-col">
        <header className="bg-[#f0f2f5] p-4 font-bold text-gray-700 border-b border-gray-300 h-[60px] flex items-center">
          Detalhes do Contrato
        </header>

        {dadosCliente ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div>
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 block">Alerta de Validade</label>
               <div className={`p-8 rounded-[2.5rem] flex flex-col items-center border-2 transition-all ${getCorValidade(dadosCliente.DIAS_RESTANTES)}`}>
                  <p className="text-6xl font-black">{dadosCliente.DIAS_RESTANTES}</p>
                  <p className="text-[10px] font-black uppercase mt-2">Dias restantes</p>
                  <p className="text-xs mt-4 font-bold border-t border-current pt-2">Expira em: {dadosCliente.VALIDADE}</p>
               </div>
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Notificações Mila</label>
               <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <Smartphone size={18} className="text-blue-500" />
                    <span className="text-sm font-bold text-gray-700">WhatsApp</span>
                  </div>
                  <span className={`text-[9px] font-black px-3 py-1 rounded-full ${dadosCliente.STATUS_ENVIO_WHATSAPP === 'ENVIADO' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                    {dadosCliente.STATUS_ENVIO_WHATSAPP}
                  </span>
               </div>
               <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <Mail size={18} className="text-blue-500" />
                    <span className="text-sm font-bold text-gray-700">E-mail</span>
                  </div>
                  <span className={`text-[9px] font-black px-3 py-1 rounded-full ${dadosCliente.STATUS_ENVIO_EMAIL === 'ENVIADO' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                    {dadosCliente.STATUS_ENVIO_EMAIL}
                  </span>
               </div>
            </div>

            <div className="bg-[#0f172a] text-white p-6 rounded-[2rem] shadow-xl">
               <div className="mb-4">
                  <label className="text-[8px] font-black text-blue-400 uppercase tracking-[0.1em]">Razão Social</label>
                  <p className="text-xs font-bold leading-tight">{dadosCliente.NOME}</p>
               </div>
               <div className="grid grid-cols-1 gap-4">
                 <div>
                    <label className="text-[8px] font-black text-blue-400 uppercase">Documento</label>
                    <p className="text-[13px] font-mono">{dadosCliente.CNPJCPF}</p>
                 </div>
                 <div>
                    <label className="text-[8px] font-black text-blue-400 uppercase">E-mail de Contato</label>
                    <p className="text-[11px] font-bold truncate text-slate-300">{dadosCliente.EMAIL}</p>
                 </div>
               </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-10 opacity-20 text-center">
             <ShieldCheck size={64} className="mb-4" />
             <p className="text-xs font-black uppercase tracking-widest">Aguardando dados técnico...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardFinal;