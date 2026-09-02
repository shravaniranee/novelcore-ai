export type RiskLevel = 'Low' | 'Medium' | 'High';
export type ImpactLevel = 'High' | 'Medium' | 'Low';

export interface InventionInput {
  title: string;
  problem: string;
  solution: string;
  howItWorks: string;
  advantages: string;
  differentiation: string;
  domain: string;
  industry: string;
}

export interface PriorArtResult {
  id: string;
  title: string;
  year: number;
  source: string;
  jurisdiction: string;
  similarity: number;
  technology: string;
  explanation: string;
  overlap: string[];
}

export interface InnovationOpportunity {
  id: string;
  title: string;
  impact: ImpactLevel;
  whyItMatters: string;
  expectedImpact: string;
  recommendedAction: string;
  applied: boolean;
  gapType?: string;
  opportunityKey?: string;
  relatedFeatureKeys?: string[];
  supportingPriorArtIds?: string[];
  coverage?: number;
  confidence?: number;
  differentiationScore?: number;
  limitations?: string;
  explanation?: string;
  explanationProvenance?: string;
}

export interface AnalysisData {
  id?: string;
  title: string;
  patentTitle: string;
  novelty: number;
  patentability: number;
  priorArtRisk: RiskLevel;
  industrialApplicability: 'High' | 'Medium' | 'Low';
  understanding: string;
  concepts: string[];
  ipc: string[];
  ipcLabels: string[];
  technologyDomain: string;
  priorArt: PriorArtResult[];
  opportunities: InnovationOpportunity[];
  patentReadiness: number;
  claimStrength: number;
  inventiveStep: number;
  industrialApp: number;
  priorArtRiskScore: number;
  noveltyBreakdown: { label: string; value: number }[];
  heatmapGrid: {
    dimension: string;
    invention: number;
    clusterA: number;
    clusterB: number;
    clusterC: number;
  }[];
  heatmap: {
    dimension: string;
    priorArt: number;
    invention: number;
    gap: number;
  }[];
  radar: {
    dimension: string;
    existing: number;
    invention: number;
  }[];
  existingApproach: string[];
  yourApproach: string[];
  aiAssessment: string;
  recommendedNextStep: string;
  abstract: string;
  description: string[];
  claims: { id: string; original: string; optimized: string }[];
  examiner: {
    overallRisk: RiskLevel;
    findings: {
      type: 'warning' | 'success';
      title: string;
      detail: string;
    }[];
    recommendation: string;
  };
  examinerObjections: {
    id: string;
    title: string;
    severity: RiskLevel;
    concern: string;
    recommendation: string;
  }[];
  examinerPositives: {
    id: string;
    title: string;
    rating: string;
  }[];
  examinerStatusChecks: {
    label: string;
    status: 'PASS' | 'REVIEW' | 'GOOD';
  }[];
  claimPriorArtAnalysis: {
    element: string;
    overlap: 'High' | 'Medium' | 'Low';
    differentiation: 'Strong' | 'Moderate' | 'Low';
  }[];
  claimStrengthImprovements: {
    label: string;
    value: number;
    positive: boolean;
  }[];
  claimInsights: string[];
  nextStepsChecklist: {
    label: string;
    done: boolean;
  }[];
  analysisMode?: 'LIVE_GROQ' | 'DETERMINISTIC_FALLBACK' | string;
  noveltyAssessment?: {
    noveltyScore: number;
    noveltyBand: string;
    evidenceConfidence: number;
    singleReferenceRisk: string;
    collectiveCoverage: number;
    patentabilityRisk: string;
    scoringBreakdown?: any;
    evidenceReferences?: any[];
    referenceAssessments?: any[];
    groqExplanation?: string;
  };
}

