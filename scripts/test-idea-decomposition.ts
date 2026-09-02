import fs from 'fs';
import path from 'path';

// Parse .env.local manually if process.env.GROQ_API_KEY is not set
if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY.includes('demo_key_placeholder')) {
  try {
    const envLocalPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envLocalPath)) {
      const envContent = fs.readFileSync(envLocalPath, 'utf8');
      const match = envContent.match(/GROQ_API_KEY=["']?([^"'\r\n]+)["']?/);
      if (match && match[1]) {
        process.env.GROQ_API_KEY = match[1];
      }
    }
  } catch {
    // Ignore error
  }
}

import { prisma } from '../lib/prisma';
import { decomposeIdeaAndMapIPC } from '../lib/ai/agents/idea-decomposition';
import type { InventionInput } from '../lib/mock-data';

// Sample Invention 1: Environmental & Computer Vision Domain
const sampleInvention1: InventionInput = {
  title: 'AI-Powered Multi-Modal Smart Waste Segregation System',
  problem:
    'Manual waste segregation is labor-intensive, error-prone, and costly. Existing automated systems rely on single-sensor classification, leading to high misclassification rates for mixed and contaminated recyclable materials.',
  solution:
    'A multi-modal edge-AI system that fuses computer vision, near-infrared spectroscopy, and inductive sensor data to classify waste materials in real time with adaptive confidence scoring and self-correcting sorting mechanisms.',
  howItWorks:
    'Waste items pass through a sensing chamber where a camera captures visual features, an NIR sensor detects material composition, and an inductive sensor identifies metals. An on-device neural network fuses these inputs, assigns a confidence score per classification, and triggers a pneumatic sorting actuator. When confidence falls below a threshold, the system routes the item to a secondary verification station and retrains on the corrected result.',
  advantages:
    'Higher classification accuracy through sensor fusion; reduced latency via edge inference; adaptive learning from misclassified items; lower operational cost; and real-time audit logging for compliance.',
  differentiation:
    'Unlike single-sensor systems, our approach combines three orthogonal sensor modalities with an adaptive confidence threshold that learns from historical error distributions, enabling continuous self-correction without cloud dependency.',
  domain: 'Computer Vision & Environmental Engineering',
  industry: 'Waste Management & Recycling',
};

// Sample Invention 2: AgTech & Autonomous Systems Domain
const sampleInvention2: InventionInput = {
  title: 'Autonomous Edge-AI Plant Disease & Irrigation Micro-Optimizer',
  problem:
    'Over-irrigation and un-detected early fungal pathogens cause major crop loss in greenhouse farming while wasting water and energy.',
  solution:
    'An autonomous micro-drone equipped with thermal-hygrometric vision and on-device neural networks that flies inside greenhouses, detects early stomatal closures, and triggers precision micro-dosing actuators directly over target plant root zones.',
  howItWorks:
    'Micro-drones fly along automated indoor waypoints. Thermal cameras detect leaf transpiration changes indicative of root stress or pathogen attack before visual symptoms appear. An onboard microcontroller processes infrared signatures and communicates wirelessly with targeted drip valves to apply localized micro-doses of nutrients.',
  advantages:
    'Early pathogen detection 5 days before visible leaf spotting; 40% reduction in water usage; zero reliance on cloud connectivity during drone flight; automated micro-zone precision treatment.',
  differentiation:
    'Combines pre-symptomatic thermal transpiration sensing with autonomous indoor flight control and micro-actuation, eliminating uniform field spraying.',
  domain: 'AgTech & Autonomous Systems',
  industry: 'Agriculture & Precision Farming',
};

