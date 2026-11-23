import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Bot, LoaderCircle, MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const suggestions = [
  'Que produtos estão disponíveis?',
  'Como posso encontrar um produto?',
  'Preciso de ajuda com uma compra.',
];

export function CitandaAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Olá! Sou o assistente virtual do Ĉitanda. Posso ajudar-te a encontrar produtos e esclarecer dúvidas sobre a plataforma. Em que posso ajudar?',
    },
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading, open]);

  async function sendMessage(value: string) {
    const content = value.trim();
    if (!content || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('citanda-assistant', {
        body: { messages: nextMessages.slice(-10) },
      });

      if (error) throw error;
      if (!data?.reply || typeof data.reply !== 'string') {
        throw new Error('Não foi possível obter uma resposta válida.');
      }

      setMessages((current) => [...current, { role: 'assistant', content: data.reply }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Tenta novamente dentro de instantes.';
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: `Não consegui responder neste momento. ${message.includes('citanda-assistant') ? 'O serviço ainda pode estar a ser configurado.' : 'Verifica a tua ligação e tenta novamente.'}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <>
      {open && (
        <section
          className="fixed bottom-24 right-4 sm:right-6 z-[80] flex h-[min(640px,calc(100dvh-8rem))] max-h-[640px] w-[calc(100vw-2rem)] max-w-[390px] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
          aria-label="Assistente Ĉitanda"
        >
          <header className="flex items-center gap-3 border-b border-border bg-base-800 px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-500/15 text-accent-400">
              <Bot size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-text-primary">Assistente Ĉitanda</h2>
              <p className="text-xs text-text-muted">Apoio ao cliente com IA</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
              aria-label="Fechar assistente"
            >
              <X size={19} />
            </button>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'rounded-br-md bg-accent-500 text-white'
                      : 'rounded-bl-md bg-surface-raised text-text-primary'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {messages.length === 1 && (
              <div className="space-y-2 pt-1">
                <p className="text-xs text-text-muted">Perguntas frequentes</p>
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void sendMessage(suggestion)}
                    disabled={loading}
                    className="block w-full rounded-xl border border-border px-3 py-2 text-left text-xs text-text-secondary transition-colors hover:border-accent-500/50 hover:bg-surface-raised disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <LoaderCircle size={15} className="animate-spin" />
                O assistente está a responder…
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-border bg-base-800 p-3">
            <label className="sr-only" htmlFor="citanda-assistant-input">Escreve a tua mensagem</label>
            <textarea
              id="citanda-assistant-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage(input);
                }
              }}
              placeholder="Escreve a tua pergunta…"
              rows={1}
              maxLength={1500}
              className="max-h-28 min-h-10 flex-1 resize-y rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-accent-500"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-accent-500 text-white transition-colors hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Enviar mensagem"
            >
              <Send size={17} />
            </button>
          </form>
          <p className="px-3 pb-2 text-center text-[10px] text-text-muted">
            As respostas são geradas por IA. Confirma informações importantes com o suporte.
          </p>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="fixed bottom-24 right-4 sm:right-6 z-[80] flex h-14 w-14 items-center justify-center rounded-full bg-accent-500 text-white shadow-lg shadow-accent-500/25 transition-transform hover:scale-105 active:scale-95"
        aria-label={open ? 'Fechar assistente Ĉitanda' : 'Abrir assistente Ĉitanda'}
        aria-expanded={open}
      >
        {open ? <X size={23} /> : <MessageCircle size={24} />}
        {!open && <Sparkles size={12} className="absolute right-3 top-3" />}
      </button>
    </>
  );
}
