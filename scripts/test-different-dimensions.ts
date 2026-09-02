import { prisma } from '../lib/prisma';
import { OpenAIEmbeddingProvider } from '../lib/embedding/providers/openai';
import { validateModelConsistency, searchPriorArtByVector } from '../lib/embedding/service';
import type { NormalizedPatentDocument } from '../lib/patent/types';

/**
 * 4 Diverse Patent Datasets across distinct technological domains:
 * 1. AgTech Micro-Drones (Agriculture)
 * 2. Quantum Error Correction (Quantum Computing)
 * 3. Bio-AI Protein Folding Synthesizer (Biomedical)
 * 4. Solid-State Lithium Battery Electrolyte (Energy Storage)
 */
const diverseSamplePatents: NormalizedPatentDocument[] = [
  {
    publicationNumber: 'US-2026-001001-A1',
    title: 'Autonomous Edge-AI Greenhouse Thermal Transpiration Micro-Drone',
    abstract: 'An autonomous micro-drone equipped with thermal-hygrometric vision and on-device neural networks that flies inside greenhouses, detects early stomatal closures, and triggers micro-dosing actuators.',
    claims: [
      '1. An autonomous micro-drone comprising a thermal camera, an edge neural network, and a wireless micro-actuator transmitter.',
      '2. The drone of claim 1, wherein plant stress is detected via leaf transpiration stomatal closure signatures.'
    ],
    source: 'lens_org',
    filingDate: new Date('2024-01-15'),
    publicationDate: new Date('2025-06-20'),
    ipcCodes: ['A01G 25/16', 'G06V 20/52', 'B64C 39/00'],
    cpcCodes: ['A01G 25/16', 'B64C 39/024'],
    inventors: ['Dr. Aris Thorne', 'Elena Rostova'],
    applicants: ['AgriTech Autonomous Systems Corp'],
    url: 'https://www.lens.org/lens/patent/US-2026-001001-A1',
    rawMetadata: { domain: 'AgTech' },
  },
  {
    publicationNumber: 'EP-4099881-A1',
    title: 'Fault-Tolerant Surface Code Quantum Error Correction Architecture',
    abstract: 'A topological quantum error correction processor utilizing a 2D lattice of superconducting transmon qubits with real-time syndrome measurement FPGA decoders.',
    claims: [
      '1. A quantum processor comprising a two-dimensional lattice of data qubits and measure qubits configured for surface code error correction.',
      '2. The quantum processor of claim 1, wherein syndrome extraction is performed by a dedicated low-latency FPGA pipeline.'
    ],
    source: 'epo_ops',
    filingDate: new Date('2023-05-10'),
    publicationDate: new Date('2024-11-12'),
    ipcCodes: ['G06N 10/70', 'H03M 13/00'],
    cpcCodes: ['G06N 10/70'],
    inventors: ['Prof. Kenji Takahashi', 'Dr. Sarah Connor'],
    applicants: ['Quantum Logic Technologies GmbH'],
    url: 'https://www.lens.org/lens/patent/EP-4099881-A1',
    rawMetadata: { domain: 'Quantum Computing' },
  },
  {
    publicationNumber: 'WO-2025-088123-A2',
    title: 'Deep Learning De Novo Macromolecular Structural Protein Synthesizer',
    abstract: 'A generative AI transformer model trained on cryogenic electron microscopy maps to generate stable de novo binder proteins against oncogenic target receptors.',
    claims: [
      '1. A computer-implemented method for generating amino acid sequences targeting a therapeutic receptor using a 3D structural diffusion model.',
      '2. The method of claim 1, further comprising evaluating binding affinity via pLDDT confidence metrics.'
    ],
    source: 'wipo',
    filingDate: new Date('2024-03-22'),
    publicationDate: new Date('2025-09-30'),
    ipcCodes: ['C07K 14/00', 'G16B 15/00', 'G06N 3/08'],
    cpcCodes: ['G16B 15/20'],
    inventors: ['Dr. Julian Vance', 'Dr. Maria Santos'],
    applicants: ['BioGenAI Therapeutics Inc'],
    url: 'https://www.lens.org/lens/patent/WO-2025-088123-A2',
    rawMetadata: { domain: 'Biomedical AI' },
  },
  {
    publicationNumber: 'US-2025-045612-A1',
    title: 'Solid-State Lithium-Sulfur Battery Nanostructured Ceramic Electrolyte',
    abstract: 'A dendrite-resistant solid ceramic electrolyte composition comprising garnet-type LLZO substituted with tantalum and zirconium for high energy density electric vehicle batteries.',
    claims: [
      '1. A solid-state battery cell comprising a lithium anode, a sulfur cathode, and a nanostructured garnet LLZO ceramic electrolyte separator.',
      '2. The battery cell of claim 1, wherein critical current density exceeds 10 mA/cm2 at ambient room temperature.'
    ],
    source: 'uspto',
    filingDate: new Date('2023-11-01'),
    publicationDate: new Date('2025-04-15'),
    ipcCodes: ['H01M 10/056', 'H01M 10/052'],
    cpcCodes: ['H01M 10/0562'],
    inventors: ['Dr. Robert Sterling', 'Li Wei'],
    applicants: ['NextGen Battery Energy Corp'],
    url: 'https://www.lens.org/lens/patent/US-2025-045612-A1',
    rawMetadata: { domain: 'Energy Storage' },
  },
];

