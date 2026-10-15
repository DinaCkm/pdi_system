// Documento do relatório gerencial do empregado (tela e impressão em PDF).
// Recebe o relatório já montado no servidor (shared/relatorioEmpregadoRegras.ts):
// história em capítulos, linha do tempo e anexo. Só conceitos, nunca notas.

type Bloco =
  | { tipo: "paragrafo"; destaque?: string; texto: string }
  | { tipo: "lista"; titulo?: string; itens: Array<{ destaque?: string; texto: string }> };
type Evento = { chave: string; rotulo: string; inicio: string; fim: string; tipo: "AVALIACAO" | "PDI" | "MARCO" | "HOJE"; detalhe: string };
export type RelatorioEmpregado = {
  titulo: string;
  posicaoEm: string;
  identificacao: Array<[string, string]>;
  resumo: string[];
  linhaDoTempo: Evento[];
  capitulos: Array<{ titulo: string; blocos: Bloco[] }>;
  anexo: Array<{ titulo: string; descricao?: string; colunas: string[]; linhas: string[][] }>;
};

export const COR = {
  navy: "#0f2a4a",
  texto: "#1b2b40",
  secundario: "#5b6b80",
  linha: "#e3e8ef",
  fundoSuave: "#f4f7fb",
  laranja: "#e0532f",
  mostarda: "#f0a43a",
  azul: "#2f6fd6",
};

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const mes = (d: string) => `${MESES[Number(d.slice(5, 7)) - 1]}/${d.slice(2, 4)}`;
const dataBr = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

