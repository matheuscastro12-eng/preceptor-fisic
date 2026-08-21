import { describe, it, expect } from 'vitest';
import {
	hasActiveSubscription,
	limitsFor,
	currentCycleStart,
	PLAN_LIMITS
} from './subscription';

const dias = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

describe('hasActiveSubscription', () => {
	it('libera quem está ativo e dentro da validade', () => {
		expect(
			hasActiveSubscription({ subscriptionStatus: 'active', subscriptionExpiresAt: dias(10) })
		).toBe(true);
	});

	it('bloqueia quem está ativo mas com a validade vencida', () => {
		expect(
			hasActiveSubscription({ subscriptionStatus: 'active', subscriptionExpiresAt: dias(-1) })
		).toBe(false);
	});

	// Regressão: 'trial' retornava true sem olhar data, e como o cadastro não
	// gravava expiração, toda conta nova ficava com acesso vitalício.
	it('bloqueia trial sem data de expiração', () => {
		expect(
			hasActiveSubscription({ subscriptionStatus: 'trial', subscriptionExpiresAt: null })
		).toBe(false);
	});

	it('bloqueia trial vencido', () => {
		expect(
			hasActiveSubscription({ subscriptionStatus: 'trial', subscriptionExpiresAt: dias(-1) })
		).toBe(false);
	});

	it('libera trial ainda dentro do prazo', () => {
		expect(
			hasActiveSubscription({ subscriptionStatus: 'trial', subscriptionExpiresAt: dias(1) })
		).toBe(true);
	});

	it('bloqueia inadimplente e cancelado, mesmo com data no futuro', () => {
		for (const status of ['past_due', 'cancelled', 'inactive'] as const) {
			expect(
				hasActiveSubscription({ subscriptionStatus: status, subscriptionExpiresAt: dias(30) })
			).toBe(false);
		}
	});

	it('bloqueia quem está ativo mas sem data nenhuma', () => {
		expect(
			hasActiveSubscription({ subscriptionStatus: 'active', subscriptionExpiresAt: null })
		).toBe(false);
	});
});

describe('limitsFor', () => {
	it('usa os limites do plano contratado', () => {
		expect(limitsFor({ subscriptionPlan: 'essencial' })).toEqual({ students: 60, generations: 20 });
		expect(limitsFor({ subscriptionPlan: 'pro' })).toEqual({ students: 150, generations: 50 });
	});

	it('institucional não tem teto de alunos', () => {
		expect(PLAN_LIMITS.institucional!.students).toBeNull();
	});

	it('aceita o plano gravado em maiúsculas', () => {
		expect(limitsFor({ subscriptionPlan: 'PRO' }).students).toBe(150);
	});

	it('cai no Essencial quando o plano está vazio', () => {
		expect(limitsFor({ subscriptionPlan: null }).students).toBe(60);
		expect(limitsFor({ subscriptionPlan: 'plano-inexistente' }).students).toBe(60);
	});
});

describe('currentCycleStart', () => {
	it('marca o início um mês antes do vencimento', () => {
		const expires = new Date('2026-08-20T12:00:00Z');
		const start = currentCycleStart({
			subscriptionStatus: 'active',
			subscriptionExpiresAt: expires
		});
		expect(start.getMonth()).toBe(6); // julho
		expect(start.getDate()).toBe(20);
	});

	it('sem data, usa o primeiro dia do mês corrente', () => {
		const start = currentCycleStart({ subscriptionStatus: 'trial', subscriptionExpiresAt: null });
		expect(start.getDate()).toBe(1);
		expect(start.getMonth()).toBe(new Date().getMonth());
	});

	// Regressão: com um passo fixo de um mês, o plano anual colocava o início do
	// ciclo no futuro e a franquia virava ilimitada por onze meses.
	it('plano anual: o início do ciclo nunca fica no futuro', () => {
		const expires = new Date();
		expires.setFullYear(expires.getFullYear() + 1);

		const start = currentCycleStart({
			subscriptionStatus: 'active',
			subscriptionExpiresAt: expires
		});

		expect(start.getTime()).toBeLessThanOrEqual(Date.now());
	});

	it('plano anual: o ciclo é o mês corrente, não o contrato inteiro', () => {
		const expires = new Date();
		expires.setFullYear(expires.getFullYear() + 1);

		const start = currentCycleStart({
			subscriptionStatus: 'active',
			subscriptionExpiresAt: expires
		});

		// Janela de no máximo ~31 dias: se pegasse o contrato inteiro, a franquia
		// mensal passaria a valer pelo ano todo.
		const limite = Date.now() - 32 * 86_400_000;
		expect(start.getTime()).toBeGreaterThan(limite);
	});

	it('vencimento no fim do mês não acumula erro a cada recuo', () => {
		// Dia 31 com recuo encadeado cairia em fevereiro e desviaria a cada passo.
		const expires = new Date();
		expires.setFullYear(expires.getFullYear() + 1);
		expires.setMonth(0);
		expires.setDate(31);

		const start = currentCycleStart({
			subscriptionStatus: 'active',
			subscriptionExpiresAt: expires
		});

		expect(start.getTime()).toBeLessThanOrEqual(Date.now());
		expect(start.getTime()).toBeGreaterThan(Date.now() - 62 * 86_400_000);
	});
});