async function testDiverseDataAndDimensions() {
  console.log('🧪 Testing Diverse Patent Ingestion & Dimension Validation...\n');

  try {
    const provider = new OpenAIEmbeddingProvider('text-embedding-3-small', 1536);

    console.log('----------------------------------------------------------------');
    console.log('1. Ingesting & Embedding 4 Diverse Technological Patents (1536-dim)...');
    console.log('----------------------------------------------------------------');

    for (const doc of diverseSamplePatents) {
      const claimsStr = doc.claims.join('\n\n');
      const textToEmbed = `Title: ${doc.title}\n\nAbstract: ${doc.abstract}\n\nClaims:\n${claimsStr}`;
      
      const embedResult = await provider.embedText(textToEmbed);

      const dbDoc = await prisma.priorArtDocument.upsert({
        where: { publicationNumber: doc.publicationNumber },
        update: {
          title: doc.title,
          abstract: doc.abstract,
          claimsText: claimsStr,
          source: doc.source,
          ipcCodes: doc.ipcCodes,
          embeddingModel: embedResult.model,
          embeddingDim: embedResult.dimensions,
          metadata: {
            cpcCodes: doc.cpcCodes,
            inventors: doc.inventors,
            applicants: doc.applicants,
            url: doc.url,
            domain: (doc.rawMetadata as any).domain,
          },
        },
        create: {
          publicationNumber: doc.publicationNumber,
          title: doc.title,
          abstract: doc.abstract,
          claimsText: claimsStr,
          source: doc.source,
          jurisdiction: doc.publicationNumber.split('-')[0] || 'US',
          ipcCodes: doc.ipcCodes,
          embeddingModel: embedResult.model,
          embeddingDim: embedResult.dimensions,
          metadata: {
            cpcCodes: doc.cpcCodes,
            inventors: doc.inventors,
            applicants: doc.applicants,
            url: doc.url,
            domain: (doc.rawMetadata as any).domain,
          },
        },
      });

      // Update vector in pgvector
      const vectorStr = `[${embedResult.vector.join(',')}]`;
      await prisma.$executeRawUnsafe(
        `UPDATE "prior_art_documents" SET "embedding" = $1::vector WHERE "id" = $2`,
        vectorStr,
        dbDoc.id
      );

      console.log(`✅ Ingested: ${doc.publicationNumber} | Domain: ${(doc.rawMetadata as any).domain}`);
      console.log(`   Model: ${embedResult.model} | Vector Dim: ${embedResult.dimensions}`);
      console.log(`   Sample Vector Coordinates: [${embedResult.vector.slice(0, 4).join(', ')}...]`);
      console.log('----------------------------------------------------------------');
    }

    // 2. Perform Cosine Vector Search for "Quantum Computing"
    console.log('\n2. Testing Cosine Distance Search for Quantum Query Vector...');
    const quantumQuery = await provider.embedText('Topological quantum error correction transmon qubit FPGA decoder');
    const quantumResults = await searchPriorArtByVector(quantumQuery.vector, 2);

    console.log('   Top Match for Quantum Query:');
    console.log(`   -> ${quantumResults[0]?.publicationNumber}: "${quantumResults[0]?.title}" (Distance: ${quantumResults[0]?.distance?.toFixed(4)})`);

    // 3. Testing Dimension Guard Detection (e.g. 512 vs 1536)
    console.log('\n----------------------------------------------------------------');
    console.log('3. Testing Dimension Mismatch Fail-Safe Guard...');
    console.log('----------------------------------------------------------------');

    const dimCheck512 = validateModelConsistency('text-embedding-3-small', 512);
    console.log('   Testing 512-dim input against 1536-dim database index:');
    console.log(`   Result: Valid? ${dimCheck512.valid} | Reason: "${dimCheck512.reason}"`);

    const dimCheck384 = validateModelConsistency('bge-small-en-v1.5', 384);
    console.log('\n   Testing 384-dim input against 1536-dim database index:');
    console.log(`   Result: Valid? ${dimCheck384.valid} | Reason: "${dimCheck384.reason}"`);

    // Attempting invalid vector search (512 dimensions)
    try {
      const invalid512Vector = new Array(512).fill(0.1);
      await searchPriorArtByVector(invalid512Vector, 1);
    } catch (err: any) {
      console.log('\n✅ Search Guard Exception Caught Successfully:');
      console.log(`   "${err.message}"`);
    }

    console.log('\n🎉 DIVERSE DATASET & DIMENSION VALIDATION TEST COMPLETE!');
  } catch (err: any) {
    console.error('❌ Test Failed:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testDiverseDataAndDimensions();
