/*!
 * DiabRisk v2.0.0 — Calculadora clínica de riesgo de Diabetes Tipo 2 (Escala FINDRISC / OMS)
 * Simulador de Reversión de Prediabetes e Intérprete Glucémico (ADA 2024)
 *
 * Copyright (c) 2026 DataFlow Elegance — Ismael Ben Kazem
 * Licencia MIT · 100% en el navegador · Privacidad médica radical
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DiabRisk = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSION = '2.0.0';

  /**
   * Cálculo del Índice de Masa Corporal (IMC / BMI)
   */
  function calcularIMC(pesoKg, alturaCm) {
    var p = parseFloat(pesoKg);
    var a = parseFloat(alturaCm) / 100;
    if (!p || !a || p <= 0 || a <= 0) return 0;
    return Math.round((p / (a * a)) * 10) / 10;
  }

  /**
   * Puntuación de la escala FINDRISC (Finnish Diabetes Risk Score)
   * Validada por la OMS y estudios españoles (PREDAPS / DE-PLAN)
   * Parámetros:
   *  - edad: número
   *  - sexo: 'hombre' | 'mujer'
   *  - peso: número (kg)
   *  - altura: número (cm)
   *  - cintura: número (cm)
   *  - actividadFisicaDiaria: boolean (>= 30 min/día)
   *  - comeVerduraFrutaDiario: boolean
   *  - tomaMedicacionHipertension: boolean
   *  - glucosaElevadaPrevia: boolean (o diabetes gestacional)
   *  - antecedentesFamiliares: 'ninguno' | 'segundo_grado' | 'primer_grado'
   */
  function calcularFINDRISC(datos) {
    datos = datos || {};
    var puntos = 0;
    var desglose = {};

    // 1. Edad
    var edad = parseInt(datos.edad, 10) || 0;
    if (edad < 45) {
      desglose.edad = { puntos: 0, descripcion: '< 45 años' };
    } else if (edad >= 45 && edad <= 54) {
      puntos += 2;
      desglose.edad = { puntos: 2, descripcion: '45-54 años' };
    } else if (edad >= 55 && edad <= 64) {
      puntos += 3;
      desglose.edad = { puntos: 3, descripcion: '55-64 años' };
    } else {
      puntos += 4;
      desglose.edad = { puntos: 4, descripcion: '≥ 65 años' };
    }

    // 2. IMC
    var imc = datos.imc || calcularIMC(datos.peso, datos.altura);
    if (imc < 25) {
      desglose.imc = { valor: imc, puntos: 0, descripcion: 'Normal (< 25 kg/m²)' };
    } else if (imc >= 25 && imc <= 30) {
      puntos += 1;
      desglose.imc = { valor: imc, puntos: 1, descripcion: 'Sobrepeso (25-30 kg/m²)' };
    } else {
      puntos += 3;
      desglose.imc = { valor: imc, puntos: 3, descripcion: 'Obesidad (> 30 kg/m²)' };
    }

    // 3. Perímetro de cintura (diferenciado por sexo biológico)
    var sexo = (datos.sexo || 'hombre').toLowerCase();
    var cintura = parseFloat(datos.cintura) || 0;
    if (sexo === 'hombre') {
      if (cintura < 94) {
        desglose.cintura = { puntos: 0, descripcion: '< 94 cm' };
      } else if (cintura >= 94 && cintura <= 102) {
        puntos += 3;
        desglose.cintura = { puntos: 3, descripcion: '94-102 cm (Riesgo moderado)' };
      } else {
        puntos += 4;
        desglose.cintura = { puntos: 4, descripcion: '> 102 cm (Riesgo alto)' };
      }
    } else {
      // Mujer
      if (cintura < 80) {
        desglose.cintura = { puntos: 0, descripcion: '< 80 cm' };
      } else if (cintura >= 80 && cintura <= 88) {
        puntos += 3;
        desglose.cintura = { puntos: 3, descripcion: '80-88 cm (Riesgo moderado)' };
      } else {
        puntos += 4;
        desglose.cintura = { puntos: 4, descripcion: '> 88 cm (Riesgo alto)' };
      }
    }

    // 4. Actividad física al menos 30 min/día
    if (!datos.actividadFisicaDiaria) {
      puntos += 2;
      desglose.actividad = { puntos: 2, descripcion: '< 30 min diarios de actividad' };
    } else {
      desglose.actividad = { puntos: 0, descripcion: '≥ 30 min diarios de actividad' };
    }

    // 5. Consumo diario de verduras y frutas
    if (!datos.comeVerduraFrutaDiario) {
      puntos += 1;
      desglose.alimentacion = { puntos: 1, descripcion: 'No come verduras/frutas a diario' };
    } else {
      desglose.alimentacion = { puntos: 0, descripcion: 'Come verduras/frutas a diario' };
    }

    // 6. Medicación para la tensión arterial
    if (datos.tomaMedicacionHipertension) {
      puntos += 2;
      desglose.hipertension = { puntos: 2, descripcion: 'Toma medicación antihipertensiva' };
    } else {
      desglose.hipertension = { puntos: 0, descripcion: 'No toma medicación antihipertensiva' };
    }

    // 7. Antecedentes de glucosa alta / diabetes gestacional
    if (datos.glucosaElevadaPrevia) {
      puntos += 5;
      desglose.glucosaPrevia = { puntos: 5, descripcion: 'Ha tenido glucemia alta o diabetes gestacional' };
    } else {
      desglose.glucosaPrevia = { puntos: 0, descripcion: 'Sin registros previos de glucosa alta' };
    }

    // 8. Antecedentes familiares de diabetes (tipo 1 o tipo 2)
    var fam = datos.antecedentesFamiliares || 'ninguno';
    if (fam === 'primer_grado') {
      puntos += 5;
      desglose.familia = { puntos: 5, descripcion: 'Padres, hermanos o hijos con diabetes' };
    } else if (fam === 'segundo_grado') {
      puntos += 3;
      desglose.familia = { puntos: 3, descripcion: 'Abuelos, tíos o primos con diabetes' };
    } else {
      desglose.familia = { puntos: 0, descripcion: 'Sin antecedentes familiares conocidos' };
    }

    // Estratificación de Riesgo a 10 años
    var nivelRiesgo = 'Bajo';
    var probabilidad10Anios = '1 %';
    var color = '#10b981'; // Verde
    var accionRecomendada = 'Mantén tu estilo de vida saludable actual y repite la prueba cada 5 años.';

    if (puntos >= 7 && puntos <= 11) {
      nivelRiesgo = 'Ligeramente elevado';
      probabilidad10Anios = '4 % (1 de cada 25 desarrollará diabetes)';
      color = '#eab308'; // Amarillo
      accionRecomendada = 'Mejora tu actividad física diaria y alimentación para frenar el aumento de peso.';
    } else if (puntos >= 12 && puntos <= 14) {
      nivelRiesgo = 'Moderado';
      probabilidad10Anios = '17 % (1 de cada 6 desarrollará diabetes)';
      color = '#f97316'; // Naranja
      accionRecomendada = 'Riesgo significativo de prediabetes. Te aconsejamos consultar a tu médico de atención primaria para solicitar una analítica con glucemia basal y HbA1c.';
    } else if (puntos >= 15 && puntos <= 20) {
      nivelRiesgo = 'Alto';
      probabilidad10Anios = '33 % (1 de cada 3 desarrollará diabetes)';
      color = '#ef4444'; // Rojo
      accionRecomendada = 'Muy alta probabilidad de prediabetes o diabetes no diagnosticada. Pide cita médica prioritaria para valoración analítica e intervención de estilo de vida.';
    } else if (puntos > 20) {
      nivelRiesgo = 'Muy alto';
      probabilidad10Anios = '50 % (1 de cada 2 desarrollará diabetes)';
      color = '#7f1d1d'; // Granate
      accionRecomendada = 'Es urgente descartar diabetes tipo 2 activa mediante analítica clínica formal. La pérdida del 7 % del peso corporal y ejercicio pueden revertir el riesgo.';
    }

    return {
      puntosTotales: puntos,
      nivelRiesgo: nivelRiesgo,
      probabilidad10Anios: probabilidad10Anios,
      color: color,
      accionRecomendada: accionRecomendada,
      desglose: desglose
    };
  }

  /**
   * Simulador de Intervención de Estilo de Vida (Estudio DPP / Diabetes Prevention Program)
   * Demuestra el impacto en puntos FINDRISC y reducción de riesgo relativo (~58%)
   */
  function simularIntervencionEstiloVida(datosActuales, mejoras) {
    mejoras = mejoras || {};
    var datosSimulados = Object.assign({}, datosActuales);

    // Reducción de peso estimada (ej: 5% a 10%)
    if (mejoras.reduccionPesoKg) {
      var pesoNuevo = Math.max(40, (parseFloat(datosSimulados.peso) || 70) - mejoras.reduccionPesoKg);
      datosSimulados.peso = pesoNuevo;
      datosSimulados.imc = calcularIMC(pesoNuevo, datosSimulados.altura);
      // Reducción proporcional en cintura (~1 cm por cada 1-1.5 kg perdidos)
      if (datosSimulados.cintura) {
        datosSimulados.cintura = Math.max(60, datosSimulados.cintura - Math.round(mejoras.reduccionPesoKg * 0.9));
      }
    }

    if (mejoras.actividadFisicaDiaria !== undefined) {
      datosSimulados.actividadFisicaDiaria = mejoras.actividadFisicaDiaria;
    }

    if (mejoras.comeVerduraFrutaDiario !== undefined) {
      datosSimulados.comeVerduraFrutaDiario = mejoras.comeVerduraFrutaDiario;
    }

    var resultadoActual = calcularFINDRISC(datosActuales);
    var resultadoSimulado = calcularFINDRISC(datosSimulados);
    var puntosGanados = resultadoActual.puntosTotales - resultadoSimulado.puntosTotales;

    return {
      actual: resultadoActual,
      simulado: resultadoSimulado,
      puntosReducidos: Math.max(0, puntosGanados),
      reduccionRiesgoRelativo: 'Hasta un 58 % de reducción de riesgo de progresión a diabetes (Ensayo Clínico DPP/DPS)'
    };
  }

  /**
   * Intérprete Clínico de Valores Glucémicos (ADA Standards of Care 2024)
   * Tipos: 'basal' (ayunas mg/dL), 'postprandial' (2h tras comida mg/dL), 'hba1c' (%)
   */
  function interpretarGlucosa(tipo, valor) {
    var v = parseFloat(valor);
    if (isNaN(v) || v <= 0) {
      return { estado: 'error', mensaje: 'Introduce un valor numérico válido.' };
    }

    if (tipo === 'basal') {
      // Glucemia basal en ayunas
      if (v < 70) {
        return {
          estado: 'hipoglucemia',
          categoria: 'Hipoglucemia (< 70 mg/dL)',
          color: '#3b82f6',
          alerta: true,
          mensaje: '⚠️ Valor anormalmente bajo. Si tienes mareos, sudoración o temblores, toma 15 g de azúcares rápidos (regla del 15) y consulta a un médico.'
        };
      } else if (v >= 70 && v < 100) {
        return {
          estado: 'normal',
          categoria: 'Normal (70-99 mg/dL)',
          color: '#10b981',
          alerta: false,
          mensaje: '✅ Glucemia basal normal según criterios ADA.'
        };
      } else if (v >= 100 && v <= 125) {
        return {
          estado: 'prediabetes',
          categoria: 'Glucosa Basal Alterada / Prediabetes (100-125 mg/dL)',
          color: '#f97316',
          alerta: true,
          mensaje: '⚠️ Prediabetes: estado metabólico reversible. Requiere confirmación analítica e intervención precoz en nutrición y ejercicio físico.'
        };
      } else {
        return {
          estado: 'sospecha_diabetes',
          categoria: 'Sospecha de Diabetes Mellitus (≥ 126 mg/dL)',
          color: '#ef4444',
          alerta: true,
          mensaje: '🚨 Valor diagnóstico de sospecha de diabetes. Los criterios ADA exigen confirmación en un segundo día en laboratorio clínico reglado.'
        };
      }
    }

    if (tipo === 'postprandial') {
      // Glucosa 2h tras comida
      if (v < 140) {
        return {
          estado: 'normal',
          categoria: 'Normal postprandial (< 140 mg/dL)',
          color: '#10b981',
          alerta: false,
          mensaje: '✅ Tolerancia a la glucosa normal.'
        };
      } else if (v >= 140 && v <= 199) {
        return {
          estado: 'prediabetes',
          categoria: 'Tolerancia Alterada a la Glucosa / Prediabetes (140-199 mg/dL)',
          color: '#f97316',
          alerta: true,
          mensaje: '⚠️ Sugiere resistencia a la insulina postprandial. Coméntalo con tu médico.'
        };
      } else {
        return {
          estado: 'sospecha_diabetes',
          categoria: 'Hiperglucemia postprandial (≥ 200 mg/dL)',
          color: '#ef4444',
          alerta: true,
          mensaje: '🚨 Valores ≥ 200 mg/dL acompañados de síntomas (sed, poliuria) son criterio diagnóstico de diabetes.'
        };
      }
    }

    if (tipo === 'hba1c') {
      // Hemoglobina Glicosilada (%)
      if (v < 5.7) {
        return {
          estado: 'normal',
          categoria: 'Normal (< 5.7 %)',
          color: '#10b981',
          alerta: false,
          mensaje: '✅ Promedio glucémico de los últimos 3 meses óptimo.'
        };
      } else if (v >= 5.7 && v <= 6.4) {
        return {
          estado: 'prediabetes',
          categoria: 'Prediabetes (5.7 - 6.4 %)',
          color: '#f97316',
          alerta: true,
          mensaje: '⚠️ Elevado riesgo de progresión a diabetes en los próximos 5 años.'
        };
      } else {
        return {
          estado: 'sospecha_diabetes',
          categoria: 'Rango de Diabetes (≥ 6.5 %)',
          color: '#ef4444',
          alerta: true,
          mensaje: '🚨 Criterio estándar ADA para el diagnóstico de Diabetes Mellitus.'
        };
      }
    }

    return { estado: 'desconocido', mensaje: 'Tipo de prueba no reconocido.' };
  }

  return {
    VERSION: VERSION,
    calcularIMC: calcularIMC,
    calcularFINDRISC: calcularFINDRISC,
    simularIntervencionEstiloVida: simularIntervencionEstiloVida,
    interpretarGlucosa: interpretarGlucosa
  };
});
