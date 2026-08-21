import { describe, it, expect } from 'vitest';
import { planLabel, isLegacyPlan } from './planos';

describe('planLabel', () => {
	it('capitaliza o nome do plano', () => {
		expect(planLabel('basico')).toBe('Basico');
		expect(planLabel('essencial')).toBe('Essencial');
		expect(planLabel('pro')).toBe('Pro');
	});

	// O assinante não pode ler "Plano Essencial_legacy" na página de cobrança.
	it('esconde o sufixo _legacy', () => {
		expect(planLabel('essencial_legacy')).toBe('Essencial');
		expect(planLabel('pro_legacy')).toBe('Pro');
	});

	it('traduz os planos que não são nome comercial', () => {
		expect(planLabel('trial')).toBe('Teste');
		expect(planLabel('admin-test')).toBe('Interno');
		expect(planLabel('institucional')).toBe('Institucional');
	});

	it('sem plano gravado, não inventa rótulo', () => {
		expect(planLabel(null)).toBeNull();
		expect(planLabel(undefined)).toBeNull();
		expect(planLabel('')).toBeNull();
	});
});

describe('isLegacyPlan', () => {
	it('distingue tabela antiga de tabela atual', () => {
		expect(isLegacyPlan('essencial_legacy')).toBe(true);
		expect(isLegacyPlan('pro_legacy')).toBe(true);
		expect(isLegacyPlan('essencial')).toBe(false);
		expect(isLegacyPlan('basico')).toBe(false);
		expect(isLegacyPlan(null)).toBe(false);
	});

	// Regressão: um plano futuro chamado "legacy" não deve ser tratado como
	// sufixo, e nada além do sufixo exato conta.
	it('só o sufixo exato conta', () => {
		expect(isLegacyPlan('legacy_essencial')).toBe(false);
		expect(isLegacyPlan('legacyplan')).toBe(false);
	});
});
