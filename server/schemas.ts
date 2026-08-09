import { z } from "zod";

const MAX_STRING = 4000;
const MAX_COMMENT = 2000;
const MAX_ARRAY = 500;

export const DocumentTypeSchema = z.enum([
  "DRAWING",
  "ENGINEERING_CHANGE",
  "PROCESS_FLOW",
  "PFMEA",
  "CONTROL_PLAN",
  "MSA",
  "DIMENSIONAL_RESULTS",
  "MATERIAL_RESULTS",
  "PERFORMANCE_RESULTS",
  "CAPABILITY_STUDY",
  "CHECKING_AIDS",
  "CUSTOMER_REQUIREMENTS",
  "PSW",
  "OTHER",
  "UNKNOWN",
]);

export const DocumentStatusSchema = z.enum([
  "PRESENT",
  "MISSING",
  "PARTIAL",
  "NOT_APPLICABLE",
  "UNABLE_TO_DETERMINE",
]);

export const FindingSeveritySchema = z.enum([
  "CRITICAL_REVIEW",
  "MAJOR_REVIEW",
  "CLARIFICATION",
  "OBSERVATION",
]);

export const FindingConfidenceSchema = z.enum(["HIGH", "MEDIUM", "LOW"]);

export const FindingStatusSchema = z.enum([
  "OPEN",
  "AWAITING_SQE",
  "SQE_CONFIRMED",
  "FALSE_POSITIVE",
  "SUPPLIER_CLARIFICATION",
  "INTERNAL_REVIEW",
  "NOT_APPLICABLE",
  "RESOLVED",
]);

export const SqeDecisionSchema = z.enum([
  "ACCEPT_FINDING",
  "FALSE_POSITIVE",
  "SUPPLIER_CLARIFICATION",
  "INTERNAL_REVIEW",
  "NOT_APPLICABLE",
  "RESOLVED",
]);

export const ReviewStatusSchema = z.enum([
  "INITIAL_REVIEW",
  "IN_REVIEW",
  "SUPPLIER_CLARIFICATION_REQUIRED",
  "INTERNAL_REVIEW_REQUIRED",
  "READY_FOR_DISPOSITION",
  "COMPLETED",
]);

export const ProcessTraceabilityStatusSchema = z.enum([
  "MATCHED",
  "POTENTIAL_GAP",
  "REVIEW_REQUIRED",
]);

export const CharacteristicTraceabilityStatusSchema = z.enum([
  "COMPLETE",
  "PARTIAL",
  "REVIEW_REQUIRED",
]);

export const ActorTypeSchema = z.enum(["LANGDOCK", "SQE", "SYSTEM"]);

export const EvidenceSchema = z.object({
  id: z.string().min(1).max(128),
  documentId: z.string().min(1).max(128),
  documentName: z.string().min(1).max(512),
  label: z.string().min(1).max(256),
  value: z.string().min(1).max(MAX_STRING),
  page: z.number().int().positive().optional(),
  sheet: z.string().max(128).optional(),
  section: z.string().max(256).optional(),
  sourceReference: z.string().max(512).optional(),
  confidence: FindingConfidenceSchema.optional(),
});

export const FindingCommentSchema = z.object({
  id: z.string().min(1).max(128),
  text: z.string().min(1).max(MAX_COMMENT),
  reviewer: z.string().max(256).optional(),
  createdAt: z.string().min(1).max(64),
});

export const PPAPDocumentSchema = z.object({
  id: z.string().min(1).max(128),
  fileName: z.string().min(1).max(512),
  type: DocumentTypeSchema,
  title: z.string().max(512).optional(),
  revision: z.string().max(64).optional(),
  date: z.string().max(64).optional(),
  status: DocumentStatusSchema,
  extractionConfidence: FindingConfidenceSchema.optional(),
});

export const PPAPFindingSchema = z.object({
  id: z.string().min(1).max(128),
  category: z.string().min(1).max(256),
  title: z.string().min(1).max(512),
  observation: z.string().min(1).max(MAX_STRING),
  preliminarySeverity: FindingSeveritySchema,
  confidence: FindingConfidenceSchema,
  status: FindingStatusSchema,
  recommendedNextStep: z.string().max(MAX_STRING).optional(),
  evidence: z.array(EvidenceSchema).max(MAX_ARRAY),
  sqeDecision: SqeDecisionSchema.optional(),
  comments: z.array(FindingCommentSchema).max(MAX_ARRAY),
  createdAt: z.string().min(1).max(64),
  updatedAt: z.string().min(1).max(64),
});