function LinhaDoTempo({ eventos }: { eventos: Evento[] }) {
  if (!eventos.length) return null;
  const t = (d: string) => Date.parse(d) / 864e5;
  const ini = Math.min(...eventos.map((e) => t(e.inicio)));
  const fim = Math.max(...eventos.map((e) => t(e.fim)));
  const primeiro = new Date(ini * 864e5);
  const inicioEixo = Date.UTC(primeiro.getUTCFullYear(), primeiro.getUTCMonth(), 1) / 864e5;
  const fimEixo = fim + 40;
  const X0 = 250;
  const X1 = 700;
  const X = (d: string) => X0 + ((t(d) - inicioEixo) / (fimEixo - inicioEixo)) * (X1 - X0);
  const ticks: string[] = [];
  for (let m = 0; m < 60; m += 3) {
    const d = new Date(Date.UTC(primeiro.getUTCFullYear(), primeiro.getUTCMonth() + m, 1));
    if (d.getTime() / 864e5 > fimEixo) break;
    ticks.push(d.toISOString().slice(0, 10));
  }
  const altura = 96 + eventos.length * 32;
  return (
    <svg viewBox={`0 0 760 ${altura}`} role="img" aria-label="Linha do tempo das avaliações e dos ciclos de PDI" style={{ width: "100%", height: "auto" }}>
      {ticks.map((d) => (
        <g key={d}>
          <line x1={X(d)} x2={X(d)} y1={52} y2={altura - 12} stroke={COR.linha} />
          <text x={X(d)} y={42} textAnchor="middle" fontSize={11.5} fill={COR.secundario}>
            {mes(d)}
          </text>
        </g>
      ))}
      <line x1={X0} x2={X1} y1={52} y2={52} stroke="#b9c3d0" strokeWidth={1.25} />
      {eventos.map((e, i) => {
        const y = 76 + i * 32;
        const um = e.inicio === e.fim || mes(e.inicio) === mes(e.fim) && e.tipo !== "PDI";
        const hoje = e.tipo === "HOJE";
        const cor = hoje ? COR.azul : e.tipo === "PDI" ? COR.laranja : "#b9b6a8";
        const rotulo = e.detalhe || (um ? mes(e.inicio) : `${mes(e.inicio)} a ${mes(e.fim)}`);
        return (
          <g key={e.chave}>
            <line x1={X0} x2={X(e.inicio)} y1={y} y2={y} stroke={COR.linha} />
            <text x={20} y={y + 4} fontSize={13} fontWeight={e.tipo === "PDI" || hoje ? 600 : 400} fill={COR.texto}>
              {e.rotulo}
            </text>
            {um ? (
              <path d={`M${X(e.inicio)} ${y - 8}l8 8l-8 8l-8 -8z`} fill={cor} />
            ) : (
              <rect x={X(e.inicio)} y={y - 7} width={Math.max(8, X(e.fim) - X(e.inicio))} height={14} rx={7} fill={cor} fillOpacity={0.25} stroke={cor} />
            )}
            <text
              x={hoje ? X(e.inicio) - 14 : X(e.fim) + 14}
              y={y + 4}
              textAnchor={hoje ? "end" : "start"}
              fontSize={11.5}
              fontWeight={hoje ? 600 : 400}
              fill={hoje ? COR.texto : COR.secundario}
            >
              {rotulo}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Destaque({ texto }: { texto?: string }) {
  if (!texto) return null;
  return <strong style={{ color: COR.navy }}>{texto} </strong>;
}

function Blocos({ blocos }: { blocos: Bloco[] }) {
  return (
    <>
      {blocos.map((b, i) =>
        b.tipo === "paragrafo" ? (
          <p key={i} style={{ margin: "0 0 12px", lineHeight: 1.6 }}>
            <Destaque texto={b.destaque} />
            {b.texto}
          </p>
        ) : (
          <div key={i} style={{ margin: "4px 0 14px" }} className="rel-sem-quebra">
            {b.titulo && <div style={{ fontWeight: 700, color: COR.navy, margin: "8px 0 6px" }}>{b.titulo}</div>}
            <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.6 }}>
              {b.itens.map((it, j) => (
                <li key={j} style={{ marginBottom: 6 }}>
                  <Destaque texto={it.destaque ? `${it.destaque}${/[:.]$/.test(it.destaque) ? "" : " —"}` : undefined} />
                  {it.texto}
                </li>
              ))}
            </ul>
          </div>
        ),
      )}
    </>
  );
}

function Secao({ titulo, children, quebra }: { titulo: string; children: React.ReactNode; quebra?: boolean }) {
  return (
    <section className={quebra ? "rel-nova-pagina" : undefined} style={{ marginTop: 32 }}>
      <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: COR.laranja, marginBottom: 4 }}>Plataforma de PDI</div>
      <h2 style={{ fontSize: 24, fontWeight: 700, color: COR.navy, margin: "0 0 14px", lineHeight: 1.25 }}>{titulo}</h2>
      {children}
    </section>
  );
}

export function RelatorioEmpregadoDocumento({ r }: { r: RelatorioEmpregado }) {
  return (
    <article style={{ color: COR.texto, fontSize: 15, maxWidth: 900, margin: "0 auto" }} className="relatorio-empregado">
      <header style={{ background: COR.navy, color: "#fff", borderRadius: 16, padding: "32px 32px 28px", position: "relative" }} className="rel-capa">
        <img src="/logo-ckm-branco.png" alt="CKM Talents" style={{ position: "absolute", top: 24, right: 28, height: 40 }} />
        <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", opacity: 0.8 }}>Plataforma de PDI · Relatório gerencial</div>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: "28px 0 12px", lineHeight: 1.15 }}>{r.titulo}</h1>
        <div style={{ width: 160, height: 3, background: COR.laranja, borderRadius: 2, margin: "0 0 12px" }} />
        <div style={{ opacity: 0.9 }}>Posição em {dataBr(r.posicaoEm)}</div>
      </header>

      <Secao titulo="Identificação">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {r.identificacao.map(([k, v]) => (
              <tr key={k} style={{ borderBottom: `1px solid ${COR.linha}` }}>
                <th style={{ textAlign: "left", padding: "10px 12px", color: COR.navy, width: "28%", fontWeight: 600 }}>{k}</th>
                <td style={{ padding: "10px 12px" }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Secao>

      <Secao titulo="Em resumo">
        <div style={{ background: COR.fundoSuave, borderLeft: `4px solid ${COR.laranja}`, borderRadius: 8, padding: "16px 20px", lineHeight: 1.65 }}>
          {r.resumo.join(" ")}
        </div>
      </Secao>

      <Secao titulo="Linha do tempo">
        <div className="rel-sem-quebra" style={{ border: `1px solid ${COR.linha}`, borderRadius: 12, padding: "8px 8px 4px" }}>
          <LinhaDoTempo eventos={r.linhaDoTempo} />
        </div>
      </Secao>

      {r.capitulos.map((c, i) => (
        <Secao key={c.titulo} titulo={c.titulo} quebra={i === 0}>
          <Blocos blocos={c.blocos} />
        </Secao>
      ))}

      <section className="rel-nova-pagina" style={{ marginTop: 40 }}>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: COR.navy, margin: "0 0 6px" }}>Anexo — dados detalhados</h2>
        <p style={{ margin: "0 0 8px", color: COR.secundario }}>As tabelas abaixo sustentam a história acima, na ordem em que os fatos aconteceram.</p>
        {r.anexo.map((tb) => (
          <div key={tb.titulo} style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: COR.navy, margin: "0 0 4px" }}>{tb.titulo}</h3>
            {tb.descricao && <p style={{ margin: "0 0 8px", color: COR.secundario, fontSize: 13 }}>{tb.descricao}</p>}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    {tb.colunas.map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "8px 10px", background: COR.navy, color: "#fff", fontWeight: 600 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tb.linhas.map((l, i) => (
                    <tr key={i} style={{ background: i % 2 ? COR.fundoSuave : "#fff", breakInside: "avoid" }}>
                      {l.map((c, j) => (
                        <td key={j} style={{ padding: "7px 10px", borderBottom: `1px solid ${COR.linha}`, verticalAlign: "top" }}>
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>
    </article>
  );
}

// Estilos de impressão: logo da CKM em todas as páginas e quebras entre capítulos.
export const ESTILO_IMPRESSAO = `
@page { size: A4; margin: 10mm 14mm 14mm; }
@media print {
  html, body { background: #fff !important; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  thead { display: table-header-group; }
  .rel-nova-pagina { break-before: page; }
  .rel-sem-quebra { break-inside: avoid; }
  .rel-capa img { display: none; }
  .nao-imprimir { display: none !important; }
}
`;
