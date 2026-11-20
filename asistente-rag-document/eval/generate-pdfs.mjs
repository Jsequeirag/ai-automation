// Genera los 2 PDFs de ejemplo del set de evaluación (T08) en eval/docs/.
// Contenido original y ficticio (sin licencias de terceros): un manual y un contrato.
// Cada sección va en su propia página para que las páginas de eval/questions.json
// no cambien. Uso: node eval/generate-pdfs.mjs
import { createWriteStream, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "docs");
mkdirSync(outDir, { recursive: true });

const manual = {
  file: "manual-cafetera-aurora.pdf",
  title: "Manual de usuario · Cafetera espresso Aurora CX-200",
  pages: [
    {
      heading: "Manual de usuario\nCafetera espresso Aurora CX-200",
      body: [
        "Gracias por elegir la cafetera espresso Aurora CX-200. Lea este manual completo antes de usar el aparato por primera vez y consérvelo para futuras consultas.",
        "Contenido del manual:",
        "1. Instrucciones de seguridad (página 2)\n2. Contenido de la caja y especificaciones técnicas (página 3)\n3. Primer uso (página 4)\n4. Preparar un espresso (página 5)\n5. Vaporizador de leche (página 6)\n6. Programación y ahorro de energía (página 7)\n7. Limpieza diaria (página 8)\n8. Descalcificación (página 9)\n9. Solución de problemas y códigos de error (página 10)\n10. Garantía (página 11)\n11. Servicio técnico y reciclaje (página 12)",
        "Aurora Cafeteras es una marca ficticia creada para este documento de ejemplo.",
      ],
    },
    {
      heading: "1. Instrucciones de seguridad",
      body: [
        "Conecte la cafetera únicamente a un enchufe con toma de tierra cuya tensión coincida con la indicada en la placa de características. No utilice alargadores ni regletas múltiples.",
        "No sumerja nunca el aparato, el cable ni el enchufe en agua ni en ningún otro líquido. Si el cable de alimentación está dañado, debe sustituirlo el servicio técnico oficial para evitar riesgos.",
        "Durante la preparación, el portafiltros, la lanza de vapor y la bandeja calientatazas alcanzan temperaturas muy altas. No los toque con las manos desnudas y no retire el portafiltros mientras sale café: el agua está a presión.",
        "Mantenga la cafetera fuera del alcance de los niños menores de 8 años. Los niños no deben realizar la limpieza ni el mantenimiento sin supervisión de un adulto.",
        "Desenchufe la cafetera antes de limpiarla, cuando no vaya a utilizarla durante un periodo prolongado y antes de desmontar cualquier pieza.",
      ],
    },
    {
      heading: "2. Contenido de la caja y especificaciones técnicas",
      body: [
        "La caja contiene: la cafetera Aurora CX-200, un portafiltros con dos filtros (para una y para dos tazas), un prensador de café, una cuchara dosificadora de 7 gramos, una jarra de acero inoxidable para leche de 350 ml y este manual.",
        "Especificaciones técnicas:",
        "Potencia: 1450 W.\nTensión de alimentación: 220-240 V, 50/60 Hz.\nPresión de la bomba: 15 bar.\nCapacidad del depósito de agua: 1,8 litros (extraíble).\nSistema de calentamiento: termobloque con control electrónico de temperatura.\nDimensiones: 29 x 24 x 32 cm (ancho x fondo x alto).\nPeso: 4,2 kg.\nLongitud del cable: 1 metro.",
        "El fabricante se reserva el derecho de modificar las características técnicas sin previo aviso.",
      ],
    },
    {
      heading: "3. Primer uso",
      body: [
        "Retire todos los materiales de embalaje y las etiquetas adhesivas. Lave el depósito de agua, el portafiltros, los filtros y la jarra de leche con agua tibia y un poco de jabón neutro; aclárelos bien.",
        "Llene el depósito con agua fría hasta la marca MAX y colóquelo en su sitio hasta oír un clic.",
        "Cebado de la bomba: encienda la cafetera con el interruptor lateral, coloque un recipiente bajo el grupo y bajo la lanza de vapor, gire el mando de vapor hacia la izquierda y deje salir agua durante 15 segundos. Vuelva a cerrar el mando.",
        "A continuación, sin café, coloque el portafiltros y realice dos ciclos completos de agua caliente pulsando el botón de dos tazas. Deseche el agua. Este proceso elimina posibles restos de fabricación y calienta el circuito.",
        "La cafetera está lista cuando el indicador de temperatura deja de parpadear y queda iluminado en verde fijo.",
      ],
    },
    {
      heading: "4. Preparar un espresso",
      body: [
        "Utilice café molido de molienda fina, específica para espresso. Para un espresso simple use 7 gramos de café (una cuchara dosificadora rasa) en el filtro de una taza; para un espresso doble use 14 gramos en el filtro de dos tazas.",
        "Distribuya el café de forma uniforme y préselo con el prensador aplicando una presión firme de unos 15 kg. Limpie los restos de café del borde del filtro antes de encajar el portafiltros.",
        "Encaje el portafiltros en el grupo girándolo hacia la derecha hasta el tope. Coloque una o dos tazas precalentadas debajo.",
        "Pulse el botón de una taza (40 ml) o el de dos tazas (80 ml). La extracción ideal dura entre 25 y 30 segundos y produce una crema de color avellana.",
        "Si el café sale demasiado rápido y claro, la molienda es demasiado gruesa o el café está poco prensado. Si sale gota a gota, la molienda es demasiado fina.",
      ],
    },
    {
      heading: "5. Vaporizador de leche",
      body: [
        "La lanza de vapor permite calentar y espumar leche para preparar capuchinos y cafés con leche.",
        "Llene la jarra de acero hasta un tercio con leche fría, recién sacada del frigorífico (unos 4 °C). La leche entera produce una espuma más cremosa; la leche desnatada, una espuma más abundante pero menos estable.",
        "Pulse el botón de vapor. El indicador parpadeará mientras la cafetera alcanza la temperatura de vapor; espere a que quede fijo, lo que tarda unos 30 segundos.",
        "Introduzca la punta de la lanza justo bajo la superficie de la leche y abra el mando de vapor. Cuando la leche aumente de volumen, baje la jarra para calentar. Detenga el vapor cuando la leche alcance entre 60 y 65 °C: a más temperatura la leche pierde dulzor.",
        "Después de cada uso, purgue la lanza abriendo el mando 2 segundos sobre la bandeja y límpiela con un paño húmedo.",
      ],
    },
    {
      heading: "6. Programación y ahorro de energía",
      body: [
        "Programar el volumen de las tazas: coloque una taza, mantenga pulsado el botón de una taza durante 3 segundos hasta que parpadee y suéltelo; la cafetera empieza a servir. Pulse de nuevo el botón cuando la taza tenga la cantidad deseada. El nuevo volumen queda guardado. Proceda igual con el botón de dos tazas.",
        "Restablecer los valores de fábrica: con la cafetera encendida, mantenga pulsados a la vez los botones de una y dos tazas durante 5 segundos. Los volúmenes vuelven a 40 ml y 80 ml.",
        "Apagado automático: para ahorrar energía, la cafetera se apaga sola tras 25 minutos sin uso. Puede cambiar este tiempo a 15 o a 60 minutos manteniendo pulsado el botón de vapor durante 5 segundos con la cafetera encendida; el indicador parpadea una vez (15 min), dos veces (25 min) o tres veces (60 min).",
      ],
    },
    {
      heading: "7. Limpieza diaria",
      body: [
        "Desenchufe la cafetera y deje que se enfríe antes de limpiarla.",
        "Vacíe y lave la bandeja de goteo cada día. El indicador rojo flotante asoma por la rejilla cuando la bandeja está llena.",
        "Retire el filtro del portafiltros, deseche los posos y lave ambos con agua caliente. No use el lavavajillas para el portafiltros: el mango puede deformarse.",
        "Limpie el grupo de café con un paño húmedo y haga salir un poco de agua caliente sin portafiltros para arrastrar los restos.",
        "Limpie la lanza de vapor después de cada uso. Si la punta se obstruye, desenrósquela y desatásquela con una aguja fina.",
        "Cambie el agua del depósito todos los días. No use productos abrasivos ni estropajos metálicos sobre la carcasa.",
      ],
    },
    {
      heading: "8. Descalcificación",
      body: [
        "La cal del agua reduce el rendimiento de la cafetera y puede dañarla. Descalcifique el aparato cada 300 cafés o cada 3 meses, lo que ocurra primero. Con agua muy dura, hágalo cada 2 meses.",
        "La cafetera le avisa: cuando es necesario descalcificar, el indicador naranja parpadea.",
        "Procedimiento: vacíe el depósito y vierta 500 ml de solución descalcificante Aurora mezclada con 500 ml de agua. Coloque un recipiente grande bajo el grupo y la lanza. Mantenga pulsados el botón de dos tazas y el de vapor durante 5 segundos para iniciar el programa. El ciclo completo dura unos 25 minutos y alterna el paso de solución por el grupo y por la lanza.",
        "Al terminar, aclare el depósito, llénelo con agua limpia hasta MAX y repita el programa para aclarar el circuito. El indicador naranja se apaga.",
        "No utilice nunca vinagre: daña las juntas y el termobloque.",
      ],
    },
    {
      heading: "9. Solución de problemas y códigos de error",
      body: [
        "El café sale frío: precaliente las tazas con agua caliente y espere a que el indicador de temperatura quede en verde fijo antes de preparar café.",
        "No sale café: compruebe que hay agua en el depósito. Si la hay, la molienda puede ser demasiado fina o el café estar demasiado prensado.",
        "Sale agua por el borde del portafiltros: limpie los restos de café del borde del filtro y compruebe que la junta del grupo no esté desgastada.",
        "La leche no hace espuma: la leche no está suficientemente fría o la punta de la lanza está obstruida.",
        "Código E1: falta agua en el depósito. Llene el depósito y vuelva a cebar la bomba.",
        "Código E2: la bandeja de goteo no está colocada o está llena.",
        "Código E3: fallo del sensor de temperatura. Apague la cafetera, desenchúfela y póngase en contacto con el servicio técnico; no intente repararla.",
      ],
    },
    {
      heading: "10. Garantía",
      body: [
        "Aurora garantiza la cafetera CX-200 frente a defectos de fabricación durante 2 años desde la fecha de compra. Para hacer valer la garantía es imprescindible presentar la factura o el ticket de compra.",
        "Ampliación de garantía: si registra el producto en la web de Aurora en los 30 días siguientes a la compra, la garantía se amplía 1 año más, hasta un total de 3 años.",
        "La garantía no cubre: las averías causadas por la cal cuando no se ha descalcificado según este manual, el uso comercial o profesional del aparato, los daños por golpes o caídas, las reparaciones realizadas por personal no autorizado ni las piezas de desgaste (juntas y filtros).",
        "Durante el periodo de garantía, la reparación o, si no es posible, la sustitución del aparato es gratuita, incluidos el transporte y la mano de obra.",
      ],
    },
    {
      heading: "11. Servicio técnico y reciclaje",
      body: [
        "Servicio de atención al cliente y servicio técnico Aurora:\nTeléfono: 900 123 456 (gratuito), de lunes a viernes de 9:00 a 18:00.\nCorreo electrónico: soporte@aurora-cafe.example",
        "Antes de llamar, tenga a mano el número de serie, que encontrará en la placa de características situada en la base de la cafetera.",
        "Reciclaje: al final de su vida útil, no deseche la cafetera con la basura doméstica. Llévela a un punto limpio o devuélvala al comercio al comprar un aparato equivalente. Los materiales del embalaje (cartón y plástico) son reciclables.",
      ],
    },
  ],
};

