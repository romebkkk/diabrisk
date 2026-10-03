/**
 * DiabRisk v2.0.0 — Test suite unitario clínico
 * Comando: node test.js
 */
'use strict';
var assert = require('assert');
var DiabRisk = require('./diabrisk.js');

var passed = 0;
function test(nombre, fn) {
  try {
    fn();
    passed++;
    console.log('  [OK] ' + nombre);
  } catch (e) {
    console.error('  [FAIL] ' + nombre + '\n         ' + e.message);
    process.exitCode = 1;
  }
}

console.log('=== 1. Cálculo de IMC (Índice de Masa Corporal) ===');

test('Cálculo de IMC: 70 kg y 175 cm da 22.9 kg/m²', function () {
  var imc = DiabRisk.calcularIMC(70, 175);
  assert.strictEqual(imc, 22.9);
});

test('Cálculo de IMC con obesidad: 95 kg y 170 cm da 32.9 kg/m²', function () {
  var imc = DiabRisk.calcularIMC(95, 170);
  assert.strictEqual(imc, 32.9);
});

console.log('\n=== 2. Escala FINDRISC (Puntuación y Estratificación a 10 años) ===');

test('Perfil óptimo joven sin factores de riesgo obtiene puntuación baja (0 puntos, 1 % riesgo)', function () {
  var r = DiabRisk.calcularFINDRISC({
    edad: 30,
    sexo: 'hombre',
    peso: 68,
    altura: 175,
    cintura: 85,
    actividadFisicaDiaria: true,
    comeVerduraFrutaDiario: true,
    tomaMedicacionHipertension: false,
    glucosaElevadaPrevia: false,
    antecedentesFamiliares: 'ninguno'
  });
  assert.strictEqual(r.puntosTotales, 0);
  assert.strictEqual(r.nivelRiesgo, 'Bajo');
  assert.strictEqual(r.probabilidad10Anios, '1 %');
});

test('Diferenciación de perímetro de cintura: Mujer con 85 cm puntúa 3 puntos (80-88 cm)', function () {
  var r = DiabRisk.calcularFINDRISC({
    edad: 40,
    sexo: 'mujer',
    peso: 60,
    altura: 165,
    cintura: 85,
    actividadFisicaDiaria: true,
    comeVerduraFrutaDiario: true
  });
  assert.strictEqual(r.desglose.cintura.puntos, 3);
});

test('Perfil de alto riesgo (≥ 65 años, obeso, medicado HTA, familiar 1er grado) supera 15 puntos', function () {
  var r = DiabRisk.calcularFINDRISC({
    edad: 66, // +4
    sexo: 'hombre',
    peso: 98, // IMC > 30 -> +3
    altura: 172,
    cintura: 108, // > 102 -> +4
    actividadFisicaDiaria: false, // +2
    comeVerduraFrutaDiario: false, // +1
    tomaMedicacionHipertension: true, // +2
    glucosaElevadaPrevia: true, // +5
    antecedentesFamiliares: 'primer_grado' // +5
  });
  // Total: 4 + 3 + 4 + 2 + 1 + 2 + 5 + 5 = 26 puntos
  assert.strictEqual(r.puntosTotales, 26);
  assert.strictEqual(r.nivelRiesgo, 'Muy alto');
  assert.ok(/50 %/i.test(r.probabilidad10Anios));
});

console.log('\n=== 3. Simulador de Intervención de Estilo de Vida (DPP) ===');

test('Perder 8 kg y hacer ejercicio diario reduce los puntos FINDRISC significativamente', function () {
  var datos = {
    edad: 52,
    sexo: 'hombre',
    peso: 88,
    altura: 175,
    cintura: 98,
    actividadFisicaDiaria: false,
    comeVerduraFrutaDiario: false,
    tomaMedicacionHipertension: false,
    glucosaElevadaPrevia: false,
    antecedentesFamiliares: 'segundo_grado'
  };

  var sim = DiabRisk.simularIntervencionEstiloVida(datos, {
    reduccionPesoKg: 8,
    actividadFisicaDiaria: true,
    comeVerduraFrutaDiario: true
  });

  assert.ok(sim.puntosReducidos >= 5, 'Debe reducir al menos 5 puntos FINDRISC');
  assert.ok(sim.simulado.puntosTotales < sim.actual.puntosTotales);
  assert.ok(/58 %/i.test(sim.reduccionRiesgoRelativo));
});

console.log('\n=== 4. Intérprete Clínico de Glucosa (Criterios ADA 2024) ===');

test('Glucemia basal de 92 mg/dL es Normal', function () {
  var r = DiabRisk.interpretarGlucosa('basal', 92);
  assert.strictEqual(r.estado, 'normal');
  assert.strictEqual(r.alerta, false);
});

test('Glucemia basal de 115 mg/dL detecta Glucosa Alterada en Ayunas / Prediabetes', function () {
  var r = DiabRisk.interpretarGlucosa('basal', 115);
  assert.strictEqual(r.estado, 'prediabetes');
  assert.strictEqual(r.alerta, true);
  assert.ok(/Prediabetes/i.test(r.categoria));
});

test('Glucemia basal de 138 mg/dL dispara sospecha diagnóstica de Diabetes', function () {
  var r = DiabRisk.interpretarGlucosa('basal', 138);
  assert.strictEqual(r.estado, 'sospecha_diabetes');
  assert.strictEqual(r.alerta, true);
});

test('Glucemia postprandial 2h de 160 mg/dL detecta Intolerancia a la Glucosa / Prediabetes', function () {
  var r = DiabRisk.interpretarGlucosa('postprandial', 160);
  assert.strictEqual(r.estado, 'prediabetes');
});

test('HbA1c de 6.8 % clasifica en rango diagnóstico de Diabetes', function () {
  var r = DiabRisk.interpretarGlucosa('hba1c', 6.8);
  assert.strictEqual(r.estado, 'sospecha_diabetes');
  assert.ok(/Diabetes/i.test(r.categoria));
});

console.log('\n' + passed + ' tests de riesgo de diabetes superados con éxito.');
