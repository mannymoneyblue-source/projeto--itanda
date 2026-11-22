import { Target, Eye, Heart, Sparkles } from 'lucide-react';

export function AboutPage() {
  const values = [
    { icon: Target, title: 'Missão', desc: 'Democratizar o acesso a soluções digitais de qualidade em Angola, tornando ferramentas profissionais acessíveis a todos.' },
    { icon: Eye, title: 'Visão', desc: 'Ser a plataforma de referência para produtos digitais em Angola, reconhecida pela confiança, qualidade e proximidade.' },
    { icon: Heart, title: 'Valores', desc: 'Acessibilidade, transparência, inovação e compromisso com a satisfação dos nossos clientes.' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-400 text-sm font-medium mb-6">
          <Sparkles size={14} /> Sobre nós
        </div>
        <h1 className="font-display text-4xl font-bold mb-4">A Ĉitanda</h1>
        <p className="text-lg text-text-secondary leading-relaxed max-w-2xl mx-auto">
          Somos uma plataforma angolana dedicada à venda de produtos digitais,
          ferramentas de produtividade e recursos profissionais. Acreditamos que
          as soluções digitais devem estar ao alcance de todos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {values.map((value, i) => (
          <div key={i} className="card p-6 text-center">
            <div className="w-14 h-14 rounded-xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center mx-auto mb-4">
              <value.icon size={24} className="text-accent-400" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2">{value.title}</h3>
            <p className="text-sm text-text-secondary leading-relaxed">{value.desc}</p>
          </div>
        ))}
      </div>

      <div className="card p-8">
        <h2 className="font-display text-2xl font-bold mb-4">O que oferecemos</h2>
        <ul className="space-y-3">
          {[
            'Produtos digitais selecionados e verificados',
            'Entrega imediata após confirmação de pagamento',
            'Métodos de pagamento adaptados ao mercado angolano',
            'Apoio ao cliente via WhatsApp',
            'Plataforma segura com proteção de dados',
            'Acesso permanente aos produtos adquiridos',
          ].map((item, i) => (
            <li key={i} className="flex items-center gap-3 text-text-secondary">
              <div className="w-5 h-5 rounded-full bg-accent-500/10 flex items-center justify-center flex-shrink-0">
                <Sparkles size={12} className="text-accent-400" />
              </div>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