const contrato = {
  file: "contrato-arrendamiento-vivienda.pdf",
  title: "Contrato de arrendamiento de vivienda",
  pages: [
    {
      heading: "Contrato de arrendamiento de vivienda",
      body: [
        "En Madrid, a 15 de febrero de 2026.",
        "REUNIDOS",
        "De una parte, como ARRENDADORA, Marta Ruiz Olmedo, mayor de edad, propietaria de la vivienda objeto de este contrato.",
        "De otra parte, como ARRENDATARIO, Daniel Ferrer Castillo, mayor de edad.",
        "Ambas partes se reconocen capacidad legal suficiente para suscribir el presente contrato de arrendamiento de vivienda, que se rige por la Ley 29/1994, de Arrendamientos Urbanos, y por las siguientes cláusulas. (Las personas, la vivienda y los datos de este documento son ficticios.)",
        "PRIMERA. Objeto. La arrendadora alquila al arrendatario la vivienda situada en la calle de los Almendros 14, piso 3.º B, 28045 Madrid. La vivienda tiene 68 metros cuadrados útiles, dos dormitorios, un baño, cocina equipada y salón. El arrendamiento incluye la plaza de garaje número 12 del mismo edificio. El trastero no está incluido. La vivienda se destinará exclusivamente a residencia habitual del arrendatario.",
      ],
    },
    {
      heading: "SEGUNDA. Duración",
      body: [
        "El contrato entra en vigor el 1 de marzo de 2026 y tiene una duración inicial de un año.",
        "Llegada la fecha de vencimiento, el contrato se prorrogará obligatoriamente por plazos anuales hasta alcanzar una duración mínima de cinco años, salvo que el arrendatario manifieste a la arrendadora, con 30 días de antelación como mínimo a la fecha de terminación del contrato o de cualquiera de sus prórrogas, su voluntad de no renovarlo.",
        "Desistimiento: el arrendatario podrá desistir del contrato una vez transcurridos al menos seis meses desde su entrada en vigor, siempre que lo comunique por escrito a la arrendadora con una antelación mínima de 30 días. En ese caso, el arrendatario indemnizará a la arrendadora con una cantidad equivalente a una mensualidad de renta por cada año de contrato que reste por cumplir; los periodos inferiores al año darán lugar a la parte proporcional de la indemnización.",
        "Al terminar el contrato, el arrendatario entregará las llaves y dejará la vivienda en el mismo estado en que la recibió, salvo el desgaste por el uso normal.",
      ],
    },
    {
      heading: "TERCERA. Renta",
      body: [
        "La renta pactada es de 1.150 euros mensuales.",
        "El arrendatario pagará la renta por meses anticipados, dentro de los siete primeros días de cada mes, mediante transferencia bancaria a la cuenta de la arrendadora indicada en el anexo de este contrato. El justificante de la transferencia servirá como recibo.",
        "Actualización: la renta se actualizará cada año, en la fecha en que se cumpla cada año de vigencia del contrato, aplicando la variación del índice de referencia para la actualización anual de los contratos de arrendamiento de vivienda publicado por el Instituto Nacional de Estadística. La arrendadora comunicará por escrito la nueva renta con al menos un mes de antelación.",
        "Retrasos: el retraso en el pago de la renta devengará un interés igual al interés legal del dinero incrementado en dos puntos, desde la fecha de vencimiento hasta la fecha de pago.",
      ],
    },
    {
      heading: "CUARTA. Fianza y garantía adicional",
      body: [
        "A la firma de este contrato el arrendatario entrega a la arrendadora una fianza en metálico equivalente a una mensualidad de renta, es decir, 1.150 euros, que la arrendadora depositará en el organismo autonómico correspondiente.",
        "Además, el arrendatario entrega una garantía adicional equivalente a dos mensualidades de renta, es decir, 2.300 euros, para responder del cumplimiento de sus obligaciones.",
        "La fianza no se actualizará durante los tres primeros años del contrato.",
        "Devolución: la arrendadora devolverá la fianza y la garantía adicional al arrendatario en el plazo de 30 días desde la entrega de las llaves, una vez comprobado el estado de la vivienda. De dichas cantidades podrá descontar el importe de los daños causados en la vivienda que no se deban al uso normal y las cantidades que el arrendatario deba en concepto de renta o suministros. Si no las devuelve en ese plazo, devengarán el interés legal del dinero.",
      ],
    },
    {
      heading: "QUINTA. Gastos y suministros",
      body: [
        "Serán a cargo de la arrendadora los gastos de comunidad de propietarios y el Impuesto sobre Bienes Inmuebles (IBI) de la vivienda y de la plaza de garaje.",
        "Serán a cargo del arrendatario todos los suministros que se midan por contador: electricidad, agua, gas y conexión a internet. El arrendatario podrá cambiar a su nombre los contratos de suministro, comunicándolo a la arrendadora.",
        "La tasa municipal de recogida de residuos (basuras) será a cargo del arrendatario.",
        "El arrendatario recibe la vivienda con los contadores a cero de consumo pendiente; las lecturas iniciales figuran en el anexo de este contrato.",
      ],
    },
    {
      heading: "SEXTA. Conservación, obras y animales domésticos",
      body: [
        "La arrendadora realizará, a su cargo, todas las reparaciones necesarias para conservar la vivienda en condiciones de habitabilidad, salvo cuando el deterioro sea imputable al arrendatario.",
        "Las pequeñas reparaciones que exija el desgaste por el uso ordinario de la vivienda (por ejemplo, grifos, enchufes, persianas o bombillas) serán a cargo del arrendatario.",
        "El arrendatario no podrá realizar obras que modifiquen la configuración de la vivienda ni de sus instalaciones sin el consentimiento previo y por escrito de la arrendadora. Pintar las paredes en colores claros no requiere autorización.",
        "Animales domésticos: se permite tener en la vivienda un animal doméstico de menos de 15 kg, siempre que el arrendatario lo comunique por escrito a la arrendadora y se haga responsable de los daños que pueda causar. Cualquier otro animal requerirá autorización escrita.",
      ],
    },
    {
      heading: "SÉPTIMA. Cesión, acceso a la vivienda y seguro",
      body: [
        "Queda prohibido el subarriendo, total o parcial, de la vivienda, así como la cesión del contrato, sin el consentimiento escrito de la arrendadora. Queda igualmente prohibido el alquiler de habitaciones o el uso turístico de la vivienda.",
        "Acceso de la arrendadora: la arrendadora solo podrá entrar en la vivienda con el consentimiento del arrendatario y avisándole con al menos 48 horas de antelación, salvo en caso de urgencia (por ejemplo, una fuga de agua) que exija una intervención inmediata.",
        "Seguro: el arrendatario se obliga a contratar y mantener durante toda la vigencia del contrato un seguro de hogar que cubra su responsabilidad civil frente a la arrendadora y frente a terceros, con un capital mínimo de 150.000 euros, y a entregar copia de la póliza cuando se le solicite.",
      ],
    },
    {
      heading: "OCTAVA. Resolución, notificaciones y jurisdicción",
      body: [
        "Resolución: el incumplimiento de las obligaciones de cualquiera de las partes permitirá a la otra exigir su cumplimiento o resolver el contrato. En particular, la arrendadora podrá resolver el contrato si el arrendatario deja de pagar dos mensualidades de renta, si subarrienda la vivienda sin permiso o si realiza obras no consentidas.",
        "Notificaciones: las partes acuerdan que las comunicaciones relativas a este contrato se harán por escrito, siendo válidas las enviadas por correo electrónico a las direcciones que figuran en el anexo.",
        "Jurisdicción: para cualquier controversia derivada de este contrato, las partes se someten a los juzgados y tribunales de Madrid.",
        "Y en prueba de conformidad, las partes firman el presente contrato por duplicado en el lugar y la fecha indicados al principio.",
        "La arrendadora: Marta Ruiz Olmedo                El arrendatario: Daniel Ferrer Castillo",
      ],
    },
  ],
};

