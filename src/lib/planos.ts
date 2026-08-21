/**
 * Nome de plano para leitura humana, compartilhado entre a tela de assinatura e
 * o CRM.
 *
 * O sufixo _legacy identifica quem assinou na tabela anterior a agosto/2026 e
 * mantém a franquia contratada. É detalhe interno: o assinante não deve ler
 * "Plano Essencial_legacy" na própria página de cobrança. Quem precisa da
 * distinção (suporte, no CRM) usa isLegacyPlan() e mostra o rótulo à parte.
 */
export function planLabel(plano: string | null | undefined): string | null {
	if (!plano) return null;
	const base = plano.replace(/_legacy$/, '');
	if (base === 'admin-test') return 'Interno';
	if (base === 'trial') return 'Teste';
	if (base === 'institucional') return 'Institucional';
	return base.charAt(0).toUpperCase() + base.slice(1);
}

/** Assinou na tabela antiga e carrega a franquia de então. */
export function isLegacyPlan(plano: string | null | undefined): boolean {
	return typeof plano === 'string' && plano.endsWith('_legacy');
}