export const demoInvention: InventionInput = {
  title: 'AI-Powered Smart Waste Segregation System',
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

export const demoAnalysis: AnalysisData = {
  title: 'AI-Powered Smart Waste Segregation System',
  patentTitle:
    'AI-Based Multi-Modal Waste Classification and Automated Segregation System',
  novelty: 82,
  patentability: 76,
  priorArtRisk: 'Medium',
  industrialApplicability: 'High',
  understanding:
    'The invention proposes a multi-modal waste classification system that combines computer vision, near-infrared spectroscopy, and inductive sensing on an edge-AI processing unit. Unlike single-sensor prior art, it introduces adaptive confidence scoring that routes low-confidence items to a secondary verification station, enabling continuous self-correction and on-device retraining. The system targets industrial recycling facilities seeking to reduce contamination rates and manual sorting costs.',
  concepts: [
    'Computer Vision',
    'Edge AI',
    'Sensor Fusion',
    'Object Classification',
    'Automated Sorting',
    'Real-Time Processing',
  ],
  ipc: ['G06V 20/50', 'B09B 3/00', 'G06N 3/04'],
  ipcLabels: ['G06V', 'B09B'],
  technologyDomain: 'Artificial Intelligence / Computer Vision',
  priorArt: [
    {
      id: 'PA-001',
      title: 'Automated Waste Classification Using Computer Vision',
      year: 2021,
      source: 'WIPO Patent',
      jurisdiction: 'WO',
      similarity: 87,
      technology: 'Computer Vision',
      explanation:
        'Discloses a convolutional neural network for classifying recyclable materials from RGB images. Lacks multi-sensor fusion and adaptive confidence scoring.',
      overlap: ['Computer Vision', 'Object Classification'],
    },
    {
      id: 'PA-002',
      title: 'Intelligent Robotic Waste Sorting System',
      year: 2020,
      source: 'USPTO',
      jurisdiction: 'US',
      similarity: 79,
      technology: 'Robotics + Vision',
      explanation:
        'Describes a robotic arm with a vision-based picker for sorting. Single-sensor approach with no edge inference or self-correction loop.',
      overlap: ['Automated Sorting', 'Computer Vision'],
    },
    {
      id: 'PA-003',
      title: 'Deep Learning Based Recycling Classification',
      year: 2022,
      source: 'EPO',
      jurisdiction: 'EP',
      similarity: 72,
      technology: 'Deep Learning',
      explanation:
        'Uses a deep neural network on cloud infrastructure for recycling classification. Does not address latency, sensor fusion, or on-device retraining.',
      overlap: ['Object Classification', 'Edge AI'],
    },
    {
      id: 'PA-004',
      title: 'NIR Spectroscopy for Plastic Identification',
      year: 2019,
      source: 'WIPO Patent',
      jurisdiction: 'WO',
      similarity: 64,
      technology: 'NIR Spectroscopy',
      explanation:
        'Uses near-infrared spectroscopy alone for plastic type identification. No vision fusion or adaptive confidence mechanism.',
      overlap: ['Sensor Fusion'],
    },
    {
      id: 'PA-005',
      title: 'Inductive Sensor Array for Metal Sorting',
      year: 2018,
      source: 'USPTO',
      jurisdiction: 'US',
      similarity: 58,
      technology: 'Inductive Sensing',
      explanation:
        'Metal sorting via inductive sensor array. Single modality, no AI classification or multi-sensor fusion.',
      overlap: ['Sensor Fusion'],
    },
  ],
  opportunities: [
    {
      id: 'OPP-1',
      title: 'Adaptive confidence scoring',
      impact: 'High',
      whyItMatters:
        'Existing systems use fixed confidence thresholds, leading to persistent misclassification. Adaptive scoring learns from historical error patterns.',
      expectedImpact: '+14% classification accuracy',
      recommendedAction:
        'Add a dynamic threshold module that adjusts based on material class and historical confidence distributions.',
      applied: false,
    },
    {
      id: 'OPP-2',
      title: 'Multi-sensor verification',
      impact: 'High',
      whyItMatters:
        'Single-sensor systems cannot resolve ambiguous items. Fusing vision + NIR + inductive data provides orthogonal evidence.',
      expectedImpact: '+22% differentiation',
      recommendedAction:
        'Implement a late-fusion network that combines embeddings from each sensor modality before classification.',
      applied: false,
    },
    {
      id: 'OPP-3',
      title: 'Low-power edge inference',
      impact: 'Medium',
      whyItMatters:
        'Cloud-based classification adds latency and requires connectivity. Edge inference enables real-time sorting on the factory floor.',
      expectedImpact: '−40ms latency per item',
      recommendedAction:
        'Deploy a quantized model on an embedded NPU with a fallback to cloud for retraining only.',
      applied: false,
    },
    {
      id: 'OPP-4',
      title: 'Self-correcting retraining loop',
      impact: 'Medium',
      whyItMatters:
        'Static models degrade as waste stream composition changes. A retraining loop maintains accuracy over time.',
      expectedImpact: 'Sustained accuracy over 12 months',
      recommendedAction:
        'Route low-confidence items to manual verification, label the result, and trigger incremental on-device fine-tuning.',
      applied: false,
    },
  ],
  patentReadiness: 76,
  claimStrength: 68,
  inventiveStep: 71,
  industrialApp: 91,
  priorArtRiskScore: 34,
  noveltyBreakdown: [
    { label: 'Technical Novelty', value: 86 },
    { label: 'Prior-Art Differentiation', value: 78 },
    { label: 'Inventive Step Potential', value: 74 },
  ],
  heatmapGrid: [
    { dimension: 'Classification Accuracy', invention: 88, clusterA: 85, clusterB: 72, clusterC: 68 },
    { dimension: 'Processing Architecture', invention: 82, clusterA: 55, clusterB: 70, clusterC: 45 },
    { dimension: 'Sensor Fusion', invention: 85, clusterA: 40, clusterB: 30, clusterC: 25 },
    { dimension: 'Edge Processing', invention: 78, clusterA: 30, clusterB: 55, clusterC: 20 },
    { dimension: 'Adaptive Decision Making', invention: 80, clusterA: 22, clusterB: 18, clusterC: 15 },
  ],
  existingApproach: [
    'Cloud Processing',
    'Limited Material Categories',
    'Manual Verification',
    'High Latency',
  ],
  yourApproach: [
    'Edge AI Processing',
    'Multi-Modal Classification',
    'Automated Verification',
    'Real-Time Sorting',
  ],
  aiAssessment:
    'Your invention demonstrates strong novelty potential and high industrial applicability. The primary weakness is inventive-step differentiation from existing computer-vision sorting systems. The adaptive confidence scoring and multi-sensor fusion mechanisms are the strongest differentiators and should be emphasized in the claims.',
  recommendedNextStep:
    'Strengthen the adaptive classification and sensor-fusion mechanism before drafting final claims. Emphasize the dynamic confidence threshold and self-correcting retraining loop as the inventive distinction.',
  heatmap: [
    { dimension: 'Vision Classification', priorArt: 85, invention: 88, gap: 3 },
    { dimension: 'Sensor Fusion', priorArt: 40, invention: 82, gap: 42 },
    { dimension: 'Adaptive Confidence', priorArt: 22, invention: 79, gap: 57 },
    { dimension: 'Edge Inference', priorArt: 55, invention: 74, gap: 19 },
    { dimension: 'Self-Correction', priorArt: 18, invention: 76, gap: 58 },
    { dimension: 'Sorting Actuation', priorArt: 70, invention: 72, gap: 2 },
    { dimension: 'Audit Logging', priorArt: 30, invention: 68, gap: 38 },
  ],
  radar: [
    { dimension: 'Processing', existing: 70, invention: 82 },
    { dimension: 'Classification', existing: 75, invention: 88 },
    { dimension: 'Sensors', existing: 45, invention: 85 },
    { dimension: 'Latency', existing: 40, invention: 78 },
    { dimension: 'Adaptability', existing: 30, invention: 80 },
  ],
  abstract:
    'A system and method for automated waste classification and segregation using multi-modal sensor fusion and adaptive confidence scoring is disclosed. The system comprises an image capture module, a near-infrared spectroscopy module, and an inductive sensing module, the outputs of which are fused by an edge-deployed neural network. An adaptive confidence scoring module dynamically adjusts classification thresholds based on historical error distributions and routes low-confidence items to a secondary verification station. A self-correcting retraining loop incrementally fine-tunes the model from verified results, sustaining classification accuracy over variable waste stream compositions.',
  description: [
    'The present disclosure relates to an automated waste segregation system employing multi-modal sensor fusion and edge-based artificial intelligence for real-time classification of recyclable and non-recyclable materials.',
    'In one embodiment, the system includes a sensing chamber through which waste items are conveyed. An RGB camera captures visual features, a near-infrared (NIR) sensor detects material composition, and an inductive sensor identifies metallic components. The outputs of these sensors are processed by a quantized neural network deployed on an embedded neural processing unit.',
    'The neural network generates a fused embedding from the sensor inputs and produces a classification with an associated confidence score. An adaptive confidence scoring module compares the confidence score against a dynamic threshold that is adjusted based on the material class and historical error distributions for that class.',
    'When the confidence score exceeds the threshold, the system actuates a pneumatic sorting mechanism to route the item to the appropriate bin. When the confidence score falls below the threshold, the item is diverted to a secondary verification station where a human operator or a higher-resolution sensor confirms the classification. The confirmed result is logged and used to trigger incremental on-device fine-tuning of the neural network.',
    'The system further includes an audit logging module that records every classification decision, confidence score, and sorting action with a timestamp, enabling compliance reporting and post-hoc accuracy analysis.',
  ],
  claims: [
    {
      id: 'C1',
      original:
        'A system for waste segregation comprising an image capture device and a processor configured to classify waste items based on image data.',
      optimized:
        'A system for automated waste segregation comprising: an RGB image capture module; a near-infrared spectroscopy module; an inductive sensing module; an edge-deployed neural processing unit configured to fuse outputs of said modules into a multi-modal embedding and generate a classification with an adaptive confidence score; and a pneumatic sorting actuator responsive to said classification, wherein said adaptive confidence score is dynamically adjusted based on historical error distributions per material class.',
    },
    {
      id: 'C2',
      original:
        'The system of claim 1, wherein the processor uses a neural network to classify the waste items.',
      optimized:
        'The system of claim 1, wherein said edge-deployed neural processing unit executes a quantized multi-modal fusion network that combines embeddings from said image capture module, said near-infrared spectroscopy module, and said inductive sensing module prior to classification.',
    },
    {
      id: 'C3',
      original:
        'The system of claim 1, further comprising a sorting mechanism for separating the waste items.',
      optimized:
        'The system of claim 1, further comprising a pneumatic sorting actuator and a secondary verification station, wherein items with an adaptive confidence score below a dynamic threshold are routed to said secondary verification station, and wherein a confirmed classification from said station triggers incremental on-device fine-tuning of said neural network.',
    },
  ],
  examiner: {
    overallRisk: 'Medium',
    findings: [
      {
        type: 'warning',
        title: 'Prior Art Concern',
        detail:
          'Claim 1 overlaps with existing computer-vision waste classification approaches. The single-sensor vision classification is well-documented in the prior art.',
      },
      {
        type: 'warning',
        title: 'Inventive Step Concern',
        detail:
          'The claim should more clearly define the technical distinction of the adaptive multi-sensor fusion mechanism over single-modality prior art.',
      },
      {
        type: 'success',
        title: 'Industrial Applicability',
        detail: 'Strong — clear application in municipal and industrial recycling facilities.',
      },
      {
        type: 'success',
        title: 'Specification Completeness',
        detail: 'Good — all system components are described with sufficient technical detail.',
      },
    ],
    recommendation:
      'Strengthen the adaptive multi-sensor classification mechanism before filing. Emphasize the dynamic confidence threshold and self-correcting retraining loop as the inventive distinction.',
  },
  examinerObjections: [
    {
      id: 'obj1',
      title: 'Prior-Art Concern',
      severity: 'Medium',
      concern:
        'Claim 1 shares computer-vision classification concepts with identified prior art.',
      recommendation:
        'Emphasize the adaptive confidence mechanism and multi-sensor verification.',
    },
    {
      id: 'obj2',
      title: 'Inventive-Step Concern',
      severity: 'Medium',
      concern:
        'The current claim should more clearly establish the technical effect produced by the proposed architecture.',
      recommendation:
        'Explicitly connect sensor fusion to improved classification accuracy.',
    },
    {
      id: 'obj3',
      title: 'Claim Scope',
      severity: 'Low',
      concern: 'Certain elements may be interpreted broadly.',
      recommendation:
        'Define the processing sequence and decision mechanism more precisely.',
    },
  ],
  examinerPositives: [
    { id: 'pos1', title: 'Industrial Applicability', rating: 'Strong' },
    { id: 'pos2', title: 'Technical Feasibility', rating: 'Strong' },
    { id: 'pos3', title: 'Specification Completeness', rating: 'Good' },
    { id: 'pos4', title: 'Potential Novel Elements', rating: 'Identified' },
  ],
  examinerStatusChecks: [
    { label: 'Novelty', status: 'PASS' },
    { label: 'Inventive Step', status: 'REVIEW' },
    { label: 'Industrial Applicability', status: 'PASS' },
    { label: 'Claim Clarity', status: 'PASS' },
    { label: 'Specification', status: 'GOOD' },
  ],
  claimPriorArtAnalysis: [
    { element: 'Computer vision classification', overlap: 'High', differentiation: 'Low' },
    { element: 'Sensor fusion', overlap: 'Medium', differentiation: 'Strong' },
    { element: 'Adaptive confidence scoring', overlap: 'Low', differentiation: 'Strong' },
    { element: 'Edge processing', overlap: 'Medium', differentiation: 'Moderate' },
  ],
  claimStrengthImprovements: [
    { label: 'Specificity', value: 18, positive: true },
    { label: 'Technical Differentiation', value: 22, positive: true },
    { label: 'Ambiguity', value: 31, positive: false },
  ],
  claimInsights: [
    'Defines the adaptive confidence mechanism more precisely.',
    'Clarifies the relationship between sensor fusion and classification.',
    'Creates stronger technical differentiation from identified prior art.',
  ],
  nextStepsChecklist: [
    { label: 'Prior art reviewed', done: true },
    { label: 'Innovation gaps identified', done: true },
    { label: 'Claims optimized', done: true },
    { label: 'Examiner concerns reviewed', done: true },
    { label: 'Professional IP review', done: false },
    { label: 'Final filing preparation', done: false },
  ],
};

export const recentAnalyses = [
  {
    id: '1',
    title: 'AI-Powered Smart Waste Segregation',
    novelty: 82,
    patentability: 76,
    status: 'Patent-Ready',
    date: '2 hours ago',
    domain: 'Computer Vision',
  },
  {
    id: '2',
    title: 'Smart Water Quality Monitoring',
    novelty: 74,
    patentability: 69,
    status: 'In Progress',
    date: '1 day ago',
    domain: 'IoT & Sensors',
  },
  {
    id: '3',
    title: 'Solar Energy Optimization System',
    novelty: 86,
    patentability: 81,
    status: 'Patent-Ready',
    date: '3 days ago',
    domain: 'Energy',
  },
  {
    id: '4',
    title: 'Blockchain Supply Chain Tracker',
    novelty: 68,
    patentability: 61,
    status: 'Needs Work',
    date: '5 days ago',
    domain: 'Blockchain',
  },
  {
    id: '5',
    title: 'Wearable Health Diagnostic Patch',
    novelty: 79,
    patentability: 72,
    status: 'In Progress',
    date: '1 week ago',
    domain: 'Medical Devices',
  },
];

export const dashboardStats = [
  { label: 'Ideas Analyzed', value: '12', change: '+3 this week' },
  { label: 'Average Novelty', value: '78%', change: '+4% vs last month' },
  { label: 'Patent-Ready', value: '4', change: '+1 this week' },
  { label: 'Innovation Opportunities', value: '17', change: '+5 new' },
];

export const intelligenceChart = [
  { month: 'Jan', novelty: 62, patentability: 55 },
  { month: 'Feb', novelty: 68, patentability: 60 },
  { month: 'Mar', novelty: 71, patentability: 64 },
  { month: 'Apr', novelty: 74, patentability: 69 },
  { month: 'May', novelty: 78, patentability: 72 },
  { month: 'Jun', novelty: 82, patentability: 76 },
];

export const loadingSteps = [
  'Understanding invention...',
  'Extracting technical concepts...',
  'Identifying technology domain...',
  'Mapping IPC classification...',
  'Searching semantic prior art...',
  'Analyzing novelty...',
  'Detecting innovation gaps...',
  'Assessing patentability...',
];