async function testIdeaDecompositionAgent() {
  console.log('🧪 Testing Idea Decomposition and IPC Mapping Agent with 2 Sample Inventions...\n');

  try {
    // 1. Ensure test user exists in database
    const testUser = await prisma.user.upsert({
      where: { email: 'agent.tester@novelcore.ai' },
      update: { name: 'Agent Test User' },
      create: {
        email: 'agent.tester@novelcore.ai',
        name: 'Agent Test User',
      },
    });

    console.log('✅ Test User Verified:', testUser.id);

    // =========================================================================
    // TEST 1: Sample Invention 1 (Smart Waste Segregation)
    // =========================================================================
    console.log('\n----------------------------------------------------------------');
    console.log('🔬 TEST 1: Decomposing Invention 1 ("', sampleInvention1.title, '")');
    console.log('----------------------------------------------------------------');

    const dbInvention1 = await prisma.invention.create({
      data: {
        userId: testUser.id,
        ...sampleInvention1,
        status: 'ANALYZING',
      },
    });

    console.log('   Saved Invention 1 to DB (ID:', dbInvention1.id, ')');

    const result1 = await decomposeIdeaAndMapIPC({
      inventionId: dbInvention1.id,
      input: sampleInvention1,
    });

    console.log('✅ Execution Success for Test 1!');
    console.log('   AnalysisRun ID:', result1.analysisRunId);
    console.log('   Technical Essence:', result1.decomposition.technicalEssence);
    console.log('   Core Concepts:', result1.decomposition.coreConcepts);
    console.log('   Technical Features:', result1.decomposition.technicalFeatures);
    console.log('   Differentiating Features:', result1.decomposition.differentiatingFeatures);
    console.log('   Suggested IPC/CPC Codes:', result1.decomposition.ipcCodes);

    // Verify DB record for Test 1
    const run1 = await prisma.analysisRun.findUnique({
      where: { id: result1.analysisRunId },
    });

    if (!run1 || run1.currentStep !== 1 || run1.noveltyScore !== null) {
      throw new Error('FAILED: AnalysisRun database record state for Test 1 is invalid!');
    }
    console.log('✅ AnalysisRun Database Record Verified (Step 1 Complete, Novelty Score is null as required)');

    // Pause briefly between tests to respect Groq rate limits
    console.log('\n⏳ Pausing 2 seconds to respect Groq API rate limits...');
    await new Promise((r) => setTimeout(r, 2000));

    // =========================================================================
    // TEST 2: Sample Invention 2 (Autonomous Plant Disease Optimizer)
    // =========================================================================
    console.log('\n----------------------------------------------------------------');
    console.log('🔬 TEST 2: Decomposing Invention 2 ("', sampleInvention2.title, '")');
    console.log('----------------------------------------------------------------');

    const dbInvention2 = await prisma.invention.create({
      data: {
        userId: testUser.id,
        ...sampleInvention2,
        status: 'ANALYZING',
      },
    });

    console.log('   Saved Invention 2 to DB (ID:', dbInvention2.id, ')');

    const result2 = await decomposeIdeaAndMapIPC({
      inventionId: dbInvention2.id,
      input: sampleInvention2,
    });

    console.log('✅ Execution Success for Test 2!');
    console.log('   AnalysisRun ID:', result2.analysisRunId);
    console.log('   Technical Essence:', result2.decomposition.technicalEssence);
    console.log('   Core Concepts:', result2.decomposition.coreConcepts);
    console.log('   Technical Features:', result2.decomposition.technicalFeatures);
    console.log('   Differentiating Features:', result2.decomposition.differentiatingFeatures);
    console.log('   Suggested IPC/CPC Codes:', result2.decomposition.ipcCodes);

    // Verify DB record for Test 2
    const run2 = await prisma.analysisRun.findUnique({
      where: { id: result2.analysisRunId },
    });

    if (!run2 || run2.currentStep !== 1 || run2.patentabilityScore !== null) {
      throw new Error('FAILED: AnalysisRun database record state for Test 2 is invalid!');
    }
    console.log('✅ AnalysisRun Database Record Verified (Step 1 Complete, Patentability Score is null as required)');

    // Cleanup test records
    await prisma.invention.deleteMany({
      where: { id: { in: [dbInvention1.id, dbInvention2.id] } },
    });
    console.log('\n🧹 Test Inventions Cleaned Up.');

    console.log('\n🎉 IDEA DECOMPOSITION & IPC MAPPING AGENT TEST PASSED 100%!');
  } catch (err: any) {
    console.error('\n❌ Test Failed:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testIdeaDecompositionAgent();
