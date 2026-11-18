import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function Modal({ title, onDismiss, children }: { title: string; onDismiss: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  return (
    <dialog
      ref={dialog}
      className="mx-auto my-auto w-[min(94vw,31rem)] max-h-[90dvh] overflow-auto rounded-2xl border border-[#e9d9c7] bg-[#fffbf2] p-5 text-[#33251f] shadow-2xl backdrop:bg-[#25140db3] sm:p-6"
      aria-label={title}
      onCancel={event => { event.preventDefault(); onDismiss(); }}
      onClick={event => { if (event.target === event.currentTarget) {
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onDismiss();
      } }}
    >
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">{title}</h2>
        <button className="cursor-pointer rounded-lg p-2 hover:bg-[#f1e3d0]" type="button" aria-label="Close dialog" onClick={onDismiss}><X size={20} /></button>
      </header>
      {children}
    </dialog>
  );
}