export const TraceEvidenceRefSchema = z.object({
  present: z.boolean(),
  documentId: z.string().max(128).optional(),
  evidence: z.string().max(MAX_STRING).optional(),
  requirement: z.string().max(512).optional(),
  operation: z.string().max(128).optional(),
  specification: z.string().max(512).optional(),
  gauge: z.string().max(128).optional(),
  result: z.string().max(512).optional(),
});

export const ProcessTraceabilitySchema = z.object({
  operationId: z.string().min(1).max(128),
  operationNumber: z.string().min(1).max(64),
  operationName: z.string().min(1).max(256),
  processFlow: TraceEvidenceRefSchema,
  pfmea: TraceEvidenceRefSchema,
  controlPlan: TraceEvidenceRefSchema,
  status: ProcessTraceabilityStatusSchema,
});

export const CharacteristicTraceabilitySchema = z.object({
  id: z.string().min(1).max(128),
  name: z.string().min(1).max(256),
  drawing: TraceEvidenceRefSchema,
  pfmea: TraceEvidenceRefSchema,
  controlPlan: TraceEvidenceRefSchema,
  dimensional: TraceEvidenceRefSchema,
  msa: TraceEvidenceRefSchema,
  capability: TraceEvidenceRefSchema,
  status: CharacteristicTraceabilityStatusSchema,
});

export const AuditEventSchema = z.object({
  id: z.string().min(1).max(128),
  timestamp: z.string().min(1).max(64),
  action: z.string().min(1).max(256),
  entityType: z.string().min(1).max(128),
  entityId: z.string().max(128).optional(),
  actorType: ActorTypeSchema,
  actor: z.string().max(256).optional(),
  oldValue: z.string().max(MAX_STRING).optional(),
  newValue: z.string().max(MAX_STRING).optional(),
  comment: z.string().max(MAX_COMMENT).optional(),
});

export const PPAPCaseSchema = z.object({
  caseId: z.string().min(1).max(128),
  createdAt: z.string().min(1).max(64),
  updatedAt: z.string().min(1).max(64),
  supplier: z.object({
    name: z.string().min(1).max(512),
    supplierId: z.string().max(128).optional(),
    manufacturingLocation: z.string().max(512).optional(),
  }),
  part: z.object({
    number: z.string().min(1).max(128),
    name: z.string().min(1).max(512),
    drawingRevision: z.string().min(1).max(64),
    customerPartNumber: z.string().max(128).optional(),
  }),
  submission: z.object({
    customer: z.string().min(1).max(512),
    reason: z.string().min(1).max(512),
    profile: z.string().min(1).max(128),
    submissionDate: z.string().max(64).optional(),
    engineeringChangeReference: z.string().max(128).optional(),
  }),
  documents: z.array(PPAPDocumentSchema).max(MAX_ARRAY),
  findings: z.array(PPAPFindingSchema).max(MAX_ARRAY),
  processTraceability: z.array(ProcessTraceabilitySchema).max(MAX_ARRAY),
  characteristicTraceability: z
    .array(CharacteristicTraceabilitySchema)
    .max(MAX_ARRAY),
  review: z.object({
    status: ReviewStatusSchema,
    reviewer: z.string().max(256).optional(),
    startedAt: z.string().max(64).optional(),
    completedAt: z.string().max(64).optional(),
  }),
  auditTrail: z.array(AuditEventSchema).max(2000),
});

export const CreatePpapCaseInputSchema = z.object({
  case: PPAPCaseSchema,
});

export const UpdatePpapCaseInputSchema = z.object({
  caseId: z.string().min(1).max(128),
  patch: z.record(z.string(), z.unknown()),
});

export const CaseIdInputSchema = z.object({
  caseId: z.string().min(1).max(128),
});

export const SetFindingDecisionInputSchema = z.object({
  caseId: z.string().min(1).max(128),
  findingId: z.string().min(1).max(128),
  decision: SqeDecisionSchema,
  reviewer: z.string().max(256).optional(),
  comment: z.string().max(MAX_COMMENT).optional(),
});

export const AddFindingCommentInputSchema = z.object({
  caseId: z.string().min(1).max(128),
  findingId: z.string().min(1).max(128),
  comment: z.string().min(1).max(MAX_COMMENT),
  reviewer: z.string().max(256).optional(),
});

export const SetReviewStatusInputSchema = z.object({
  caseId: z.string().min(1).max(128),
  status: ReviewStatusSchema,
  reviewer: z.string().max(256).optional(),
});
