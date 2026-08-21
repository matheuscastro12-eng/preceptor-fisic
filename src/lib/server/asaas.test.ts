import { describe, it, expect } from 'vitest';
import { planFromPayment, PAYMENT_LINKS, isEbookPayment } from './asaas';

/**
 * O reconhecimento do plano é o que mantém o acesso de quem paga. Se
 * planFromPayment() devolve null, o webhook não renova e a pessoa perde acesso
 * mesmo em dia. Por isso os valores da tabela antiga são testados junto com os
 * atuais: os dois links mensais foram reaproveitados com preço novo, então uma
 * assinatura antiga só é reconhecível pelo valor.
 */
describe('planFromPayment', () => {
	it('reconhece pelo paymentLink quando ele vem no payload', () => {
		expect(planFromPayment({ paymentLink: PAYMENT_LINKS.basico_mensal.id })).toEqual({
			plan: 'basico',
			months: 1
		});
		expect(planFromPayment({ paymentLink: PAYMENT_LINKS.pro_anual.id })).toEqual({
			plan: 'pro',
			months: 12
		});
	});

	it('reconhece pelo valor quando a renovação chega sem paymentLink', () => {
		expect(planFromPayment({ value: 39.9 })).toEqual({ plan: 'basico', months: 1 });
		expect(planFromPayment({ value: 399.0 })).toEqual({ plan: 'basico', months: 12 });
		expect(planFromPayment({ value: 49.9 })).toEqual({ plan: 'essencial', months: 1 });
		expect(planFromPayment({ value: 499.0 })).toEqual({ plan: 'essencial', months: 12 });
		expect(planFromPayment({ value: 99.9 })).toEqual({ plan: 'pro', months: 1 });
		expect(planFromPayment({ value: 999.0 })).toEqual({ plan: 'pro', months: 12 });
	});

	// Regressão: sem isto, a renovação de quem assinou na tabela antiga voltaria
	// null e o webhook derrubaria o acesso de um cliente adimplente.
	it('reconhece os valores da tabela antiga como plano legado', () => {
		expect(planFromPayment({ value: 69.9 })).toEqual({ plan: 'essencial_legacy', months: 1 });
		expect(planFromPayment({ value: 699.0 })).toEqual({ plan: 'essencial_legacy', months: 12 });
		expect(planFromPayment({ value: 149.9 })).toEqual({ plan: 'pro_legacy', months: 1 });
		expect(planFromPayment({ value: 1498.8 })).toEqual({ plan: 'pro_legacy', months: 12 });
	});

	it('o link tem precedência sobre o valor', () => {
		// Cobrança avulsa de valor legado criada a partir de um link atual: o link
		// é a informação mais específica e deve ganhar.
		expect(
			planFromPayment({ paymentLink: PAYMENT_LINKS.essencial_mensal.id, value: 69.9 })
		).toEqual({ plan: 'essencial', months: 1 });
	});

	it('ignora cobrança que não é de plano', () => {
		expect(planFromPayment({ value: 29.9 })).toBeNull(); // ebook
		expect(planFromPayment({ value: 12.34 })).toBeNull();
		expect(planFromPayment({})).toBeNull();
	});

	it('nenhum valor legado colide com o catálogo em venda', () => {
		const atuais = Object.values(PAYMENT_LINKS).map((l) => l.value);
		for (const legado of [69.9, 699.0, 149.9, 1498.8]) {
			expect(atuais.some((v) => Math.abs(v - legado) < 0.01)).toBe(false);
		}
	});

	it('o ebook não é confundido com plano', () => {
		expect(isEbookPayment({ value: 29.9 })).toBe(true);
		expect(isEbookPayment({ value: 39.9 })).toBe(false);
	});
});