function render({ file, title, pages }) {
  const doc = new PDFDocument({ size: "A4", margin: 60, info: { Title: title, Author: "Asistente RAG (ejemplo)" } });
  const path = join(outDir, file);
  doc.pipe(createWriteStream(path));
  let pageCount = 1;
  doc.on("pageAdded", () => pageCount++);
  pages.forEach((page, i) => {
    if (i > 0) doc.addPage();
    doc.font("Helvetica-Bold").fontSize(i === 0 ? 20 : 15).text(page.heading, { paragraphGap: 14 });
    doc.font("Helvetica").fontSize(11);
    for (const p of page.body) doc.text(p, { align: "left", paragraphGap: 8, lineGap: 2 });
    // Las secciones deben caber en su página (si no, las páginas del set cambian).
    if (pageCount !== i + 1) throw new Error(`${file}: la sección ${i + 1} no cabe en una página`);
    const bottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0; // pie de página bajo el margen sin abrir otra página
    doc.fontSize(9).fillColor("#666").text(`${title} · Página ${i + 1} de ${pages.length}`, 60, 790, { lineBreak: false });
    doc.page.margins.bottom = bottom;
    doc.fillColor("black");
  });
  doc.end();
  console.log(`${path} (${pages.length} páginas)`);
}

render(manual);
render(contrato);
